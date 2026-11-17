<script lang="ts">
	import {
		Barcode,
		CircleHelp,
		Hash,
		ListOrdered,
		ShoppingCart,
		Trash2,
		Type
	} from '@lucide/svelte';
	import Alert from '#lib/Alert.svelte';
	import KassierArtikel from '#lib/KassierArtikel.svelte';
	import PillGroup from '#lib/PillGroup.svelte';
	import Suchfeld from '#lib/Suchfeld.svelte';
	import Thumbnail from '#lib/Thumbnail.svelte';
	import { api } from '#lib/api.js';
	import { euro } from '#lib/format.js';
	import { thumbnailSize } from '#lib/theme.js';
	import { WarenkorbStore } from '#lib/warenkorb.svelte.js';
	import type { Artikel } from '#lib/types.js';

	const store = new WarenkorbStore();

	let modus = $state<'normal' | 'leergut' | 'rueckgabe'>('normal');
	let error = $state<string | null>(null);
	let info = $state<string | null>(null);
	let barcodeFeld: Suchfeld | undefined = $state();

	const modi = [
		{ value: 'normal', label: 'Normal' },
		{ value: 'leergut', label: 'Leergut' },
		{ value: 'rueckgabe', label: 'Rückgabe' }
	];

	const mwstZeilen = $derived(store.summen?.mwst ?? []);

	async function run(action: () => Promise<void>) {
		error = null;
		try {
			await action();
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
		await run(async () => {
			await store.add(artikel, modus);
			barcodeFeld?.focus();
		});
	}

	function kurz(text: string, length = 100) {
		return text.length > length ? `${text.slice(0, length)}…` : text;
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
						placeholder="Artikelname"
						trigger="input"
						minChars={3}
						search={searchName}
						onselect={addArtikel}
					>
						{#snippet children(artikel)}
							<Thumbnail artikelId={artikel.artikel_id} size={thumbnailSize} />
							<em>{artikel.lieferant_name}</em>
							<span>{kurz(artikel.artikel_name)}</span>
						{/snippet}
					</Suchfeld>
				</div>
			</section>

			<section>
				<h3><CircleHelp size={20} /> Artikel mit var. Preis</h3>
				<p class="hint">Wird in Kürze ergänzt.</p>
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
							onselect={() => store.toggleSelected(position.ref)}
							onquantity={(ref, stueckzahl) => run(() => store.changeQuantity(ref, stueckzahl))}
							onremove={(ref) => run(() => store.remove(ref))}
							onprice={() => {}}
						/>
					{/each}
				</div>
			</section>

			<section class="summen">
				<div class="zahlen">
					<div><span>Zwischensumme:</span><span>{euro(store.summen?.zwischensumme)} €</span></div>
					{#each mwstZeilen as zeile (zeile.mwst_satz)}
						<div>
							<span>inkl. {zeile.mwst_satz * 100}% MwSt:</span>
							<span>{euro(zeile.mwst_betrag)} €</span>
						</div>
					{/each}
					<div><span>Rabatte:</span><span>{euro(store.summen?.rabatte)} €</span></div>
				</div>
				<div class="zahlung">
					<p class="hinweis">Zahlungsbereich in Arbeit.</p>
				</div>
			</section>
		</div>
	</div>
</main>

<style>
	main {
		padding: 1rem;
	}

	h1 {
		margin: 0 0 1rem;
	}

	.layout {
		display: flex;
		gap: 1rem;
		height: calc(100vh - 5rem);
	}

	.auswahl {
		display: flex;
		flex: 1 1 33%;
		flex-direction: column;
		gap: 1rem;
		min-width: 22rem;
		overflow-y: auto;
	}

	.warenkorb {
		display: flex;
		flex: 1 1 66%;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
	}

	section {
		padding: 0.75rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background-color: var(--surface);
	}

	.auswahl section {
		display: flex;
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
		height: 350px;
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

	.hinweis {
		margin: 0;
		font-size: 0.85rem;
		opacity: 0.7;
	}
</style>
