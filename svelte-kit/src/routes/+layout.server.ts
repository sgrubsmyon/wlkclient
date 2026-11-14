import { requireLogin } from '#lib/server/auth.js';

export function load({ url }) {
	// The login page must stay reachable without a session, otherwise the guard loops.
	if (url.pathname === '/login') return;

	return { user: requireLogin() };
}
