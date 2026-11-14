<script lang="ts">
	import Sidebar from '#lib/Sidebar.svelte';
	import DemoLinks from './demo/DemoLinks.svelte';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data.user}
	<Sidebar />
{/if}

<div class:with-sidebar={data.user}>
	{@render children()}
</div>
<DemoLinks />

<style>
	:global(body) {
		--bg: #ffffff;
		--fg: #1a1a1a;
		--input-bg: #ffffff;
		margin: 0;
		background-color: var(--bg);
		color: var(--fg);
	}

	:global(body[data-theme='dark']) {
		--bg: #121212;
		--fg: #e8e8e8;
		--input-bg: #1e1e1e;
	}

	:global(input) {
		background-color: var(--input-bg);
		color: var(--fg);
	}

	.with-sidebar {
		padding-left: 60px;
	}
</style>
