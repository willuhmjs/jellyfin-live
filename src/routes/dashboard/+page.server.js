import { redirect } from '@sveltejs/kit';
import * as jellyfin from '$lib/server/jellyfin';
import * as tvmaze from '$lib/server/tvmaze';

export async function load({ cookies }) {
	const sessionId = cookies.get('session_id');
	const userId = cookies.get('user_id');

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

		// Group timers by Series (Scheduled)
		const timerGroups = {};
		for (const timer of (timers || [])) {
			const groupId = timer.SeriesId || timer.Name;
			if (!timerGroups[groupId]) {
				timerGroups[groupId] = {
					seriesId: timer.SeriesId || timer.ProgramId || timer.Id,
					seriesName: timer.SeriesName || timer.Name,
					seriesImageTag: timer.SeriesPrimaryImageTag || timer.ImageTags?.Primary,
					timers: []
				};
			}
			timerGroups[groupId].timers.push(timer);
		}

        // Identify all unique series from Timers (Scheduled) and Recordings (Library)
        const monitoredSeriesMap = new Map();

        // Add from Timers
        Object.values(timerGroups).forEach(group => {
            monitoredSeriesMap.set(group.seriesName, {
                name: group.seriesName,
                id: group.seriesId, // Jellyfin ID
                imageTag: group.seriesImageTag,
                status: 'Scheduled'
            });
        });

        // Add from Recordings
        for (const rec of (recordings || [])) {
        	if (rec.SeriesName && !monitoredSeriesMap.has(rec.SeriesName)) {
        		monitoredSeriesMap.set(rec.SeriesName, {
                    name: rec.SeriesName,
                    id: rec.SeriesId,
                    imageTag: rec.ImageTags?.Primary,
                    status: 'Recorded'
                });
            }
        }

        const monitoredSeries = Array.from(monitoredSeriesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

		return {
			groupedTimers: Object.values(timerGroups), // Keep for legacy/debug view if needed
            monitoredSeries,
			premieres,
			JELLYFIN_HOST
		};
	} catch (e) {
		console.error('Error fetching dashboard data:', e);
		return {
			groupedTimers: [],
            monitoredSeries: [],
			premieres: [],
			JELLYFIN_HOST,
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
    }
};
