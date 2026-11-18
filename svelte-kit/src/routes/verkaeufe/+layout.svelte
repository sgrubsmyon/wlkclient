<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<main>
	<h1>Verkäufe</h1>
	<nav class="tabs">
		<a
			href={resolve('/verkaeufe/heute')}
			class:active={page.url.pathname.startsWith('/verkaeufe/heute')}
		>
			Heutige Verkäufe
		</a>
		<a
			href={resolve('/verkaeufe/alt')}
			class:active={page.url.pathname.startsWith('/verkaeufe/alt')}
		>
			Alte Verkäufe
		</a>
	</nav>
	{@render children()}
</main>

<style>
	main {
		padding: 1rem;
	}

	h1 {
		margin: 0 0 0.75rem;
	}

	.tabs {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 1rem;
		border-bottom: 1px solid var(--border);
	}

	a {
		padding: 0.5rem 1rem;
		border: 1px solid transparent;
		border-bottom: none;
		border-radius: 0.375rem 0.375rem 0 0;
		color: var(--text);
		text-decoration: none;
	}

	a:hover {
		background-color: var(--border);
	}

	a.active {
		border-color: var(--border);
		background-color: var(--surface);
		font-weight: 700;
	}
</style>
