import { redirect } from '@sveltejs/kit';
import * as tvmaze from '$lib/server/tvmaze';
import * as jellyfin from '$lib/server/jellyfin';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
    const name = url.searchParams.get('name');

    if (!name) {
        throw redirect(303, '/dashboard');
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results: any[] = await tvmaze.searchShows(name);
        if (results && results.length > 0) {
            // Redirect to the first result
            throw redirect(303, `/dashboard/series/${results[0].show.id}`);
        }
        
        // Fallback: Try Jellyfin
        if (locals.user) {
            try {
                console.log(`TVMaze lookup failed for "${name}", searching Jellyfin...`);
                const { user, token } = locals.user;
                // Search for Series and Movies
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const jResults: any[] = await jellyfin.searchItems(user.Id, token, name, ['Series', 'Movie', 'Recording']);
                
                // Find best match (exact name match first, then loosely)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let match = jResults.find((s: any) => s.Name.toLowerCase() === name.toLowerCase());
                if (!match && jResults.length > 0) {
                    match = jResults[0]; // Take first result if exact match fails
                }

                if (match) {
                    console.log(`Found Jellyfin match: ${match.Name} (${match.Id})`);
                    throw redirect(303, `/dashboard/series/${match.Id}`);
                }
            } catch (je: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                console.error('Jellyfin lookup failed:', je);
                if (je.status === 303) throw je;
                if (je.status === 401 || (je.message && je.message.includes('401'))) {
                    throw redirect(303, '/login');
                }
            }
        }

        // If still not found
        throw redirect(303, `/dashboard?error=not_found&q=${encodeURIComponent(name)}`);
        
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        // e can be the redirect object itself
        if (e.status === 303) throw e;
        if (e.status === 401 || (e.message && e.message.includes('401'))) {
            throw redirect(303, '/login');
        }
        console.error('Lookup failed:', e);
        throw redirect(303, `/dashboard?error=lookup_failed&q=${encodeURIComponent(name)}`);
    }
};
