import { error } from '@sveltejs/kit';
import { API_URL } from '#lib/server/api.js';

const SOURCES: Record<string, string> = {
	full: '/tse/export/full',
	partial: '/tse/export/partial',
	certificates: '/tse/certificates'
};

function tarResponse(data: ArrayBuffer, kind: string) {
	return new Response(data, {
		headers: {
			'content-type': 'application/x-tar',
			'content-disposition': `attachment; filename="tse_${kind}.tar"`
		}
	});
}

export const GET = async ({ params, cookies, fetch }) => {
	const source = SOURCES[params.kind];
	if (!source) error(404, 'Unknown export');

	const response = await fetch(`${API_URL}${source}`, {
		method: 'POST',
		headers: { authorization: `Bearer ${cookies.get('access_token')}` }
	});
	if (!response.ok) error(response.status, 'Export failed');

	return tarResponse(await response.arrayBuffer(), params.kind);
};

function intField(form: FormData, name: string) {
	const text = String(form.get(name) ?? '').trim();
	if (!text) return null;
	const value = Number(text);
	if (!Number.isInteger(value)) error(400, `${name} muss eine ganze Zahl sein.`);
	return value;
}

/** Partial log export with a date range or a transaction-counter range. */
export const POST = async ({ params, request, cookies, fetch }) => {
	if (params.kind !== 'partial') error(404, 'Unknown export');

	const form = await request.formData();
	const byDate = form.get('criterion') === 'date';
	const body: Record<string, string | number> = { criterion: byDate ? 'date' : 'tx_number' };

	if (byDate) {
		const start = String(form.get('start_date') ?? '').trim();
		const end = String(form.get('end_date') ?? '').trim();
		if (!start && !end) error(400, 'Bitte ein Start- oder Enddatum angeben.');
		if (start) body.start_date = start;
		if (end) body.end_date = end;
	} else {
		const start = intField(form, 'start_tx_number');
		const end = intField(form, 'end_tx_number');
		if (start === null && end === null) {
			error(400, 'Bitte eine Start- oder Endnummer angeben.');
		}
		if (start !== null) body.start_tx_number = start;
		if (end !== null) body.end_tx_number = end;
	}

	const response = await fetch(`${API_URL}/tse/export/partial`, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${cookies.get('access_token')}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify(body)
	});
	if (!response.ok) error(response.status, 'Export failed');

	return tarResponse(await response.arrayBuffer(), 'partial');
};
