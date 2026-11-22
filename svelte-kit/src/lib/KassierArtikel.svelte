<script lang="ts">
	import { Minus, Plus, Trash2 } from '@lucide/svelte';
	import Modal from '#lib/Modal.svelte';
	import Thumbnail from '#lib/Thumbnail.svelte';
	import { euro, parseDecimal, vatLabel, vatSeverity } from '#lib/format.js';
	import { cartThumbnailSize } from '#lib/theme.js';
	import type { Position } from '#lib/types.js';

	let {
		position,
		selected,
		readonly = false,
		onselect,
		onquantity,
		onremove,
		onprice
	}: {
		position: Position;
		selected: boolean;
		readonly?: boolean;
		onselect: () => void;
		onquantity: (ref: string, stueckzahl: number) => void;
		onremove: (ref: string) => void;
		onprice: (ref: string, preis: number) => void;
	} = $props();

	const indented = $derived(position.parent_ref != null);
	const hasImage = $derived(['artikel', 'leergut', 'rueckgabe'].includes(position.kind));
	const interactive = $derived(
		!indented &&
			!readonly &&
			(position.kind === 'artikel' || position.kind === 'leergut' || position.kind === 'rueckgabe')
	);
	const editablePrice = $derived(position.variabler_preis && !indented && !readonly);
	const total = $derived(euro(position.ges_preis));
	const name = $derived(position.aktionsname || position.artikel_name);

	let bildOffen = $state(false);
	let bildFehler = $state(false);

	function zeigeBild() {
		bildFehler = false;
		bildOffen = true;
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="row {position.kind}"
	class:selected
	class:child={indented}
	role={interactive ? 'button' : undefined}
	tabindex={interactive ? 0 : undefined}
	onclick={() => interactive && onselect()}
	onkeydown={(event) => {
		if (interactive && (event.key === 'Enter' || event.key === ' ')) onselect();
	}}
>
	{#if hasImage}
		<button
			type="button"
			class="bild"
			title="Bild vergrößern"
			onclick={(event) => {
				event.stopPropagation();
				zeigeBild();
			}}
			onkeydown={(event) => event.stopPropagation()}
		>
			<Thumbnail artikelId={position.artikel_id} size={cartThumbnailSize} />
		</button>
	{/if}

	<div class="main">
		<div class="top">
			<span class="name" title={name}>{name}</span>
			<span class="badge {vatSeverity(position.mwst_satz)}">{vatLabel(position.mwst_satz)}</span>
			<div class="price">
				{#if editablePrice}
					<input
						class="price-input"
						value={String(position.einzelpreis).replace('.', ',')}
						inputmode="decimal"
						onclick={(event) => event.stopPropagation()}
						onkeydown={(event) => {
							event.stopPropagation();
							if (event.key === 'Enter') event.currentTarget.blur();
						}}
						onchange={(event) => {
							const parsed = parseDecimal(event.currentTarget.value);
							if (parsed != null && parsed > 0) onprice(position.ref, parsed * position.stueckzahl);
							else event.currentTarget.value = String(position.einzelpreis).replace('.', ',');
						}}
					/>
				{:else}
					<span>{euro(position.einzelpreis)}</span>
				{/if}
				<span>× {position.stueckzahl}</span>
			</div>
		</div>

		<div class="bottom">
			{#if hasImage}
				<span class="lieferant">{position.lieferant_kurzname ?? ''}</span>
				<span class="nr">{position.artikel_nr}</span>
			{:else}
				<span class="nr special">{position.artikel_nr}</span>
			{/if}

			{#if interactive}
				<div
					class="qty"
					onclick={(event) => event.stopPropagation()}
					onkeydown={(event) => event.stopPropagation()}
					role="presentation"
				>
					<button
						type="button"
						title="Stückzahl verringern"
						disabled={position.stueckzahl <= 1}
						onclick={() => onquantity(position.ref, position.stueckzahl - 1)}
					>
						<Minus size={16} />
					</button>
					<input
						class="qty-input"
						value={position.stueckzahl}
						inputmode="numeric"
						onchange={(event) => {
							const value = Number.parseInt(event.currentTarget.value, 10);
							if (Number.isFinite(value) && value >= 1) onquantity(position.ref, value);
							else event.currentTarget.value = String(position.stueckzahl);
						}}
					/>
					<button
						type="button"
						title="Stückzahl erhöhen"
						onclick={() => onquantity(position.ref, position.stueckzahl + 1)}
					>
						<Plus size={16} />
					</button>
				</div>
				<button
					type="button"
					class="remove"
					title="Artikel entfernen"
					onclick={(event) => {
						event.stopPropagation();
						onremove(position.ref);
					}}
				>
					<Trash2 size={16} />
				</button>
			{/if}

			<span class="gesamt">{total}</span>
		</div>
	</div>
</div>

<Modal open={bildOffen} title={name} onclose={() => (bildOffen = false)}>
	{#if bildFehler}
		<p class="kein-bild">Kein Bild vorhanden.</p>
	{:else}
		<img
			class="gross"
			src={`/api/artikel/${position.artikel_id}/bild`}
			alt={name}
			onerror={() => (bildFehler = true)}
		/>
	{/if}
</Modal>

<style>
	.row {
		display: flex;
		gap: 0.75rem;
		padding: 0.5rem;
		border-bottom: 1px solid var(--border);
		cursor: pointer;
	}

	.row.child {
		padding-left: 2.5rem;
		cursor: default;
	}

	.row.selected {
		background-color: var(--selection);
		color: #fff;
	}

	.main {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
	}

	.bild {
		align-self: flex-start;
		padding: 0;
		border: none;
		background: none;
		line-height: 0;
		cursor: zoom-in;
	}

	.gross {
		display: block;
		max-width: 100%;
		max-height: 70vh;
		border-radius: 0.25rem;
	}

	.kein-bild {
		margin: 0;
		opacity: 0.7;
	}

	.top {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.name {
		display: -webkit-box;
		flex: 1;
		min-width: 0;
		overflow: hidden;
		overflow-wrap: anywhere;
		font-size: 1.05rem;
		font-weight: 700;
		line-height: 1.2;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.badge {
		padding: 0.1rem 0.4rem;
		border-radius: 0.4rem;
		color: #fff;
		font-size: 0.7rem;
		white-space: nowrap;
	}

	.badge.success {
		background-color: var(--alert-success);
	}

	.badge.info {
		background-color: var(--alert-info);
	}

	.badge.error {
		background-color: var(--alert-error);
	}

	.price {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.85rem;
		white-space: nowrap;
	}

	.price-input {
		width: 6.5rem;
		padding: 0.15rem 0.35rem;
		border: 1px solid var(--border);
		border-radius: 0.25rem;
		background-color: var(--input-bg);
		color: var(--text);
		font: inherit;
		font-size: 0.85rem;
		text-align: right;
	}

	.bottom {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.8rem;
	}

	.lieferant {
		font-weight: 600;
	}

	.nr {
		font-style: italic;
		opacity: 0.8;
	}

	.qty {
		display: flex;
		align-items: center;
		gap: 0.15rem;
	}

	.qty button {
		display: grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		border: 1px solid var(--border);
		border-radius: 0.25rem;
		background-color: var(--surface);
		color: var(--text);
		cursor: pointer;
	}

	.qty button:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.qty-input {
		width: 2.6rem;
		padding: 0.1rem;
		border: 1px solid var(--border);
		border-radius: 0.25rem;
		font: inherit;
		text-align: center;
	}

	.remove {
		display: grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		border: none;
		border-radius: 0.25rem;
		background-color: var(--alert-error);
		color: #fff;
		cursor: pointer;
	}

	.gesamt {
		margin-left: auto;
		font-size: 1.1rem;
		font-weight: 700;
	}

	.pfand {
		color: var(--selection);
	}

	.rabatt,
	.rechnung_rabatt,
	.preisanpassung {
		color: var(--alert-error);
	}

	.leergut,
	.rueckgabe {
		color: var(--alert-success);
	}

	.gutschein {
		color: var(--alert-fatal);
	}

	.anzahlung,
	.anzahlungsaufloesung {
		color: var(--alert-info);
	}

	/* Phones: name, supplier/quantity/remove, VAT + unit price, total below. */
	@media (max-width: 800px) {
		.main {
			display: grid;
			grid-template-columns: 1fr auto auto;
			grid-template-areas:
				'name name name'
				'lieferant qty remove'
				'badge price price'
				'gesamt gesamt gesamt';
			gap: 0.4rem 0.5rem;
		}

		.top,
		.bottom {
			display: contents;
		}

		.name {
			grid-area: name;
		}

		.lieferant {
			grid-area: lieferant;
			align-self: center;
		}

		.nr.special {
			grid-area: lieferant;
			align-self: center;
			display: block;
		}

		.qty {
			grid-area: qty;
		}

		.remove {
			grid-area: remove;
			justify-self: end;
		}

		.badge {
			grid-area: badge;
			justify-self: start;
			align-self: center;
		}

		.price {
			grid-area: price;
			justify-self: end;
		}

		.gesamt {
			grid-area: gesamt;
			justify-self: end;
			margin-left: 0;
		}

		.nr {
			display: none;
		}
	}

	/* The dark theme needs lighter kind colours to stay readable. */
	:global(body[data-theme='dark']) .pfand {
		color: color-mix(in srgb, var(--selection) 40%, white);
	}

	:global(body[data-theme='dark']) .rabatt,
	:global(body[data-theme='dark']) .rechnung_rabatt,
	:global(body[data-theme='dark']) .preisanpassung {
		color: color-mix(in srgb, var(--alert-error) 40%, white);
	}

	:global(body[data-theme='dark']) .leergut,
	:global(body[data-theme='dark']) .rueckgabe {
		color: color-mix(in srgb, var(--alert-success) 40%, white);
	}

	:global(body[data-theme='dark']) .gutschein {
		color: color-mix(in srgb, var(--alert-fatal) 40%, white);
	}

	:global(body[data-theme='dark']) .anzahlung,
	:global(body[data-theme='dark']) .anzahlungsaufloesung {
		color: color-mix(in srgb, var(--alert-info) 40%, white);
	}

	.row.selected .pfand,
	.row.selected .rabatt,
	.row.selected .rechnung_rabatt,
	.row.selected .preisanpassung,
	.row.selected .leergut,
	.row.selected .rueckgabe,
	.row.selected .gutschein,
	.row.selected .anzahlung,
	.row.selected .anzahlungsaufloesung {
		color: #fff;
	}
</style>
