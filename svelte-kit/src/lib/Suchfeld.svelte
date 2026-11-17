<script lang="ts">
	import type { Snippet } from 'svelte';
	import TextInput from '#lib/TextInput.svelte';
	import type { Artikel } from '#lib/types.js';

	let {
		placeholder = '',
		trigger = 'input',
		minChars = 3,
		search,
		onselect,
		children
	}: {
		placeholder?: string;
		trigger?: 'input' | 'enter';
		minChars?: number;
		search: (term: string) => Promise<Artikel[]>;
		onselect: (artikel: Artikel) => void | Promise<void>;
		children: Snippet<[Artikel]>;
	} = $props();

	let terms = $state('');
	let items = $state<Artikel[]>([]);
	let active = $state(-1);
	let searched = $state(false);
	let input: TextInput | undefined = $state();
	let container: HTMLDivElement | undefined = $state();
	let timer: ReturnType<typeof setTimeout> | undefined;

	export function focus() {
		input?.focus();
	}

	export function setTerm(value: string, run = false) {
		terms = value;
		if (run) void searchNow();
	}

	export function clear() {
		terms = '';
		items = [];
		active = -1;
	}

	async function searchNow() {
		clearTimeout(timer);
		if (terms.trim().length < (trigger === 'enter' ? 1 : minChars)) {
			items = [];
			active = -1;
			searched = false;
			return;
		}
		try {
			items = await search(terms.trim());
			active = items.length ? 0 : -1;
		} catch {
			items = [];
			active = -1;
		}
		searched = true;
	}

	function onInput() {
		items = [];
		active = -1;
		searched = false;
		if (trigger !== 'input' || terms.trim().length < minChars) return;
		clearTimeout(timer);
		timer = setTimeout(() => void searchNow(), 200);
	}

	async function select(artikel: Artikel) {
		await onselect(artikel);
		clear();
		input?.focus();
	}

	function onEnter() {
		if (items.length && active >= 0) {
			void select(items[active]);
		} else if (items.length === 1) {
			void select(items[0]);
		} else {
			void searchNow();
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if (!(event.target instanceof Node) || !container?.contains(event.target)) return;
		if (event.key === 'ArrowDown' && items.length) {
			event.preventDefault();
			active = (active + 1) % items.length;
		} else if (event.key === 'ArrowUp' && items.length) {
			event.preventDefault();
			active = (active - 1 + items.length) % items.length;
		} else if (event.key === 'Escape') {
			items = [];
			active = -1;
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="suchfeld" bind:this={container}>
	<TextInput
		bind:this={input}
		bind:value={terms}
		{placeholder}
		onenter={onEnter}
		onchange={onInput}
	/>
	{#if items.length}
		<ul class="treffer">
			{#each items as artikel, index (artikel.artikel_id)}
				<li>
					<button
						type="button"
						class:active={index === active}
						onmousedown={(event) => {
							event.preventDefault();
							void select(artikel);
						}}
					>
						{@render children(artikel)}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	{#if searched && !items.length}
		<p class="leer">Keine Treffer.</p>
	{/if}
</div>

<style>
	.suchfeld {
		position: relative;
		width: 100%;
	}

	.treffer {
		position: absolute;
		top: calc(100% + 2px);
		left: 0;
		right: 0;
		z-index: 50;
		max-height: 30vh;
		overflow-y: auto;
		margin: 0;
		padding: 0;
		list-style: none;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		background-color: var(--surface);
		box-shadow: 0 6px 20px rgb(0 0 0 / 0.2);
	}

	button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.3rem 0.5rem;
		border: none;
		background: transparent;
		color: var(--text);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	button.active {
		background-color: var(--selection);
		color: #fff;
	}

	.leer {
		margin: 0.25rem 0 0;
		font-size: 0.85rem;
		opacity: 0.7;
	}

	button.active :global(em) {
		color: #fff;
	}
</style>
