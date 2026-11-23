<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { ChevronLeft, ChevronRight, Minus, Plus } from '@lucide/svelte';
	import Alert from '#lib/Alert.svelte';
	import Modal from '#lib/Modal.svelte';
	import { api } from '#lib/api.js';
	import { euro, vatLabel } from '#lib/format.js';
	import config from '#lib/config.json';
	import type {
		AbrechnungJahr,
		AbrechnungMonat,
		AbrechnungMwst,
		AbrechnungTag,
		AbrechnungVorschau,
		AbrechnungZaehlprotokoll
	} from '#lib/types.js';

	let { kind }: { kind: 'tag' | 'monat' | 'jahr' } = $props();

	type Zeile = AbrechnungTag | AbrechnungMonat | AbrechnungJahr;

	type Spalte = {
		id: number | null;
		titel: string;
		roh: string[];
		mwst: AbrechnungMwst[];
		zaehlprotokolle: AbrechnungZaehlprotokoll[];
		offen?: boolean;
	};

	type ZeileDef = {
		label: string;
		cls?: string;
		wert: (spalte: Spalte) => string;
		zelle?: (spalte: Spalte) => string | undefined;
	};

	const proSeite = config.abrechnungenProSeite;
	const einheiten = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];

	// Coin and banknote pictures, taken from the Java POS resources.
	const geldBilder = import.meta.glob('./assets/geld/*.{gif,jpg}', {
		eager: true,
		query: '?url',
		import: 'default'
	}) as Record<string, string>;
	const geldDateien: Record<number, string> = {
		0.01: '1cent_klein.gif',
		0.02: '2cent_klein.gif',
		0.05: '5cent_klein.gif',
		0.1: '10cent_klein.gif',
		0.2: '20cent_klein.gif',
		0.5: '50cent_klein.gif',
		1: '1euro_klein.gif',
		2: '2euro_klein.gif',
		5: '5euro_neu_vorne_klein.jpg',
		10: '10euro_neu_vorne_klein.jpg',
		20: '20euro_neu_vorne_klein.jpg',
		50: '50euro_neu_vorne_klein.jpg',
		100: '100euro_klein.gif',
		200: '200euro_klein.gif'
	};

	let zeilen = $state<Zeile[]>([]);
	let vorschau = $state<AbrechnungVorschau | null>(null);
	let seite = $state(1);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let meldung = $state<string | null>(null);
	let von = $state('');
	let bis = $state('');

	let zaehlenOffen = $state(false);
	let anzahl = $state<number[]>(einheiten.map(() => 0));
	let kommentar = $state('');
	let busy = $state(false);

	function zeitpunktText(value: string) {
		return new Date(value).toLocaleString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			year: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function monatText(value: string) {
		return new Date(value).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
	}

	function spalteFuer(zeile: Zeile): Spalte {
		if (kind === 'tag') {
			const tag = zeile as AbrechnungTag;
			return {
				id: tag.id,
				titel: zeitpunktText(tag.zeitpunkt),
				roh: [
					String(tag.id),
					zeitpunktText(tag.zeitpunkt),
					zeitpunktText(tag.zeitpunkt_real),
					tag.kassenstand_id == null ? '–' : String(tag.kassenstand_id),
					tag.user_id == null ? '–' : String(tag.user_id),
					String(tag.rechnungs_nr_von),
					String(tag.rechnungs_nr_bis),
					tag.last_tse_sig_counter == null ? '–' : String(tag.last_tse_sig_counter),
					tag.z_kasse_id
				],
				mwst: tag.mwst,
				zaehlprotokolle: tag.zaehlprotokolle
			};
		}
		if (kind === 'monat') {
			const monat = zeile as AbrechnungMonat;
			return {
				id: monat.id,
				titel: monatText(monat.monat),
				roh: [
					String(monat.id),
					monatText(monat.monat),
					String(monat.abrechnung_tag_id_von),
					String(monat.abrechnung_tag_id_bis)
				],
				mwst: monat.mwst,
				zaehlprotokolle: []
			};
		}
		const jahr = zeile as AbrechnungJahr;
		return {
			id: jahr.id,
			titel: String(jahr.jahr),
			roh: [
				String(jahr.id),
				String(jahr.jahr),
				String(jahr.abrechnung_tag_id_von),
				String(jahr.abrechnung_tag_id_bis)
			],
			mwst: jahr.mwst,
			zaehlprotokolle: []
		};
	}

	function vorschauSpalte(preview: AbrechnungVorschau): Spalte {
		const nummer = (value: number | null) => (value == null ? '–' : String(value));
		return {
			id: null,
			titel:
				preview.rechnungs_nr_von == null
					? 'Offen'
					: `Offen (Nr. ${preview.rechnungs_nr_von}–${preview.rechnungs_nr_bis})`,
			roh: [
				'–',
				'–',
				'–',
				'–',
				'–',
				nummer(preview.rechnungs_nr_von),
				nummer(preview.rechnungs_nr_bis),
				'–',
				'–'
			],
			mwst: preview.mwst,
			zaehlprotokolle: [],
			offen: true
		};
	}

	const spalten = $derived.by(() => {
		const liste: Spalte[] = [];
		if (kind === 'tag' && vorschau?.open) liste.push(vorschauSpalte(vorschau));
		for (const zeile of zeilen) liste.push(spalteFuer(zeile));
		return liste;
	});

	const rohLabels = $derived(
		kind === 'tag'
			? [
					'Laufende Nr. (Z_NR)',
					'Zeitpunkt',
					'Zeitpunkt (real)',
					'Kassenstand-ID',
					'User-ID',
					'Rechnungs-Nr. von',
					'Rechnungs-Nr. bis',
					'Letzter TSE-Signaturzähler',
					'Kassen-ID'
				]
			: kind === 'monat'
				? ['Laufende Nr. (Z_NR)', 'Monat', 'Tagesabrechnung von', 'Tagesabrechnung bis']
				: ['Laufende Nr. (Z_NR)', 'Jahr', 'Tagesabrechnung von', 'Tagesabrechnung bis']
	);

	const mwstSaetze = $derived(
		[...new Set(spalten.flatMap((spalte) => spalte.mwst.map((m) => m.mwst_satz)))].sort(
			(a, b) => a - b
		)
	);

	const zaehlprotokolleAnzahl = $derived(
		Math.max(0, ...spalten.map((spalte) => spalte.zaehlprotokolle.length))
	);

	const zaehlEinheiten = $derived(
		[
			...new Set(
				spalten.flatMap((spalte) =>
					spalte.zaehlprotokolle.flatMap((protokoll) =>
						protokoll.details.map((detail) => detail.einheit)
					)
				)
			)
		].sort((a, b) => a - b)
	);

	// Mirrors AbrechnungenTag.fillDataArrayColumn: the count protocols are listed
	// below the export row, the newest first, inactive ones greyed out.
	function zaehlprotokollZeilen(defs: ZeileDef[], index: number) {
		const protokoll = (spalte: Spalte) => spalte.zaehlprotokolle[index];
		const inaktiv = index > 0;
		const basis = inaktiv ? 'inaktiv' : undefined;
		const zelle = (spalte: Spalte): string | undefined =>
			inaktiv || !protokoll(spalte) ? 'inaktiv' : undefined;
		const push = (label: string, wert: (proto: AbrechnungZaehlprotokoll) => string) =>
			defs.push({
				label,
				cls: basis,
				zelle,
				wert: (spalte) => {
					const proto = protokoll(spalte);
					return proto ? wert(proto) : '';
				}
			});

		defs.push({
			label: inaktiv ? 'Inaktives Zählprotokoll' : 'Aktives Zählprotokoll',
			cls: inaktiv ? 'inaktiv zaehl-titel' : 'zaehl-titel',
			zelle,
			wert: () => ''
		});
		push('Zeitpunkt', (proto) => zeitpunktText(proto.zeitpunkt));
		for (const einheit of zaehlEinheiten) {
			push(`${euro(einheit)}, Anzahl =`, (proto) => {
				const detail = proto.details.find((d) => d.einheit === einheit);
				return detail ? String(detail.anzahl) : '';
			});
		}
		push('Zähl-Kassenstand', (proto) => euro(proto.summe));
		push('Soll-Kassenstand', (proto) =>
			proto.soll_kassenstand == null ? '' : euro(proto.soll_kassenstand)
		);
		defs.push({
			label: 'Differenz',
			cls: basis,
			wert: (spalte) => {
				const proto = protokoll(spalte);
				return proto?.differenz == null ? '' : euro(proto.differenz);
			},
			zelle: (spalte) => {
				if (inaktiv) return 'inaktiv';
				const proto = protokoll(spalte);
				if (!proto || proto.differenz == null) return 'inaktiv';
				return Math.abs(proto.differenz) < 0.005 ? 'gut' : 'schlecht';
			}
		});
		push('Bar-Tageseinnahmen', (proto) =>
			proto.tageseinnahmen == null ? '' : euro(proto.tageseinnahmen)
		);
		push('Kommentar', (proto) => proto.kommentar);
	}

	const zeilenDefs = $derived.by(() => {
		const defs: ZeileDef[] = rohLabels.map((label, index) => ({
			label,
			wert: (spalte) => spalte.roh[index] ?? ''
		}));
		const summen = (spalte: Spalte) => {
			const brutto = spalte.mwst.reduce((total, m) => total + m.mwst_netto + m.mwst_betrag, 0);
			const bar = spalte.mwst.reduce((total, m) => total + m.bar_brutto, 0);
			return [brutto, bar, brutto - bar];
		};
		['Gesamt Brutto', 'Gesamt Bar Brutto', 'Gesamt EC Brutto'].forEach((label, index) =>
			defs.push({ label, wert: (spalte) => euro(summen(spalte)[index]) })
		);
		for (const satz of mwstSaetze) {
			const mwst = (spalte: Spalte) => spalte.mwst.find((m) => m.mwst_satz === satz);
			defs.push(
				{
					label: `${vatLabel(satz)} Brutto`,
					wert: (spalte) => {
						const row = mwst(spalte);
						return euro(row ? row.mwst_netto + row.mwst_betrag : 0);
					}
				},
				{
					label: `${vatLabel(satz)} Netto`,
					wert: (spalte) => euro(mwst(spalte)?.mwst_netto)
				},
				{
					label: `${vatLabel(satz)} Betrag`,
					wert: (spalte) => euro(mwst(spalte)?.mwst_betrag)
				}
			);
		}
		return defs;
	});

	// The Zählprotokoll sits below the export row of the settlements.
	const zaehlZeilenDefs = $derived.by(() => {
		const defs: ZeileDef[] = [];
		for (let index = 0; index < zaehlprotokolleAnzahl; index++) {
			zaehlprotokollZeilen(defs, index);
		}
		return defs;
	});

	async function lade() {
		loading = true;
		error = null;
		try {
			let pfad = `abrechnung/${kind}/?desc=true&offset=${(seite - 1) * proSeite}&limit=${proSeite}`;
			if (von) pfad += `&von=${von}`;
			if (bis) pfad += `&bis=${bis}`;
			zeilen = await api<Zeile[]>(pfad);
		} catch (caught) {
			error = caught instanceof Error ? caught.message : String(caught);
			zeilen = [];
		} finally {
			loading = false;
		}
	}

	async function ladeVorschau() {
		if (kind !== 'tag') return;
		try {
			vorschau = await api<AbrechnungVorschau>('abrechnung/tag/vorschau');
		} catch {
			vorschau = null;
		}
	}

	function filterAnwenden() {
		seite = 1;
		void lade();
	}

	function blaettern(richtung: number) {
		seite += richtung;
		void lade();
	}

	function oeffneZaehlung() {
		anzahl = einheiten.map(() => 0);
		kommentar = '';
		error = null;
		zaehlenOffen = true;
	}

	const gezaehlt = $derived(
		einheiten.reduce((summe, einheit, i) => summe + einheit * (anzahl[i] || 0), 0)
	);
	const soll = $derived(vorschau?.expected_balance ?? 0);

	async function tagesabrechnung() {
		busy = true;
		error = null;
		try {
			await api('abrechnung/tag/', {
				method: 'POST',
				body: JSON.stringify({
					zaehlprotokoll: {
						kommentar,
						details: einheiten
							.map((einheit, i) => ({ anzahl: anzahl[i] || 0, einheit }))
							.filter((detail) => detail.anzahl > 0)
					}
				})
			});
			zaehlenOffen = false;
			meldung = 'Tagesabrechnung gespeichert.';
			seite = 1;
			await Promise.all([lade(), ladeVorschau()]);
		} catch (caught) {
			error = caught instanceof Error ? caught.message : String(caught);
		} finally {
			busy = false;
		}
	}

	onMount(() => {
		void lade();
		void ladeVorschau();
	});
</script>

{#if meldung}
	<Alert severity="success">{meldung}</Alert>
{/if}
{#if error && !zaehlenOffen}
	<Alert severity="error">{error}</Alert>
{/if}

<div class="kopf">
	<div class="filter">
		<label for="von">Von:</label>
		<input id="von" type="date" bind:value={von} onchange={filterAnwenden} />
		<label for="bis">Bis:</label>
		<input id="bis" type="date" bind:value={bis} onchange={filterAnwenden} />
	</div>
	{#if kind === 'tag'}
		<div class="aktion">
			<span>Zahlen in rot werden als neue Tagesabrechnung gespeichert.</span>
			<button type="button" class="primary" disabled={!vorschau?.open} onclick={oeffneZaehlung}>
				Tagesabrechnung machen
			</button>
		</div>
	{/if}
</div>

<div class="blaettern">
	<button
		type="button"
		title="Vorherige Seite"
		disabled={seite === 1 || loading}
		onclick={() => blaettern(-1)}
	>
		<ChevronLeft size={18} />
	</button>
	<span>Seite {seite}</span>
	<button
		type="button"
		title="Nächste Seite"
		disabled={zeilen.length < proSeite || loading}
		onclick={() => blaettern(1)}
	>
		<ChevronRight size={18} />
	</button>
</div>

{#if loading}
	<p class="hinweis">Lade Abrechnungen…</p>
{:else if spalten.length === 0}
	<p class="hinweis">Keine Abrechnungen vorhanden.</p>
{:else}
	<div class="tabelle">
		<table>
			<thead>
				<tr>
					<th></th>
					{#each spalten as spalte (spalte.id ?? 'offen')}
						<th class:offen={spalte.offen}>{spalte.titel}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each zeilenDefs as zeile, index (`${index}-${zeile.label}`)}
					<tr class={zeile.cls}>
						<th scope="row">{zeile.label}</th>
						{#each spalten as spalte (spalte.id ?? 'offen')}
							<td class={zeile.zelle?.(spalte) ?? ''} class:offen={spalte.offen}>
								{zeile.wert(spalte)}
							</td>
						{/each}
					</tr>
				{/each}
				<tr>
					<th scope="row"></th>
					{#each spalten as spalte (spalte.id ?? 'offen')}
						<td>
							{#if spalte.id != null}
								<a
									class="primary"
									href={resolve('/api/[...path]', {
										path: `export/abrechnung/${kind}/${spalte.id}/ods`
									})}
									download
								>
									Exportieren
								</a>
							{/if}
						</td>
					{/each}
				</tr>
				{#each zaehlZeilenDefs as zeile, index (`zaehl-${index}-${zeile.label}`)}
					<tr class={zeile.cls}>
						<th scope="row">{zeile.label}</th>
						{#each spalten as spalte (spalte.id ?? 'offen')}
							<td class={zeile.zelle?.(spalte) ?? ''} class:offen={spalte.offen}>
								{zeile.wert(spalte)}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<Modal open={zaehlenOffen} title="Tagesabrechnung machen" onclose={() => (zaehlenOffen = false)}>
	{#if error}
		<Alert severity="error">{error}</Alert>
	{/if}
	<p>Bitte den Kassenbestand zählen.</p>
	<div class="zaehlung">
		{#each einheiten as einheit, index (einheit)}
			<div class="zaehl-zeile">
				<img class="geld" src={geldBilder[`./assets/geld/${geldDateien[einheit]}`]} alt="" />
				<span class="einheit">{euro(einheit)}</span>
				<button
					type="button"
					title="Weniger"
					onclick={() => (anzahl[index] = Math.max(0, (anzahl[index] || 0) - 1))}
				>
					<Minus size={16} />
				</button>
				<input type="number" min="0" step="1" inputmode="numeric" bind:value={anzahl[index]} />
				<button
					type="button"
					title="Mehr"
					onclick={() => (anzahl[index] = (anzahl[index] || 0) + 1)}
				>
					<Plus size={16} />
				</button>
				<span class="summe">{euro(einheit * (anzahl[index] || 0))}</span>
			</div>
		{/each}
	</div>
	<div class="differenz">
		<div><span>Gezählt:</span><span>{euro(gezaehlt)}</span></div>
		<div><span>Soll-Kassenstand:</span><span>{euro(soll)}</span></div>
		<div><strong>Differenz:</strong><strong>{euro(gezaehlt - soll)}</strong></div>
	</div>
	<label class="kommentar">
		<span>Kommentar:</span>
		<textarea
			rows="3"
			bind:value={kommentar}
			placeholder="Bitte eingeben: Was ist der Grund für die Differenz? Wenn die Differenz 0,00 € ist, dann einfach „Kasse stimmt“, „passt“ o.ä. eintragen"
		></textarea>
	</label>
	<div class="modal-actions">
		<button type="button" class="secondary" onclick={() => (zaehlenOffen = false)}>Abbrechen</button
		>
		<button
			type="button"
			class="primary"
			disabled={busy || !kommentar.trim()}
			onclick={tagesabrechnung}
		>
			Speichern
		</button>
	</div>
</Modal>

<style>
	.kopf {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.filter {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.filter input {
		padding: 0.3rem 0.4rem;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		background-color: var(--input-bg);
		color: var(--text);
		font: inherit;
	}

	.aktion {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.9rem;
	}

	/* The export links and the Tagesabrechnung button share one look. */
	a.primary,
	button.primary {
		padding: 0.25rem 0.6rem;
		border: none;
		border-radius: 0.375rem;
		background-color: var(--primary);
		color: #000;
		text-decoration: none;
		cursor: pointer;
	}

	button.primary:disabled {
		opacity: 0.5;
		cursor: default;
	}

	/* The main action is the same button, a bit larger. */
	.aktion button.primary {
		padding: 0.45rem 1rem;
		font-size: 1rem;
		font-weight: 700;
	}

	.blaettern {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.tabelle {
		overflow: auto;
	}

	table {
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th,
	td {
		padding: 0.35rem 0.6rem;
		border: 1px solid var(--border);
		white-space: nowrap;
	}

	tbody th[scope='row'] {
		text-align: left;
		font-weight: 700;
	}

	thead th {
		background-color: var(--surface);
	}

	td {
		text-align: right;
	}

	.offen {
		color: var(--alert-error);
	}

	:global(body[data-theme='dark']) .offen {
		color: color-mix(in srgb, var(--alert-error) 40%, white);
	}

	tr.zaehl-titel th {
		font-style: italic;
	}

	tr.inaktiv th,
	td.inaktiv {
		color: #808080;
	}

	td.gut {
		color: var(--alert-success);
		font-weight: 700;
	}

	td.schlecht {
		color: var(--alert-error);
		font-weight: 700;
	}

	:global(body[data-theme='dark']) td.gut {
		color: color-mix(in srgb, var(--alert-success) 40%, white);
	}

	:global(body[data-theme='dark']) td.schlecht {
		color: color-mix(in srgb, var(--alert-error) 40%, white);
	}

	.hinweis {
		margin: 0;
		font-size: 0.9rem;
		opacity: 0.7;
	}

	.blaettern button,
	.zaehl-zeile button {
		display: grid;
		place-items: center;
		width: 1.8rem;
		height: 1.8rem;
		border: 1px solid var(--border);
		border-radius: 0.25rem;
		background-color: var(--surface);
		color: var(--text);
		cursor: pointer;
	}

	.blaettern button:disabled,
	.zaehl-zeile button:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.zaehlung {
		display: grid;
		grid-template-columns: repeat(2, minmax(16rem, 1fr));
		grid-template-rows: repeat(8, auto);
		grid-auto-flow: column;
		gap: 0.25rem 1rem;
		margin: 0.75rem 0;
	}

	@media (max-width: 700px) {
		.zaehlung {
			grid-template-columns: 1fr;
			grid-template-rows: none;
			grid-auto-flow: row;
		}
	}

	.zaehl-zeile {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.zaehl-zeile .geld {
		flex-shrink: 0;
		width: 3.75rem;
		height: 2.25rem;
		object-fit: contain;
	}

	.zaehl-zeile .einheit {
		width: 4rem;
	}

	.zaehl-zeile button {
		width: 1.5rem;
		height: 1.5rem;
	}

	.zaehl-zeile input {
		width: 2.75rem;
		padding: 0.15rem 0.35rem;
		border: 1px solid var(--border);
		border-radius: 0.25rem;
		background-color: var(--input-bg);
		color: var(--text);
		font: inherit;
		text-align: right;
		/* The +/- buttons replace the native spinner arrows. */
		appearance: textfield;
	}

	.zaehl-zeile input::-webkit-inner-spin-button,
	.zaehl-zeile input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	/* Fixed width keeps the dialog from jumping while counting; 100 of the
	   largest denomination still fit (20.000,00 €). */
	.zaehl-zeile .summe {
		flex-shrink: 0;
		margin-left: auto;
		width: 5.5rem;
		font-size: 0.85rem;
		text-align: right;
		white-space: nowrap;
	}

	.differenz {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--text);
		border-radius: 0.5rem;
	}

	.differenz div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}

	.kommentar {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-top: 0.75rem;
	}

	.kommentar textarea {
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		background-color: var(--input-bg);
		color: var(--text);
		font: inherit;
		resize: vertical;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.modal-actions button {
		padding: 0.4rem 1rem;
		border: none;
		border-radius: 0.375rem;
		font: inherit;
		cursor: pointer;
	}

	.modal-actions .primary {
		background-color: var(--primary);
		color: #000;
	}

	.modal-actions .primary:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.modal-actions .secondary {
		background-color: var(--border);
		color: var(--text);
	}
</style>
