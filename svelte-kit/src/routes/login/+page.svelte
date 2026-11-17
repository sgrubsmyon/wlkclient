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
		min-height: 100vh;
		font-size: 1.2rem;
	}

	form > div.grid {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: 1rem;
	}

	input {
		padding: 0.35rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		font: inherit;
	}

	button {
		margin-top: 1rem;
		width: 100%;
		padding: 0.5rem;
		border-radius: 0.5rem;
		border: none;
		background-color: var(--primary);
		color: #000;
		cursor: pointer;
		font-size: 1.2rem;
		transition: filter 0.15s;
	}

	button:hover {
		filter: brightness(0.92);
	}

	.error {
		color: var(--alert-error);
	}
</style>
