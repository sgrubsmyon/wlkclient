import { dev } from '$app/env';
import { fail, redirect } from '@sveltejs/kit';
import { API_URL } from '#lib/server/api.js';

export const actions = {
	default: async ({ request, cookies, url, fetch }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '');
		const password = String(form.get('password') ?? '');

		const response = await fetch(`${API_URL}/auth/login`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ username, password })
		});
		if (!response.ok) {
			return fail(response.status, { username, error: 'Anmeldung fehlgeschlagen.' });
		}

		const { access_token } = await response.json();
		cookies.set('access_token', access_token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev
		});

		const redirectTo = url.searchParams.get('redirectTo');
		redirect(
			303,
			redirectTo?.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/'
		);
	}
};
