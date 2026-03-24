import { sql } from '@vercel/postgres';
import type { DbSummary } from '$lib/types';

interface SaveSummaryData {
    title: string;
    username?: string;
    ip_address?: string;
    transcript?: string;
    summary?: string;
    translation?: string;
    duration?: number;
    language?: string;
}

export async function saveSummaryToDb(userId: number, data: SaveSummaryData): Promise<DbSummary> {
    const result = await sql`
		INSERT INTO summaries (user_id, username, ip_address, title, transcript, summary, translation, duration, language)
		VALUES (
			${userId},
			${data.username ?? null},
			${data.ip_address ?? null},
			${data.title},
			${data.transcript ?? null},
			${data.summary ?? null},
			${data.translation ?? null},
			${data.duration ?? 0},
			${data.language ?? 'en'}
		)
		RETURNING *
	`;
    return result.rows[0] as DbSummary;
}

export async function getUserSummaries(userId: number): Promise<DbSummary[]> {
    const { rows } = await sql`
		SELECT * FROM summaries
		WHERE user_id = ${userId}
		ORDER BY created_at DESC
	`;
    return rows as DbSummary[];
}

export async function deleteSummaryFromDb(id: number, userId: number): Promise<boolean> {
    const result = await sql`
		DELETE FROM summaries
		WHERE id = ${id} AND user_id = ${userId}
	`;
    return (result.rowCount ?? 0) > 0;
}
