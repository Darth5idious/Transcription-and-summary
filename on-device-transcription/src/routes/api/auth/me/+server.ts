import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
    const session = cookies.get('session_user');
    if (!session) {
        return json({ user: null });
    }

    try {
        const user = JSON.parse(session);
        return json({ user: { id: user.id, username: user.username } });
    } catch {
        return json({ user: null });
    }
};
