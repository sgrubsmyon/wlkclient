<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Trash2 } from '@lucide/svelte';
	import 'datatables.net-dt/css/dataTables.dataTables.css';
	import Alert from '#lib/Alert.svelte';
	import KassierArtikel from '#lib/KassierArtikel.svelte';
	import Modal from '#lib/Modal.svelte';
	import { api } from '#lib/api.js';
	import { euro, vatSeverity } from '#lib/format.js';
	import type {
		Position,
		PositionKind,
		VerkaufDetail,
		VerkaufDetails,
		VerkaufUebersicht
	} from '#lib/types.js';

	let { nurHeute }: { nurHeute: boolean } = $props();

	let verkaeufe = $state<VerkaufUebersicht[]>([]);
	let selectedNr = $state<number | null>(null);
	let details = $state<VerkaufDetails | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let storno = $state<VerkaufUebersicht | null>(null);
	let stornoBusy = $state(false);

	let tableEl: HTMLTableElement | undefined = $state();
	let dataTable: { destroy: () => void } | undefined;

	const positionen = $derived.by(() => {
		let lastArticle: string | null = null;
		return (details?.verkauf_details ?? []).map((row) => {
			const position = toPosition(row);
			const childKind = ['pfand', 'rabatt', 'preisanpassung'].includes(position.kind);
			if (childKind && lastArticle) {
				position.parent_ref = lastArticle;
			}
			if (!childKind && position.kind === 'artikel') {
				lastArticle = position.ref;
			}
			return position;
		});
	});

	const summe = $derived(
		(details?.verkauf_details ?? []).reduce((total, row) => total + Number(row.ges_preis), 0)
	);
	const rabatte = $derived(
		-(details?.verkauf_details ?? [])
			.filter((row) => row.artikel_nr === 'RABATT1' || row.artikel_nr === 'RABATT2')
			.reduce((total, row) => total + Number(row.ges_preis), 0)
	);

	const mwstZeilen = $derived.by(() => {
		const vorhanden = details?.verkauf_mwst ?? [];
		const zeilen = [0, 0.07, 0.19].map(
			(satz) =>
				vorhanden.find((row) => Math.abs(Number(row.mwst_satz) - satz) < 0.0001) ?? {
					mwst_satz: satz,
					mwst_betrag: 0
				}
		);
		for (const row of vorhanden) {
			if (![0, 0.07, 0.19].some((satz) => Math.abs(Number(row.mwst_satz) - satz) < 0.0001)) {
				zeilen.push(row);
			}
		}
		return zeilen;
	});

	const spezialKinds: Record<string, PositionKind> = {
		RABATT1: 'rabatt',
		RABATT2: 'rechnung_rabatt',
		ANPASSUNG: 'preisanpassung',
		ANZAHLUNG: 'anzahlung',
		ANZAHLAUFLOES: 'anzahlungsaufloesung',
		GUTSCHEINEINLOES: 'gutschein'
	};

	function toPosition(row: VerkaufDetail): Position {
		const stueckzahl = row.stueckzahl || 1;
		const kind =
			row.rabatt_id != null
				? 'rabatt'
				: row.ist_pfand
					? 'pfand'
					: (spezialKinds[row.artikel_nr ?? ''] ?? 'artikel');
		const name =
			kind === 'gutschein' && row.gutschein_nr != null
				? `Einlösung Gutschein Nr. ${row.gutschein_nr}`
				: (row.aktionsname ?? row.artikel_name ?? '');
		return {
			ref: `vd-${row.vd_id}`,
			parent_ref: null,
			kind,
			artikel_id: row.artikel_id ?? 0,
			artikel_name: name,
			kurzname: row.artikel_kurzname,
			lieferant_kurzname: row.lieferant_kurzname,
			artikel_nr: row.artikel_nr ?? '',
			stueckzahl,
			einzelpreis: row.ges_preis / stueckzahl,
			ges_preis: Number(row.ges_preis),
			mwst_satz: Number(row.mwst_satz),
			variabler_preis: Boolean(row.artikel_variabler_preis),
			rabatt_id: row.rabatt_id,
			aktionsname: row.aktionsname,
			rabatt_absolut: null,
			hat_rabatt: false
		};
	}

	function datum(value: string) {
		return new Date(value).toLocaleString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			year: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function initTable() {
		if (!tableEl) return;
		const { default: DataTable } = await import('datatables.net-dt');
		dataTable?.destroy();
		const columns = nurHeute
			? [{ orderable: false, searchable: false, targets: [9] }]
			: [{ orderable: false, searchable: false, targets: [] }];
		const smallScreen = window.matchMedia('(max-width: 1100px)').matches;
		dataTable = new DataTable(tableEl, {
			order: [],
			pageLength: smallScreen ? 10 : 25,
			lengthMenu: [10, 25, 50, 100],
			columnDefs: columns,
			language: {
				search: 'Suche:',
				lengthMenu: '_MENU_ pro Seite',
				info: '_START_ bis _END_ von _TOTAL_ Einträgen',
				infoEmpty: 'Keine Einträge',
				infoFiltered: '(gefiltert von _MAX_)',
				zeroRecords: 'Keine Verkäufe gefunden',
				emptyTable: 'Keine Verkäufe vorhanden',
				paginate: { first: 'Erste', previous: 'Zurück', next: 'Weiter', last: 'Letzte' }
			}
		});
	}

	async function load() {
		dataTable?.destroy();
		dataTable = undefined;
		loading = true;
		error = null;
		try {
			verkaeufe = await api<VerkaufUebersicht[]>(
				`verkauf/uebersicht?nur_heute=${nurHeute}&limit=500`
			);
		} catch (caught) {
			error = caught instanceof Error ? caught.message : String(caught);
			verkaeufe = [];
		} finally {
			loading = false;
		}
		await tick();
		await initTable();
	}

	async function auswaehlen(verkauf: VerkaufUebersicht) {
		selectedNr = verkauf.rechnungs_nr;
		try {
			details = await api<VerkaufDetails>(`verkauf/${verkauf.rechnungs_nr}`);
		} catch (caught) {
			details = null;
			error = caught instanceof Error ? caught.message : String(caught);
		}
	}

	async function stornieren() {
		if (!storno) return;
		stornoBusy = true;
		error = null;
		try {
			await api(`verkauf/${storno.rechnungs_nr}/storno`, { method: 'POST' });
			storno = null;
			selectedNr = null;
			details = null;
			await load();
		} catch (caught) {
			error = caught instanceof Error ? caught.message : String(caught);
			storno = null;
		} finally {
			stornoBusy = false;
		}
	}

	onMount(load);
</script>

{#if error}
	<Alert severity="error">{error}</Alert>
{/if}

<div class="inhalt">
	<div class="tabelle">
		{#if loading}
			<p class="hinweis">Lade Verkäufe…</p>
		{:else}
			<table class="display" bind:this={tableEl}>
				<thead>
					<tr>
						<th>Nr.</th>
						<th>Datum</th>
						<th>Summe</th>
						<th>7% MwSt</th>
						<th>19% MwSt</th>
						<th>Zahlungsart</th>
						<th>Kunde gibt</th>
						<th>Storniert Nr.</th>
						<th>User</th>
						{#if nurHeute}<th>Storno</th>{/if}
					</tr>
				</thead>
				<tbody>
					{#each verkaeufe as verkauf (verkauf.rechnungs_nr)}
						<tr
							class:selected={selectedNr === verkauf.rechnungs_nr}
							onclick={() => auswaehlen(verkauf)}
							onkeydown={(event) => {
								if (event.key === 'Enter') auswaehlen(verkauf);
							}}
							tabindex="0"
						>
							<td>{verkauf.rechnungs_nr}</td>
							<td data-order={verkauf.verkaufsdatum}>{datum(verkauf.verkaufsdatum)}</td>
							<td data-order={verkauf.summe}><strong>{euro(verkauf.summe)}</strong></td>
							<td data-order={verkauf.mwst_7}>{euro(verkauf.mwst_7)}</td>
							<td data-order={verkauf.mwst_19}>{euro(verkauf.mwst_19)}</td>
							<td>{verkauf.ec_zahlung ? 'Karte' : 'Bar'}</td>
							<td data-order={verkauf.kunde_gibt ?? ''}>{euro(verkauf.kunde_gibt)}</td>
							<td>{verkauf.storno_von ?? ''}</td>
							<td>{verkauf.username ?? ''}</td>
							{#if nurHeute}
								<td>
									{#if verkauf.storno_von == null}
										<button
											type="button"
											class="storno"
											title="Stornieren"
											onclick={(event) => {
												event.stopPropagation();
												storno = verkauf;
											}}
										>
											<Trash2 size={16} />
										</button>
									{/if}
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<div class="details">
		{#if details}
			<div class="positionen">
				{#each positionen as position (position.ref)}
					<KassierArtikel
						{position}
						readonly
						selected={false}
						onselect={() => {}}
						onquantity={() => {}}
						onremove={() => {}}
						onprice={() => {}}
					/>
				{/each}
			</div>
			<div class="zahlen">
				<div class="summe">
					<span>Summe:</span><span><strong>{euro(summe)}</strong></span>
				</div>
				{#each mwstZeilen as zeile (zeile.mwst_satz)}
					<div class="mwst-zeile {vatSeverity(Number(zeile.mwst_satz))}">
						<span>inkl. {Math.round(Number(zeile.mwst_satz) * 100)}% MwSt:</span>
						<span>{euro(zeile.mwst_betrag)}</span>
					</div>
				{/each}
				<div class="rabatte"><span>Rabatte:</span><span>{euro(rabatte)}</span></div>
			</div>
		{:else}
			<p class="hinweis">Für Details einen Verkauf auswählen.</p>
		{/if}
	</div>
</div>

<Modal open={storno != null} title="Verkauf stornieren" onclose={() => (storno = null)}>
	<p>
		Verkauf Nr. {storno?.rechnungs_nr} über <strong>{euro(storno?.summe)}</strong> wirklich stornieren?
	</p>
	<div class="modal-actions">
		<button type="button" class="secondary" onclick={() => (storno = null)}>Nein</button>
		<button type="button" class="primary" disabled={stornoBusy} onclick={stornieren}>Ja</button>
	</div>
</Modal>

<style>
	.inhalt {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	/* Large screens: fill the page, each pane scrolls on its own. */
	@media (min-width: 1101px) {
		.inhalt {
			height: 100%;
			gap: 0;
			align-items: stretch;
		}

		.tabelle {
			overflow: auto;
			min-height: 0;
			padding-right: 1rem;
		}

		.details {
			overflow-y: auto;
			min-height: 0;
			padding-left: 1rem;
			padding-right: 1rem;
			border-left: 1px solid var(--border);
		}

		.details > * {
			flex-shrink: 0;
		}
	}

	.tabelle {
		flex: 1 1 66%;
		min-width: 0;
		overflow-x: auto;
	}

	.details {
		flex: 1 1 34%;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.positionen {
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background-color: var(--surface);
		overflow: hidden;
	}

	.zahlen {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.6rem;
		border: 1px solid var(--text);
		border-radius: 0.5rem;
	}

	.zahlen div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}

	.zahlen .mwst-zeile {
		padding: 0.1rem 0.35rem;
		border-radius: 0.25rem;
	}

	.zahlen .mwst-zeile.success {
		background-color: var(--alert-success);
		color: #fff;
	}

	.zahlen .mwst-zeile.info {
		background-color: var(--alert-info);
		color: #fff;
	}

	.zahlen .mwst-zeile.error {
		background-color: var(--alert-error);
		color: #fff;
	}

	.zahlen .rabatte {
		font-style: italic;
	}

	.hinweis {
		margin: 0;
		font-size: 0.9rem;
		opacity: 0.7;
	}

	.storno {
		display: grid;
		place-items: center;
		padding: 0.25rem;
		border: none;
		border-radius: 0.25rem;
		background-color: var(--alert-error);
		color: #fff;
		cursor: pointer;
	}

	.storno:hover {
		filter: brightness(0.92);
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
		background-color: var(--alert-error);
		color: #fff;
	}

	.modal-actions .secondary {
		background-color: var(--border);
		color: var(--text);
	}

	/* DataTables follows the theme colours. */
	:global(.dt-container) {
		color: var(--text);
	}

	:global(.dt-container .dt-search input),
	:global(.dt-container .dt-length select) {
		padding: 0.25rem 0.4rem;
		border: 1px solid var(--border);
		border-radius: 0.25rem;
		background-color: var(--input-bg);
		color: var(--text);
		font: inherit;
	}

	:global(table.dataTable) {
		background-color: transparent;
		color: var(--text);
	}

	:global(table.dataTable) {
		font-size: 0.9rem;
	}

	:global(table.dataTable thead th),
	:global(table.dataTable tbody td) {
		padding: 0.35rem 0.45rem;
		border-bottom: 1px solid var(--border);
	}

	:global(table.dataTable thead th) {
		color: var(--text);
	}

	:global(table.dataTable tbody tr) {
		background-color: transparent;
	}

	:global(table.dataTable tbody tr.selected),
	:global(table.dataTable tbody tr.selected td) {
		background-color: var(--selection);
		color: #fff;
	}

	:global(.dt-container .dt-paging .dt-paging-button) {
		color: var(--text);
	}

	:global(.dt-container .dt-paging .dt-paging-button.current) {
		background-color: var(--primary);
		color: #000;
	}

	@media (max-width: 1100px) {
		.inhalt {
			flex-direction: column;
		}

		.tabelle,
		.details {
			flex: none;
			width: 100%;
		}
	}
</style>
