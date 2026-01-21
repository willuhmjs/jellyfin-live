import { redirect } from '@sveltejs/kit';
import * as jellyfin from '$lib/server/jellyfin';
import { getCached, clearCache } from '$lib/server/cache';
import type { PageServerLoad, Actions } from './$types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObject = any;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const load: PageServerLoad = async ({ locals }) => {
	const sessionId = locals.user?.token;
	const userId = locals.user?.user?.Id;

	if (!sessionId || !userId) {
		throw redirect(303, '/login');
	}

	try {
		// Round to nearest 15 minutes to improve cache hit rate
		const now = Date.now();
		const roundedNow = Math.floor(now / (15 * 60 * 1000)) * (15 * 60 * 1000);
		const minEndDate = new Date(roundedNow - 1 * 60 * 60 * 1000).toISOString();
		// Fetch 12 hours of data
		const maxStartDate = new Date(roundedNow + 12 * 60 * 60 * 1000).toISOString();

		// Fetch data in parallel for better performance
		const [channels, fetchedPrograms, timers, seriesTimers] = await Promise.all([
			// Cache channels for 5 minutes
			getCached(
				`channels:${userId}`,
				() => jellyfin.getChannels(userId, sessionId),
				300
			),
			// Fetch programs. 25000 limit to ensure we cover enough time for all channels.
			getCached(
				`programs:${userId}:${minEndDate}:${maxStartDate}`,
				() => jellyfin.getPrograms(userId, sessionId, 25000, null, minEndDate, maxStartDate),
				300
			),
			// Active timers (recordings) - short cache
			getCached(
				`timers:${sessionId}`,
				() => jellyfin.getTimers(sessionId),
				10
			),
			// Series timers - short cache
			getCached(
				`series_timers:${sessionId}`,
				() => jellyfin.getSeriesTimers(sessionId),
				10
			)
		]);

		let programs = fetchedPrograms as AnyObject[];

		// Inject future recordings that might be outside the fetched guide window
		// This allows the user to see future scheduled recordings in the grid
		const existingProgramIds = new Set(programs.map((p) => p.Id));
		const futurePrograms = (timers as AnyObject[])
			.filter((t) => t.ProgramId && !existingProgramIds.has(t.ProgramId) && t.ChannelId)
			.map((t) => ({
				Id: t.ProgramId,
				ChannelId: t.ChannelId,
				Name: t.Name,
				SeriesName: t.SeriesName,
				EpisodeTitle: t.EpisodeTitle,
				StartDate: t.StartDate,
				EndDate: t.EndDate,
				Overview: t.Overview,
				SeriesId: t.SeriesId,
				SeasonId: t.SeasonId,
				ParentIndexNumber: t.ParentIndexNumber,
				IndexNumber: t.IndexNumber
			}));

		if (futurePrograms.length > 0) {
			console.log(`Injecting ${futurePrograms.length} future programs from timers`);
			programs = [...programs, ...futurePrograms];
		}

		console.log('--- DEBUG MATCHING ---');
		if (programs.length > 0) {
			const programWithSeries = programs.find(p => p.SeriesId);
			console.log('Sample Program with SeriesId:', JSON.stringify(programWithSeries, null, 2));
		} else {
			console.log('No programs found');
		}

		if ((seriesTimers as AnyObject[]).length > 0) {
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
		(timers as AnyObject[]).forEach((t) => {
			if (t.ProgramId) timersByProgramId.set(t.ProgramId, t);
		});

		const seriesTimersBySeriesId = new Map();
		const seriesTimersByName = new Map(); // For fallback

		(seriesTimers as AnyObject[]).forEach((st) => {
			if (st.SeriesId) seriesTimersBySeriesId.set(st.SeriesId, st);
			// Helper for name matching
			const cleanName = (n: string) => (n ? n.toLowerCase().replace(/[^a-z0-9]/g, '') : '');
			const nameKey = cleanName(st.SeriesName || st.Name);
			if (nameKey) seriesTimersByName.set(nameKey, st);
		});

		let maxProgramDate = 0;

		// Map programs to channels
		const channelsWithPrograms = (channels as AnyObject[]).map((channel) => {
			const rawPrograms = programsByChannel.get(channel.Id) || [];

			const channelPrograms = rawPrograms
				// Optimize sort: String comparison for ISO dates is faster and correct
				.sort((a: AnyObject, b: AnyObject) => (a.StartDate < b.StartDate ? -1 : a.StartDate > b.StartDate ? 1 : 0))
				.map((p: AnyObject) => {
					const startTimeMs = new Date(p.StartDate).getTime();
					const endTimeMs = new Date(p.EndDate).getTime();

					// Track max date for frontend optimization
					if (endTimeMs > maxProgramDate) maxProgramDate = endTimeMs;

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
						const cleanName = (n: string) => (n ? n.toLowerCase().replace(/[^a-z0-9]/g, '') : '');
						const targetName = cleanName(p.SeriesName);
						seriesTimer = seriesTimersByName.get(targetName);
					}

					return {
						...p,
						startTimeMs,
						endTimeMs,
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
			maxDate: maxProgramDate > 0 ? new Date(maxProgramDate).toISOString() : null,
			JELLYFIN_HOST: await jellyfin.getHost(),
			token: sessionId
		};
	} catch (e: unknown) {
        const err = e as AnyObject;
		console.error('Error fetching guide data:', err);
		if (err.status === 401 || (err.message && err.message.includes('401'))) {
			throw redirect(303, '/login');
		}
		return {
			channels: [],
			error: 'Failed to load TV guide'
		};
	}
}

export const actions: Actions = {
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
			clearCache(`timers:${token}`); // Invalidate timers cache
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
			clearCache(`timers:${token}`); // Invalidate timers cache
			clearCache(`series_timers:${token}`);
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
			clearCache(`timers:${token}`); // Invalidate timers cache
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
			clearCache(`series_timers:${token}`); // Invalidate series timers cache
			// Also invalidate timers as cancelling a series timer might remove scheduled items
			clearCache(`timers:${token}`);
			await delay(500); // Allow Jellyfin to process
			return { success: true };
		} catch (error) {
			console.error('Failed to cancel series recording:', error);
			return { success: false, error: 'Failed to cancel series recording' };
		}
	}
};
