import { setSetting } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';

export const actions = {
    default: async ({ request }) => {
        const formData = await request.formData();
        const url = formData.get('url');
        const ignoreSsl = formData.get('ignore_ssl');

        if (!url) {
            return { success: false, message: 'URL is required' };
        }

        await setSetting('jellyfin_url', url.toString());
        await setSetting('ignore_ssl', ignoreSsl ? 'true' : 'false');

        throw redirect(303, '/login');
    }
};
