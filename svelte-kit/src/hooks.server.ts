import type { Handle } from '@sveltejs/kit/hooks';
import { API_URL } from '#lib/server/api.js';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('access_token');
	if (token) {
		// The API is the authority: it also rejects expired tokens and logged-out sessions.
		const response = await fetch(`${API_URL}/auth/me`, {
			headers: { authorization: `Bearer ${token}` }
		});
		if (response.ok) {
			event.locals.user = await response.json();
		} else {
			event.cookies.delete('access_token', { path: '/' });
		}
	}

	return resolve(event);
};
