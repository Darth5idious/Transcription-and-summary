import { sql } from '@vercel/postgres';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
    try {
        // Create users table with encrypted password storage
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                google_id TEXT UNIQUE,
                email TEXT UNIQUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Create summaries table
        await sql`
            CREATE TABLE IF NOT EXISTS summaries (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                username TEXT,
                ip_address TEXT,
                title TEXT NOT NULL,
                transcript TEXT,
                summary TEXT,
                translation TEXT,
                duration INTEGER DEFAULT 0,
                language TEXT DEFAULT 'en',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Create index for faster lookups
        await sql`
            CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id)
        `;

        // Verify tables exist
        const tables = await sql`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `;

        return json({
            success: true,
            message: 'Database tables initialized successfully',
            tables: tables.rows.map(r => r.table_name)
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return json({ success: false, error: message }, { status: 500 });
    }
};
