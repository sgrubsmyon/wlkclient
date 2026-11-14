<script lang="ts">
	import Alert from '#lib/Alert.svelte';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const LCS_NAMES: Record<number, string> = {
		0: 'unbekannt',
		1: 'nicht initialisiert',
		2: 'Zeit nicht gesetzt',
		3: 'aktiv',
		4: 'deaktiviert',
		5: 'gesperrt',
		6: 'Secure-Element-Fehler',
		7: 'Ruhezustand',
		8: 'geschlossen'
	};

	const LABELS: Record<string, string> = {
		unique_id: 'Unique ID',
		certification_id: 'Zertifizierungs-ID',
		firmware_id: 'Firmware-ID',
		serial_number: 'Seriennummer',
		public_key: 'Öffentlicher Schlüssel',
		signature_algorithm: 'Signaturalgorithmus',
		time_sync_variant: 'Zeitsynchronisation',
		certificate: 'Zertifikat',
		certificate_expiration: 'Zertifikat gültig bis',
		transaction_counter: 'Transaktionszähler',
		signature_counter: 'Signaturzähler',
		total_log_memory: 'Log-Speicher gesamt',
		available_log_memory: 'Log-Speicher frei',
		wear_indicator: 'Verschleißindikator',
		max_clients: 'Mandanten max.',
		current_clients: 'Mandanten aktuell',
		max_transactions: 'Transaktionen max.',
		current_transactions: 'Transaktionen aktuell'
	};

	const status = $derived(data.status);
	const details = $derived(status?.tse ? Object.entries(status.tse) : []);
	const pins = $derived(
		Object.entries(status?.pins ?? {}) as [
			string,
			{ blocked: boolean | null; remaining_retries: number | null }
		][]
	);
	const registerResult = $derived(form && 'result' in form ? form.result : null);
	const registerOk = $derived(form && 'ok' in form ? form.ok : null);

	function lcsName(value: number | null) {
		return value === null || value === undefined
			? 'unbekannt'
			: (LCS_NAMES[value] ?? `unbekannt (${value})`);
	}

	function yesNo(value: boolean | null) {
		return value === null || value === undefined ? 'unbekannt' : value ? 'Ja' : 'Nein';
	}

	function show(value: unknown) {
		if (value === null || value === undefined || value === '') return '–';
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}
</script>

<main>
	<h1>TSE-Status</h1>

	{#if !status}
		<Alert severity="error">Der TSE-Status konnte nicht geladen werden.</Alert>
	{:else}
		<Alert severity={status.mode === 'stub' ? 'info' : 'success'}>
			<strong>Modus:</strong>
			{status.mode === 'stub' ? 'Stub (TSE-Bibliothek nicht geladen)' : 'Hardware'}
			– {status.opened ? 'Gerät geöffnet' : 'Gerät nicht geöffnet'}.
		</Alert>

		{#if status.device_error}
			<Alert severity="warn">{status.device_error}.</Alert>
		{/if}

		<h2>Zustand</h2>
		<dl>
			<dt>Life-Cycle-State</dt>
			<dd>{status.life_cycle_state} ({lcsName(status.life_cycle_state)})</dd>
			<dt>PIN-State</dt>
			<dd>{show(status.pin_state)}{status.pin_state === 0 ? ' (alle PINs/PUKs gesetzt)' : ''}</dd>
			<dt>Initialisiert</dt>
			<dd>{yesNo(status.initialized)}</dd>
			<dt>Zeitfehler</dt>
			<dd>{show(status.time_error)}</dd>
			<dt>Gerätepfad</dt>
			<dd>{show(status.device_path)}</dd>
			<dt>API-Version</dt>
			<dd>{show(status.api_version)}</dd>
			<dt>Client registriert</dt>
			<dd>{yesNo(status.client_registered)} ({status.tse?.current_clients ?? '?'} Mandanten)</dd>
		</dl>

		<h2>PINs</h2>
		<table>
			<thead>
				<tr><th>Benutzer</th><th>Gesperrt</th><th>Verbleibende Versuche</th></tr>
			</thead>
			<tbody>
				{#each pins as [user, pin] (user)}
					<tr>
						<td>{user}</td>
						<td>{yesNo(pin.blocked)}</td>
						<td>{show(pin.remaining_retries)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p class="hint">
			„Unbekannt“ heißt: seit dem Start der API wurde noch keine Anmeldung mit dieser PIN versucht.
			Die TSE bietet keine reine Leseabfrage für gesperrte PINs.
		</p>

		<h2>Client-Registrierung</h2>
		{#if registerResult}
			<Alert severity={registerOk ? 'success' : 'error'}>
				<pre>{JSON.stringify(registerResult, null, 2)}</pre>
			</Alert>
		{/if}
		{#if data.user?.role === 'admin'}
			<form method="POST" action="?/register">
				<button type="submit">Client registrieren</button>
			</form>
		{:else}
			<p>Nur Administratoren können die Client-Registrierung ausführen.</p>
		{/if}

		<h2>Exporte</h2>
		<p>
			<a class="button" href={resolve('/tse/download/[kind]', { kind: 'full' })}
				>Vollständiges Log exportieren</a
			>
			<a class="button" href={resolve('/tse/download/[kind]', { kind: 'certificates' })}
				>Zertifikate exportieren</a
			>
		</p>

		<h3>Teilweises Log exportieren</h3>
		<form
			class="export-form"
			method="POST"
			action={resolve('/tse/download/[kind]', { kind: 'partial' })}
		>
			<input type="hidden" name="criterion" value="date" />
			<label>Von <input type="date" name="start_date" /></label>
			<label>Bis <input type="date" name="end_date" /></label>
			<button type="submit">Zeitraum exportieren</button>
		</form>
		<form
			class="export-form"
			method="POST"
			action={resolve('/tse/download/[kind]', { kind: 'partial' })}
		>
			<input type="hidden" name="criterion" value="tx_number" />
			<label>Transaktion von <input type="number" name="start_tx_number" min="0" /></label>
			<label>bis <input type="number" name="end_tx_number" min="0" /></label>
			<button type="submit">Zählerbereich exportieren</button>
		</form>

		<h2>TSE-Daten</h2>
		{#if details.length}
			<dl>
				{#each details as [key, value] (key)}
					<dt>{LABELS[key] ?? key}</dt>
					<dd>
						{#if key === 'certificate' || key === 'public_key'}
							<details>
								<summary>anzeigen</summary>
								<pre>{show(value)}</pre>
							</details>
						{:else}
							{show(value)}
						{/if}
					</dd>
				{/each}
			</dl>
		{:else}
			<p>Keine TSE-Daten verfügbar (Gerät nicht geöffnet).</p>
		{/if}
	{/if}
</main>

<style>
	main {
		padding: 1rem;
		max-width: 60rem;
	}

	dl {
		display: grid;
		grid-template-columns: 14rem 1fr;
		gap: 0.25rem 1rem;
	}

	dt {
		font-weight: 600;
	}

	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}

	table {
		border-collapse: collapse;
	}

	th,
	td {
		padding: 0.25rem 1rem 0.25rem 0;
		text-align: left;
	}

	.hint {
		font-size: 0.85rem;
		opacity: 0.75;
	}

	.export-form {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin: 0.5rem 0;
	}

	.export-form label {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	button,
	.button {
		display: inline-block;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		border: 1px solid currentColor;
		background: transparent;
		color: inherit;
		font: inherit;
		text-decoration: none;
		cursor: pointer;
	}

	pre {
		overflow-x: auto;
		font-size: 0.8rem;
	}
</style>
