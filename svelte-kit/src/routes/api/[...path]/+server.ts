import { error } from '@sveltejs/kit';
import { API_URL } from '#lib/server/api.js';
import type { RequestEvent } from '@sveltejs/kit';

async function proxy(event: RequestEvent) {
	if (!event.locals.user) error(401, 'Nicht angemeldet');

	const url = new URL(event.request.url);
	const headers = new Headers({ authorization: `Bearer ${event.cookies.get('access_token')}` });
	const contentType = event.request.headers.get('content-type');
	if (contentType) headers.set('content-type', contentType);
	const accept = event.request.headers.get('accept');
	if (accept) headers.set('accept', accept);

	const hasBody = event.request.method !== 'GET' && event.request.method !== 'HEAD';
	let response: Response;
	try {
		response = await fetch(`${API_URL}/${event.params.path}${url.search}`, {
			method: event.request.method,
			headers,
			body: hasBody ? await event.request.arrayBuffer() : undefined
		});
	} catch {
		error(502, 'Der Server ist nicht erreichbar.');
	}

	const outHeaders = new Headers({
		'content-type': response.headers.get('content-type') ?? 'application/json',
		'cache-control': 'no-store'
	});
	const disposition = response.headers.get('content-disposition');
	if (disposition) outHeaders.set('content-disposition', disposition);

	return new Response(response.body, { status: response.status, headers: outHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
