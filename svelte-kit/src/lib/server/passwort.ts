import { randomInt } from 'node:crypto';

// No ambiguous characters (0/O, 1/l/I) for hand-written passwords.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function randomPassword(length = 10) {
	let password = '';
	for (let index = 0; index < length; index++) {
		password += ALPHABET[randomInt(ALPHABET.length)];
	}
	return password;
}
