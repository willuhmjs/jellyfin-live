<script>
	import GuideGrid from '$lib/components/GuideGrid.svelte';
	import ProgramModal from '$lib/components/ProgramModal.svelte';

	export let data;
	export let form;

	let selectedProgram = null;

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

<div class="flex h-full flex-col bg-gray-950">
	<header class="flex h-16 items-center px-4 border-b border-gray-800 shrink-0">
		<h1 class="text-xl font-bold text-white">TV Guide</h1>
	</header>
	
	<div class="flex-1 overflow-hidden relative">
		{#if data.error}
			<div class="p-4 text-red-400 bg-red-900/20 border border-red-900 m-4 rounded">
				{data.error}
			</div>
		{:else}
			<div class="absolute inset-0">
				<GuideGrid channels={data.channels} on:select={handleSelect} />
			</div>
		{/if}
	</div>

	{#if selectedProgram}
		<ProgramModal program={selectedProgram} on:close={handleClose} />
	{/if}
</div>
