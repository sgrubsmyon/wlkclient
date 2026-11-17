<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/Alert.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<main>
	<h1>Neuer Benutzer</h1>
	<a href={resolve('/benutzer')}>← Zurück zur Benutzerliste</a>

	{#if form && 'error' in form && form.error}
		<Alert severity="error">{form.error}</Alert>
	{/if}

	{#if form && 'created' in form && form.created}
		<Alert severity="success">
			Der Benutzer <strong>{form.created}</strong> wurde angelegt. Passwort:
			<code>{form.password}</code>
			– bitte sicher übergeben, es wird nur jetzt angezeigt.
		</Alert>
	{:else}
		<form method="POST">
			<label for="username">Benutzername</label>
			<input
				id="username"
				name="username"
				type="text"
				value={form && 'username' in form ? form.username : ''}
				required
			/>

			<label for="full_name">Vollständiger Name</label>
			<input
				id="full_name"
				name="full_name"
				type="text"
				value={form && 'fullName' in form ? form.fullName : ''}
			/>

			<label for="role">Rolle</label>
			<select id="role" name="role">
				<option value="mitarbeiter">Mitarbeiter</option>
				<option value="admin">Administrator</option>
			</select>

			<label for="pref_theme">Bevorzugtes Theme</label>
			<select id="pref_theme" name="pref_theme">
				<option value="light">Hell</option>
				<option value="dark">Dunkel</option>
			</select>

			<button type="submit">Benutzer anlegen</button>
		</form>
	{/if}
</main>

<style>
	main {
		padding: 1rem;
		max-width: 30rem;
	}

	h1 {
		margin: 0 0 0.5rem;
	}

	a {
		color: var(--secondary);
	}

	form {
		display: grid;
		gap: 0.4rem;
		margin-top: 1rem;
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background-color: var(--surface);
	}

	input,
	select {
		padding: 0.35rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		font: inherit;
	}

	button {
		margin-top: 0.6rem;
		padding: 0.45rem 1rem;
		border: none;
		border-radius: 0.375rem;
		background-color: var(--primary);
		color: #000;
		font: inherit;
		cursor: pointer;
	}
</style>
