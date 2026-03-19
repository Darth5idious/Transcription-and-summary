import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyUser } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
    const { username, password } = await request.json();

    if (!username || !password) {
        return json({ error: 'Username and password are required' }, { status: 400 });
    }

    try {
        const user = await verifyUser(username.trim(), password);
        if (!user) {
            return json({ error: 'Invalid username or password' }, { status: 401 });
        }

        cookies.set('session_user', JSON.stringify({ id: user.id, username: user.username }), {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return json({ success: true, user: { id: user.id, username: user.username } });
    } catch (err) {
        console.error('Login error:', err);
        return json({ error: 'Server error' }, { status: 500 });
    }
};
