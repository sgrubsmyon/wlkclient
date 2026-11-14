<script lang="ts">
	import { resolve } from '$app/paths';
	import { Activity, LogOut, Moon, Sun } from '@lucide/svelte';

	let { user }: { user: NonNullable<App.Locals['user']> } = $props();

	const initial = $derived(Array.from(user.username)[0]?.toUpperCase() ?? '?');
	const color = $derived(avatarColor(user.username));

	function avatarColor(name: string) {
		let hue = 0;
		for (const char of name) hue = (hue * 31 + (char.codePointAt(0) ?? 0)) % 360;
		return `hsl(${hue} 60% 45%)`;
	}

	function toggleTheme() {
		const theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
		document.body.dataset.theme = theme;
		localStorage.setItem('theme', theme);
	}
</script>

<nav>
	<a
		class="profile"
		href={resolve('/me')}
		title={`Eingeloggt als ${user.username}`}
		style:background-color={color}
	>
		{initial}
	</a>
	<a class="icon-link" href={resolve('/tse/status')} title="TSE-Status">
		<Activity size={24} />
	</a>
	<button type="button" title="Theme wechseln" onclick={toggleTheme}>
		<span class="sun"><Sun size={24} /></span>
		<span class="moon"><Moon size={24} /></span>
	</button>
	<form method="POST" action="/logout">
		<button type="submit" title="Abmelden">
			<LogOut size={24} />
		</button>
	</form>
</nav>

<style>
	nav {
		position: fixed;
		inset: 0 auto 0 0;
		width: 60px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		padding: 5px 0;
		background-color: #333;
		z-index: 100;
	}

	button,
	.profile,
	.icon-link {
		width: 50px;
		height: 50px;
		display: grid;
		place-items: center;
		border: none;
		border-radius: 20px;
		background-color: #4a4a4a;
		color: #fff;
		cursor: pointer;
	}

	button:hover,
	.profile:hover,
	.icon-link:hover {
		background-color: #5a5a5a;
	}

	.icon-link {
		text-decoration: none;
	}

	.profile {
		border-radius: 50%;
		font-size: 1.25rem;
		font-weight: 600;
		text-decoration: none;
	}

	form {
		margin: 0;
	}

	button span {
		display: contents;
	}

	/* Sun while dark (switch to light), moon while light (switch to dark). */
	:global(body[data-theme='dark']) .sun {
		display: none;
	}

	:global(body:not([data-theme='dark'])) .moon {
		display: none;
	}
</style>
