import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ cookies }) => {
    const googleClientId = env.GOOGLE_CLIENT_ID;
    const googleRedirectUri = env.GOOGLE_REDIRECT_URI;

    if (!googleClientId || !googleRedirectUri) {
        console.error('Missing Google OAuth configuration');
        throw redirect(302, '/login?error=Google auth not configured');
    }

    const state = crypto.randomUUID();
    cookies.set('google_oauth_state', state, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 10 // 10 minutes
    });

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', googleClientId);
    googleAuthUrl.searchParams.set('redirect_uri', googleRedirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid profile email');
    googleAuthUrl.searchParams.set('state', state);

    throw redirect(302, googleAuthUrl.toString());
};
