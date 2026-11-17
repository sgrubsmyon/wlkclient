<script lang="ts">
	import { Plus, RotateCcw, Trash2, UserCheck, UserX } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import Alert from '#lib/Alert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const resetPassword = $derived(form && 'resetPassword' in form ? form.resetPassword : null);
	const resetUsername = $derived(form && 'resetUsername' in form ? form.resetUsername : null);
	const message = $derived(form && 'message' in form && form.message ? form.message : null);
	const error = $derived(form && 'error' in form && form.error ? form.error : data.error);

	function confirmDelete(username: string) {
		return confirm(`Konto „${username}“ wirklich löschen?`);
	}
</script>

<main>
	<header>
		<div>
			<h1>Benutzer</h1>
			<p>Hier können die Benutzer der Kasse verwaltet werden.</p>
		</div>
		<a class="add" href={resolve('/benutzer/neu')} title="Benutzer hinzufügen"><Plus size={24} /></a
		>
	</header>

	{#if error}
		<Alert severity="error">{error}</Alert>
	{:else if message}
		<Alert severity="success">{message}</Alert>
	{/if}

	{#if resetPassword}
		<Alert severity="info">
			Neues Passwort für <strong>{resetUsername}</strong>:
			<code>{resetPassword}</code>
			– bitte sicher übergeben, es wird nur jetzt angezeigt.
		</Alert>
	{/if}

	<table>
		<thead>
			<tr>
				<th>ID</th>
				<th>Benutzername</th>
				<th>Name</th>
				<th>Rolle</th>
				<th>Theme</th>
				<th>Passwort</th>
				<th>Konto</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each data.users as user (user.user_id)}
				<tr class:inactive={!user.active}>
					<td>{user.user_id}</td>
					<td>{user.username}</td>
					<td>{user.full_name ?? '–'}</td>
					<td>{user.role === 'admin' ? 'Administrator' : 'Mitarbeiter'}</td>
					<td>{user.pref_theme === 'dark' ? 'Dunkel' : 'Hell'}</td>
					<td>
						<form method="POST" action="?/reset">
							<input type="hidden" name="user_id" value={user.user_id} />
							<input type="hidden" name="username" value={user.username} />
							<button type="submit" title="Passwort zurücksetzen">
								<RotateCcw size={16} /> Zurücksetzen
							</button>
						</form>
					</td>
					<td>
						<form method="POST" action="?/toggle">
							<input type="hidden" name="user_id" value={user.user_id} />
							<input type="hidden" name="active" value={String(user.active)} />
							<button type="submit" title={user.active ? 'Deaktivieren' : 'Aktivieren'}>
								{#if user.active}
									<UserX size={16} /> Deaktivieren
								{:else}
									<UserCheck size={16} /> Aktivieren
								{/if}
							</button>
						</form>
					</td>
					<td>
						<form
							method="POST"
							action="?/delete"
							onsubmit={(event) => {
								if (!confirmDelete(user.username)) event.preventDefault();
							}}
						>
							<input type="hidden" name="user_id" value={user.user_id} />
							<button type="submit" class="danger" title="Konto löschen">
								<Trash2 size={16} />
							</button>
						</form>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</main>

<style>
	main {
		padding: 1rem;
	}

	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	h1 {
		margin: 0;
	}

	header p {
		margin: 0.25rem 0 1rem;
	}

	.add {
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 50%;
		background-color: var(--green);
		color: #000;
		text-decoration: none;
	}

	.add:hover {
		filter: brightness(0.92);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		background-color: var(--surface);
	}

	th,
	td {
		padding: 0.5rem;
		border-bottom: 1px solid var(--border);
		text-align: left;
	}

	tr.inactive {
		opacity: 0.55;
	}

	form {
		margin: 0;
	}

	td button {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.6rem;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		background-color: var(--surface);
		color: var(--text);
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
	}

	td button:hover {
		background-color: var(--primary);
		color: #000;
	}

	td button.danger {
		border: none;
		background-color: var(--alert-error);
		color: #fff;
	}
</style>
