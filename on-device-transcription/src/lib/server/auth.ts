import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import type { User } from '$lib/types';

const SALT_ROUNDS = 10;

export async function createUser(username: string, password: string): Promise<User> {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await sql`
		INSERT INTO users (username, password_hash)
		VALUES (${username}, ${hash})
		RETURNING id, username
	`;
    return result.rows[0] as User;
}

export async function verifyUser(username: string, password: string): Promise<User | null> {
    const { rows } = await sql`
		SELECT id, username, password_hash FROM users
		WHERE username = ${username}
	`;
    if (rows.length === 0) return null;

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    return valid ? { id: rows[0].id, username: rows[0].username } : null;
}

export async function getUserById(id: number): Promise<User | null> {
    const { rows } = await sql`
		SELECT id, username, email FROM users WHERE id = ${id}
	`;
    return rows.length > 0 ? (rows[0] as User) : null;
}

export async function findOrCreateUserByGoogle(googleId: string, email: string, name: string): Promise<User> {
    // 1. Check if user with googleId exists
    const { rows: googleRows } = await sql`
        SELECT id, username, email FROM users WHERE google_id = ${googleId}
    `;
    if (googleRows.length > 0) {
        return googleRows[0] as User;
    }

    // 2. Check if user with email exists
    const { rows: emailRows } = await sql`
        SELECT id, username, email FROM users WHERE email = ${email}
    `;
    if (emailRows.length > 0) {
        // Link googleId to existing user
        const result = await sql`
            UPDATE users SET google_id = ${googleId} 
            WHERE id = ${emailRows[0].id}
            RETURNING id, username, email
        `;
        return result.rows[0] as User;
    }

    // 3. Create new user
    // Generate a unique username from name or email
    let baseUsername = name.toLowerCase().replace(/\s+/g, '_') || email.split('@')[0];
    let username = baseUsername;
    let counter = 1;

    // Ensure username is unique
    while (true) {
        const { rows: check } = await sql`SELECT id FROM users WHERE username = ${username}`;
        if (check.length === 0) break;
        username = `${baseUsername}${counter++}`;
    }

    const result = await sql`
        INSERT INTO users (username, google_id, email, password_hash)
        VALUES (${username}, ${googleId}, ${email}, 'OAUTH_USER')
        RETURNING id, username, email
    `;
    return result.rows[0] as User;
}
