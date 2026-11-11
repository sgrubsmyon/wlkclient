import type { Handle } from '@sveltejs/kit/hooks';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await getUserInformation(event.cookies.get('sessionid'));

	return resolve(event);
};