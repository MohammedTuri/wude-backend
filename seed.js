import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1') 
    ? false 
    : { rejectUnauthorized: false }
});

async function seedWude() {
    try {
        console.log('Initializing schema and seeding Wude database...');

        // 0. Initialize Schema
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);
        console.log('Wude: Database schema initialized.');

        // 1. Clear existing demo data
        await pool.query('TRUNCATE wude_users, wude_likes, wude_matches CASCADE');

        const users = [
            { email: 'user1@wude.app', password: 'hashed_password', name: 'Selamawit Tekle', age: 24, gender: 'woman', looking: 'man', bio: 'Architecture student. I love jazz and exploring ancient cultures.', location: 'Addis Ababa, Ethiopia', premium: true, photo: 'https://images.unsplash.com/photo-1523824921871-d6f1a31951bc', marriage_timeline: 'Within 1-2 years', profession: 'Architecture Student', education: 'Bachelors', income: 'Prefer not to say', marital_status: 'Never Married', religion_practice: 'Practicing Orthodox', height: '165 cm', children_plans: 'Wants children' },
            { email: 'user2@wude.app', password: 'hashed_password', name: 'James Wilson', age: 30, gender: 'man', looking: 'woman', bio: 'Tech entrepreneur and traveler. Looking for a partner to build a life with.', location: 'London, UK', premium: false, photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', marriage_timeline: 'As soon as possible', profession: 'Tech Entrepreneur', education: 'Masters', income: '$100k+', marital_status: 'Never Married', religion_practice: 'Moderately Practicing', height: '182 cm', children_plans: 'Open to children' },
            { email: 'user3@wude.app', password: 'hashed_password', name: 'Fatima Al-Sayed', age: 27, gender: 'woman', looking: 'man', bio: 'Doctor with a passion for humanitarian work. Values kindness and family.', location: 'Dubai, UAE', premium: true, photo: 'https://images.unsplash.com/photo-1531123897727-8f129e16fd3c', marriage_timeline: 'Within 1-2 years', profession: 'Doctor', education: 'Doctorate', income: '$75k - $100k', marital_status: 'Never Married', religion_practice: 'Practicing Muslim', height: '170 cm', children_plans: 'Wants children' },
            { email: 'user4@wude.app', password: 'hashed_password', name: 'Marcus Chen', age: 29, gender: 'man', looking: 'woman', bio: 'Artist and cook. I believe food is the best way to the heart.', location: 'New York, USA', premium: false, photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce', marriage_timeline: '3+ years', profession: 'Artist', education: 'Bachelors', income: '$50k - $75k', marital_status: 'Divorced', religion_practice: 'Spiritual', height: '178 cm', children_plans: 'Does not want children' },
            { email: 'user5@wude.app', password: 'hashed_password', name: 'Zainab Juma', age: 25, gender: 'woman', looking: 'man', bio: 'Graphic designer and nature lover. Looking for a soulful connection.', location: 'Nairobi, Kenya', premium: false, photo: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2', marriage_timeline: 'Within 1-2 years', profession: 'Graphic Designer', education: 'Bachelors', income: 'Prefer not to say', marital_status: 'Never Married', religion_practice: 'Practicing Muslim', height: '162 cm', children_plans: 'Wants children' },
            { email: 'user6@wude.app', password: 'hashed_password', name: 'Sofia Rodriguez', age: 28, gender: 'woman', looking: 'man', bio: 'Journalist and storyteller. Seeking someone to share new chapters with.', location: 'Madrid, Spain', premium: true, photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d', marriage_timeline: 'Within 1-2 years', profession: 'Journalist', education: 'Masters', income: '$50k - $75k', marital_status: 'Never Married', religion_practice: 'Catholic', height: '168 cm', children_plans: 'Wants children' }
        ];

        for (const u of users) {
            await pool.query(
                'INSERT INTO wude_users (email, password_hash, full_name, age, gender, looking_for, bio, location, is_premium, photo_url, marriage_timeline, profession, education, income, marital_status, religion_practice, height, children_plans) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)',
                [u.email, u.password, u.name, u.age, u.gender, u.looking, u.bio, u.location, u.premium, u.photo, u.marriage_timeline, u.profession, u.education, u.income, u.marital_status, u.religion_practice, u.height, u.children_plans]
            );
        }

        console.log('Wude: Database seeded with 6 profiles. 🚀');
        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err.message);
        process.exit(1);
    }
}

seedWude();
