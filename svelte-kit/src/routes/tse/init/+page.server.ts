import { fail } from '@sveltejs/kit';
import { API_URL } from '#lib/server/api.js';
import type { Actions, PageServerLoad } from './$types';

const PIN_LENGTH = 8;
const PUK_LENGTH = 10;

function credentialError(name: string, value: string, length: number) {
	const bytes = new TextEncoder().encode(value);
	if (bytes.length !== length) {
		return `${name} muss genau ${length} ASCII-Zeichen lang sein.`;
	}
	if (![...bytes].every((byte) => byte >= 0x21 && byte <= 0x7e)) {
		return `${name} darf nur druckbare ASCII-Zeichen ohne Leerzeichen enthalten.`;
	}
	return null;
}

function readValues(form: FormData) {
	const values = {
		admin_pin: String(form.get('admin_pin') ?? ''),
		admin_puk: String(form.get('admin_puk') ?? ''),
		time_admin_pin: String(form.get('time_admin_pin') ?? ''),
		time_admin_puk: String(form.get('time_admin_puk') ?? '')
	};

	const pairs = [
		['Admin-PIN', 'admin_pin', PIN_LENGTH],
		['Admin-PUK', 'admin_puk', PUK_LENGTH],
		['TimeAdmin-PIN', 'time_admin_pin', PIN_LENGTH],
		['TimeAdmin-PUK', 'time_admin_puk', PUK_LENGTH]
	] as const;
	for (const [label, key, length] of pairs) {
		if (form.get(`${key}_confirm`) !== values[key]) {
			return { error: `${label} und ihre Wiederholung stimmen nicht überein.` };
		}
		const error = credentialError(label, values[key], length);
		if (error) return { error };
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
