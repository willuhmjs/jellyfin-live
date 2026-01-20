import * as jellyfin from '$lib/server/jellyfin';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url, cookies }) => {
    const { seriesId } = params;
    const seasonId = url.searchParams.get('seasonId') || undefined;
    const sessionId = cookies.get('session_id');
    const userId = cookies.get('user_id');

    if (!sessionId || !userId) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const episodes = await jellyfin.getEpisodes(userId, sessionId, seriesId, seasonId);
        return json(episodes);
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (e.status === 401 || (e.message && e.message.includes('401'))) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        return json({ error: e.message || 'Unknown error' }, { status: 500 });
    }
};
