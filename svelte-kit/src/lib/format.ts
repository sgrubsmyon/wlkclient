const euroFormat = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const numberFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

export function euro(value: number | null | undefined) {
	// `value === 0` also catches -0, which Intl would render as "-0,00 €".
	const amount = value == null || value === 0 ? 0 : value;
	return euroFormat.format(amount);
}

export function number(value: number | null | undefined) {
	const amount = value == null || value === 0 ? 0 : value;
	return numberFormat.format(amount);
}

/** Accept a decimal input with comma or dot. Returns null for invalid input. */
export function parseDecimal(value: string): number | null {
	const normalized = value.trim().replace(',', '.');
	if (!normalized) return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

export function vatLabel(rate: number | null | undefined) {
	if (rate == null) return '';
	return `${number(rate * 100)}% MwSt`;
}

/** Alert colour name for a VAT rate, used for the badge background. */
export function vatSeverity(rate: number | null | undefined) {
	if (rate == null || rate === 0) return 'success';
	return rate < 0.19 ? 'info' : 'error';
}
