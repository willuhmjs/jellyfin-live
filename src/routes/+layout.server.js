
export function load({ cookies }) {
	const sessionId = cookies.get('session_id');

	return {
		user: {
			isAuthenticated: !!sessionId
		}
	};
}
