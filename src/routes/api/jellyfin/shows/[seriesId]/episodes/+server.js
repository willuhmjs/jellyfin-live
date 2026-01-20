import * as jellyfin from '$lib/server/jellyfin';
import { json } from '@sveltejs/kit';

export async function GET({ params, url, cookies }) {
    const { seriesId } = params;
    const seasonId = url.searchParams.get('seasonId');
    const sessionId = cookies.get('session_id');
    const userId = cookies.get('user_id');

    if (!sessionId || !userId) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const episodes = await jellyfin.getEpisodes(userId, sessionId, seriesId, seasonId);
        return json(episodes);
    } catch (e) {
        if (e.status === 401 || (e.message && e.message.includes('401'))) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        return json({ error: e.message }, { status: 500 });
    }
}
