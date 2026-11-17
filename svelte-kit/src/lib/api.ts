export class ApiError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

/** Call the API through the authenticated `/api` proxy. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
	const headers = new Headers(init.headers);
	if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
	const response = await fetch(`/api/${path.replace(/^\//, '')}`, { ...init, headers });
	if (!response.ok) {
		let message = `Fehler ${response.status}`;
		try {
			const body = await response.json();
			if (body?.detail) {
				message = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
			}
		} catch {
			// keep the status-based message
		}
		throw new ApiError(response.status, message);
	}
	if (response.status === 204) return undefined as T;
	return (await response.json()) as T;
}
