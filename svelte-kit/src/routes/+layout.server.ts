import { API_URL } from '#lib/server/api.js';
import { requireLogin } from '#lib/server/auth.js';

type TseStatus = {
	accessible: boolean;
	mode: string;
	deviceError: string | null;
	initialized: boolean;
	lifeCycleState: number | null;
	timeError: string | null;
	blockedPins: string[];
	clientRegistered: boolean | null;
};

export async function load({ url, cookies, fetch }) {
	// The login page must stay reachable without a session, otherwise the guard loops.
	if (url.pathname === '/login') return;

	const user = requireLogin();
	const token = cookies.get('access_token');

	// Not being able to ask the API is treated like an inaccessible TSE.
	let tse: TseStatus = {
		accessible: false,
		mode: 'unknown',
		deviceError: null,
		initialized: false,
		lifeCycleState: null,
		timeError: null,
		blockedPins: [],
		clientRegistered: null
	};
	try {
		const response = await fetch(`${API_URL}/tse/status`, {
			headers: { authorization: `Bearer ${token}` }
		});
		if (response.ok) {
			const status = await response.json();
			const pins: Record<string, { blocked: boolean | null }> = status.pins ?? {};
			tse = {
				accessible: Boolean(status.library_loaded && status.opened),
				mode: status.mode ?? 'unknown',
				deviceError: status.device_error ?? null,
				initialized: Boolean(status.initialized),
				lifeCycleState: status.life_cycle_state ?? null,
				timeError: status.time_error ?? null,
				blockedPins: Object.entries(pins)
					.filter(([, pin]) => pin.blocked === true)
					.map(([name]) => name),
				clientRegistered: status.client_registered ?? null
			};
		}
	} catch {
		// keep the inaccessible default
	}

	return { user, tse };
}
