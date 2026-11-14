import { API_URL } from '#lib/server/api.js';
import { requireLogin } from '#lib/server/auth.js';

type TseStatus = {
	accessible: boolean;
	initialized: boolean;
	lifeCycleState: number | null;
	timeError: string | null;
};

export async function load({ url, cookies, fetch }) {
	// The login page must stay reachable without a session, otherwise the guard loops.
	if (url.pathname === '/login') return;

	const user = requireLogin();
	const token = cookies.get('access_token');

	// Not being able to ask the API is treated like an inaccessible TSE.
	let tse: TseStatus = {
		accessible: false,
		initialized: false,
		lifeCycleState: null,
		timeError: null
	};
	try {
		const response = await fetch(`${API_URL}/tse/status`, {
			headers: { authorization: `Bearer ${token}` }
		});
		if (response.ok) {
			const status = await response.json();
			tse = {
				accessible: Boolean(status.library_loaded && status.opened),
				initialized: Boolean(status.initialized),
				lifeCycleState: status.life_cycle_state ?? null,
				timeError: status.time_error ?? null
			};
		}
	} catch {
		// keep the inaccessible default
	}

	return { user, tse };
}
