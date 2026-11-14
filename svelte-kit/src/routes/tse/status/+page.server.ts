import type { Cookies } from '@sveltejs/kit';
import { API_URL } from '#lib/server/api.js';
import type { Actions, PageServerLoad } from './$types';

async function fetchStatus(cookies: Cookies, fetch: typeof globalThis.fetch) {
	const response = await fetch(`${API_URL}/tse/status`, {
		headers: { authorization: `Bearer ${cookies.get('access_token')}` }
	});
	return response.ok ? await response.json() : null;
}

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	return { status: await fetchStatus(cookies, fetch) };
};

export const actions: Actions = {
	register: async ({ cookies, fetch }) => {
		const response = await fetch(`${API_URL}/tse/register-client`, {
			method: 'POST',
			headers: { authorization: `Bearer ${cookies.get('access_token')}` }
		});
		return { ok: response.ok, result: await response.json() };
	}
};
