import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies }) => {
	const sessionId = cookies.get('session_id');

	if (sessionId) {
		throw redirect(307, '/dashboard');
	} else {
		throw redirect(307, '/login');
	}
};
