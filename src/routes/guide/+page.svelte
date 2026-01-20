<script>
	import GuideGrid from '$lib/components/GuideGrid.svelte';
	import ProgramModal from '$lib/components/ProgramModal.svelte';

	export let data;
	export let form;

	let selectedProgram = null;
	let searchQuery = '';

	$: filteredChannels =
		data.channels?.filter((channel) => {
			if (!searchQuery) return true;
			const q = searchQuery.toLowerCase();
			return (
				channel.Name?.toLowerCase()?.includes(q) ||
				channel.Number?.toString()?.includes(q) ||
				channel.ChannelNumber?.toString()?.includes(q) ||
				channel.programs?.some((p) => p.Name?.toLowerCase()?.includes(q))
			);
		}) || [];

	function handleSelect(event) {
		selectedProgram = event.detail;
	}

	function handleClose() {
		selectedProgram = null;
	}

	$: if (form?.success) {
		selectedProgram = null;
	}
</script>

<div class="flex h-full flex-col bg-background">
	<header class="flex h-16 items-center gap-4 border-b border-white/5 px-4 shrink-0">
		<h1 class="text-xl font-bold text-white">TV Guide</h1>
		<div class="relative ml-auto w-full max-w-md">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				<svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<input
				type="text"
				bind:value={searchQuery}
				class="block w-full rounded-md border border-gray-700 bg-gray-900 py-2 pl-10 pr-3 leading-5 text-gray-300 placeholder-gray-400 focus:border-white focus:bg-gray-800 focus:text-white focus:outline-none focus:ring-white sm:text-sm"
				placeholder="Search channels & programs"
			/>
		</div>
	</header>
	
	<div class="flex-1 overflow-hidden relative">
		{#if data.error}
			<div class="p-4 text-red-400 bg-red-900/20 border border-red-900 m-4 rounded">
				{data.error}
			</div>
		{:else}
			<div class="absolute inset-0">
				<GuideGrid
					channels={filteredChannels}
					host={data.JELLYFIN_HOST}
					token={data.token}
					maxDate={data.maxDate}
					on:select={handleSelect}
				/>
			</div>
		{/if}
	</div>

	{#if selectedProgram}
		<ProgramModal
	           program={selectedProgram}
	           host={data.JELLYFIN_HOST}
	           token={data.token}
	           on:close={handleClose}
	       />
	{/if}
</div>
