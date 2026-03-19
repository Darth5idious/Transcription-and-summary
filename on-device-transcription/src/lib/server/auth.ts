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
		SELECT id, username FROM users WHERE id = ${id}
	`;
    return rows.length > 0 ? (rows[0] as User) : null;
}
