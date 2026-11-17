<script lang="ts">
	let {
		options,
		value = $bindable(),
		disabled = false,
		onchange
	}: {
		options: { value: string; label: string }[];
		value?: string;
		disabled?: boolean;
		onchange?: (value: string) => void;
	} = $props();
</script>

<div class="pills" role="radiogroup">
	{#each options as option (option.value)}
		<button
			type="button"
			role="radio"
			aria-checked={value === option.value}
			class:active={value === option.value}
			{disabled}
			onclick={() => {
				value = option.value;
				onchange?.(option.value);
			}}
		>
			{option.label}
		</button>
	{/each}
</div>

<style>
	.pills {
		display: flex;
	}

	button {
		padding: 0.35rem 0.9rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background-color: transparent;
		color: var(--text);
		font: inherit;
		font-size: 0.95rem;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	button:first-child {
		border-radius: 999px 0 0 999px;
	}

	button:last-child {
		border-radius: 0 999px 999px 0;
	}

	button:not(:first-child) {
		border-left: none;
	}

	button.active {
		background-color: var(--primary);
		color: #000;
	}

	button:disabled {
		cursor: default;
		opacity: 0.5;
	}
</style>
