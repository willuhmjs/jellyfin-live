import * as tvmaze from '$lib/server/tvmaze';
import * as jellyfin from '$lib/server/jellyfin';
import { error, fail } from '@sveltejs/kit';

export async function load({ params, locals }) {
    if (!locals.user) {
        return {
            show: null,
            seasons: {},
            isMonitored: false,
            jellyfinSeriesId: null
        };
    }

    const { user, token } = locals.user;
    const tvmazeId = params.id;

    // 1. Fetch TVMaze Data
    let show;
    try {
        console.log(`Loading series details for ID: ${tvmazeId}`);
        show = await tvmaze.getShow(tvmazeId);
        console.log(`Fetched show: ${show ? show.name : 'null'}`);
    } catch (e) {
        console.error('Failed to fetch from TVMaze:', e);
        return {
            show: null,
            error: `Failed to load show details: ${e.message}`
        };
    }

    if (!show) {
        return {
            show: null,
            error: 'Show not found in TVMaze.'
        };
    }

    let jellyfinEpisodes = [];
    let isMonitored = false;
    let jellyfinSeriesId = null;

    try {
        // 2. Search Jellyfin for Series
        console.log(`Searching Jellyfin for: ${show.name}`);
        const jellyfinSeriesResults = await jellyfin.getSeries(user.Id, token, show.name);
        
        // Simple matching logic: Exact name match (case insensitive)
        const jellyfinSeries = jellyfinSeriesResults.find(s =>
            s.Name.toLowerCase() === show.name.toLowerCase()
        );

        if (jellyfinSeries) {
            console.log(`Found Jellyfin series: ${jellyfinSeries.Name} (${jellyfinSeries.Id})`);
            jellyfinSeriesId = jellyfinSeries.Id;
            // 3. Fetch Jellyfin Episodes
            jellyfinEpisodes = await jellyfin.getEpisodes(user.Id, token, jellyfinSeries.Id);
            
            // 4. Check for Series Timer
            const allSeriesTimers = await jellyfin.getSeriesTimers(token);
            const timer = allSeriesTimers.find(t => t.Name === show.name || (t.SeriesId && t.SeriesId === jellyfinSeries.Id));
            if (timer) {
                isMonitored = true;
            }
        } else {
            console.log('Series not found in Jellyfin library.');
            // If not in library, we might still have a Series Timer
            const allSeriesTimers = await jellyfin.getSeriesTimers(token);
            const timer = allSeriesTimers.find(t => t.Name === show.name);
            if (timer) {
                isMonitored = true;
            }
        }
    } catch (e) {
        console.error('Error fetching Jellyfin data (continuing anyway):', e);
        // We continue without Jellyfin data so the user can still see show info
    }

    // 5. Merge Data
    const seasons = {};
    
    if (show._embedded && show._embedded.episodes) {
        for (const ep of show._embedded.episodes) {
            const seasonNum = ep.season;
            if (!seasons[seasonNum]) {
                seasons[seasonNum] = [];
            }

            const isOwned = jellyfinEpisodes.some(je =>
                je.ParentIndexNumber === ep.season &&
                je.IndexNumber === ep.number
            );
            
            const airdate = ep.airdate ? new Date(ep.airdate) : null;
            const isUpcoming = airdate && airdate > new Date();

            seasons[seasonNum].push({
                ...ep,
                owned: isOwned,
                upcoming: isUpcoming
            });
        }
    }

    return {
        show,
        seasons,
        isMonitored,
        jellyfinSeriesId
    };
}

export const actions = {
    recordSeries: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const seriesName = data.get('seriesName');

        if (!seriesName) {
            return fail(400, { message: 'Series name required' });
        }

        try {
            // 1. Search Guide for any airing of this show to get a ProgramId
            // We need a ProgramId to create a Series Timer in Jellyfin (API requirement usually)
            const programs = await jellyfin.getPrograms(locals.user.user.Id, locals.user.token, 50, seriesName);
            
            if (!programs || programs.length === 0) {
                 return fail(404, { message: 'No upcoming airings found in guide.' });
            }

            // Filter strictly by name to avoid partial matches on other shows
            const match = programs.find(p => p.Name.toLowerCase() === seriesName.toLowerCase());

            if (!match) {
                return fail(404, { message: 'No upcoming airings found in guide.' });
            }

            // 2. Schedule Series Recording
            await jellyfin.scheduleRecording(locals.user.token, match.Id, true);

            return { success: true };
        } catch (e) {
            console.error('Failed to record series:', e);
            return fail(500, { message: 'Failed to schedule recording' });
        }
    }
};
