<script lang="ts">
	let { artikelId, size = 40 }: { artikelId: number | null | undefined; size?: number } = $props();

	let failed = $state(false);
	const src = $derived(artikelId == null ? null : `/api/artikel/${artikelId}/bild`);
</script>

{#if src && !failed}
	<img
		{src}
		alt=""
		width={size}
		height={size}
		style:width="{size}px"
		style:height="{size}px"
		onerror={() => (failed = true)}
	/>
{:else}
	<div class="placeholder" style:width="{size}px" style:height="{size}px">N/A</div>
{/if}

<style>
	img,
	.placeholder {
		flex-shrink: 0;
		border-radius: 0.25rem;
		object-fit: cover;
	}

	.placeholder {
		display: grid;
		place-items: center;
		background-color: #bdbdbd;
		color: #555;
		font-size: 0.65rem;
	}
</style>
