import { getSetting, setSetting } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export async function load() {
    return {
        jellyfin_url: await getSetting('jellyfin_url'),
        ignore_ssl: (await getSetting('ignore_ssl')) === 'true'
    };
}

export const actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const jellyfin_url = data.get('jellyfin_url');
        const ignore_ssl = data.get('ignore_ssl');

        if (!jellyfin_url) {
            return fail(400, { missing: true });
        }

        await setSetting('jellyfin_url', jellyfin_url);
        await setSetting('ignore_ssl', ignore_ssl ? 'true' : 'false');

        return { success: true };
    }
};
