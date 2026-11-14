<script lang="ts">
	import type { Snippet } from 'svelte';

	type Severity = 'success' | 'info' | 'warn' | 'error' | 'fatal';

	let { severity, children }: { severity: Severity; children: Snippet } = $props();
</script>

<div class="alert {severity}" role="alert">
	{@render children()}
</div>

<style>
	:global(.alert) {
		margin: 1rem;
		padding: 0.75rem 1rem;
		border: 1px solid currentColor;
		border-radius: 0.5rem;
	}

	:global(.alert.success) {
		background-color: #e6f4ea;
		color: #1b5e20;
	}

	:global(.alert.info) {
		background-color: #e3f2fd;
		color: #0d47a1;
	}

	:global(.alert.warn) {
		background-color: #fff4e5;
		color: #b45309;
	}

	:global(.alert.error) {
		background-color: #fdecea;
		color: #b71c1c;
	}

	:global(.alert.fatal) {
		background-color: #f3e5f5;
		color: #6a1b9a;
	}

	:global(body[data-theme='dark'] .alert.success) {
		background-color: #12331c;
		color: #a5d6a7;
	}

	:global(body[data-theme='dark'] .alert.info) {
		background-color: #102a43;
		color: #90caf9;
	}

	:global(body[data-theme='dark'] .alert.warn) {
		background-color: #3a2a12;
		color: #ffcc80;
	}

	:global(body[data-theme='dark'] .alert.error) {
		background-color: #3a1518;
		color: #ef9a9a;
	}

	:global(body[data-theme='dark'] .alert.fatal) {
		background-color: #2a1533;
		color: #ce93d8;
	}
</style>
