import { fail, redirect } from '@sveltejs/kit';
import { authenticate } from '$lib/server/jellyfin';

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username');
		const password = data.get('password');

		if (!username) {
			return fail(400, { username, error: 'Username is required' });
		}

		try {
			const { user, accessToken } = await authenticate(username, password);

			cookies.set('session_id', accessToken, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				secure: import.meta.env.PROD,
				maxAge: 60 * 60 * 24 * 7 // 1 week
			});

			cookies.set('user_id', user.Id, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				secure: import.meta.env.PROD,
				maxAge: 60 * 60 * 24 * 7 // 1 week
			});
		} catch (error) {
			console.error('Login error:', error);
			return fail(401, { username, error: 'Invalid username or password' });
		}

		throw redirect(303, '/guide');
	}
};
