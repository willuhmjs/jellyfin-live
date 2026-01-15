import { redirect } from '@sveltejs/kit';
import * as jellyfin from '$lib/server/jellyfin';

export async function load({ cookies }) {
	const sessionId = cookies.get('session_id');
	const userId = cookies.get('user_id');

	if (!sessionId || !userId) {
		throw redirect(303, '/login');
	}

	const JELLYFIN_HOST = await jellyfin.getHost();

	try {
        // Fetch timers and upcoming programs concurrently
		const [timers, programs] = await Promise.all([
			jellyfin.getTimers(sessionId),
			jellyfin.getPrograms(userId, sessionId, 500) // Fetch next 500 programs to find premieres
		]);
        
		// Filter for premieres
		const premieres = programs.filter(p => p.IsPremiere);

		return {
			timers,
			premieres,
			JELLYFIN_HOST
		};
	} catch (e) {
		console.error('Error fetching dashboard data:', e);
		return {
			timers: [],
			premieres: [],
			JELLYFIN_HOST,
			error: 'Failed to load dashboard data'
		};
	}
}
