import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'wude_profiles',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 600, height: 600, crop: 'limit' }]
  },
});
const upload = multer({ storage: storage });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')) ? false : { rejectUnauthorized: false }
});

// Auto-init DB
const initDb = async () => {
    try {
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await pool.query(schema);
        console.log('Database Ready');
    } catch (err) {
        console.error('Database Init Failed:', err.message);
    }
};
initDb();

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

// --- API ---

app.get('/api/profiles', async (req, res) => {
    try {
        const { gender } = req.query;
        const targetGender = gender === 'man' ? 'woman' : 'man';
        const result = await pool.query('SELECT * FROM wude_users WHERE gender = $1 ORDER BY created_at DESC', [targetGender]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/profiles/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM wude_users WHERE id = $1', [req.params.id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { email, password, full_name, age, gender } = req.body;
        const result = await pool.query(
            'INSERT INTO wude_users (email, password_hash, full_name, age, gender, photo_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [email, password, full_name, age, gender, 'https://images.unsplash.com/photo-1523824921871-d6f1a31951bc']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query('SELECT * FROM wude_users WHERE email = $1 AND password_hash = $2', [email, password]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        const user = result.rows[0];
        delete user.password_hash;
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { full_name, bio, location } = req.body;
        const result = await pool.query(
            'UPDATE wude_users SET full_name = $1, bio = $2, location = $3 WHERE id = $4 RETURNING *',
            [full_name, bio, location, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/upload-photo', upload.single('photo'), async (req, res) => {
    try {
        const { userId } = req.body;
        if (!req.file) return res.status(400).json({ error: 'No file' });
        await pool.query('UPDATE wude_users SET photo_url = $1 WHERE id = $2', [req.file.path, userId]);
        res.json({ success: true, photo_url: req.file.path });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Matching
app.post('/api/like', async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;
        await pool.query('INSERT INTO wude_likes (sender_id, receiver_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [senderId, receiverId]);
        const check = await pool.query('SELECT * FROM wude_likes WHERE sender_id = $1 AND receiver_id = $2', [receiverId, senderId]);
        if (check.rows.length > 0) {
            await pool.query('INSERT INTO wude_matches (user_one, user_two) VALUES ($1, $2) ON CONFLICT DO NOTHING', [Math.min(senderId, receiverId), Math.max(senderId, receiverId)]);
            return res.json({ status: 'MATCHED' });
        }
        res.json({ status: 'LIKED' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/likes/:userId', async (req, res) => {
    try {
        const { type } = req.query;
        let q = type === 'received' 
            ? 'SELECT u.* FROM wude_users u JOIN wude_likes l ON u.id = l.sender_id WHERE l.receiver_id = $1'
            : 'SELECT u.* FROM wude_users u JOIN wude_likes l ON u.id = l.receiver_id WHERE l.sender_id = $1';
        const result = await pool.query(q, [req.params.userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Messaging
app.get('/api/conversations/:userId', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.id as match_id, u.id as user_id, u.full_name, u.photo_url
            FROM wude_matches m
            JOIN wude_users u ON (m.user_one = u.id OR m.user_two = u.id)
            WHERE (m.user_one = $1 OR m.user_two = $1) AND u.id != $1
        `, [req.params.userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.get('/api/messages/:id1/:id2', async (req, res) => {
    try {
        const { id1, id2 } = req.params;
        const result = await pool.query(`
            SELECT * FROM wude_messages 
            WHERE match_id IN (
                SELECT id FROM wude_matches 
                WHERE (user_one = $1 AND user_two = $2)
                   OR (user_one = $2 AND user_two = $1)
            )
            ORDER BY created_at ASC
        `, [id1, id2]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/matches/:matchId/messages', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM wude_messages WHERE match_id = $1 ORDER BY created_at ASC', [req.params.matchId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/messages', async (req, res) => {
    try {
        const { senderId, receiverId, content } = req.body;
        const m = await pool.query('SELECT id FROM wude_matches WHERE (user_one = $1 AND user_two = $2) OR (user_one = $2 AND user_two = $1)', [senderId, receiverId]);
        if (m.rows.length === 0) return res.status(403).json({ error: 'No match' });
        const result = await pool.query('INSERT INTO wude_messages (match_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *', [m.rows[0].id, senderId, content]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => console.log(`Wude running on ${port}`));
