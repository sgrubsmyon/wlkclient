import { error } from '@sveltejs/kit';
import { API_URL } from '#lib/server/api.js';

const SOURCES: Record<string, string> = {
	full: '/tse/export/full',
	partial: '/tse/export/partial',
	certificates: '/tse/certificates'
};

export const GET = async ({ params, cookies, fetch }) => {
	const source = SOURCES[params.kind];
	if (!source) error(404, 'Unknown export');

	const response = await fetch(`${API_URL}${source}`, {
		method: 'POST',
		headers: { authorization: `Bearer ${cookies.get('access_token')}` }
	});
	if (!response.ok) error(response.status, 'Export failed');

	return new Response(await response.arrayBuffer(), {
		headers: {
			'content-type': 'application/x-tar',
			'content-disposition': `attachment; filename="tse_${params.kind}.tar"`
		}
	});
};
