import * as jellyfin from '$lib/server/jellyfin';
import { json } from '@sveltejs/kit';

export async function GET({ params, cookies }) {
    const { id } = params;
    const sessionId = cookies.get('session_id');
    const userId = cookies.get('user_id');

    if (!sessionId || !userId) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const program = await jellyfin.getProgram(userId, sessionId, id);
        return json(program);
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
