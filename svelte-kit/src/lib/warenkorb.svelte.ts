import { api } from '#lib/api.js';
import type { Position, RabattSpec, Summen, Verkauf, Artikel } from '#lib/types.js';

// `crypto.randomUUID` is only available in secure contexts; on a phone opening
// the dev server via a LAN IP it is missing. Cart refs only need to be unique
// inside one cart, so a counter suffices.
const STORAGE_KEY = 'wlk-warenkorb';

function today() {
	return new Date().toISOString().slice(0, 10);
}

let refCounter = 0;

function newRef() {
	refCounter += 1;
	return `pos-${Date.now().toString(36)}-${refCounter}`;
}

/**
 * Client state of the cart. Every price/expansion rule stays in the API: this
 * store only keeps the rows returned by `/warenkorb/*` and re-requests them
 * when something changes, so Pfand and discount rows always follow the article.
 */
export class WarenkorbStore {
	positionen = $state<Position[]>([]);
	selected = $state<string[]>([]);
	summen = $state<Summen | null>(null);
	rechnungRabatt = $state<RabattSpec | null>(null);
	gutschein = $state<{ nr: number; betrag: number; restbetrag: number } | null>(null);
	anzahlungBetrag = $state<number | null>(null);
	anzahlungAufloesenNr = $state<number | null>(null);
	depositPreview = $state<Position[] | null>(null);
	staged = $state(false);
	tseTransactionId = $state<number | null>(null);
	busy = $state(false);

	get sources() {
		return this.positionen.filter((row) => !row.parent_ref && row.kind !== 'rechnung_rabatt');
	}

	/** Rows to render: the deposit preview while one is configured. */
	get displayPositionen() {
		return this.depositPreview ?? this.positionen;
	}

	get depositActive() {
		return this.anzahlungBetrag != null || this.anzahlungAufloesenNr != null;
	}

	get artikelRows() {
		return this.positionen.filter((row) => !row.parent_ref && row.kind === 'artikel');
	}

	get selectedSources() {
		return this.sources.filter((row) => this.selected.includes(row.ref));
	}

	get isEmpty() {
		return this.positionen.length === 0;
	}

	get hasDiscounts() {
		return this.positionen.some((row) => row.kind === 'rabatt' || row.kind === 'rechnung_rabatt');
	}

	get hasUndiscountedArticle() {
		return this.artikelRows.some((row) => !row.hat_rabatt);
	}

	isSelected(ref: string) {
		return this.selected.includes(ref);
	}

	toggleSelected(ref: string) {
		this.selected = this.isSelected(ref)
			? this.selected.filter((item) => item !== ref)
			: [...this.selected, ref];
	}

	clearSelection() {
		this.selected = [];
	}

