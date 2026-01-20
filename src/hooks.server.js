import { getSetting } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';

export async function handle({ event, resolve }) {
    const url = event.url.pathname;

    // Allow static assets
    if (url.startsWith('/_app') || url.startsWith('/favicon.ico')) {
        return resolve(event);
    }

    let jellyfinUrl = null;
    try {
        jellyfinUrl = await getSetting('jellyfin_url');
    } catch (e) {
        console.error('Database error checking settings:', e);
        // If it's a DB error, we treat it as not configured, 
        // effectively forcing onboarding (which will fail on save if DB is totally dead, 
        // but might recover if it's just a transient issue or first run migration issue?)
    }

    // If not configured and not on onboarding page, redirect to onboarding
    if (!jellyfinUrl && url !== '/onboarding') {
        throw redirect(303, '/onboarding');
    }

    // If configured and on onboarding page, redirect to login
    if (jellyfinUrl && url === '/onboarding') {
        throw redirect(303, '/login');
    }

    const sessionId = event.cookies.get('session_id');
    const userId = event.cookies.get('user_id');

    if (sessionId && userId) {
        event.locals.user = {
            user: { Id: userId },
            token: sessionId
        };
    }

    // Protect all routes except login and onboarding
    if (!event.locals.user && !url.startsWith('/login') && !url.startsWith('/onboarding')) {
        throw redirect(303, '/login');
    }

    return resolve(event);
}
