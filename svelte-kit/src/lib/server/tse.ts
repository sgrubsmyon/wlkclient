export const PIN_LENGTH = 8;
export const PUK_LENGTH = 10;

/** Same rules as the API (gap G5): exact ASCII byte length, printable, no whitespace. */
export function credentialError(name: string, value: string, length: number) {
	const bytes = new TextEncoder().encode(value);
	if (bytes.length !== length) {
		return `${name} muss genau ${length} ASCII-Zeichen lang sein.`;
	}
	if (![...bytes].every((byte) => byte >= 0x21 && byte <= 0x7e)) {
		return `${name} darf nur druckbare ASCII-Zeichen ohne Leerzeichen enthalten.`;
	}
	return null;
}

/** Read a masked value plus its confirmation field. */
export function readPair(form: FormData, key: string, label: string, length: number) {
	const value = String(form.get(key) ?? '');
	if (form.get(`${key}_confirm`) !== value) {
		return { error: `${label} und ihre Wiederholung stimmen nicht überein.` };
	}
	const error = credentialError(label, value, length);
	return error ? { error } : { value };
}
