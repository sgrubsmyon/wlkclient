import { fail } from '@sveltejs/kit';
import { API_URL } from '#lib/server/api.js';
import { PIN_LENGTH, PUK_LENGTH, readPair } from '#lib/server/tse.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	return { forbidden: !user || user.role !== 'admin' };
};

export const actions: Actions = {
	default: async ({ request, cookies, fetch }) => {
		const form = await request.formData();

		const user = String(form.get('user') ?? '');
		if (user !== 'Admin' && user !== 'TimeAdmin') {
			return fail(400, { error: 'Bitte wählen Sie Admin oder TimeAdmin.' });
		}
		const puk = readPair(form, 'puk', 'PUK', PUK_LENGTH);
		if ('error' in puk) return fail(400, { error: puk.error });
		const pin = readPair(form, 'new_pin', 'Neue PIN', PIN_LENGTH);
		if ('error' in pin) return fail(400, { error: pin.error });
		if (form.get('confirmed') !== 'on') {
			return fail(400, {
				error: 'Bitte bestätigen Sie, dass Sie den PUK Zeichen für Zeichen geprüft haben.'
			});
		}

		const response = await fetch(`${API_URL}/tse/unblock`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${cookies.get('access_token')}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({ user, puk: puk.value, new_pin: pin.value })
		});
		return { ok: response.ok, result: await response.json() };
	}
};
