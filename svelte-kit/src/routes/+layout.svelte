<script lang="ts">
	import Alert from '#lib/Alert.svelte';
	import Sidebar from '#lib/Sidebar.svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
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
		{:else if data.tse.lifeCycleState === 2}
			<Alert severity="warn">
				<strong>Die TSE ist initialisiert, aber ihre Uhrzeit ist nicht gesetzt.</strong>
				Meist stimmt die in der Server-Konfiguration gespeicherte TimeAdmin-PIN nicht mit der TSE überein.
				Verkäufe sind weiterhin möglich, aber es kann keine Signatur erzeugt werden; der Fehler wird in
				der TSE-Tabelle der Datenbank vermerkt.
				{#if data.user.role === 'admin'}
					<form class="inline" method="POST" action="/tse/time">
						<input type="hidden" name="redirectTo" value={page.url.pathname + page.url.search} />
						<button class="alert-action" type="submit">Jetzt Zeit setzen</button>
					</form>
				{:else}
					Bitte wenden Sie sich an eine Administratorin oder einen Administrator.
				{/if}
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

	.inline {
		display: inline;
	}

	.alert-action {
		display: inline-block;
		margin-left: 0.75rem;
		padding: 0.25rem 0.75rem;
		border: 1px solid currentColor;
		border-radius: 0.375rem;
		background: transparent;
		color: inherit;
		font: inherit;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
	}
</style>
