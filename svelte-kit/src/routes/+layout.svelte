<script lang="ts">
	import Alert from '#lib/Alert.svelte';
	import Sidebar from '#lib/Sidebar.svelte';
	import { resolve } from '$app/paths';
	import DemoLinks from './demo/DemoLinks.svelte';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data.user}
	<Sidebar user={data.user} />
{/if}

<div class:with-sidebar={data.user}>
	{#if data.user && data.tse}
		{#if !data.tse.accessible}
			<Alert severity="warn">
				<strong>Die TSE ist nicht erreichbar.</strong>
				Bitte stellen Sie sicher, dass die TSE korrekt im Server eingesteckt ist. Verkäufe sind weiterhin
				möglich, aber es kann keine Signatur erzeugt werden; der Fehler wird in der TSE-Tabelle der Datenbank
				vermerkt.
			</Alert>
		{:else if !data.tse.initialized}
			<Alert severity="warn">
				<strong>Die TSE ist noch nicht initialisiert.</strong>
				Verkäufe sind weiterhin möglich, aber es kann keine Signatur erzeugt werden; der Fehler wird in
				der TSE-Tabelle der Datenbank vermerkt.
				<a class="alert-action" href={resolve('/tse/init')}>Jetzt initialisieren</a>
			</Alert>
		{:else if data.tse.timeError}
			<Alert severity="warn">
				<strong>Die TSE-Zeit konnte nicht gesetzt werden.</strong>
				{data.tse.timeError}
			</Alert>
		{/if}
	{/if}

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

	.alert-action {
		display: inline-block;
		margin-left: 0.75rem;
		padding: 0.25rem 0.75rem;
		border: 1px solid currentColor;
		border-radius: 0.375rem;
		color: inherit;
		font-weight: 600;
		text-decoration: none;
	}
</style>
