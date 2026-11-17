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
	const response = await fetch(`${API_URL}/${event.params.path}${url.search}`, {
		method: event.request.method,
		headers,
		body: hasBody ? await event.request.arrayBuffer() : undefined
	});

	return new Response(response.body, {
		status: response.status,
		headers: {
			'content-type': response.headers.get('content-type') ?? 'application/json',
			'cache-control': 'no-store'
		}
	});
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
