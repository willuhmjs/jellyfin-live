import { redirect } from '@sveltejs/kit';
import * as jellyfin from '$lib/server/jellyfin';
import * as tvmaze from '$lib/server/tvmaze';
import * as db from '$lib/server/db';

export async function load({ cookies }) {
    const sessionId = cookies.get('session_id');
    const user_id = cookies.get('user_id');

    if (!sessionId || !user_id) {
        throw redirect(303, '/login');
    }

    const JELLYFIN_HOST = await jellyfin.getHost();

    try {
        // Fetch timers and recordings
        const [timers, recordings] = await Promise.all([
            jellyfin.getTimers(sessionId),
            jellyfin.getRecordings(user_id, sessionId)
        ]);

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
            if (rec.SeriesName) {
                if (!monitoredSeriesMap.has(rec.SeriesName)) {
                    monitoredSeriesMap.set(rec.SeriesName, {
                        name: rec.SeriesName,
                        id: rec.SeriesId,
                        imageTag: rec.SeriesPrimaryImageTag || rec.ImageTags?.Primary,
                        status: 'Recorded',
                        isMovie: false
                    });
                } else {
                    // Update existing entry (from Timers) if it's missing image/ID
                    const existing = monitoredSeriesMap.get(rec.SeriesName);
                    const newImageTag = rec.SeriesPrimaryImageTag || rec.ImageTags?.Primary;
                    
                    if (!existing.imageTag && newImageTag) {
                        existing.imageTag = newImageTag;
                    }
                    // Prefer actual SeriesId over TimerId/ProgramId if available
                    if (rec.SeriesId && (!existing.id || existing.id !== rec.SeriesId)) {
                        existing.id = rec.SeriesId;
                    }
                }
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

        // Enrich with TVMaze images
        const seriesWithImages = [];
        for (const series of monitoredSeries) {
            if (series.isMovie) {
                seriesWithImages.push(series);
                continue;
            }

            const cachedImage = await db.getSeriesImage(series.name);
            if (cachedImage) {
                seriesWithImages.push({
                    ...series,
                    tvmazeImage: cachedImage
                });
                continue;
            }

            try {
                // Add a small delay to be polite
                await new Promise(resolve => setTimeout(resolve, 50)); // Faster delay for full list
                const results = await tvmaze.searchShows(series.name);
                const match = results.find(r => r.show.name.toLowerCase() === series.name.toLowerCase()) || results[0];

                if (match && match.show.image) {
                    seriesWithImages.push({
                        ...series,
                        tvmazeImage: match.show.image.original || match.show.image.medium
                    });
                } else {
                    seriesWithImages.push(series);
                }
            } catch (e) {
                console.warn(`Failed to fetch TVMaze image for ${series.name}:`, e.message);
                seriesWithImages.push(series);
            }
        }

        return {
            monitoredSeries: seriesWithImages,
            JELLYFIN_HOST,
            token: sessionId
        };
    } catch (e) {
        console.error('Error fetching series data:', e);
        return {
            monitoredSeries: [],
            JELLYFIN_HOST,
            error: 'Failed to load series data'
        };
    }
}
