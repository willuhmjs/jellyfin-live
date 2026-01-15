import { redirect } from '@sveltejs/kit';
import * as tvmaze from '$lib/server/tvmaze';

export async function GET({ url }) {
    const name = url.searchParams.get('name');

    if (!name) {
        throw redirect(303, '/dashboard');
    }

    try {
        const results = await tvmaze.searchShows(name);
        if (results && results.length > 0) {
            // Redirect to the first result
            throw redirect(303, `/dashboard/series/${results[0].show.id}`);
        } else {
             // Fallback: If not found, redirect to dashboard with error
             throw redirect(303, `/dashboard?error=not_found&q=${encodeURIComponent(name)}`);
        }
    } catch (e) {
        if (e.status === 303) throw e;
        console.error('Lookup failed:', e);
        throw redirect(303, `/dashboard?error=lookup_failed&q=${encodeURIComponent(name)}`);
    }
}
