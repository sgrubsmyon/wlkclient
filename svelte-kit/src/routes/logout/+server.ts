import { redirect } from '@sveltejs/kit';
import { API_URL } from '#lib/server/api.js';

export const POST = async ({ cookies, fetch }) => {
	const token = cookies.get('access_token');
	if (token) {
		await fetch(`${API_URL}/auth/logout`, {
			method: 'POST',
			headers: { authorization: `Bearer ${token}` }
		});
	}

	cookies.delete('access_token', { path: '/' });
	redirect(303, '/login');
};
