import { redirect } from '@sveltejs/kit';
import * as jellyfin from '$lib/server/jellyfin';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function load({ cookies }) {
	const sessionId = cookies.get('session_id');
	const userId = cookies.get('user_id');

	if (!sessionId || !userId) {
		throw redirect(303, '/login');
	}

	try {
		const channels = await jellyfin.getChannels(userId, sessionId);
		// Fetch programs. 5000 limit to ensure we cover enough time for all channels.
		// API returns programs sorted by StartDate.
		const programs = await jellyfin.getPrograms(userId, sessionId, 5000);

		// Fetch active timers (recordings) and series timers
		const timers = await jellyfin.getTimers(sessionId);
		const seriesTimers = await jellyfin.getSeriesTimers(sessionId);

		console.log('--- DEBUG MATCHING ---');
		if (programs.length > 0) {
			const programWithSeries = programs.find(p => p.SeriesId);
			console.log('Sample Program with SeriesId:', JSON.stringify(programWithSeries, null, 2));
		} else {
			console.log('No programs found');
		}

		if (seriesTimers.length > 0) {
			console.log('Sample Series Timer:', JSON.stringify(seriesTimers[0], null, 2));
		} else {
			console.log('No series timers found');
		}
		console.log('----------------------');

		// Optimize: Create lookup maps
		const programsByChannel = new Map();
		programs.forEach((p) => {
			if (!programsByChannel.has(p.ChannelId)) {
				programsByChannel.set(p.ChannelId, []);
			}
			programsByChannel.get(p.ChannelId).push(p);
		});

		const timersByProgramId = new Map();
		timers.forEach((t) => {
			if (t.ProgramId) timersByProgramId.set(t.ProgramId, t);
		});

		const seriesTimersBySeriesId = new Map();
		const seriesTimersByName = new Map(); // For fallback

		seriesTimers.forEach((st) => {
			if (st.SeriesId) seriesTimersBySeriesId.set(st.SeriesId, st);
			// Helper for name matching
			const cleanName = (n) => (n ? n.toLowerCase().replace(/[^a-z0-9]/g, '') : '');
			const nameKey = cleanName(st.SeriesName || st.Name);
			if (nameKey) seriesTimersByName.set(nameKey, st);
		});

		// Map programs to channels
		const channelsWithPrograms = channels.map((channel) => {
			const rawPrograms = programsByChannel.get(channel.Id) || [];

			const channelPrograms = rawPrograms
				.sort((a, b) => new Date(a.StartDate).getTime() - new Date(b.StartDate).getTime())
				.map((p) => {
					// Check if this specific program is being recorded
					const timer = timersByProgramId.get(p.Id);

					// Check if this series is being recorded
					let seriesTimer = null;

					// 1. Strict Match by SeriesId
					if (p.SeriesId) {
						seriesTimer = seriesTimersBySeriesId.get(p.SeriesId);
					}

					// 2. Fallback Match by Name
					if (!seriesTimer && p.SeriesName) {
						const cleanName = (n) => (n ? n.toLowerCase().replace(/[^a-z0-9]/g, '') : '');
						const targetName = cleanName(p.SeriesName);
						seriesTimer = seriesTimersByName.get(targetName);
					}

					return {
						...p,
						timerId: timer ? timer.Id : null,
						isRecording: !!timer,
						seriesTimerId: seriesTimer ? seriesTimer.Id : null,
						isSeriesRecording: !!seriesTimer
					};
				});

			return {
				...channel,
				programs: channelPrograms
			};
		});

		return {
			channels: channelsWithPrograms,
		          JELLYFIN_HOST: await jellyfin.getHost(),
		          token: sessionId
		};
	} catch (e) {
		console.error('Error fetching guide data:', e);
		if (e.message && e.message.includes('401')) {
			throw redirect(303, '/login');
		}
		return {
			channels: [],
			error: 'Failed to load TV guide'
		};
	}
}

/** @type {import('./$types').Actions} */
export const actions = {
	record: async ({ cookies, request }) => {
		const token = cookies.get('session_id');
		const userId = cookies.get('user_id');
		if (!token || !userId) {
			return { success: false, error: 'Not authenticated' };
		}

		const data = await request.formData();
		const programId = data.get('programId');

		if (!programId) {
			return { success: false, error: 'Program ID is required' };
		}

		try {
			await jellyfin.scheduleRecording(token, programId.toString(), false, userId);
			await delay(500); // Allow Jellyfin to process
			return { success: true };
		} catch (error) {
			console.error('Failed to schedule recording:', error);
			return { success: false, error: 'Failed to schedule recording' };
		}
	},
	recordSeries: async ({ cookies, request }) => {
		const token = cookies.get('session_id');
		const userId = cookies.get('user_id');
		if (!token || !userId) {
			return { success: false, error: 'Not authenticated' };
		}

		const data = await request.formData();
		const programId = data.get('programId');

		if (!programId) {
			return { success: false, error: 'Program ID is required' };
		}

		try {
			await jellyfin.scheduleRecording(token, programId.toString(), true, userId);
			await delay(500); // Allow Jellyfin to process
			return { success: true };
		} catch (error) {
			console.error('Failed to schedule series recording:', error);
			return { success: false, error: 'Failed to schedule series recording' };
		}
	},
	cancelRecording: async ({ cookies, request }) => {
		const token = cookies.get('session_id');
		if (!token) {
			return { success: false, error: 'Not authenticated' };
		}

		const data = await request.formData();
		const timerId = data.get('timerId');

		if (!timerId) {
			return { success: false, error: 'Timer ID is required' };
		}

		try {
			await jellyfin.cancelTimer(token, timerId.toString());
			await delay(500); // Allow Jellyfin to process
			return { success: true };
		} catch (error) {
			console.error('Failed to cancel recording:', error);
			return { success: false, error: 'Failed to cancel recording' };
		}
	},
	cancelSeriesRecording: async ({ cookies, request }) => {
		const token = cookies.get('session_id');
		if (!token) {
			return { success: false, error: 'Not authenticated' };
		}

		const data = await request.formData();
		const seriesTimerId = data.get('seriesTimerId');

		if (!seriesTimerId) {
			return { success: false, error: 'Series Timer ID is required' };
		}

		try {
			await jellyfin.cancelSeriesTimer(token, seriesTimerId.toString());
			await delay(500); // Allow Jellyfin to process
			return { success: true };
		} catch (error) {
			console.error('Failed to cancel series recording:', error);
			return { success: false, error: 'Failed to cancel series recording' };
		}
	}
};