	/** Store the cart locally so a reload, an app switch or a page change keeps it. */
	persist() {
		if (!this.positionen.length && !this.gutschein && !this.staged) {
			this.clearStorage();
			return;
		}
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					datum: today(),
					positionen: this.positionen,
					selected: this.selected,
					rechnungRabatt: this.rechnungRabatt,
					gutschein: this.gutschein,
					anzahlungBetrag: this.anzahlungBetrag,
					anzahlungAufloesenNr: this.anzahlungAufloesenNr,
					depositPreview: this.depositPreview,
					tseTransactionId: this.tseTransactionId,
					staged: this.staged
				})
			);
		} catch {
			// storage disabled/full: the cart just stays in memory
		}
	}

	clearStorage() {
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {
			// ignore unavailable storage
		}
	}

	/** Restore a cart saved on the same day; stale carts are dropped. */
	async restore() {
		let raw: string | null;
		try {
			raw = localStorage.getItem(STORAGE_KEY);
		} catch {
			return;
		}
		if (!raw) return;
		try {
			const data = JSON.parse(raw);
			if (data?.datum !== today() || !Array.isArray(data.positionen)) {
				this.clearStorage();
				return;
			}
			this.positionen = data.positionen.filter(
				(row: Position) =>
					row && typeof row.ref === 'string' && Number.isFinite(Number(row.ges_preis))
			);
			const refs = this.positionen.map((row) => row.ref);
			this.selected = Array.isArray(data.selected)
				? data.selected.filter((ref: string) => refs.includes(ref))
				: [];
			this.rechnungRabatt = data.rechnungRabatt ?? null;
			this.gutschein = data.gutschein ?? null;
			this.anzahlungBetrag = data.anzahlungBetrag ?? null;
			this.anzahlungAufloesenNr = data.anzahlungAufloesenNr ?? null;
			this.depositPreview = Array.isArray(data.depositPreview) ? data.depositPreview : null;
			this.tseTransactionId = data.tseTransactionId ?? null;
			this.staged = Boolean(data.staged);
		} catch {
			this.clearStorage();
			return;
		}
		try {
			await this.refresh();
		} catch {
			// Totals are recomputed on the next cart change; keep the rows.
		}
	}

	async refresh(kundeGibt: number | null = null) {
		if (this.isEmpty) {
			this.summen = null;
			return;
		}
		this.summen = await api<Summen>('warenkorb/summen', {
			method: 'POST',
			body: JSON.stringify({ positionen: this.displayPositionen, kunde_gibt: kundeGibt })
		});
	}

	private async ensureTse() {
		if (this.tseTransactionId != null) return;
		try {
			const transaction = await api<{ transaction_id: number }>('tse/transaction/start', {
				method: 'POST'
			});
			this.tseTransactionId = transaction.transaction_id;
		} catch {
			// Selling keeps working without a TSE; the API records the failure.
			this.tseTransactionId = null;
		}
	}

	async abortTse() {
		if (this.tseTransactionId == null) return;
		try {
			await api(`tse/transaction/${this.tseTransactionId}/abbruch`, { method: 'POST' });
		} catch {
			// already aborted or unreachable
		}
		this.tseTransactionId = null;
	}

	/** Add an article (line total `preis` for variable prices). */
	async add(artikel: Artikel, modus: 'normal' | 'leergut' | 'rueckgabe', preis?: number) {
		await this.ensureTse();
		const ref = newRef();
		let rows = await api<Position[]>(
			modus === 'leergut' ? 'warenkorb/leergut' : 'warenkorb/hinzufuegen',
			{
				method: 'POST',
				body: JSON.stringify({
					artikel_id: artikel.artikel_id,
					stueckzahl: 1,
					preis: preis ?? null,
					ref
				})
			}
		);
		if (modus === 'rueckgabe') {
			rows = rows
				.filter((row) => !row.parent_ref)
				.map((row) => ({
					...row,
					kind: 'rueckgabe',
					ges_preis: -row.ges_preis,
					einzelpreis: -row.einzelpreis,
					preis_override: true
				}));
		}
		this.positionen = [...this.positionen, ...rows];
		if (this.rechnungRabatt) await this.applyRechnungRabatt(this.rechnungRabatt, false);
		await this.refresh();
	}

	async remove(ref: string) {
		const index = this.positionen.findIndex((row) => row.ref === ref);
		if (index < 0) return;
		const source = this.positionen[index];
		this.positionen = this.positionen.filter((row) => row.ref !== ref && row.parent_ref !== ref);
		this.selected = this.selected.filter((item) => item !== ref);
		if (source.kind === 'gutschein') this.gutschein = null;
		if (this.rechnungRabatt) await this.applyRechnungRabatt(this.rechnungRabatt, false);
		await this.refresh();
	}

	async clear() {
		await this.abortTse();
		this.positionen = [];
		this.selected = [];
		this.summen = null;
		this.rechnungRabatt = null;
		this.staged = false;
		this.gutschein = null;
		this.anzahlungBetrag = null;
		this.anzahlungAufloesenNr = null;
		this.depositPreview = null;
		this.clearStorage();
	}

	private replaceTree(ref: string, rows: Position[]) {
		const index = this.positionen.findIndex((row) => row.ref === ref);
		const rest = this.positionen.filter((row) => row.ref !== ref && row.parent_ref !== ref);
		if (index < 0) {
			this.positionen = [...rest, ...rows];
		} else {
			const before = this.positionen
				.slice(0, index)
				.filter((row) => row.ref !== ref && row.parent_ref !== ref);
			const after = this.positionen
				.slice(index)
				.filter((row) => row.ref !== ref && row.parent_ref !== ref);
			this.positionen = [...before, ...rows, ...after];
		}
	}

	private async reloadSource(source: Position, stueckzahl: number, preis?: number) {
		const rows = await api<Position[]>(
			source.kind === 'leergut' ? 'warenkorb/leergut' : 'warenkorb/hinzufuegen',
			{
				method: 'POST',
				body: JSON.stringify({
					artikel_id: source.artikel_id,
					stueckzahl,
					preis: preis ?? null,
					ref: source.ref
				})
			}
		);
		return source.kind === 'rueckgabe'
			? rows
					.filter((row) => !row.parent_ref)
					.map((row) => ({
						...row,
						kind: 'rueckgabe' as const,
						ges_preis: -row.ges_preis,
						einzelpreis: -row.einzelpreis,
						preis_override: true
					}))
			: rows;
	}

	async changeQuantity(ref: string, stueckzahl: number) {
		const source = this.positionen.find((row) => row.ref === ref);
		if (!source || stueckzahl < 1) return;
		const preis =
			source.variabler_preis || source.preis_override
				? Math.round(source.einzelpreis * stueckzahl * 100) / 100
				: undefined;
		let rows = await this.reloadSource(source, stueckzahl, preis);
		rows[0] = { ...rows[0], preis_override: source.preis_override };
		if (source.rabatt_spec) {
			rows = await this.discountRows(rows[0], source.rabatt_spec);
			rows[0].rabatt_spec = source.rabatt_spec;
		}
		this.replaceTree(ref, rows);
		if (this.rechnungRabatt) await this.applyRechnungRabatt(this.rechnungRabatt, false);
		await this.refresh();
	}

	private async discountRows(source: Position, spec: RabattSpec): Promise<Position[]> {
		const rows = await api<Position[]>('warenkorb/rabatt', {
			method: 'POST',
			body: JSON.stringify({
				positionen: [
					{
						ref: source.ref,
						artikel_id: source.artikel_id,
						stueckzahl: source.stueckzahl,
						ges_preis: source.ges_preis,
						rabatt_id: source.rabatt_id
					}
				],
				rabatt: spec
			})
		});
		const echoed = rows.find((row) => row.ref === source.ref);
		const children = rows.filter((row) => row.parent_ref === source.ref);
		return [{ ...source, ...(echoed ?? {}), hat_rabatt: true, rabatt_spec: spec }, ...children];
	}

	/** Discount the selected article rows (5/10/15/20/25 %, individual). */
	async applyRabatt(spec: RabattSpec) {
		const targets = this.selectedSources.filter((row) => row.kind === 'artikel');
		for (const target of targets) {
			const rows = await this.discountRows(target, spec);
			this.replaceTree(target.ref, rows);
		}
		if (this.rechnungRabatt) {
			if (this.staged) await this.applyRechnungRabatt(this.rechnungRabatt, false);
			else this.rechnungRabatt = null;
		}
		await this.refresh();
	}

	/** Override the line total of one article ("Abweichender Preis"). */
	async applyAbweichenderPreis(ref: string, preis: number) {
		const source = this.positionen.find((row) => row.ref === ref);
		if (!source) return;
		const rows = await this.reloadSource(source, source.stueckzahl, preis);
		rows[0] = { ...rows[0], preis_override: true };
		this.replaceTree(ref, rows);
		if (this.rechnungRabatt) await this.applyRechnungRabatt(this.rechnungRabatt, false);
		await this.refresh();
	}

	/** Receipt-level discount ("Rabatt auf Rechnung"): one row per VAT rate. */
	async applyRechnungRabatt(spec: RabattSpec, refresh = true) {
		this.positionen = this.positionen.filter((row) => row.kind !== 'rechnung_rabatt');
		const rows = await api<Position[]>('warenkorb/rabatt', {
			method: 'POST',
			body: JSON.stringify({
				positionen: this.artikelRows.map((row) => ({
					ref: row.ref,
					artikel_id: row.artikel_id,
					stueckzahl: row.stueckzahl,
					ges_preis: row.variabler_preis || row.preis_override ? row.ges_preis : undefined,
					rabatt_id: row.rabatt_id,
					rabatt_absolut: row.rabatt_absolut
				})),
				rabatt: spec,
				rechnung: true
			})
		});
		this.rechnungRabatt = spec;
		this.positionen = [...this.positionen, ...rows];
		if (refresh) await this.refresh();
	}

	// --- deposit (Anzahlung) ---------------------------------------------

	/** Preview a new deposit or the resolution of an open one. */
	async previewAnzahlung(betrag: number | null, aufloesenNr: number | null) {
		this.anzahlungBetrag = betrag;
		this.anzahlungAufloesenNr = aufloesenNr;
		if (betrag == null && aufloesenNr == null) {
			this.depositPreview = null;
		} else {
			this.depositPreview = await api<Position[]>('warenkorb/anzahlung', {
				method: 'POST',
				body: JSON.stringify({
					positionen: this.artikelRows.map((row) => ({
						ref: row.ref,
						artikel_id: row.artikel_id,
						stueckzahl: row.stueckzahl,
						ges_preis: row.variabler_preis || row.preis_override ? row.ges_preis : undefined,
						rabatt_id: row.rabatt_id,
						rabatt_absolut: row.rabatt_absolut
					})),
					betrag,
					aufloesen_nr: aufloesenNr,
					rechnung_rabatt_relativ: this.rechnungRabatt?.wert ?? null
				})
			});
		}
		this.selected = [];
		await this.refresh();
	}

	/** Recompute the deposit preview after a cart change. */
	async refreshDeposit() {
		if (!this.depositActive) return;
		await this.previewAnzahlung(this.anzahlungBetrag, this.anzahlungAufloesenNr);
	}

	// --- voucher ---------------------------------------------------------

	addGutschein(nr: number, betrag: number, restbetrag: number) {
		this.positionen = this.positionen.filter((row) => row.kind !== 'gutschein');
		this.gutschein = { nr, betrag, restbetrag };
		this.positionen = [
			...this.positionen,
			{
				ref: 'gutschein-einloesung',
				parent_ref: null,
				kind: 'gutschein',
				artikel_id: 0,
				artikel_name: `Gutschein Nr. ${nr}`,
				kurzname: null,
				lieferant_kurzname: null,
				artikel_nr: 'GUTSCHEINEINLOES',
				stueckzahl: 1,
				einzelpreis: -betrag,
				ges_preis: -betrag,
				mwst_satz: 0,
				variabler_preis: false,
				rabatt_id: null,
				rabatt_absolut: null,
				hat_rabatt: false
			}
		];
	}

	// --- sale ------------------------------------------------------------

	saleDetails() {
		return this.positionen
			.filter(
				(row) =>
					!row.parent_ref &&
					(row.kind === 'artikel' || row.kind === 'leergut' || row.kind === 'rueckgabe')
			)
			.map((row) => {
				const detail: Record<string, unknown> = {
					artikel_id: row.artikel_id,
					stueckzahl: row.stueckzahl
				};
				if (row.variabler_preis || row.preis_override || row.kind !== 'artikel') {
					detail.ges_preis = row.ges_preis;
				}
				if (row.rabatt_absolut != null) detail.rabatt_absolut = row.rabatt_absolut;
				if (row.rabatt_id != null) detail.rabatt_id = row.rabatt_id;
				return detail;
			});
	}

	async abschliessen(options: {
		ecZahlung: boolean;
		kundeGibt: number | null;
		anzahlungBetrag: number | null;
		anzahlungAufloesenNr: number | null;
	}) {
		const payload: Record<string, unknown> = {
			ec_zahlung: options.ecZahlung,
			kunde_gibt: options.kundeGibt,
			verkauf_details: this.saleDetails(),
			rechnung_rabatt_relativ: this.rechnungRabatt?.wert ?? null,
			gutschein_einloesung_nr: this.gutschein?.nr ?? null,
			gutschein_einloesung_betrag: this.gutschein?.betrag ?? null,
			anzahlung_betrag: options.anzahlungBetrag,
			anzahlung_aufloesen_nr: options.anzahlungAufloesenNr,
			tse_transaction_id: this.tseTransactionId
		};
		const verkauf = await api<Verkauf>('verkauf/', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
		this.positionen = [];
		this.selected = [];
		this.summen = null;
		this.rechnungRabatt = null;
		this.gutschein = null;
		this.staged = false;
		this.tseTransactionId = null;
		this.anzahlungBetrag = null;
		this.anzahlungAufloesenNr = null;
		this.depositPreview = null;
		this.clearStorage();
		return verkauf;
	}
}
