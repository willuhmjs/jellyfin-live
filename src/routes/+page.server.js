import { redirect } from '@sveltejs/kit';

export function load({ cookies }) {
	const sessionId = cookies.get('session_id');

	if (sessionId) {
		throw redirect(307, '/guide');
	} else {
		throw redirect(307, '/login');
	}
}
