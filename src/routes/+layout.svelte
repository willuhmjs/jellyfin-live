<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Toast from '$lib/components/Toast.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<Toast />

<div class="h-screen w-screen bg-background text-white selection:bg-accent selection:text-white font-sans flex overflow-hidden">
	{#if data?.user?.isAuthenticated}
		<Navbar />
        <!-- Main content area: takes remaining width, full height, no scroll on itself -->
        <main class="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative pb-20 md:pb-0">
            {@render children()}
        </main>
    {:else}
        <main class="w-full h-full flex flex-col overflow-y-auto relative">
            {@render children()}
        </main>
	{/if}
</div>
