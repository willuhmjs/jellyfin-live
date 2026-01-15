import { redirect } from '@sveltejs/kit';
import * as jellyfin from '$lib/server/jellyfin';

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

		// Map programs to channels
		const channelsWithPrograms = channels.map((channel) => {
			const channelPrograms = programs
				.filter((p) => p.ChannelId === channel.Id)
				// Ensure they are sorted by time
				.sort((a, b) => new Date(a.StartDate).getTime() - new Date(b.StartDate).getTime());

			return {
				...channel,
				programs: channelPrograms
			};
		});

		return {
			channels: channelsWithPrograms
		};
	} catch (e) {
		console.error('Error fetching guide data:', e);
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
			return { success: true };
		} catch (error) {
			console.error('Failed to schedule series recording:', error);
			return { success: false, error: 'Failed to schedule series recording' };
		}
	}
};
