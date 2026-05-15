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
console.log('--- Environment Variable Check ---');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'PRESENT' : 'MISSING');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'PRESENT' : 'MISSING');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'PRESENT' : 'MISSING');
console.log('---------------------------------');

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn("CRITICAL WARNING: Cloudinary environment variables are missing. Photo uploads will definitely fail.");
}

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

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'OK', database: 'Connected', timestamp: new Date() });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', database: err.message });
    }
});

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

// Upload User Photo
app.post('/api/users/:id/photo', upload.single('photo'), async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ error: 'Profile picture is absolutely required.' });
        }
        
        const photo_url = `/uploads/${req.file.filename}`;
        
        const result = await pool.query(
            'UPDATE wude_users SET photo_url = $1 WHERE id = $2 RETURNING photo_url',
            [photo_url, id]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        
        res.json({ success: true, photo_url: result.rows[0].photo_url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`Login attempt for: ${email}`);
        
        if (!email || !password) {
            console.warn('Login attempt with missing credentials');
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await pool.query(
            'SELECT * FROM wude_users WHERE email = $1 AND password_hash = $2',
            [email, password]
        );
        
        if (result.rows.length === 0) {
            console.log(`Login failed for: ${email}`);
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        console.log(`Login successful for: ${email}`);
        const user = result.rows[0];
        delete user.password_hash; // Don't send the password back!
        res.json(user);
    } catch (err) {
        console.error('Login database error:', err.message);
        res.status(500).json({ error: 'Internal Server Error: ' + err.message });
    }
});

// Password Reset
app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const result = await pool.query(
            'UPDATE wude_users SET password_hash = $1 WHERE email = $2 RETURNING id',
            [newPassword, email]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Email not found' });
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Profile
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`Update request received for user ID: ${id}`);
    
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
            [
                full_name || null, 
                location || null, 
                parseInt(age) || null, 
                profession || null, 
                education || null, 
                marital_status || null, 
                religion_practice || null, 
                marriage_timeline || null, 
                children_plans || null, 
                bio || null, 
                income || null, 
                id
            ]
        );
        
        if (result.rows.length === 0) {
            console.warn(`Update failed: User ${id} not found.`);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log(`Successfully updated profile for user ${id}`);
        const updatedUser = result.rows[0];
        delete updatedUser.password;
        res.json(updatedUser);
    } catch (err) {
        console.error(`Database error during update for user ${id}:`, err.message);
        res.status(500).json({ error: 'Failed to update profile: ' + err.message });
    }
});

// 2. Like a User (The Matching Engine)
app.post('/api/like', async (req, res) => {
    const { senderId, receiverId } = req.body;
    try {
        // Record the like
        await pool.query(
            'INSERT INTO wude_likes (sender_id, receiver_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [senderId, receiverId]
        );

        // Also record as an interest (Zawaj style)
        await pool.query(
            'INSERT INTO wude_interests (sender_id, receiver_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [senderId, receiverId]
        );

        // Check if it's a match! (Did the other person already like us?)
        const checkMatch = await pool.query(
            'SELECT * FROM wude_likes WHERE sender_id = $1 AND receiver_id = $2',
            [receiverId, senderId]
        );

        if (checkMatch.rows.length > 0) {
            // IT IS A MATCH!
            await pool.query(
                'INSERT INTO wude_matches (user_one, user_two) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [Math.min(senderId, receiverId), Math.max(senderId, receiverId)]
            );
            return res.json({ status: 'MATCHED', message: 'You have a new match!' });
        }

        res.json({ status: 'LIKED', message: 'Interest expressed successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Action failed' });
    }
});

// Reject/Delete a Like
app.delete('/api/like', async (req, res) => {
    const { senderId, receiverId } = req.body;
    try {
        await pool.query('DELETE FROM wude_likes WHERE sender_id = $1 AND receiver_id = $2', [senderId, receiverId]);
        res.json({ success: true, message: 'Like rejected' });
    } catch (err) {
        res.status(500).json({ error: 'Action failed' });
    }
});

// Get likes by type
app.get('/api/likes/:userId', async (req, res) => {
    const { userId } = req.params;
    const { type } = req.query; // received, sent, mutual
    try {
        let query;
        if (type === 'received') {
            query = `
                SELECT u.id, u.full_name, u.age, u.location, u.photo_url 
                FROM wude_users u
                JOIN wude_likes l ON u.id = l.sender_id
                WHERE l.receiver_id = $1
            `;
        } else if (type === 'sent') {
            query = `
                SELECT u.id, u.full_name, u.age, u.location, u.photo_url 
                FROM wude_users u
                JOIN wude_likes l ON u.id = l.receiver_id
                WHERE l.sender_id = $1
            `;
        } else { // mutual
            query = `
                SELECT u.id, u.full_name, u.age, u.location, u.photo_url 
                FROM wude_users u
                WHERE u.id IN (
                    SELECT user_two FROM wude_matches WHERE user_one = $1
                    UNION
                    SELECT user_one FROM wude_matches WHERE user_two = $1
                )
            `;
        }
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch likes' });
    }
});

