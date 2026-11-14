<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<main>
	<h1>Profil</h1>

	{#if data.user}
		<dl>
			<dt>Benutzername</dt>
			<dd>{data.user.username}</dd>
			<dt>Benutzer-ID</dt>
			<dd>{data.user.user_id}</dd>
			<dt>Rolle</dt>
			<dd>{data.user.role}</dd>
			<dt>Aktiv</dt>
			<dd>{data.user.active ? 'Ja' : 'Nein'}</dd>
		</dl>
	{/if}
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
</style>
