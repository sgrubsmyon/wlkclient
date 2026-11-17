<script lang="ts">
	import Alert from '#lib/Alert.svelte';
	import Sidebar from '#lib/Sidebar.svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { themeCss } from '#lib/theme.js';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const LCS_NAMES: Record<number, string> = {
		0: 'unbekannt',
		4: 'deaktiviert',
		5: 'gesperrt',
		6: 'Secure-Element-Fehler',
		7: 'Ruhezustand',
		8: 'geschlossen'
	};

	function lcsName(state: number | null) {
		return state === null ? 'unbekannt' : (LCS_NAMES[state] ?? `unbekannt (${state})`);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<svelte:element this={"style"}>{themeCss()}</svelte:element>
</svelte:head>

{#if data.user}
	<Sidebar user={data.user} />
{/if}

<div class:with-sidebar={data.user} class:fit-height={page.url.pathname === '/kassieren'}>
	{#if data.user && data.tse}
		{#if !data.tse.accessible}
			<Alert severity="warn">
				<strong>Die TSE ist nicht erreichbar.</strong>
				{#if data.tse.deviceError}
					{data.tse.deviceError}.
				{:else}
					Bitte stellen Sie sicher, dass die TSE korrekt im Server eingesteckt ist.
				{/if}
				Verkäufe sind weiterhin möglich, aber es kann keine Signatur erzeugt werden; der Fehler wird in
				der TSE-Tabelle der Datenbank vermerkt.
			</Alert>
		{:else if data.tse.blockedPins.length}
			<Alert severity="warn">
				<strong>PIN gesperrt: {data.tse.blockedPins.join(', ')}.</strong>
				Die TSE kann sich mit dieser PIN nicht mehr anmelden. Verkäufe sind weiterhin möglich, aber es
				kann keine Signatur erzeugt werden; der Fehler wird in der TSE-Tabelle der Datenbank vermerkt.
				<a class="alert-action" href={resolve('/tse/unblock')}>PIN entsperren</a>
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
					<a class="alert-action" href={resolve('/tse/unblock')}>PIN entsperren</a>
				{:else}
					Bitte wenden Sie sich an eine Administratorin oder einen Administrator.
				{/if}
			</Alert>
		{:else if data.tse.lifeCycleState === 3}
			{#if data.tse.timeError}
				<Alert severity="warn">
					<strong>Die TSE-Zeit konnte nicht gesetzt werden.</strong>
					{data.tse.timeError}
					{#if data.user.role === 'admin'}
						<form class="inline" method="POST" action="/tse/time">
							<input type="hidden" name="redirectTo" value={page.url.pathname + page.url.search} />
							<button class="alert-action" type="submit">Jetzt Zeit setzen</button>
						</form>
						<a class="alert-action" href={resolve('/tse/unblock')}>PIN entsperren</a>
					{/if}
				</Alert>
			{/if}
		{:else if data.tse.lifeCycleState === 1 || data.tse.lifeCycleState === null}
			<Alert severity="warn">
				<strong>Die TSE ist noch nicht initialisiert.</strong>
				Verkäufe sind weiterhin möglich, aber es kann keine Signatur erzeugt werden; der Fehler wird in
				der TSE-Tabelle der Datenbank vermerkt.
				<a class="alert-action" href={resolve('/tse/init')}>Jetzt initialisieren</a>
			</Alert>
		{:else}
			<Alert severity="error">
				<strong>Die TSE ist in einem Fehlerzustand.</strong>
				Sie meldet den Life-Cycle-State {data.tse.lifeCycleState} ({lcsName(
					data.tse.lifeCycleState
				)}). Dieser Zustand lässt sich nicht über die Kasse beheben; Verkäufe sind weiterhin
				möglich, aber es kann keine Signatur erzeugt werden. Der Fehler wird in der TSE-Tabelle der
				Datenbank vermerkt.
				<a class="alert-action" href={resolve('/tse/unblock')}>PIN entsperren</a>
			</Alert>
		{/if}
	{/if}

	{@render children()}
</div>

<style>
	:global(body) {
		margin: 0;
		background-color: var(--bg);
		color: var(--text);
		font-family: system-ui, sans-serif;
	}

	:global(input),
	:global(select),
	:global(textarea) {
		background-color: var(--input-bg);
		color: var(--text);
	}

	.with-sidebar {
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		min-height: 100vh;
		padding-left: var(--sidebar-width, 60px);
	}

	/* Pages with an internal scroll area must not grow beyond the viewport. */
	.with-sidebar.fit-height {
		height: 100vh;
		min-height: 0;
		overflow: hidden;
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
