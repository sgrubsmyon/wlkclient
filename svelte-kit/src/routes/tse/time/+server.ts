import { redirect } from '@sveltejs/kit';
import { API_URL } from '#lib/server/api.js';

export const POST = async ({ request, cookies, fetch }) => {
	const form = await request.formData();
	const target = String(form.get('redirectTo') ?? '/');
	const redirectTo = target.startsWith('/') && !target.startsWith('//') ? target : '/';

	// `force` skips the sync-interval shortcut: after a power-up the TSE clock is unset.
	await fetch(`${API_URL}/tse/init?force=true`, {
		method: 'POST',
		headers: { authorization: `Bearer ${cookies.get('access_token')}` }
	});

	redirect(303, redirectTo);
};
