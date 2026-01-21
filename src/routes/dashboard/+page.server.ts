import { redirect } from '@sveltejs/kit';
import * as jellyfin from '$lib/server/jellyfin';
import * as tvmaze from '$lib/server/tvmaze';
import * as db from '$lib/server/db';
import { cleanName } from '$lib/server/normalization';
import type { PageServerLoad, Actions } from './$types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObject = any;

export const load: PageServerLoad = async ({ cookies, locals }) => {
    const sessionId = locals.user?.token;
    const userId = locals.user?.user?.Id;
    const showWelcomeBanner = cookies.get('dashboard_welcome_dismissed') !== 'true';

    if (!sessionId || !userId) {
        throw redirect(303, '/login');
    }

    const JELLYFIN_HOST = await jellyfin.getHost();

    try {
        // Fetch timers, recordings and upcoming programs concurrently
        const [timers, recordings, programs, onAirPrograms] = await Promise.all([
            jellyfin.getTimers(sessionId),
            jellyfin.getRecordings(userId, sessionId),
            jellyfin.getPrograms(userId, sessionId, 500), // Fetch next 500 programs to find premieres
            jellyfin.getOnAir(userId, sessionId)
        ]);

        // Filter for premieres
        const premieres = programs.filter((p: AnyObject) => p.IsPremiere);

        // Enrich timers with missing EpisodeTitle or SeriesName (if it looks like a series)
        const timersToEnrich = (timers || []).filter((t: AnyObject) => (!t.EpisodeTitle || !t.SeriesName || !t.SeriesId) && t.ProgramId);
        if (timersToEnrich.length > 0) {
            const programIds = [...new Set(timersToEnrich.map((t: AnyObject) => t.ProgramId))];
            try {
                // Fetch program details concurrently
                const results = await Promise.allSettled(
                    programIds.map((id: unknown) => jellyfin.getProgram(userId, sessionId, id as string))
                );

                results.forEach((result: PromiseSettledResult<AnyObject>) => {
                    if (result.status === 'fulfilled' && result.value) {
                        const item = result.value;
                        const matchingTimers = timers.filter((t: AnyObject) => t.ProgramId === item.Id);

                        matchingTimers.forEach((timer: AnyObject) => {
                            timer.EpisodeTitle = item.EpisodeTitle || item.Name;

                            if (timer.Name === timer.SeriesName && item.Name && item.Name !== timer.SeriesName) {
                                timer.Name = item.Name;
                            }

                            if (!timer.SeriesName && item.SeriesName) {
                                timer.SeriesName = item.SeriesName;
                            }
                            if (!timer.SeriesId && item.SeriesId) {
                                timer.SeriesId = item.SeriesId;
                            }
                        });
                    }
                });
            } catch (e) {
                console.warn('Failed to enrich timers with episode titles:', e);
            }
        }

        // Process timers for Scheduled Recordings list
        const scheduledRecordings = (timers || []).sort((a: AnyObject, b: AnyObject) => {
            return new Date(a.StartDate).getTime() - new Date(b.StartDate).getTime();
        });

        // Group timers by Series/Movie (Scheduled) for My Library identification
        const timerGroups: Record<string, AnyObject> = {};
        for (const timer of (timers || [])) {
            const groupId = timer.SeriesId || timer.Name;
            const isMovie = !timer.SeriesId;

            if (groupId && !timerGroups[groupId]) {
                timerGroups[groupId] = {
                    seriesId: timer.SeriesId || timer.ProgramId || timer.Id,
                    seriesName: timer.SeriesName || timer.Name,
                    seriesImageTag: timer.SeriesPrimaryImageTag || timer.ImageTags?.Primary,
                    isMovie,
                    timers: []
                };
            }
            if (groupId) {
                timerGroups[groupId].timers.push(timer);
            }
        }

        // Identify all unique content from Timers (Scheduled) and Recordings (Library)
        const monitoredSeriesMap = new Map();

        // Add from Timers
        Object.values(timerGroups).forEach(group => {
            if (!group.seriesName) return;
            monitoredSeriesMap.set(group.seriesName, {
                name: group.seriesName,
                id: group.seriesId, // Jellyfin ID
                imageTag: group.seriesImageTag,
                status: 'Scheduled',
                isMovie: group.isMovie
            });
        });

        // Add from Recordings
        for (const rec of (recordings || [])) {
            // Series Logic
            if (rec.SeriesName && !monitoredSeriesMap.has(rec.SeriesName)) {
                monitoredSeriesMap.set(rec.SeriesName, {
                    name: rec.SeriesName,
                    id: rec.SeriesId,
                    imageTag: rec.ImageTags?.Primary,
                    status: 'Recorded',
                    isMovie: false
                });
            }
            // Movie Logic (No SeriesName)
            else if (!rec.SeriesName && !monitoredSeriesMap.has(rec.Name)) {
                monitoredSeriesMap.set(rec.Name, {
                    name: rec.Name,
                    id: rec.Id,
                    imageTag: rec.ImageTags?.Primary,
                    status: 'Recorded',
                    isMovie: true
                });
            }
        }

        const monitoredSeries = Array.from(monitoredSeriesMap.values()).sort((a: AnyObject, b: AnyObject) => a.name.localeCompare(b.name));

        // --- UPDATED LOGIC START ---
        // Enrich with TVMaze images (Series Only)
        console.log('[Dashboard] Starting parallel TVMaze image fetch...');
        
        const seriesPromises = monitoredSeries.map(async (series: AnyObject) => {
            const cachedImage = await db.getSeriesImage(series.name);
            // console.log(`[Dashboard] Cached image for ${series.name}: ${cachedImage}`);
            if (cachedImage) {
                return {
                    ...series,
                    tvmazeImage: cachedImage
                };
            }

            if (series.isMovie) {
                return series;
            }

            try {
                // Search TVMaze for the show (cached)
                const results = await tvmaze.searchShows(series.name);
                // Find exact match or fallback to first result
                const match = results.find((r: AnyObject) => cleanName(r.show.name) === cleanName(series.name)) || results[0];

                if (match && match.show.image) {
                    return {
                        ...series,
                        tvmazeImage: match.show.image.original || match.show.image.medium
                    };
                } else {
                    return series;
                }
            } catch (e: unknown) {
                // Silently fail and fallback to Jellyfin image
                const err = e as AnyObject;
                console.warn(`Failed to fetch TVMaze image for ${series.name}:`, err.message);
                return series;
            }
        });

        const seriesWithImages = await Promise.all(seriesPromises);
        // --- UPDATED LOGIC END ---

        // Enrich Scheduled Recordings with TVMaze Images from seriesWithImages
        const enrichedScheduledRecordings = scheduledRecordings.map((rec: AnyObject) => {
             const seriesName = rec.SeriesName || rec.Name;
             if (!seriesName) return rec;

             const matchingSeries = seriesWithImages.find((s: AnyObject) => cleanName(s.name) === cleanName(seriesName));
             
             if (matchingSeries && matchingSeries.tvmazeImage) {
                 return {
                     ...rec,
                     tvmazeImage: matchingSeries.tvmazeImage
                 };
             }
             return rec;
        });

        return {
            scheduledRecordings: enrichedScheduledRecordings,
            monitoredSeries: seriesWithImages,
            premieres,
            onAir: onAirPrograms,
            JELLYFIN_HOST,
            showWelcomeBanner,
            token: sessionId
        };
    } catch (e: unknown) {
        const err = e as AnyObject;
     if (err.status === 401 || (err.message && err.message.includes('401'))) {
      throw redirect(303, '/login');
     }
    	console.error('Error fetching dashboard data:', e);
    	return {
            scheduledRecordings: [],
            monitoredSeries: [],
            premieres: [],
            JELLYFIN_HOST,
            showWelcomeBanner,
            error: 'Failed to load dashboard data'
        };
    }
}

export const actions: Actions = {
    search: async ({ request }) => {
        const data = await request.formData();
        const query = data.get('query');

        if (!query) {
            return { results: [] };
        }

        try {
            const results = await tvmaze.searchShows(query as string);
            return { results, query };
        } catch (e) {
            console.error('Search failed:', e);
            return { results: [], error: 'Search failed' };
        }
    },

    dismissWelcome: async ({ cookies }) => {
        cookies.set('dashboard_welcome_dismissed', 'true', {
            path: '/',
            maxAge: 60 * 60 * 24 * 365, // 1 year
            httpOnly: false, // Allow client-side access if needed, though we use server actions
            sameSite: 'strict'
        });
        return { success: true };
    }
};
