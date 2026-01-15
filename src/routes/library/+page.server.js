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
        const [recordings, channels] = await Promise.all([
            jellyfin.getRecordings(userId, sessionId),
            jellyfin.getChannels(userId, sessionId)
        ]);

        // Create channel map for fallback
        const channelMap = new Map();
        if (channels) {
            channels.forEach(c => channelMap.set(c.Id, c.Name));
        }

        // Group recordings by Series
        const groups = {};
        for (const rec of recordings) {
            // Fix ChannelName if missing
            if (!rec.ChannelName && rec.ChannelId) {
                rec.ChannelName = channelMap.get(rec.ChannelId);
            }

            // Use SeriesId if available (for shows), otherwise use the Item Id (for movies/singles)
            const isSeries = !!rec.SeriesId;
            const groupId = rec.SeriesId || rec.Id;
            // Prefer SeriesName, fallback to Name
            const groupName = rec.SeriesName || rec.Name;

            const recDate = rec.DateCreated ? new Date(rec.DateCreated).getTime() : (rec.StartDate ? new Date(rec.StartDate).getTime() : 0);

            if (!groups[groupId]) {
                groups[groupId] = {
                    id: groupId,
                    name: groupName,
                    isSeries: isSeries,
                    seriesId: rec.SeriesId,
                    recordings: [],
                    lastRecorded: recDate,
                    // If it's a series, use SeriesId for image (Series Primary). If not, use Item Id.
                    imageId: rec.SeriesId || rec.Id
                };
            }

            groups[groupId].recordings.push(rec);

            // Keep track of the most recent recording in the group
            if (recDate > groups[groupId].lastRecorded) {
                groups[groupId].lastRecorded = recDate;
            }
        }

        // Sort groups by lastRecorded (descending)
        const groupedRecordings = Object.values(groups).sort((a, b) => b.lastRecorded - a.lastRecorded);

        return {
            groupedRecordings,
            JELLYFIN_HOST
        };
    } catch (e) {
        console.error('Error fetching recordings:', e);
        return {
            recordings: [],
            error: 'Failed to load recordings'
        };
    }
}

/** @type {import('./$types').Actions} */
export const actions = {
    delete: async ({ cookies, request }) => {
        const token = cookies.get('session_id');
        if (!token) {
            return { success: false, error: 'Not authenticated' };
        }

        const data = await request.formData();
        const recordingId = data.get('recordingId');

        if (!recordingId) {
            return { success: false, error: 'Recording ID is required' };
        }

        try {
            await jellyfin.deleteRecording(token, recordingId.toString());
            return { success: true };
        } catch (error) {
            console.error('Failed to delete recording:', error);
            return { success: false, error: 'Failed to delete recording' };
        }
    }
};
