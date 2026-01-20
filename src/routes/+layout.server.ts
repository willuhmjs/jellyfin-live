import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies }) => {
	const sessionId = cookies.get('session_id');

	return {
		user: {
			isAuthenticated: !!sessionId
		}
	};
};
