import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveSummaryToDb, getUserSummaries } from '$lib/server/db';

function getUser(cookies: any) {
    const session = cookies.get('session_user');
    if (!session) return null;
    try {
        return JSON.parse(session);
    } catch {
        return null;
    }
}

export const GET: RequestHandler = async ({ cookies }) => {
    const user = getUser(cookies);
    if (!user) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        const summaries = await getUserSummaries(user.id);
        return json({ summaries });
    } catch (err) {
        console.error('Get summaries error:', err);
        return json({ error: 'Server error' }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request, cookies }) => {
    const user = getUser(cookies);
    if (!user) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.title) {
        return json({ error: 'Title is required' }, { status: 400 });
    }

    try {
        const saved = await saveSummaryToDb(user.id, {
            title: data.title,
            transcript: data.transcript,
            summary: data.summary,
            translation: data.translation,
            duration: data.duration,
            language: data.language,
        });
        return json({ success: true, summary: saved });
    } catch (err) {
        console.error('Save summary error:', err);
        return json({ error: 'Server error' }, { status: 500 });
    }
};
