import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUser } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
    const { username, password } = await request.json();

    if (!username || !password) {
        return json({ error: 'Username and password are required' }, { status: 400 });
    }
    if (typeof username !== 'string' || username.length < 3) {
        return json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8) {
        return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    try {
        const user = await createUser(username.trim(), password);

        cookies.set('session_user', JSON.stringify({ id: user.id, username: user.username }), {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return json({ success: true, user: { id: user.id, username: user.username } });
    } catch (err: any) {
        if (err.code === '23505') {
            return json({ error: 'Username already taken' }, { status: 409 });
        }
        console.error('Signup error:', err);
        return json({ error: 'Server error' }, { status: 500 });
    }
};
