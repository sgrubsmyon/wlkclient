<script lang="ts">
	import {
		BadgeEuro,
		BanknoteArrowDown,
		BanknoteArrowUp,
		Barcode,
		CircleHelp,
		Check,
		CirclePercent,
		CreditCard,
		Gift,
		Hash,
		ListOrdered,
		ShoppingCart,
		Trash2,
		Type
	} from '@lucide/svelte';
	import Alert from '#lib/Alert.svelte';
	import KassierArtikel from '#lib/KassierArtikel.svelte';
	import Modal from '#lib/Modal.svelte';
	import TextInput from '#lib/TextInput.svelte';
	import PillGroup from '#lib/PillGroup.svelte';
	import Suchfeld from '#lib/Suchfeld.svelte';
	import Thumbnail from '#lib/Thumbnail.svelte';
	import { api } from '#lib/api.js';
	import { euro, parseDecimal } from '#lib/format.js';
	import { thumbnailSize } from '#lib/theme.js';
	import { WarenkorbStore } from '#lib/warenkorb.svelte.js';
	import type { Artikel, Gutschein } from '#lib/types.js';

	const store = new WarenkorbStore();

	let modus = $state<'normal' | 'leergut' | 'rueckgabe'>('normal');
	let error = $state<string | null>(null);
	let info = $state<string | null>(null);
	let barcodeFeld: Suchfeld | undefined = $state();
	let nameFeld: Suchfeld | undefined = $state();
	let preisModal = $state<Artikel | null>(null);
	let preisEingabe = $state('');
	let anzahlungModal = $state<'neu' | 'aufloesen' | null>(null);
	let anzahlungEingabe = $state('');
	let offeneAnzahlungen = $state<{ nr: number; datum: string; betrag: number }[]>([]);
	let anzahlungLaden = $state(false);
	let ecZahlung = $state(false);
	let kundeGibt = $state('');
	let gutscheinModal = $state(false);
	let gutscheinNr = $state('');
	let gutscheinBetrag = $state('');
	let gutscheinSuche = $state<Gutschein | null>(null);
	let gutscheinFehler = $state<string | null>(null);

	const zahlungsarten = [
		{ value: 'bar', label: 'Bar' },
		{ value: 'karte', label: 'Karte' }
	];
	const zahlungsart = $derived(ecZahlung ? 'karte' : 'bar');
	const kundeGibtWert = $derived(parseDecimal(kundeGibt));

	const modi = [
		{ value: 'normal', label: 'Normal' },
		{ value: 'leergut', label: 'Leergut' },
		{ value: 'rueckgabe', label: 'Rückgabe' }
	];

	const mwstZeilen = $derived.by(() => {
		const vorhanden = store.summen?.mwst ?? [];
		const zeilen = [0, 0.07, 0.19].map(
			(satz) =>
				vorhanden.find((zeile) => zeile.mwst_satz === satz) ?? { mwst_satz: satz, mwst_betrag: 0 }
		);
		for (const zeile of vorhanden) {
			if (![0, 0.07, 0.19].includes(zeile.mwst_satz)) zeilen.push(zeile);
		}
		return zeilen;
	});
	const canPercent = $derived(
		!store.depositActive &&
			(store.staged
				? store.hasUndiscountedArticle
				: store.selectedSources.some((row) => row.kind === 'artikel'))
	);
	const canSingle = $derived(
		!store.depositActive && !store.staged && store.selectedSources.length === 1
	);
	const canMitarbeiter = $derived(
		!store.depositActive && store.staged && store.hasUndiscountedArticle
	);
	const prozentWerte = [5, 10, 15, 20, 25];

	let rabattProzent = $state('');
	let rabattEuro = $state('');
	let abweichenderPreis = $state('');

	async function run(action: () => Promise<void>) {
		error = null;
		try {
			await action();
			await store.refreshDeposit();
		} catch (caught) {
			error = caught instanceof Error ? caught.message : String(caught);
		}
	}

	async function searchBarcode(term: string) {
		return api<Artikel[]>(`artikel/?search_string=${encodeURIComponent(term)}&limit=20`);
	}

	async function searchNummer(term: string) {
		return api<Artikel[]>(`artikel/?artikel_nr=${encodeURIComponent(term)}&limit=20`);
	}

	async function searchName(term: string) {
		return api<Artikel[]>(`artikel/?artikel_name=${encodeURIComponent(term)}&limit=20`);
	}

	async function addArtikel(artikel: Artikel) {
		if (artikel.variabler_preis && modus === 'normal') {
			preisModal = artikel;
			preisEingabe = '';
			return;
		}
		await run(async () => {
			await store.add(artikel, modus);
			barcodeFeld?.focus();
		});
	}

	async function prozentRabatt(wert: number) {
		await run(async () => {
			const spec = { art: 'relativ' as const, wert };
			if (store.staged) await store.applyRechnungRabatt(spec);
			else await store.applyRabatt(spec);
		});
	}

	async function individuellProzent() {
		const wert = parseDecimal(rabattProzent);
		if (wert == null || wert <= 0 || wert >= 100) {
			error = 'Bitte einen Rabatt zwischen 0 und 100 % eingeben.';
			return;
		}
		rabattProzent = '';
		await prozentRabatt(wert / 100);
	}

	async function individuellEuro() {
		const wert = parseDecimal(rabattEuro);
		if (wert == null || wert <= 0) {
			error = 'Bitte einen Rabatt größer als 0 eingeben.';
			return;
		}
		const selected = store.selectedSources[0];
		if (!selected) return;
		rabattEuro = '';
		await run(() => store.applyRabatt({ art: 'absolut', wert }));
	}

	async function abweichendenPreisSetzen() {
		const wert = parseDecimal(abweichenderPreis);
		if (wert == null || wert <= 0) {
			error = 'Bitte einen Preis größer als 0 eingeben.';
			return;
		}
		const selected = store.selectedSources[0];
		if (!selected) return;
		abweichenderPreis = '';
		await run(() => store.applyAbweichenderPreis(selected.ref, wert));
	}

	async function artikelByNr(nr: string) {
		const found = await api<Artikel[]>(`artikel/?artikel_nr=${nr}&limit=1`);
		if (!found.length) throw new Error(`Artikel ${nr} nicht gefunden`);
		await addArtikel(found[0]);
	}

	async function neueAnzahlung() {
		const betrag = parseDecimal(anzahlungEingabe);
		if (betrag == null || betrag <= 0) {
			error = 'Bitte einen Betrag größer als 0 eingeben.';
			return;
		}
		anzahlungModal = null;
		anzahlungEingabe = '';
		await run(() => store.previewAnzahlung(betrag, null));
	}

	async function openAnzahlungenLaden() {
		anzahlungLaden = true;
		error = null;
		try {
			const offen = await api<{ anzahlung_in_rech_nr: number; datum: string }[]>('anzahlung/offen');
			offeneAnzahlungen = await Promise.all(
				offen.map(async (eintrag) => {
					const verkauf = await api<{ verkauf_details?: { ges_preis: number }[] }>(
						`verkauf/${eintrag.anzahlung_in_rech_nr}`
					);
					const betrag = (verkauf.verkauf_details ?? []).reduce(
						(summe, detail) => summe + detail.ges_preis,
						0
					);
					return { nr: eintrag.anzahlung_in_rech_nr, datum: eintrag.datum, betrag };
				})
			);
		} catch (caught) {
			error = caught instanceof Error ? caught.message : String(caught);
		} finally {
			anzahlungLaden = false;
		}
	}

	async function anzahlungAufloesen(nr: number) {
		anzahlungModal = null;
		await run(() => store.previewAnzahlung(null, nr));
	}

	function closeAnzahlungModal() {
		anzahlungModal = null;
		anzahlungEingabe = '';
	}

	async function zurZahlung() {
		if (store.isEmpty) {
			error = 'Der Warenkorb ist leer.';
			return;
		}
		store.staged = true;
		await refreshTotals();
	}

	async function refreshTotals() {
		error = null;
		try {
			await store.refresh(kundeGibtWert);
		} catch (caught) {
			error = caught instanceof Error ? caught.message : String(caught);
		}
	}

	function setZahlungsart(art: string) {
		ecZahlung = art === 'karte';
		if (ecZahlung) kundeGibt = '';
		void refreshTotals();
	}

	async function gutscheinSuchen() {
		gutscheinFehler = null;
		gutscheinSuche = null;
		const nr = Number.parseInt(gutscheinNr, 10);
		if (!Number.isFinite(nr)) {
			gutscheinFehler = 'Bitte eine Gutschein-Nr. eingeben.';
			return;
		}
		try {
			const treffer = await api<Gutschein[]>(`gutschein/?gutschein_nr=${nr}&limit=100`);
			if (!treffer.length) {
				gutscheinFehler = 'Gutschein nicht gefunden.';
				return;
			}
			const aktuell = treffer.reduce((a, b) => (a.gutschein_id > b.gutschein_id ? a : b));
			const ausstehend = await api<Gutschein[]>('gutschein/ausstehend');
			const anfang = ausstehend.find((g) => g.gutschein_nr === nr);
			gutscheinSuche = {
				...aktuell,
				restbetrag_anfang: anfang?.restbetrag_anfang ?? aktuell.restbetrag
			};
		} catch (caught) {
			gutscheinFehler = caught instanceof Error ? caught.message : String(caught);
		}
	}

	async function gutscheinUebernehmen() {
		gutscheinFehler = null;
		if (!gutscheinSuche) {
			gutscheinFehler = 'Bitte zuerst den Gutschein suchen.';
			return;
		}
		const betrag = parseDecimal(gutscheinBetrag);
		if (betrag == null || betrag <= 0) {
			gutscheinFehler = 'Bitte einen Betrag größer als 0 eingeben.';
			return;
		}
		if (betrag > gutscheinSuche.restbetrag) {
			gutscheinFehler = `Der Gutschein hat nur noch ${euro(gutscheinSuche.restbetrag)} Guthaben.`;
			return;
		}
		store.addGutschein(gutscheinSuche.gutschein_nr, betrag, gutscheinSuche.restbetrag);
		gutscheinModal = false;
		gutscheinSuche = null;
		gutscheinNr = '';
		gutscheinBetrag = '';
		await refreshTotals();
	}

	async function buchungAbschliessen() {
		error = null;
		info = null;
		try {
			const verkauf = await store.abschliessen({
				ecZahlung,
				kundeGibt: ecZahlung ? null : (kundeGibtWert ?? null),
				anzahlungBetrag: store.anzahlungBetrag,
				anzahlungAufloesenNr: store.anzahlungAufloesenNr
			});
			info = `Buchung abgeschlossen. Rechnung Nr. ${verkauf.rechnungs_nr}.`;
			if (verkauf.change != null) {
				info += ` Rückgeld: ${euro(verkauf.change)}.`;
			}
			if (verkauf.ec_warning) info += ` ${verkauf.ec_warning}`;
			kundeGibt = '';
			ecZahlung = false;
			gutscheinModal = false;
			gutscheinSuche = null;
			barcodeFeld?.focus();
		} catch (caught) {
			error = caught instanceof Error ? caught.message : String(caught);
		}
	}

	function closePreisModal() {
		preisModal = null;
		preisEingabe = '';
		barcodeFeld?.focus();
	}

	async function preisUebernehmen() {
		if (!preisModal) return;
		const preis = parseDecimal(preisEingabe);
		if (preis == null || preis <= 0) {
			error = 'Bitte einen Preis größer als 0 eingeben.';
			return;
		}
		const artikel = preisModal;
		closePreisModal();
		await run(() => store.add(artikel, 'normal', preis));
	}
