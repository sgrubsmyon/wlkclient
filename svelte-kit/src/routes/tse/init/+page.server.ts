import { fail } from '@sveltejs/kit';
import { API_URL } from '#lib/server/api.js';
import { PIN_LENGTH, PUK_LENGTH, readPair } from '#lib/server/tse.js';
import type { Actions, PageServerLoad } from './$types';

const pairs = [
	['Admin-PIN', 'admin_pin', PIN_LENGTH],
	['Admin-PUK', 'admin_puk', PUK_LENGTH],
	['TimeAdmin-PIN', 'time_admin_pin', PIN_LENGTH],
	['TimeAdmin-PUK', 'time_admin_puk', PUK_LENGTH]
] as const;

function readValues(form: FormData) {
	const values: Record<string, string> = {};
	for (const [label, key, length] of pairs) {
		const parsed = readPair(form, key, label, length);
		if ('error' in parsed) return { error: parsed.error };
		values[key] = parsed.value;
	}
	if (form.get('written_down') !== 'on') {
		return { error: 'Bitte bestätigen Sie, dass Sie alle vier Werte notiert haben.' };
	}
	return { values };
}

export const load: PageServerLoad = async ({ parent, cookies, fetch }) => {
	const { user } = await parent();
	if (!user || user.role !== 'admin') {
		return { forbidden: true, preflight: null };
	}

	const response = await fetch(`${API_URL}/tse/init/preflight`, {
		method: 'POST',
		headers: { authorization: `Bearer ${cookies.get('access_token')}` }
	});
	return {
		forbidden: false,
		preflight: response.ok ? await response.json() : null
	};
};

export const actions: Actions = {
	preflight: async ({ request, cookies, fetch }) => {
		const parsed = readValues(await request.formData());
		if ('error' in parsed) return fail(400, { error: parsed.error });

		const response = await fetch(`${API_URL}/tse/init/preflight`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${cookies.get('access_token')}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify(parsed.values)
		});
		return { ok: response.ok, preflight: await response.json() };
	},

	commission: async ({ request, cookies, fetch }) => {
		const form = await request.formData();
		const parsed = readValues(form);
		if ('error' in parsed) return fail(400, { error: parsed.error });

		const response = await fetch(`${API_URL}/tse/init`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${cookies.get('access_token')}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				...parsed.values,
				// Only for a partly commissioned TSE (gap G6 in TSE_FAILURE_PATHWAYS.md).
				confirm_stored_puks: form.get('confirm_stored_puks') === 'on'
			})
		});
		return { ok: response.ok, result: await response.json() };
	}
};
