import { redirect } from '@sveltejs/kit';
import * as tvmaze from '$lib/server/tvmaze';
import * as jellyfin from '$lib/server/jellyfin';

export async function GET({ url, locals }) {
    const name = url.searchParams.get('name');

    if (!name) {
        throw redirect(303, '/dashboard');
    }

    try {
        const results = await tvmaze.searchShows(name);
        if (results && results.length > 0) {
            // Redirect to the first result
            throw redirect(303, `/dashboard/series/${results[0].show.id}`);
        }
        
        // Fallback: Try Jellyfin
        if (locals.user) {
            try {
                console.log(`TVMaze lookup failed for "${name}", searching Jellyfin...`);
                const { user, token } = locals.user;
                // Search for series specifically
                const jResults = await jellyfin.getSeries(user.Id, token, name);
                
                // Find best match (exact name match first, then loosely)
                let match = jResults.find(s => s.Name.toLowerCase() === name.toLowerCase());
                if (!match && jResults.length > 0) {
                    match = jResults[0]; // Take first result if exact match fails
                }

                if (match) {
                    console.log(`Found Jellyfin match: ${match.Name} (${match.Id})`);
                    throw redirect(303, `/dashboard/series/${match.Id}`);
                }
            } catch (je) {
                console.error('Jellyfin lookup failed:', je);
                if (je.status === 303) throw je;
            }
        }

        // If still not found
        throw redirect(303, `/dashboard?error=not_found&q=${encodeURIComponent(name)}`);
        
    } catch (e) {
        if (e.status === 303) throw e;
        console.error('Lookup failed:', e);
        throw redirect(303, `/dashboard?error=lookup_failed&q=${encodeURIComponent(name)}`);
    }
}
