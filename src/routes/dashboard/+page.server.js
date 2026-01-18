import { redirect } from '@sveltejs/kit';
import * as jellyfin from '$lib/server/jellyfin';
import * as tvmaze from '$lib/server/tvmaze';
import * as db from '$lib/server/db';

export async function load({ cookies }) {
    const sessionId = cookies.get('session_id');
    const userId = cookies.get('user_id');
    const showWelcomeBanner = cookies.get('dashboard_welcome_dismissed') !== 'true';

    if (!sessionId || !userId) {
        throw redirect(303, '/login');
    }

    const JELLYFIN_HOST = await jellyfin.getHost();

    try {
        // Fetch timers, recordings and upcoming programs concurrently
        const [timers, recordings, programs] = await Promise.all([
            jellyfin.getTimers(sessionId),
            jellyfin.getRecordings(userId, sessionId),
            jellyfin.getPrograms(userId, sessionId, 500) // Fetch next 500 programs to find premieres
        ]);

        // Filter for premieres
        const premieres = programs.filter(p => p.IsPremiere);

        // Enrich timers with missing EpisodeTitle or SeriesName (if it looks like a series)
        const timersToEnrich = (timers || []).filter(t => (!t.EpisodeTitle || !t.SeriesName || !t.SeriesId) && t.ProgramId);
        if (timersToEnrich.length > 0) {
            const programIds = [...new Set(timersToEnrich.map(t => t.ProgramId))];
            try {
                // Fetch program details concurrently
                const results = await Promise.allSettled(
                    programIds.map(id => jellyfin.getProgram(userId, sessionId, id))
                );

                results.forEach(result => {
                    if (result.status === 'fulfilled') {
                        const item = result.value;
                        const matchingTimers = timers.filter(t => t.ProgramId === item.Id);

                        matchingTimers.forEach(timer => {
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
        const scheduledRecordings = (timers || []).sort((a, b) => {
            return new Date(a.StartDate) - new Date(b.StartDate);
        });

        // Group timers by Series/Movie (Scheduled) for My Library identification
        const timerGroups = {};
        for (const timer of (timers || [])) {
            const groupId = timer.SeriesId || timer.Name;
            const isMovie = !timer.SeriesId;

            if (!timerGroups[groupId]) {
                timerGroups[groupId] = {
                    seriesId: timer.SeriesId || timer.ProgramId || timer.Id,
                    seriesName: timer.SeriesName || timer.Name,
                    seriesImageTag: timer.SeriesPrimaryImageTag || timer.ImageTags?.Primary,
                    isMovie,
                    timers: []
                };
            }
            timerGroups[groupId].timers.push(timer);
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

        const monitoredSeries = Array.from(monitoredSeriesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

        // --- UPDATED LOGIC START ---
        // Enrich with TVMaze images (Series Only)
        console.log('[Dashboard] Starting parallel TVMaze image fetch...');
        
        const seriesPromises = monitoredSeries.map(async (series) => {
            if (series.isMovie) {
                return series;
            }

            const cachedImage = db.getSeriesImage(series.name);
            // console.log(`[Dashboard] Cached image for ${series.name}: ${cachedImage}`);
            if (cachedImage) {
                return {
                    ...series,
                    tvmazeImage: cachedImage
                };
            }

            try {
                // Search TVMaze for the show (cached)
                const results = await tvmaze.searchShows(series.name);
                // Find exact match or fallback to first result
                const match = results.find(r => r.show.name.toLowerCase() === series.name.toLowerCase()) || results[0];

                if (match && match.show.image) {
                    return {
                        ...series,
                        tvmazeImage: match.show.image.original || match.show.image.medium
                    };
                } else {
                    return series;
                }
            } catch (e) {
                // Silently fail and fallback to Jellyfin image
                console.warn(`Failed to fetch TVMaze image for ${series.name}:`, e.message);
                return series;
            }
        });

        const seriesWithImages = await Promise.all(seriesPromises);
        // --- UPDATED LOGIC END ---

        return {
            scheduledRecordings,
            monitoredSeries: seriesWithImages,
            premieres,
            JELLYFIN_HOST,
            showWelcomeBanner
        };
    } catch (e) {
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

export const actions = {
    search: async ({ request }) => {
        const data = await request.formData();
        const query = data.get('query');

        if (!query) {
            return { results: [] };
        }

        try {
            const results = await tvmaze.searchShows(query);
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
