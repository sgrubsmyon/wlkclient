import { fail, redirect } from '@sveltejs/kit';
import { API_URL } from '#lib/server/api.js';
import { randomPassword } from '#lib/server/passwort.js';
import { requireLogin } from '#lib/server/auth.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const user = requireLogin();
	if (user.role !== 'admin') redirect(303, '/kassieren');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, fetch }) => {
		requireLogin();
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const fullName = String(form.get('full_name') ?? '').trim();
		const role = String(form.get('role') ?? 'mitarbeiter');
		const prefTheme = String(form.get('pref_theme') ?? 'light');
		if (!username) {
			return fail(400, { error: 'Bitte einen Benutzernamen eingeben.', username, fullName });
		}

		const password = randomPassword();
		const response = await fetch(`${API_URL}/users/`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${cookies.get('access_token')}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				username,
				password,
				role,
				full_name: fullName || null,
				pref_theme: prefTheme
			})
		});
		if (!response.ok) {
			const detail = await response.json().catch(() => ({}));
			return fail(response.status, {
				error: detail.detail ?? 'Benutzer konnte nicht angelegt werden.',
				username,
				fullName
			});
		}
		return { created: username, password };
	}
};
