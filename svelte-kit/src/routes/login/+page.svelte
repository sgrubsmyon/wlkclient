<script lang="ts">
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<main>
	<form method="POST">
		<div class="grid">
			<label for="username">Benutzername:</label>
			<input id="username" name="username" type="text" value={form?.username ?? ''} required />
			<label for="password">Passwort:</label>
			<input id="password" name="password" type="password" required />
		</div>
		{#if form?.error}
			<p class="error">{form.error}</p>
		{/if}
		<button type="submit">Login</button>
	</form>
</main>

<style>
	main {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		font-size: 1.2rem;
		font: sans-serif;
	}

	form > div.grid {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: 1rem;
	}

	button {
		margin-top: 1rem;
		width: 100%;
		padding: 0.5rem;
		border-radius: 0.5rem;
		border: none;
		background-color: #4caf50;
		color: white;
		cursor: pointer;
		font-size: 1.2rem;
	}

	.error {
		color: #c62828;
	}
</style>
