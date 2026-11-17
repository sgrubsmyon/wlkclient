import { fail, redirect } from '@sveltejs/kit';
import { API_URL } from '#lib/server/api.js';
import { randomPassword } from '#lib/server/passwort.js';
import { requireLogin } from '#lib/server/auth.js';
import type { Actions, PageServerLoad } from './$types';

export type Benutzer = {
	user_id: number;
	username: string;
	role: string;
	active: boolean;
	full_name: string | null;
	pref_theme: string | null;
};

function requireAdmin() {
	const user = requireLogin();
	if (user.role !== 'admin') redirect(303, '/kassieren');
	return user;
}

async function call(
	cookies: Parameters<PageServerLoad>[0]['cookies'],
	fetch: typeof globalThis.fetch,
	path: string,
	init: RequestInit = {}
) {
	const headers = new Headers(init.headers);
	headers.set('authorization', `Bearer ${cookies.get('access_token')}`);
	if (init.body) headers.set('content-type', 'application/json');
	return fetch(`${API_URL}/${path}`, { ...init, headers });
}

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	requireAdmin();
	const response = await call(cookies, fetch, 'users/?limit=100');
	if (!response.ok)
		return { users: [] as Benutzer[], error: 'Benutzer konnten nicht geladen werden.' };
	return { users: (await response.json()) as Benutzer[], error: null };
};

export const actions: Actions = {
	reset: async ({ request, cookies, fetch }) => {
		requireAdmin();
		const form = await request.formData();
		const user_id = Number(form.get('user_id'));
		const password = randomPassword();
		const response = await call(
			cookies,
			fetch,
			`users/${user_id}/reset-password?new_password=${encodeURIComponent(password)}`,
			{ method: 'POST' }
		);
		if (!response.ok)
			return fail(response.status, { error: 'Passwort konnte nicht zurückgesetzt werden.' });
		return { resetPassword: password, resetUsername: String(form.get('username') ?? '') };
	},
	toggle: async ({ request, cookies, fetch }) => {
		requireAdmin();
		const form = await request.formData();
		const user_id = Number(form.get('user_id'));
		const active = String(form.get('active')) === 'true';
		const response = await call(cookies, fetch, `users/${user_id}`, {
			method: 'PATCH',
			body: JSON.stringify({ active: !active })
		});
		if (!response.ok)
			return fail(response.status, { error: 'Konto konnte nicht geändert werden.' });
		return { message: 'Konto geändert.' };
	},
	delete: async ({ request, cookies, fetch }) => {
		requireAdmin();
		const form = await request.formData();
		const user_id = Number(form.get('user_id'));
		const response = await call(cookies, fetch, `users/${user_id}`, { method: 'DELETE' });
		if (!response.ok) {
			const detail = await response.json().catch(() => ({}));
			return fail(response.status, {
				error: detail.detail ?? 'Konto konnte nicht gelöscht werden.'
			});
		}
		return { message: 'Konto gelöscht.' };
	}
};
