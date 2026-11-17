import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WarenkorbStore } from './warenkorb.svelte.js';
import type { Artikel, Position } from './types.js';

const artikel: Artikel = {
	artikel_id: 1,
	artikel_nr: 'A1',
	artikel_name: 'Apfel',
	kurzname: null,
	barcode: '123',
	vk_preis: 2.5,
	variabler_preis: false,
	lieferant_name: 'Hof',
	produktgruppen_name: 'Obst',
	pfand_artikel_id: 9,
	pfand_wert: 0.5
};

function row(overrides: Partial<Position> = {}): Position {
	return {
		ref: 'r1',
		parent_ref: null,
		kind: 'artikel',
		artikel_id: 1,
		artikel_name: 'Apfel',
		kurzname: null,
		lieferant_kurzname: 'HOF',
		artikel_nr: 'A1',
		stueckzahl: 1,
		einzelpreis: 2.5,
		ges_preis: 2.5,
		mwst_satz: 0.07,
		variabler_preis: false,
		rabatt_id: null,
		rabatt_absolut: null,
		hat_rabatt: false,
		...overrides
	};
}

const calls: { url: string; body: unknown }[] = [];
let responses: Record<string, unknown>;

beforeEach(() => {
	calls.length = 0;
	responses = {};
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init?: RequestInit) => {
			calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
			const key = Object.keys(responses).find((path) => url.includes(path));
			const body = key ? responses[key] : [];
			return new Response(JSON.stringify(body), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});
		})
	);
	vi.stubGlobal('crypto', { randomUUID: () => 'r1' });
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('WarenkorbStore', () => {
	it('appends the returned rows, including Pfand', async () => {
		responses['warenkorb/hinzufuegen'] = [
			row(),
			row({ ref: 'r1-pfand-1', parent_ref: 'r1', kind: 'pfand', artikel_id: 9, ges_preis: 0.5 })
		];
		responses['tse/transaction/start'] = { transaction_id: 7 };
		responses['warenkorb/summen'] = {
			zwischensumme: 3,
			rabatte: 0,
			zu_zahlen: 3,
			mwst: [],
			rueckgeld: null
		};

		const store = new WarenkorbStore();
		await store.add(artikel, 'normal');

		expect(store.positionen).toHaveLength(2);
		expect(store.positionen[1].kind).toBe('pfand');
		expect(store.tseTransactionId).toBe(7);
		expect(store.summen?.zu_zahlen).toBe(3);
	});

	it('negates the rows for Rückgabe and drops the Pfand child', async () => {
		responses['warenkorb/hinzufuegen'] = [
			row(),
			row({ ref: 'r1-pfand-1', parent_ref: 'r1', kind: 'pfand', artikel_id: 9 })
		];
		const store = new WarenkorbStore();
		await store.add(artikel, 'rueckgabe');

		expect(store.positionen).toHaveLength(1);
		expect(store.positionen[0].kind).toBe('rueckgabe');
		expect(store.positionen[0].ges_preis).toBe(-2.5);
	});

	it('re-requests the parent row with the new quantity', async () => {
		responses['warenkorb/hinzufuegen'] = [row()];
		const store = new WarenkorbStore();
		await store.add(artikel, 'normal');

		responses['warenkorb/hinzufuegen'] = [row({ stueckzahl: 3, ges_preis: 7.5, einzelpreis: 2.5 })];
		await store.changeQuantity('r1', 3);

		const addCall = calls.filter((call) => call.url.includes('hinzufuegen')).at(-1);
		expect(addCall?.body).toMatchObject({ artikel_id: 1, stueckzahl: 3 });
		expect(store.positionen[0].stueckzahl).toBe(3);
	});

	it('removes the source row together with its children and toggles selection', async () => {
		responses['warenkorb/hinzufuegen'] = [
			row(),
			row({ ref: 'r1-pfand-1', parent_ref: 'r1', kind: 'pfand', artikel_id: 9 })
		];
		const store = new WarenkorbStore();
		await store.add(artikel, 'normal');

		store.toggleSelected('r1');
		expect(store.isSelected('r1')).toBe(true);
		store.toggleSelected('r1');
		expect(store.isSelected('r1')).toBe(false);

		store.toggleSelected('r1');
		await store.remove('r1');
		expect(store.positionen).toHaveLength(0);
		expect(store.selected).toHaveLength(0);
	});

	it('builds the sale payload from source rows only', async () => {
		responses['warenkorb/hinzufuegen'] = [
			row({ rabatt_absolut: 0.25 }),
			row({ ref: 'r1-rabatt-1', parent_ref: 'r1', kind: 'rabatt', ges_preis: -0.25 })
		];
		const store = new WarenkorbStore();
		await store.add(artikel, 'normal');

		expect(store.saleDetails()).toEqual([{ artikel_id: 1, stueckzahl: 1, rabatt_absolut: 0.25 }]);
	});
});
