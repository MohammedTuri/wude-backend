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
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend from this folder

// Cloudinary Config Diagnostics
console.log('--- Startup Cloudinary Check ---');
console.log('CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'OK' : 'MISSING');
console.log('API_KEY:', process.env.CLOUDINARY_API_KEY ? 'OK' : 'MISSING');
console.log('API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'OK' : 'MISSING');

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

// Database Connection
const connectionString = process.env.DATABASE_URL || '';
const pool = new Pool({
  connectionString: connectionString,
  ssl: (connectionString.includes('localhost') || connectionString.includes('127.0.0.1') || connectionString === '')
    ? false 
    : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

// Auto-initialize Schema
const initDb = async () => {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);
        console.log('Wude: Database schema initialized.');
    } catch (err) {
        console.error('Wude: Database init failed!', err.message);
    }
};
initDb();

// Debug & Health Routes
app.get('/api/debug-env', (req, res) => {
    res.json({
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'OK' : 'MISSING',
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? 'OK' : 'MISSING',
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'OK' : 'MISSING',
        DATABASE_URL: process.env.DATABASE_URL ? 'OK' : 'MISSING',
        NODE_ENV: process.env.NODE_ENV,
        timestamp: new Date()
    });
});

app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'OK', database: 'Connected', timestamp: new Date() });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', database: err.message });
    }
});

// --- API ROUTES ---

// 1. Get Profiles (The Discovery Feed)
app.get('/api/profiles', async (req, res) => {
    try {
        const { gender, country, minAge, maxAge, education, maritalStatus, religion } = req.query;
        // Strict heterosexual matching logic enforced by backend
        const strictLookingFor = gender === 'man' ? 'woman' : 'man';
        
        let query = 'SELECT id, full_name, age, bio, location, photo_url, is_premium, ethnicity, country_of_origin, photo_private FROM wude_users WHERE gender = $1';
        let params = [strictLookingFor];
        let paramCount = 1;

        if (country && country !== 'All') {
            paramCount++;
            query += ` AND (country_of_origin ILIKE $${paramCount} OR location ILIKE $${paramCount})`;
            params.push(`%${country}%`);
        }

        if (minAge) {
            paramCount++;
            query += ` AND age >= $${paramCount}`;
            params.push(parseInt(minAge));
        }

        if (maxAge) {
            paramCount++;
            query += ` AND age <= $${paramCount}`;
            params.push(parseInt(maxAge));
        }

        if (education && education !== 'All') {
            paramCount++;
            query += ` AND education = $${paramCount}`;
            params.push(education);
        }

        if (maritalStatus && maritalStatus !== 'All') {
            paramCount++;
            query += ` AND marital_status = $${paramCount}`;
            params.push(maritalStatus);
        }

        if (religion && religion !== 'All') {
            paramCount++;
            query += ` AND religion_practice = $${paramCount}`;
            params.push(religion);
        }

        query += ' ORDER BY created_at DESC LIMIT 50';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch profiles' });
    }
});

// Get Detailed Profile
app.get('/api/profiles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT id, full_name, age, bio, location, photo_url, is_premium, gender, looking_for, marriage_timeline, profession, education, income, marital_status, religion_practice, height, children_plans, ethnicity, country_of_origin, photo_private FROM wude_users WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, full_name, age, gender, bio, location, marriage_timeline, profession, education, income, marital_status, religion_practice, height, children_plans, ethnicity, country_of_origin } = req.body;
        
        const check = await pool.query('SELECT id FROM wude_users WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });

        const strictLookingFor = gender === 'man' ? 'woman' : 'man';
        const photo_url = 'https://images.unsplash.com/photo-1523824921871-d6f1a31951bc'; // Default until upload
        
        const result = await pool.query(
            'INSERT INTO wude_users (email, password_hash, full_name, age, gender, looking_for, bio, location, marriage_timeline, profession, education, income, marital_status, religion_practice, height, children_plans, photo_url, ethnicity, country_of_origin) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *',
            [email, password, full_name, age, gender, strictLookingFor, bio, location, marriage_timeline, profession, education, income, marital_status, religion_practice, height, children_plans, photo_url, ethnicity, country_of_origin]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const result = await pool.query(
            'SELECT * FROM wude_users WHERE email = $1 AND password_hash = $2',
            [email, password]
        );
        
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
        
        const user = result.rows[0];
        delete user.password_hash;
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Profile
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const {
        full_name, location, age, profession, education,
        marital_status, religion_practice, marriage_timeline,
        children_plans, bio, income
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE wude_users 
             SET full_name = $1, location = $2, age = $3, profession = $4, 
                 education = $5, marital_status = $6, religion_practice = $7, 
                 marriage_timeline = $8, children_plans = $9, bio = $10, income = $11
             WHERE id = $12 RETURNING *`,
            [full_name, location, parseInt(age), profession, education, marital_status, religion_practice, marriage_timeline, children_plans, bio, income, id]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upload Photo (Middleware handles Cloudinary)
app.post('/api/upload-photo', upload.single('photo'), async (req, res) => {
    try {
        const { userId } = req.body;
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        
        const photoUrl = req.file.path; 
        await pool.query('UPDATE wude_users SET photo_url = $1 WHERE id = $2', [photoUrl, userId]);
        
        res.json({ success: true, photo_url: photoUrl });
    } catch (err) {
        res.status(500).json({ error: 'Upload failed: ' + err.message });
    }
});

// Like / Match System
app.post('/api/like', async (req, res) => {
    const { senderId, receiverId } = req.body;
    try {
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
    const { userId } = req.params;
    const { type } = req.query;
    try {
        let query;
        if (type === 'received') {
            query = 'SELECT u.* FROM wude_users u JOIN wude_likes l ON u.id = l.sender_id WHERE l.receiver_id = $1';
        } else if (type === 'sent') {
            query = 'SELECT u.* FROM wude_users u JOIN wude_likes l ON u.id = l.receiver_id WHERE l.sender_id = $1';
        } else {
            query = 'SELECT u.* FROM wude_users u WHERE u.id IN (SELECT user_two FROM wude_matches WHERE user_one = $1 UNION SELECT user_one FROM wude_matches WHERE user_two = $1)';
        }
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Messages
app.get('/api/conversations/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT m.id as match_id, u.id as user_id, u.full_name, u.photo_url,
                   (SELECT content FROM wude_messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM wude_matches m
            JOIN wude_users u ON (m.user_one = u.id OR m.user_two = u.id)
            WHERE (m.user_one = $1 OR m.user_two = $1) AND u.id != $1
        `, [userId]);
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
        const match = await pool.query('SELECT id FROM wude_matches WHERE (user_one = $1 AND user_two = $2) OR (user_one = $2 AND user_two = $1)', [senderId, receiverId]);
        if (match.rows.length === 0) return res.status(403).json({ error: 'Not matched' });
        const result = await pool.query('INSERT INTO wude_messages (match_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *', [match.rows[0].id, senderId, content]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    if (err instanceof multer.MulterError) return res.status(400).json({ error: 'Upload Error: ' + err.message });
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

app.listen(port, () => {
    console.log(`Wude Backend running on port ${port}`);
});
