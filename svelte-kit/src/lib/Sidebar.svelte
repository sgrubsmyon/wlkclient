<script lang="ts">
	import { LogOut, Moon, Sun } from '@lucide/svelte';

	function toggleTheme() {
		const theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
		document.body.dataset.theme = theme;
		localStorage.setItem('theme', theme);
	}
</script>

<nav>
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

	button {
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

	button:hover {
		background-color: #5a5a5a;
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
