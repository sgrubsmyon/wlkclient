<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<main>
	<h1>Abrechnungen</h1>
	<nav class="tabs">
		<a
			href={resolve('/abrechnungen/tag')}
			class:active={page.url.pathname.startsWith('/abrechnungen/tag')}
		>
			Tagesabrechnungen
		</a>
		<a
			href={resolve('/abrechnungen/monat')}
			class:active={page.url.pathname.startsWith('/abrechnungen/monat')}
		>
			Monatsabrechnungen
		</a>
		<a
			href={resolve('/abrechnungen/jahr')}
			class:active={page.url.pathname.startsWith('/abrechnungen/jahr')}
		>
			Jahresabrechnungen
		</a>
	</nav>
	<div class="content">
		{@render children()}
	</div>
</main>

<style>
	main {
		display: flex;
		flex: 1;
		flex-direction: column;
		box-sizing: border-box;
		min-height: 0;
		padding: 1rem;
	}

	.content {
		flex: 1;
		min-height: 0;
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
