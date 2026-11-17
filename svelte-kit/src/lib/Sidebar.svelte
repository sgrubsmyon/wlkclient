<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import {
		CardSim,
		ChevronLeft,
		ChevronRight,
		Euro,
		LogOut,
		Moon,
		Sun,
		User,
		Users
	} from '@lucide/svelte';
	import type { Component } from 'svelte';
	import { api } from '#lib/api.js';

	let { user }: { user: NonNullable<App.Locals['user']> } = $props();

	type Entry = { href: string; label: string; icon: Component<{ size?: number }>; admin?: boolean };

	// Order and labels follow the implementation plan; pages are added as they are built.
	const entries: (Entry | 'theme' | 'logout')[] = [
		{ href: '/me', label: 'Profil', icon: User },
		'logout',
		{ href: '/benutzer', label: 'Benutzer', icon: Users, admin: true },
		'theme',
		{ href: '/kassieren', label: 'Kassieren', icon: Euro },
		{ href: '/tse/status', label: 'TSE', icon: CardSim }
	];

	const visible = $derived(
		entries.filter(
			(entry) => entry === 'theme' || entry === 'logout' || !entry.admin || user.role === 'admin'
		)
	);

	const initial = $derived(Array.from(user.username)[0]?.toUpperCase() ?? '?');
	const color = $derived(avatarColor(user.username));
	let dark = $state(false);
	let collapsed = $state(false);
	let nav: HTMLElement | undefined = $state();

	$effect(() => {
		try {
			collapsed = localStorage.getItem('sidebar') === 'collapsed';
		} catch {
			// keep the expanded default
		}
		dark = document.body.dataset.theme === 'dark';
	});

	// Keep the content offset in sync with the real (content-sized) sidebar width.
	$effect(() => {
		if (!nav) return;
		const update = () =>
			document.documentElement.style.setProperty('--sidebar-width', `${nav!.offsetWidth}px`);
		update();
		const observer = new ResizeObserver(update);
		observer.observe(nav);
		return () => observer.disconnect();
	});

	function toggleCollapsed() {
		collapsed = !collapsed;
		try {
			localStorage.setItem('sidebar', collapsed ? 'collapsed' : 'expanded');
		} catch {
			// ignore unavailable storage
		}
	}

	function avatarColor(name: string) {
		let hue = 0;
		for (const char of name) hue = (hue * 31 + (char.codePointAt(0) ?? 0)) % 360;
		return `hsl(${hue} 60% 45%)`;
	}

	function toggleTheme() {
		dark = !dark;
		const theme = dark ? 'dark' : 'light';
		document.body.dataset.theme = theme;
		document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax`;
		try {
			localStorage.setItem('theme', theme);
		} catch {
			// ignore unavailable storage
		}
		// Remember the preference on the user account; a failure must not block the UI.
		void api('auth/me', {
			method: 'PATCH',
			body: JSON.stringify({ pref_theme: theme })
		}).catch(() => {});
	}
</script>

<nav class:collapsed bind:this={nav}>
	<button
		type="button"
		class="toggle"
		title={collapsed ? 'Ausklappen' : 'Einklappen'}
		onclick={toggleCollapsed}
	>
		{#if collapsed}<ChevronRight size={24} />{:else}<ChevronLeft size={24} />{/if}
	</button>

	<a
		class="profile"
		href={resolve('/me')}
		title={`Eingeloggt als ${user.username}`}
		style:background-color={color}
	>
		{initial}
	</a>

	{#each visible as entry, index (index)}
		{#if entry === 'theme'}
			<button type="button" title="Theme wechseln" onclick={toggleTheme}>
				{#if dark}<Sun size={24} />{:else}<Moon size={24} />{/if}
				<span class="label">{dark ? 'Hell' : 'Dunkel'}</span>
			</button>
		{:else if entry === 'logout'}
			<form method="POST" action="/logout">
				<button type="submit" title="Abmelden">
					<LogOut size={24} />
					<span class="label">Ausloggen</span>
				</button>
			</form>
		{:else}
			{@const Icon = entry.icon}
			<a
				class="icon-link"
				class:active={page.url.pathname.startsWith(entry.href)}
				href={resolve(entry.href as '/kassieren')}
				title={entry.label}
			>
				<Icon size={24} />
				<span class="label">{entry.label}</span>
			</a>
		{/if}
	{/each}
</nav>

<style>
	nav {
		position: fixed;
		inset: 0 auto 0 0;
		z-index: 100;
		width: max-content;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 5px;
		padding: 5px;
		overflow: hidden;
		background-color: var(--sidebar-bg);
	}

	nav.collapsed {
		box-sizing: border-box;
		width: 60px;
	}

	nav.collapsed button,
	nav.collapsed .icon-link {
		justify-content: center;
		padding: 0;
	}

	/* Small screens: horizontal bar at the bottom, swipe to scroll. */
	@media (max-width: 800px) {
		nav,
		nav.collapsed {
			inset: auto 0 0 0;
			box-sizing: border-box;
			width: 100%;
			height: 60px;
			flex-direction: row;
			align-items: center;
			padding: 5px;
			overflow-x: auto;
			overflow-y: hidden;
			overscroll-behavior-x: contain;
			scrollbar-width: thin;
		}

		nav .toggle {
			display: none;
		}

		nav .label {
			display: none;
		}

		nav button,
		nav .profile,
		nav .icon-link,
		nav form {
			flex-shrink: 0;
		}

		nav button,
		nav .icon-link {
			justify-content: center;
			padding: 0;
			width: 50px;
			min-height: 50px;
			height: 50px;
		}

		nav form {
			width: 50px;
		}
	}

	button,
	.profile,
	.icon-link {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 50px;
		padding: 0 0.8rem;
		border: none;
		border-radius: 20px;
		background-color: var(--sidebar-button);
		color: var(--sidebar-fg, #ccc);
		font: inherit;
		text-decoration: none;
		cursor: pointer;
		white-space: nowrap;
		transition: background-color 0.15s;
	}

	button:hover,
	.profile:hover,
	.icon-link:hover {
		filter: brightness(0.92);
	}

	.icon-link.active {
		background-color: var(--primary);
		color: #000;
	}

	.toggle {
		min-height: 40px;
		justify-content: center;
		padding: 0;
		background-color: transparent;
		color: var(--sidebar-fg, #ccc);
	}

	.profile {
		width: 50px;
		height: 50px;
		justify-content: center;
		padding: 0;
		border-radius: 50%;
		color: #fff;
		font-size: 1.25rem;
		font-weight: 600;
	}

	nav.collapsed .label {
		display: none;
	}

	form {
		margin: 0;
	}

	form button {
		width: 100%;
	}
</style>
