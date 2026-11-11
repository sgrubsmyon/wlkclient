import { requireLogin } from '#lib/server/auth.js';

export function load() {
	const user = requireLogin();

	// `user` is guaranteed to be a user object here, because otherwise
	// `requireLogin` would throw a redirect and we wouldn't get here
	return {
		message: `hello ${user.name}!`
	};
}