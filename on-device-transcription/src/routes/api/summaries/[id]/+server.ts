import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSummaryFromDb } from '$lib/server/db';

function getUser(cookies: any) {
    const session = cookies.get('session_user');
    if (!session) return null;
    try {
        return JSON.parse(session);
    } catch {
        return null;
    }
}

export const DELETE: RequestHandler = async ({ params, cookies }) => {
    const user = getUser(cookies);
    if (!user) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
        return json({ error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const deleted = await deleteSummaryFromDb(id, user.id);
        if (!deleted) {
            return json({ error: 'Summary not found' }, { status: 404 });
        }
        return json({ success: true });
    } catch (err) {
        console.error('Delete summary error:', err);
        return json({ error: 'Server error' }, { status: 500 });
    }
};
