<script lang="ts">
	import { enhance } from '$app/forms';
	import Alert from '#lib/Alert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const error = $derived(form && 'error' in form ? form.error : null);
	const result = $derived(form && 'result' in form ? form.result : null);
	const ok = $derived(form && 'ok' in form ? form.ok : null);
	const accessible = $derived(Boolean(data.tse?.accessible));
</script>

<main>
	<h1>PIN entsperren</h1>

	{#if data.forbidden}
		<Alert severity="info">
			Nur Administratoren können eine PIN entsperren. Bitte wenden Sie sich an eine Administratorin
			oder einen Administrator.
		</Alert>
	{:else}
		{#if !accessible}
			<Alert severity="warn">
				Die TSE ist nicht erreichbar. Eine PIN kann erst entsperrt werden, wenn die TSE korrekt im
				Server eingesteckt ist.
			</Alert>
		{/if}

		<Alert severity="warn">
			<strong>Ein falscher PUK kann den PUK dauerhaft sperren.</strong>
			Prüfen Sie den PUK vor dem Absenden Zeichen für Zeichen. Bei TimeAdmin muss die neue PIN mit
			<code>TSE_TIME_ADMIN_PIN</code> in der Server-Konfiguration übereinstimmen, sonst kann die TSE beim
			nächsten Start die Zeit nicht setzen.
		</Alert>

		{#if error}
			<Alert severity="error">{error}</Alert>
		{/if}

		{#if result}
			<Alert severity={ok ? 'success' : 'error'}>
				<strong>{ok ? 'PIN entsperrt.' : 'Entsperren fehlgeschlagen.'}</strong>
				<pre>{JSON.stringify(result, null, 2)}</pre>
			</Alert>
		{/if}

		<form
			method="POST"
			use:enhance={() =>
				async ({ update }) =>
					update({ reset: false })}
		>
			<fieldset disabled={!accessible}>
				<div class="grid">
					<label for="user">Benutzer</label>
					<select id="user" name="user">
						<option value="TimeAdmin">TimeAdmin</option>
						<option value="Admin">Admin</option>
					</select>

					<label for="puk">PUK (10 Zeichen)</label>
					<input id="puk" name="puk" type="password" autocomplete="off" spellcheck="false" />
					<label for="puk_confirm">PUK wiederholen</label>
					<input
						id="puk_confirm"
						name="puk_confirm"
						type="password"
						autocomplete="off"
						spellcheck="false"
					/>

					<label for="new_pin">Neue PIN (8 Zeichen)</label>
					<input
						id="new_pin"
						name="new_pin"
						type="password"
						autocomplete="new-password"
						spellcheck="false"
					/>
					<label for="new_pin_confirm">Neue PIN wiederholen</label>
					<input
						id="new_pin_confirm"
						name="new_pin_confirm"
						type="password"
						autocomplete="new-password"
						spellcheck="false"
					/>
				</div>

				<label class="check">
					<input name="confirmed" type="checkbox" />
					Ich habe den PUK geprüft. Ein falscher PUK kann dauerhaft schaden.
				</label>

				<div class="actions">
					<button type="submit" class="primary">PIN entsperren</button>
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
