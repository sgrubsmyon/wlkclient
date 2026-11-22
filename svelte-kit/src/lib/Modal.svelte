<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from '@lucide/svelte';

	let {
		open,
		title,
		onclose,
		children
	}: {
		open: boolean;
		title: string;
		onclose: () => void;
		children: Snippet;
	} = $props();

	let backdropEl = $state<HTMLDivElement>();

	// The backdrop needs focus for Escape to reach its keydown handler.
	$effect(() => {
		if (open) backdropEl?.focus();
	});
</script>

{#if open}
	<div
		class="backdrop"
		role="presentation"
		tabindex="-1"
		bind:this={backdropEl}
		onclick={(event) => {
			if (event.target === event.currentTarget) onclose();
		}}
		onkeydown={(event) => {
			if (event.key === 'Escape') onclose();
		}}
	>
		<div class="dialog" role="dialog" aria-modal="true" aria-label={title}>
			<header>
				<h2>{title}</h2>
				<button type="button" title="Schließen" onclick={onclose}><X size={20} /></button>
			</header>
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 500;
		display: grid;
		place-items: center;
		background-color: rgb(0 0 0 / 0.5);
		outline: none;
	}

	.dialog {
		min-width: 20rem;
		max-width: min(40rem, 90vw);
		max-height: 85vh;
		overflow: auto;
		padding: 1rem 1.25rem 1.25rem;
		border-radius: 0.5rem;
		background-color: var(--surface);
		color: var(--text);
		box-shadow: 0 10px 40px rgb(0 0 0 / 0.4);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	h2 {
		margin: 0;
		font-size: 1.15rem;
	}

	header button {
		display: grid;
		place-items: center;
		padding: 0.25rem;
		border: none;
		border-radius: 0.25rem;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}

	header button:hover {
		background-color: var(--border);
	}
</style>
