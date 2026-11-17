<script lang="ts">
	import { Minus, Plus, Trash2 } from '@lucide/svelte';
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

	const isChild = $derived(position.parent_ref != null);
	const interactive = $derived(!isChild && !readonly);
	const editablePrice = $derived(position.variabler_preis && !isChild && !readonly);
	const total = $derived(euro(position.ges_preis));
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="row {position.kind}"
	class:selected
	class:child={isChild}
	role={interactive ? 'button' : undefined}
	tabindex={interactive ? 0 : undefined}
	onclick={() => interactive && onselect()}
	onkeydown={(event) => {
		if (interactive && (event.key === 'Enter' || event.key === ' ')) onselect();
	}}
>
	{#if !isChild}
		<Thumbnail artikelId={position.artikel_id} size={cartThumbnailSize} />
	{/if}

	<div class="main">
		<div class="top">
			<span class="name">{position.artikel_name}</span>
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
			{#if !isChild}
				<span class="lieferant">{position.lieferant_kurzname ?? ''}</span>
				<span class="nr">{position.artikel_nr}</span>
			{:else}
				<span class="kind">{position.kind === 'pfand' ? 'Pfand' : position.artikel_name}</span>
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

	.kind {
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
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
