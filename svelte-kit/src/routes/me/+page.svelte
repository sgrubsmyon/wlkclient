<script lang="ts">
	import Alert from '#lib/Alert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<main>
	<h1>Profil</h1>

	{#if form?.error}
		<Alert severity="error">{form.error}</Alert>
	{:else if form?.success}
		<Alert severity="success">Das Passwort wurde geändert.</Alert>
	{/if}

	{#if data.user}
		<dl>
			<dt>Benutzername</dt>
			<dd>{data.user.username}</dd>
			<dt>Name</dt>
			<dd>{data.user.full_name ?? '–'}</dd>
			<dt>Benutzer-ID</dt>
			<dd>{data.user.user_id}</dd>
			<dt>Rolle</dt>
			<dd>{data.user.role}</dd>
			<dt>Aktiv</dt>
			<dd>{data.user.active ? 'Ja' : 'Nein'}</dd>
			<dt>Theme</dt>
			<dd>{data.user.pref_theme === 'dark' ? 'Dunkel' : 'Hell'}</dd>
		</dl>
	{/if}

	<section>
		<h2>Passwort ändern</h2>
		<form method="POST" action="?/passwort">
			<label for="current_password">Aktuelles Passwort:</label>
			<input id="current_password" name="current_password" type="password" required />
			<label for="new_password">Neues Passwort:</label>
			<input id="new_password" name="new_password" type="password" minlength="8" required />
			<label for="repeat_password">Neues Passwort wiederholen:</label>
			<input id="repeat_password" name="repeat_password" type="password" minlength="8" required />
			<button type="submit">Passwort ändern</button>
		</form>
	</section>
</main>

<style>
	main {
		padding: 1rem;
	}

	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5rem 1.5rem;
	}

	dt {
		font-weight: 600;
	}

	dd {
		margin: 0;
	}

	section {
		max-width: 26rem;
		margin-top: 2rem;
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background-color: var(--surface);
	}

	h2 {
		margin: 0 0 0.75rem;
		font-size: 1.1rem;
	}

	form {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.4rem;
	}

	input {
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
