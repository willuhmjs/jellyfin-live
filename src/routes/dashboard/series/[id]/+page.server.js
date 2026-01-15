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
    let guidePrograms = [];
    let scheduledTimers = [];

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

        // Fetch guide data and timers concurrently
        const [programsResult, timersResult] = await Promise.allSettled([
            jellyfin.getPrograms(user.Id, token, 500, show.name),
            jellyfin.getTimers(token)
        ]);
        
        if (programsResult.status === 'fulfilled') {
            guidePrograms = programsResult.value;
        }
        if (timersResult.status === 'fulfilled') {
            scheduledTimers = timersResult.value;

            // Enrich timers with missing EpisodeTitle
            const timersToEnrich = scheduledTimers.filter(t => !t.EpisodeTitle && t.ProgramId);
            if (timersToEnrich.length > 0) {
                 const programIds = [...new Set(timersToEnrich.map(t => t.ProgramId))];
                 try {
                     const results = await Promise.allSettled(
                         programIds.map(id => jellyfin.getProgram(user.Id, token, id))
                     );
                     
                     results.forEach(result => {
                         if (result.status === 'fulfilled') {
                             const item = result.value;
                             const matchingTimers = scheduledTimers.filter(t => t.ProgramId === item.Id);
                             
                             matchingTimers.forEach(t => {
                                 t.EpisodeTitle = item.EpisodeTitle || item.Name;
                                 
                                 if (t.Name === t.SeriesName && item.Name && item.Name !== t.SeriesName) {
                                     t.Name = item.Name;
                                 }
                                 
                                 if (!t.SeriesName && item.SeriesName) {
                                     t.SeriesName = item.SeriesName;
                                 }
                                 if (!t.SeriesId && item.SeriesId) {
                                     t.SeriesId = item.SeriesId;
                                 }
                             });
                         }
                     });
                 } catch (err) {
                     console.warn('Failed to enrich timers:', err);
                 }
            }
        }

    } catch (e) {
        console.error('Error fetching Jellyfin data (continuing anyway):', e);
        // We continue without Jellyfin data so the user can still see show info
    }

    const JELLYFIN_HOST = await jellyfin.getHost();

    // 5. Merge Data
    const seasons = {};
    const matchedTimerIds = new Set();
    
    // Helper for name matching
    const cleanName = (n) => n ? n.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const matchName = (target, ...candidates) => {
        const cleanTarget = cleanName(target);
        if (!cleanTarget) return false;
        return candidates.some(c => cleanName(c) === cleanTarget);
    };

    // Filter timers for this series
    const showTimers = scheduledTimers.filter(t => {
        // Match by SeriesId if available
        if (jellyfinSeriesId && (t.SeriesId === jellyfinSeriesId || t.ParentId === jellyfinSeriesId)) return true;
        // Match by Name (SeriesName or Name if generic)
        if (t.SeriesName && cleanName(t.SeriesName) === cleanName(show.name)) return true;
        // Fallback: If Name is series name
        if (cleanName(t.Name) === cleanName(show.name)) return true;
        return false;
    });

    if (show._embedded && show._embedded.episodes) {
        for (const ep of show._embedded.episodes) {
            const seasonNum = ep.season;
            if (!seasons[seasonNum]) {
                seasons[seasonNum] = [];
            }

            const isOwned = jellyfinEpisodes.some(je => {
                const matchIndex = je.ParentIndexNumber == ep.season &&
                                 je.IndexNumber == ep.number;
                
                if (matchIndex) return true;

                // Fallback: Match by name if indices are missing or mismatch
                // Check Name and EpisodeTitle (if available)
                return matchName(ep.name, je.Name, je.EpisodeTitle);
            });
            
            let isUpcoming = false;
            if (ep.airstamp) {
                isUpcoming = new Date(ep.airstamp) > new Date();
            } else if (ep.airdate) {
                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];
                isUpcoming = ep.airdate >= todayStr;
            }

            // Check for guide match
            const guideMatch = guidePrograms.find(p => {
                // 1. Strongest Match: SeriesId check
                if (jellyfinSeriesId && p.SeriesId && p.SeriesId !== jellyfinSeriesId) return false;

                // 2. Match by S/E
                // Use loose equality for season/episode numbers to handle string/number mismatch
                if (p.ParentIndexNumber == ep.season && p.IndexNumber == ep.number) return true;
                
                // 3. Match by Name
                if (matchName(ep.name, p.Name, p.EpisodeTitle)) return true;
                
                // 4. Match by PremiereDate (Original Air Date)
                if (ep.airdate && p.PremiereDate && p.PremiereDate.startsWith(ep.airdate)) return true;
                
                return false;
            });

            // Check if ALREADY recording (using timers directly, independent of guide match)
            const recordingTimer = showTimers.find(t => {
                 // Use loose equality for season/episode numbers
                 if (t.ParentIndexNumber == ep.season && t.IndexNumber == ep.number) return true;
                 if (matchName(ep.name, t.Name, t.EpisodeTitle)) return true;
                 // Match by PremiereDate (Original Air Date)
                 if (ep.airdate && t.PremiereDate && t.PremiereDate.startsWith(ep.airdate)) return true;
                 return false;
            });

            if (recordingTimer) {
                matchedTimerIds.add(recordingTimer.Id || recordingTimer.ProgramId);
            }

            const isRecording = !!recordingTimer;

            seasons[seasonNum].push({
                ...ep,
                owned: isOwned,
                upcoming: isUpcoming,
                guideProgramId: guideMatch ? guideMatch.Id : null,
                isRecording,
                timerId: recordingTimer ? recordingTimer.Id : null
            });
        }
    }

    const unmappedRecordings = showTimers.filter(t => !matchedTimerIds.has(t.Id || t.ProgramId));

    return {
        show,
        seasons,
        isMonitored,
        jellyfinSeriesId,
        unmappedRecordings,
        JELLYFIN_HOST
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
    },

    recordEpisode: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const programId = data.get('programId');

        if (!programId) {
            return fail(400, { message: 'Program ID required' });
        }

        try {
            await jellyfin.scheduleRecording(locals.user.token, programId, false, locals.user.user.Id);
            return { success: true, message: 'Recording scheduled' };
        } catch (e) {
            console.error('Failed to record episode:', e);
            return fail(500, { message: 'Failed to schedule recording' });
        }
    },

    cancelRecording: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const timerId = data.get('timerId');

        if (!timerId) {
            return fail(400, { message: 'Timer ID required' });
        }

        try {
            await jellyfin.cancelTimer(locals.user.token, timerId);
            return { success: true, message: 'Recording cancelled' };
        } catch (e) {
            console.error('Failed to cancel recording:', e);
            return fail(500, { message: 'Failed to cancel recording' });
        }
    }
};