</script>

<main>
	<h1>Kassieren</h1>

	{#if error}
		<Alert severity="error">{error}</Alert>
	{/if}
	{#if info}
		<Alert severity="success">{info}</Alert>
	{/if}

	<div class="layout">
		<div class="auswahl">
			<section>
				<h3><ListOrdered size={20} /> Artikel hinzufügen</h3>
				<PillGroup options={modi} bind:value={modus} />
				{#if modus === 'leergut'}
					<p class="hint">Der Pfand des nächsten Artikels wird als Leergut zurückgenommen.</p>
				{:else if modus === 'rueckgabe'}
					<p class="hint">Der nächste Artikel wird mit negativem Preis zurückgenommen.</p>
				{/if}

				<div class="feld">
					<Barcode size={20} />
					<span class="label">Barcode</span>
					<Suchfeld
						bind:this={barcodeFeld}
						placeholder="Barcode scannen und Enter"
						trigger="enter"
						search={searchBarcode}
						onselect={addArtikel}
					>
						{#snippet children(artikel)}
							<Thumbnail artikelId={artikel.artikel_id} size={thumbnailSize} />
							<span>{artikel.barcode ?? artikel.artikel_nr}</span>
						{/snippet}
					</Suchfeld>
				</div>

				<div class="feld">
					<Hash size={20} />
					<span class="label">Art.-Nr.</span>
					<Suchfeld
						placeholder="Artikelnummer"
						trigger="input"
						minChars={3}
						search={searchNummer}
						onselect={addArtikel}
					>
						{#snippet children(artikel)}
							<Thumbnail artikelId={artikel.artikel_id} size={thumbnailSize} />
							<em>{artikel.lieferant_name}</em>
							<span>{artikel.artikel_nr}</span>
						{/snippet}
					</Suchfeld>
				</div>

				<div class="feld">
					<Type size={20} />
					<span class="label">Art.-Name</span>
					<Suchfeld
						bind:this={nameFeld}
						placeholder="Artikelname"
						trigger="input"
						minChars={3}
						wide
						search={searchName}
						onselect={addArtikel}
					>
						{#snippet children(artikel)}
							<Thumbnail artikelId={artikel.artikel_id} size={thumbnailSize} />
							<em>{artikel.lieferant_name}</em>
							<span class="artikel-name">{artikel.artikel_name}</span>
						{/snippet}
					</Suchfeld>
				</div>
			</section>

			<section>
				<h3><CircleHelp size={20} /> Artikel mit var. Preis</h3>
				<div class="grid-buttons">
					<button type="button" onclick={() => nameFeld?.setTerm('Sonstiges', true)}>
						Sonstiges
					</button>
					<button type="button" onclick={() => run(() => artikelByNr('SONSTIGES1'))}>
						7% MwSt
					</button>
					<button type="button" onclick={() => run(() => artikelByNr('GUTSCHEIN'))}>
						<Gift size={18} /> Gutschein verkaufen
					</button>
					<button type="button" onclick={() => run(() => artikelByNr('SONSTIGES2'))}>
						19% MwSt
					</button>
				</div>
			</section>

			<section>
				<h3>
					<CirclePercent size={20} />
					{store.staged ? 'Rabatt auf Rechnung' : 'Rabatt auf ausgewählte Artikel'}
				</h3>
				<div class="rabatt-buttons">
					{#each prozentWerte as prozent (prozent)}
						<button
							type="button"
							disabled={!canPercent}
							onclick={() => prozentRabatt(prozent / 100)}
						>
							{prozent}%
						</button>
					{/each}
					<button type="button" disabled={!canMitarbeiter} onclick={() => prozentRabatt(0.1)}>
						Mitarbeiter
					</button>
				</div>
				<div class="individuell">
					<label for="rabatt-prozent">individuell:</label>
					<input
						id="rabatt-prozent"
						bind:value={rabattProzent}
						disabled={!canPercent}
						inputmode="decimal"
					/>
					<span>%</span>
					<button type="button" disabled={!canPercent} onclick={individuellProzent}>OK</button>
					<label for="rabatt-euro">individuell:</label>
					<input
						id="rabatt-euro"
						bind:value={rabattEuro}
						disabled={!canSingle}
						inputmode="decimal"
					/>
					<span>€</span>
					<button type="button" disabled={!canSingle} onclick={individuellEuro}>OK</button>
					<label for="abweichender-preis">Abweichender Preis:</label>
					<input
						id="abweichender-preis"
						bind:value={abweichenderPreis}
						disabled={!canSingle}
						inputmode="decimal"
					/>
					<span>€</span>
					<button type="button" disabled={!canSingle} onclick={abweichendenPreisSetzen}>
						OK
					</button>
				</div>
			</section>

			<section>
				<h3><BanknoteArrowUp size={20} /> Anzahlung</h3>
				<div class="anzahlung-buttons">
					<button
						type="button"
						onclick={() => {
							anzahlungModal = 'neu';
							anzahlungEingabe = '';
						}}
					>
						<BanknoteArrowUp size={18} /> Neue Anzahlung
					</button>
					<button
						type="button"
						onclick={() => {
							anzahlungModal = 'aufloesen';
							offeneAnzahlungen = [];
							void openAnzahlungenLaden();
						}}
					>
						<BanknoteArrowDown size={18} /> Anzahlung auflösen
					</button>
				</div>
				{#if store.depositActive}
					<div class="anzahlung-info">
						<span>
							{store.anzahlungBetrag != null
								? `Neue Anzahlung über ${euro(store.anzahlungBetrag)}`
								: `Anzahlung aus Rechnung Nr. ${store.anzahlungAufloesenNr}`}
						</span>
						<button type="button" onclick={() => run(() => store.previewAnzahlung(null, null))}>
							Abbrechen
						</button>
					</div>
				{/if}
			</section>
		</div>

		<div class="warenkorb">
			<section class="liste">
				<div class="kopf">
					<span class="titel"><ShoppingCart size={20} /> Warenkorb</span>
					<button type="button" class="loeschen" onclick={() => run(() => store.clear())}>
						<Trash2 size={18} /> Alles löschen
					</button>
				</div>
				<div class="positionen">
					{#if store.isEmpty}
						<p class="leer">Der Warenkorb ist leer.</p>
					{/if}
					{#each store.positionen as position (position.ref)}
						<KassierArtikel
							{position}
							selected={store.isSelected(position.ref)}
							onselect={() => {
								if (position.kind === 'artikel') store.toggleSelected(position.ref);
							}}
							onquantity={(ref, stueckzahl) => run(() => store.changeQuantity(ref, stueckzahl))}
							onremove={(ref) => run(() => store.remove(ref))}
							onprice={(ref, preis) => run(() => store.applyAbweichenderPreis(ref, preis))}
						/>
					{/each}
				</div>
			</section>

			<section class="summen">
				<div class="zahlen">
					<div><span>Zwischensumme:</span><span>{euro(store.summen?.zwischensumme)}</span></div>
					{#each mwstZeilen as zeile (zeile.mwst_satz)}
						<div>
							<span>inkl. {Math.round(zeile.mwst_satz * 100)}% MwSt:</span>
							<span>{euro(zeile.mwst_betrag)}</span>
						</div>
					{/each}
					<div><span>Rabatte:</span><span>{euro(store.summen?.rabatte)}</span></div>
				</div>
				<div class="zahlung">
					<button
						type="button"
						class="zur-zahlung"
						disabled={store.isEmpty || store.staged}
						onclick={zurZahlung}
					>
						<CreditCard size={20} /> Zur Zahlung
					</button>

					<div class="zeile">
						<label for="zu-zahlen">ZU ZAHLEN:</label>
						<input
							id="zu-zahlen"
							class="gross"
							readonly
							value={store.staged ? `${euro(store.summen?.zu_zahlen)}` : ''}
						/>
					</div>

					<div class="zeile">
						<PillGroup
							options={zahlungsarten}
							value={zahlungsart}
							disabled={!store.staged}
							onchange={(value) => setZahlungsart(value)}
						/>
						<button
							type="button"
							class="gutschein"
							disabled={!store.staged}
							onclick={() => {
								gutscheinModal = true;
								gutscheinSuche = null;
								gutscheinFehler = null;
							}}
						>
							<BadgeEuro size={18} /> Gutschein
						</button>
					</div>

					{#if !ecZahlung}
						<div class="zeile cash">
							<label for="kunde-gibt">KUNDE GIBT:</label>
							<TextInput
								bind:value={kundeGibt}
								placeholder="Betrag"
								inputmode="decimal"
								disabled={!store.staged}
								onchange={() => void refreshTotals()}
								onenter={() => void refreshTotals()}
							/>
							<label for="rueckgeld">Rückgeld:</label>
							<input
								id="rueckgeld"
								readonly
								class="gross"
								value={store.summen?.rueckgeld != null ? `${euro(store.summen.rueckgeld)}` : ''}
							/>
						</div>
					{/if}

					<button
						type="button"
						class="abschluss"
						disabled={!store.staged || store.isEmpty}
						onclick={buchungAbschliessen}
					>
						<Check size={20} /> Buchung abschließen
					</button>
				</div>
			</section>
		</div>
	</div>
</main>

<Modal open={anzahlungModal === 'neu'} title="Neue Anzahlung" onclose={closeAnzahlungModal}>
	<div class="preis-zeile">
		<TextInput
			bind:value={anzahlungEingabe}
			placeholder="Betrag"
			inputmode="decimal"
			onenter={neueAnzahlung}
		/>
		<span>€</span>
	</div>
	<div class="modal-actions">
		<button type="button" class="secondary" onclick={closeAnzahlungModal}>Abbrechen</button>
		<button type="button" class="primary" onclick={neueAnzahlung}>Übernehmen</button>
	</div>
</Modal>

<Modal
	open={anzahlungModal === 'aufloesen'}
	title="Anzahlung auflösen"
	onclose={() => (anzahlungModal = null)}
>
	{#if anzahlungLaden}
		<p class="hint">Lade offene Anzahlungen…</p>
	{:else if !offeneAnzahlungen.length}
		<p class="hint">Es gibt keine offenen Anzahlungen.</p>
	{:else}
		<ul class="anzahlung-liste">
			{#each offeneAnzahlungen as eintrag (eintrag.nr)}
				<li>
					<button type="button" onclick={() => anzahlungAufloesen(eintrag.nr)}>
						<span>Rechnung Nr. {eintrag.nr}</span>
						<span>{new Date(eintrag.datum).toLocaleDateString('de-DE')}</span>
						<span>{euro(eintrag.betrag)}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</Modal>

<Modal open={gutscheinModal} title="Gutschein einlösen" onclose={() => (gutscheinModal = false)}>
	<div class="gutschein-form">
		<label for="gutschein-nr">Gutschein-Nr.:</label>
		<TextInput bind:value={gutscheinNr} inputmode="numeric" onenter={gutscheinSuchen} />
		<button type="button" class="secondary" onclick={gutscheinSuchen}>Suchen</button>
	</div>
	{#if gutscheinSuche}
		<dl class="gutschein-info">
			<dt>Restbetrag</dt>
			<dd>{euro(gutscheinSuche.restbetrag)}</dd>
			<dt>Ursprünglicher Betrag</dt>
			<dd>{euro(gutscheinSuche.restbetrag_anfang)}</dd>
			<dt>Gekauft am</dt>
			<dd>{new Date(gutscheinSuche.datum).toLocaleDateString('de-DE')}</dd>
		</dl>
		<div class="gutschein-form">
			<label for="gutschein-betrag">Einlösen:</label>
			<TextInput bind:value={gutscheinBetrag} inputmode="decimal" onenter={gutscheinUebernehmen} />
			<span>€</span>
		</div>
	{/if}
	{#if gutscheinFehler}
		<p class="gutschein-fehler">{gutscheinFehler}</p>
	{/if}
	<div class="modal-actions">
		<button type="button" class="secondary" onclick={() => (gutscheinModal = false)}>
			Abbrechen
		</button>
		<button type="button" class="primary" onclick={gutscheinUebernehmen}>Einlösen</button>
	</div>
</Modal>

<Modal open={preisModal != null} title="Preis eingeben" onclose={closePreisModal}>
	<p class="hint">{preisModal?.artikel_name}</p>
	<div class="preis-zeile">
		<TextInput
			bind:value={preisEingabe}
			placeholder="Preis"
			inputmode="decimal"
			onenter={preisUebernehmen}
		/>
		<span>€</span>
	</div>
	<div class="modal-actions">
		<button type="button" class="secondary" onclick={closePreisModal}>Abbrechen</button>
		<button type="button" class="primary" onclick={preisUebernehmen}>Übernehmen</button>
	</div>
</Modal>

<style>
	main {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		flex: 1;
		box-sizing: border-box;
		min-height: 0;
		padding: 1rem;
		overflow: hidden;
	}

	h1 {
		margin: 0;
	}

	.layout {
		display: flex;
		flex: 1;
		gap: 1rem;
		min-height: 0;
	}

	.auswahl {
		display: flex;
		flex: 1 1 33%;
		flex-direction: column;
		gap: 1rem;
		min-height: 0;
		min-width: 22rem;
		overflow-y: auto;
	}

	.warenkorb {
		display: flex;
		flex: 1 1 66%;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
		min-height: 0;
	}

	section {
		box-sizing: border-box;
		padding: 0.75rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background-color: var(--surface);
	}

	.auswahl section {
		display: flex;
		flex-shrink: 0;
		flex-direction: column;
		gap: 0.6rem;
	}

	h3 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		font-size: 1.05rem;
	}

	.feld {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.label {
		width: 4.5rem;
		font-size: 0.9rem;
	}

	.hint {
		margin: 0;
		font-size: 0.85rem;
		opacity: 0.8;
	}

	/* Long article names are clamped to two lines inside the search results. */
	.artikel-name {
		display: -webkit-box;
		overflow: hidden;
		overflow-wrap: anywhere;
		line-height: 1.2;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.warenkorb .liste {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
		padding: 0;
		overflow: hidden;
	}

	.kopf {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.6rem 0.75rem;
		border-bottom: 1px solid var(--border);
	}

	.titel {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 700;
	}

	.loeschen {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.7rem;
		border: none;
		border-radius: 0.375rem;
		background-color: var(--alert-error);
		color: #fff;
		font: inherit;
		cursor: pointer;
	}

	.loeschen:hover {
		filter: brightness(0.92);
	}

	.positionen {
		flex: 1;
		overflow-y: auto;
	}

	.leer {
		padding: 1rem;
		opacity: 0.7;
	}

	.summen {
		display: flex;
		gap: 1rem;
		min-height: 250px;
		flex-shrink: 0;
	}

	.zahlen,
	.zahlung {
		flex: 1;
		min-width: 0;
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

	.zahlung {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.grid-buttons {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.grid-buttons button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		min-height: 3rem;
		padding: 0.4rem;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		background-color: var(--surface);
		color: var(--text);
		font: inherit;
		cursor: pointer;
	}

	.grid-buttons button:hover {
		background-color: var(--primary);
		color: #000;
	}

	.rabatt-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.rabatt-buttons button,
	.individuell button {
		padding: 0.35rem 0.7rem;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		background-color: var(--surface);
		color: var(--text);
		font: inherit;
		cursor: pointer;
	}

	.rabatt-buttons button:hover:not(:disabled),
	.individuell button:hover:not(:disabled) {
		background-color: var(--primary);
		color: #000;
	}

	.rabatt-buttons button:disabled,
	.individuell button:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.individuell {
		display: grid;
		grid-template-columns: auto 5rem auto auto;
		align-items: center;
		gap: 0.4rem;
	}

	.individuell input {
		box-sizing: border-box;
		width: 100%;
		padding: 0.25rem 0.4rem;
		border: 1px solid var(--border);
		border-radius: 0.25rem;
		background-color: var(--input-bg);
		color: var(--text);
		font: inherit;
	}

	.anzahlung-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.anzahlung-buttons button {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.7rem;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		background-color: var(--surface);
		color: var(--text);
		font: inherit;
		cursor: pointer;
	}

	.anzahlung-buttons button:hover {
		background-color: var(--primary);
		color: #000;
	}

	.anzahlung-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		border-radius: 0.375rem;
		background-color: color-mix(in srgb, var(--alert-info) 15%, var(--surface));
		font-size: 0.9rem;
	}

	.anzahlung-info button {
		padding: 0.2rem 0.6rem;
		border: 1px solid var(--border);
		border-radius: 0.25rem;
		background: transparent;
		color: var(--text);
		font: inherit;
		cursor: pointer;
	}

	.anzahlung-liste {
		margin: 0.75rem 0 0;
		padding: 0;
		list-style: none;
	}

	.anzahlung-liste button {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		width: 100%;
		padding: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		margin-bottom: 0.35rem;
		background: transparent;
		color: var(--text);
		font: inherit;
		cursor: pointer;
	}

	.anzahlung-liste button:hover {
		background-color: var(--primary);
		color: #000;
	}

	.zur-zahlung {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.6rem;
		border: none;
		border-radius: 0.5rem;
		background-color: var(--selection);
		color: #fff;
		font: inherit;
		font-size: 1.1rem;
		cursor: pointer;
	}

	.zur-zahlung:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.zeile {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	/* Label and input stay together, also when the payment column is narrow. */
	.zeile.cash {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.35rem 0.5rem;
	}

	.zeile label {
		font-size: 0.9rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.zeile input.gross {
		flex: 1 1 6rem;
		min-width: 6rem;
		padding: 0.35rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		background-color: var(--input-bg);
		color: var(--text);
		font-size: 1.2rem;
		font-weight: 700;
		text-align: right;
	}

	.gutschein {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.8rem;
		border: none;
		border-radius: 999px;
		background-color: var(--alert-fatal);
		color: #fff;
		font: inherit;
		cursor: pointer;
	}

	.gutschein:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.abschluss {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: auto;
		padding: 0.6rem;
		border: none;
		border-radius: 0.5rem;
		background-color: var(--green);
		color: #000;
		font: inherit;
		font-size: 1.1rem;
		font-weight: 700;
		cursor: pointer;
	}

	.abschluss:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.gutschein-form {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.6rem;
	}

	.gutschein-info {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.25rem 1rem;
		margin: 0.75rem 0 0;
	}

	.gutschein-info dd {
		margin: 0;
		text-align: right;
	}

	.gutschein-fehler {
		margin: 0.5rem 0 0;
		color: var(--alert-error);
	}

	.preis-zeile {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.75rem;
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
		background-color: var(--green);
		color: #000;
	}

	.modal-actions .secondary {
		background-color: var(--border);
		color: var(--text);
	}
</style>
