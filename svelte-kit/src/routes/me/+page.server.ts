import { fail } from '@sveltejs/kit';
import { API_URL } from '#lib/server/api.js';
import type { Actions } from './$types';

export const actions: Actions = {
	passwort: async ({ request, cookies, fetch }) => {
		const form = await request.formData();
		const currentPassword = String(form.get('current_password') ?? '');
		const newPassword = String(form.get('new_password') ?? '');
		const repeat = String(form.get('repeat_password') ?? '');
		if (newPassword !== repeat) {
			return fail(400, { error: 'Die neuen Passwörter stimmen nicht überein.' });
		}
		if (newPassword.length < 8) {
			return fail(400, { error: 'Das neue Passwort muss mindestens 8 Zeichen lang sein.' });
		}

		const response = await fetch(`${API_URL}/auth/passwort`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${cookies.get('access_token')}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				current_password: currentPassword,
				new_password: newPassword
			})
		});
		if (!response.ok) {
			const detail = await response.json().catch(() => ({}));
			return fail(response.status, {
				error: detail.detail ?? 'Passwort konnte nicht geändert werden.'
			});
		}
		return { success: true };
	}
};
