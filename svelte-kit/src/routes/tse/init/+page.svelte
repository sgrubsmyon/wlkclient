<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Alert from '#lib/Alert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const error = $derived(form && 'error' in form ? form.error : null);
	const preflightResult = $derived(form && 'preflight' in form ? form.preflight : null);
	const commissionResult = $derived(form && 'result' in form ? form.result : null);
	const ok = $derived(form && 'ok' in form ? form.ok : null);

	const state = $derived(preflightResult ?? data.preflight);
	const canCommission = $derived(Boolean(data.preflight?.can_commission));
	const stateSeverity = $derived(
		!state
			? 'error'
			: state.can_commission || String(state.status).startsWith('already commissioned')
				? 'info'
				: 'warn'
	);
</script>

<main>
	<h1>TSE initialisieren</h1>

	{#if data.forbidden}
		<Alert severity="info">
			Nur Administratoren können die TSE initialisieren. Bitte wenden Sie sich an eine
			Administratorin oder einen Administrator.
		</Alert>
	{:else}
		{#if state}
			<Alert severity={stateSeverity}>
				<strong>TSE-Status:</strong>
				{state.status}
				{#if state.life_cycle_state !== null && state.life_cycle_state !== undefined}
					(Life-Cycle-State {state.life_cycle_state}, PIN-State {state.pin_state})
				{/if}
			</Alert>
		{:else}
			<Alert severity="error">Der TSE-Status konnte nicht geladen werden.</Alert>
		{/if}

		<Alert severity="info">
			<strong>Vor der Initialisierung:</strong>
			Die PUKs sind dauerhaft und können später nicht mehr geändert werden. Notieren Sie alle vier Werte
			zuerst und prüfen Sie sie Zeichen für Zeichen. Die TimeAdmin-PIN muss mit
			<code>TSE_TIME_ADMIN_PIN</code> in der Server-Konfiguration übereinstimmen. Führen Sie die
			Initialisierung auf dem Server-Rechner oder über eine verschlüsselte Verbindung aus. Eine
			blockierte PIN lässt sich mit dem PUK unter
			<a href={resolve('/tse/unblock')}>PIN entsperren</a> reparieren.
		</Alert>

		{#if error}
			<Alert severity="error">{error}</Alert>
		{/if}

		{#if commissionResult}
			<Alert severity={ok ? 'success' : 'error'}>
				<strong>{ok ? 'Initialisierung ausgeführt.' : 'Initialisierung fehlgeschlagen.'}</strong>
				<pre>{JSON.stringify(commissionResult, null, 2)}</pre>
			</Alert>
		{:else if preflightResult}
			<Alert severity={ok ? 'success' : 'error'}>
				<strong>{ok ? 'Vorprüfung erfolgreich.' : 'Vorprüfung fehlgeschlagen.'}</strong>
				<pre>{JSON.stringify(preflightResult, null, 2)}</pre>
			</Alert>
		{/if}

		<form
			method="POST"
			use:enhance={() =>
				async ({ update }) =>
					update({ reset: false })}
		>
			<fieldset disabled={!canCommission}>
				<div class="grid">
					<label for="admin_pin">Admin-PIN (8 Zeichen)</label>
					<input
						id="admin_pin"
						name="admin_pin"
						type="password"
						autocomplete="new-password"
						spellcheck="false"
					/>
					<label for="admin_pin_confirm">Admin-PIN wiederholen</label>
					<input
						id="admin_pin_confirm"
						name="admin_pin_confirm"
						type="password"
						autocomplete="new-password"
						spellcheck="false"
					/>

					<label for="admin_puk">Admin-PUK (10 Zeichen)</label>
					<input
						id="admin_puk"
						name="admin_puk"
						type="password"
						autocomplete="new-password"
						spellcheck="false"
					/>
					<label for="admin_puk_confirm">Admin-PUK wiederholen</label>
					<input
						id="admin_puk_confirm"
						name="admin_puk_confirm"
						type="password"
						autocomplete="new-password"
						spellcheck="false"
					/>

					<label for="time_admin_pin">TimeAdmin-PIN (8 Zeichen)</label>
					<input
						id="time_admin_pin"
						name="time_admin_pin"
						type="password"
						autocomplete="new-password"
						spellcheck="false"
					/>
					<label for="time_admin_pin_confirm">TimeAdmin-PIN wiederholen</label>
					<input
						id="time_admin_pin_confirm"
						name="time_admin_pin_confirm"
						type="password"
						autocomplete="new-password"
						spellcheck="false"
					/>

					<label for="time_admin_puk">TimeAdmin-PUK (10 Zeichen)</label>
					<input
						id="time_admin_puk"
						name="time_admin_puk"
						type="password"
						autocomplete="new-password"
						spellcheck="false"
					/>
					<label for="time_admin_puk_confirm">TimeAdmin-PUK wiederholen</label>
					<input
						id="time_admin_puk_confirm"
						name="time_admin_puk_confirm"
						type="password"
						autocomplete="new-password"
						spellcheck="false"
					/>
				</div>

				<label class="check">
					<input name="written_down" type="checkbox" />
					Ich habe alle vier Werte notiert und geprüft. Die PUKs sind dauerhaft.
				</label>
				<label class="check">
					<input name="confirm_stored_puks" type="checkbox" />
					Die eingegebenen PUKs sind bereits auf der TSE gespeichert (nur bei teilweise initialisierter
					TSE).
				</label>

				<div class="actions">
					<button type="submit" formaction="?/preflight">Vorprüfung</button>
					<button type="submit" class="primary" formaction="?/commission">
						Jetzt initialisieren
					</button>
				</div>
			</fieldset>
		</form>
	{/if}
</main>

<style>
	main {
		padding: 1rem;
		max-width: 50rem;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem 1rem;
		align-items: center;
	}

	fieldset {
		border: none;
		padding: 0;
		margin: 0;
	}

	fieldset:disabled {
		opacity: 0.45;
	}

	.check {
		display: block;
		margin-top: 1rem;
	}

	.actions {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	button {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		border: 1px solid currentColor;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}

	.primary {
		background-color: #b45309;
		border-color: #b45309;
		color: #fff;
	}

	pre {
		overflow-x: auto;
		font-size: 0.85rem;
	}
</style>