// Get received interests count
app.get('/api/interests/count/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            'SELECT COUNT(*) FROM wude_interests WHERE receiver_id = $1 AND status = \'pending\'',
            [userId]
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle Photo Privacy
app.post('/api/users/:id/photo-privacy', async (req, res) => {
    try {
        const { id } = req.params;
        const { isPrivate } = req.body;
        await pool.query(
            'UPDATE wude_users SET photo_private = $1 WHERE id = $2',
            [isPrivate, id]
        );
        res.json({ success: true, isPrivate });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Conversations (Matches)
app.get('/api/conversations/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT m.id as match_id, 
                   u.id as user_id, u.full_name, u.age, u.location, u.photo_url, u.marital_status, u.height,
                   (SELECT content FROM wude_messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) as last_message,
                   (SELECT created_at FROM wude_messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) as last_message_time
            FROM wude_matches m
            JOIN wude_users u ON (m.user_one = u.id OR m.user_two = u.id)
            WHERE (m.user_one = $1 OR m.user_two = $1) AND u.id != $1
            ORDER BY last_message_time DESC NULLS LAST
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Messages for a Match
app.get('/api/matches/:matchId/messages', async (req, res) => {
    try {
        const { matchId } = req.params;
        const result = await pool.query('SELECT * FROM wude_messages WHERE match_id = $1 ORDER BY created_at ASC', [matchId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Messages between two users
app.get('/api/messages/:userOne/:userTwo', async (req, res) => {
    try {
        const { userOne, userTwo } = req.params;
        const result = await pool.query(`
            SELECT msg.* FROM wude_messages msg
            JOIN wude_matches m ON msg.match_id = m.id
            WHERE (m.user_one = $1 AND m.user_two = $2) 
               OR (m.user_one = $2 AND m.user_two = $1)
            ORDER BY msg.created_at ASC
        `, [userOne, userTwo]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Send a Message
app.post('/api/messages', async (req, res) => {
    try {
        const { senderId, receiverId, content } = req.body;
        
        // Find the match_id
        const matchQuery = await pool.query(
            'SELECT id FROM wude_matches WHERE (user_one = $1 AND user_two = $2) OR (user_one = $2 AND user_two = $1)',
            [senderId, receiverId]
        );
        
        let matchId;
        if (matchQuery.rows.length === 0) {
            // PROMOTIONAL FEATURE: Auto-create match to allow open messaging
            const newMatch = await pool.query(
                'INSERT INTO wude_matches (user_one, user_two) VALUES ($1, $2) RETURNING id',
                [senderId, receiverId]
            );
            matchId = newMatch.rows[0].id;
        } else {
            matchId = matchQuery.rows[0].id;
        }
        
        const result = await pool.query(
            'INSERT INTO wude_messages (match_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
            [matchId, senderId, content]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Likes Sent
app.get('/api/likes/sent/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT u.id, u.full_name, u.age, u.location, u.photo_url, u.photo_private 
            FROM wude_likes l
            JOIN wude_users u ON l.receiver_id = u.id
            WHERE l.sender_id = $1
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Likes Received (excluding those already matched)
app.get('/api/likes/received/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT u.id, u.full_name, u.age, u.location, u.photo_url, u.photo_private 
            FROM wude_likes l
            JOIN wude_users u ON l.sender_id = u.id
            WHERE l.receiver_id = $1
            AND NOT EXISTS (
                SELECT 1 FROM wude_matches 
                WHERE (user_one = $1 AND user_two = u.id) 
                   OR (user_one = u.id AND user_two = $1)
            )
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Mutual Likes (Matches)
app.get('/api/likes/mutual/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT u.id, u.full_name, u.age, u.location, u.photo_url, u.photo_private 
            FROM wude_matches m
            JOIN wude_users u ON (m.user_one = u.id OR m.user_two = u.id)
            WHERE (m.user_one = $1 OR m.user_two = $1) AND u.id != $1
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upload Photo to Cloudinary
app.post('/api/upload-photo', upload.single('photo'), async (req, res) => {
    try {
        const { userId } = req.body;
        console.log(`Photo upload attempt for user ID: ${userId}`);
        
        if (!req.file) {
            console.warn('Upload attempt with no file.');
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const photoUrl = req.file.path; // Cloudinary URL
        console.log(`File received. Cloudinary path: ${photoUrl}`);

        const result = await pool.query(
            'UPDATE wude_users SET photo_url = $1 WHERE id = $2 RETURNING id',
            [photoUrl, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`Successfully updated photo URL in database for user ${userId}`);
        res.json({ success: true, photo_url: photoUrl });
    } catch (err) {
        console.error('Photo upload/DB error:', err.message);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: 'Upload Error: ' + err.message });
    }
    res.status(500).json({ 
        error: 'Critical Server Error', 
        details: err.message,
        path: req.path
    });
});

app.listen(port, () => {
    console.log(`Wude Backend running on port ${port}`);
});
