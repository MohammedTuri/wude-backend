-- Wude Sovereign Data Schema
-- Designed for high-performance matching and monetization.

CREATE TABLE IF NOT EXISTS wude_users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL, -- 'man', 'woman'
    looking_for TEXT NOT NULL, -- 'man', 'woman'
    bio TEXT,
    location TEXT,
    photo_url TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wude_likes (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES wude_users(id),
    receiver_id INTEGER REFERENCES wude_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS wude_matches (
    id SERIAL PRIMARY KEY,
    user_one INTEGER REFERENCES wude_users(id),
    user_two INTEGER REFERENCES wude_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_one, user_two)
);

CREATE INDEX IF NOT EXISTS idx_wude_gender_looking ON wude_users(gender, looking_for);

CREATE TABLE IF NOT EXISTS wude_messages (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES wude_matches(id),
    sender_id INTEGER REFERENCES wude_users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE wude_users ADD COLUMN IF NOT EXISTS marriage_timeline TEXT;
ALTER TABLE wude_users ADD COLUMN IF NOT EXISTS profession TEXT;
ALTER TABLE wude_users ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE wude_users ADD COLUMN IF NOT EXISTS income TEXT;
ALTER TABLE wude_users ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE wude_users ADD COLUMN IF NOT EXISTS religion_practice TEXT;
ALTER TABLE wude_users ADD COLUMN IF NOT EXISTS height TEXT;
ALTER TABLE wude_users ADD COLUMN IF NOT EXISTS children_plans TEXT;
ALTER TABLE wude_users ADD COLUMN IF NOT EXISTS ethnicity TEXT;
ALTER TABLE wude_users ADD COLUMN IF NOT EXISTS country_of_origin TEXT;
ALTER TABLE wude_users ADD COLUMN IF NOT EXISTS photo_private BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS wude_interests (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES wude_users(id),
    receiver_id INTEGER REFERENCES wude_users(id),
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender_id, receiver_id)
);
