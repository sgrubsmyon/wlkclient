<script lang="ts">
	import { X } from '@lucide/svelte';

	let {
		id,
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		inputmode,
		onenter,
		onchange
	}: {
		id?: string;
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		inputmode?: 'text' | 'numeric' | 'decimal';
		onenter?: () => void;
		onchange?: (value: string) => void;
	} = $props();

	let input: HTMLInputElement | undefined = $state();

	export function focus() {
		input?.focus();
		input?.select();
	}

	function clear() {
		value = '';
		onchange?.('');
		input?.focus();
	}
</script>

<div class="text-input">
	<input
		bind:this={input}
		{id}
		bind:value
		{placeholder}
		{disabled}
		{inputmode}
		oninput={() => onchange?.(value)}
		onkeydown={(event) => {
			if (event.key === 'Enter') onenter?.();
		}}
	/>
	{#if value && !disabled}
		<button type="button" class="clear" title="Leeren" onclick={clear}>
			<X size={16} />
		</button>
	{/if}
</div>

<style>
	.text-input {
		position: relative;
		display: flex;
		flex: 1;
		min-width: 0;
	}

	input {
		width: 100%;
		padding: 0.4rem 2rem 0.4rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		background-color: var(--input-bg);
		color: var(--text);
		font: inherit;
		font-size: 1rem;
	}

	.clear {
		position: absolute;
		top: 50%;
		right: 0.25rem;
		transform: translateY(-50%);
		display: grid;
		place-items: center;
		padding: 0.15rem;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: var(--text);
		cursor: pointer;
	}

	.clear:hover {
		background-color: var(--border);
	}
</style>
