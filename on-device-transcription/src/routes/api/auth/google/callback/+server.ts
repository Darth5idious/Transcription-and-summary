import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { findOrCreateUserByGoogle } from '$lib/server/auth';

export const GET: RequestHandler = async ({ url, cookies }) => {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const storedState = cookies.get('google_oauth_state');

    if (!code || !state || state !== storedState) {
        return json({ error: 'Invalid state or code' }, { status: 400 });
    }

    cookies.delete('google_oauth_state', { path: '/' });

    const googleClientId = env.GOOGLE_CLIENT_ID;
    const googleClientSecret = env.GOOGLE_CLIENT_SECRET;
    const googleRedirectUri = env.GOOGLE_REDIRECT_URI;

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: googleClientId!,
                client_secret: googleClientSecret!,
                redirect_uri: googleRedirectUri!,
                grant_type: 'authorization_code'
            })
        });

        const tokens = await tokenResponse.json();
        if (!tokens.access_token) {
            console.error('Failed to exchange code for tokens:', tokens);
            throw redirect(302, '/login?error=Authentication failed');
        }

        // Get user info
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });

        const googleUser = await userResponse.json();
        // googleUser includes: sub, name, email, picture, etc.

        const user = await findOrCreateUserByGoogle(googleUser.sub, googleUser.email, googleUser.name);

        cookies.set('session_user', JSON.stringify({ id: user.id, username: user.username }), {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        throw redirect(302, '/');
    } catch (err) {
        if (err instanceof Response || (err && typeof err === 'object' && 'status' in err)) {
            throw err;
        }
        console.error('Google callback error:', err);
        throw redirect(302, '/login?error=Server error during Google sign-in');
    }
};
