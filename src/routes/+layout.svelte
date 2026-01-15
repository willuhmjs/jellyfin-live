<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Toast from '$lib/components/Toast.svelte';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children, data } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<Toast />

<div class="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 dark:text-white">
	{#if data?.user?.isAuthenticated}
		<Navbar />
	{/if}

	<main class="flex-1 flex flex-col min-h-0 relative overflow-hidden">
		{@render children()}
	</main>
</div>
