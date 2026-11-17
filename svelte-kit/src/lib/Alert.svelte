<script lang="ts">
	import type { Snippet } from 'svelte';

	type Severity = 'success' | 'info' | 'warn' | 'error' | 'fatal';

	let { severity, children }: { severity: Severity; children: Snippet } = $props();
</script>

<div class="alert {severity}" role="alert">
	{@render children()}
</div>

<style>
	.alert {
		margin: 1rem;
		padding: 0.75rem 1rem;
		border: 1px solid currentColor;
		border-radius: 0.5rem;
	}

	.success {
		background-color: color-mix(in srgb, var(--alert-success) 14%, var(--surface));
		color: var(--alert-success);
	}

	.info {
		background-color: color-mix(in srgb, var(--alert-info) 14%, var(--surface));
		color: var(--alert-info);
	}

	.warn {
		background-color: color-mix(in srgb, var(--alert-warn) 14%, var(--surface));
		color: var(--alert-warn);
	}

	.error {
		background-color: color-mix(in srgb, var(--alert-error) 14%, var(--surface));
		color: var(--alert-error);
	}

	.fatal {
		background-color: color-mix(in srgb, var(--alert-fatal) 14%, var(--surface));
		color: var(--alert-fatal);
	}

	:global(body[data-theme='dark']) .success {
		color: color-mix(in srgb, var(--alert-success) 40%, white);
	}

	:global(body[data-theme='dark']) .info {
		color: color-mix(in srgb, var(--alert-info) 40%, white);
	}

	:global(body[data-theme='dark']) .warn {
		color: color-mix(in srgb, var(--alert-warn) 40%, white);
	}

	:global(body[data-theme='dark']) .error {
		color: color-mix(in srgb, var(--alert-error) 40%, white);
	}

	:global(body[data-theme='dark']) .fatal {
		color: color-mix(in srgb, var(--alert-fatal) 40%, white);
	}
</style>
