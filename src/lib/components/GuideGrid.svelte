
<script>
	import { createEventDispatcher } from 'svelte';
	import VirtualList from 'svelte-virtual-list';

	export let channels = [];

	const dispatch = createEventDispatcher();
	const PIXELS_PER_MINUTE = 4; // 1 min = 4px

	// Helper to calculate width
	function getProgramWidth(program) {
		let durationMinutes = 30; // Default fallback

		if (program.RunTimeTicks && program.RunTimeTicks > 0) {
			// RunTimeTicks is 10000 ticks per ms
			const durationMs = program.RunTimeTicks / 10000;
			durationMinutes = durationMs / 1000 / 60;
		} else if (program.StartDate && program.EndDate) {
			const start = new Date(program.StartDate);
			const end = new Date(program.EndDate);
			const diffMs = end - start;
			if (diffMs > 0) {
				durationMinutes = diffMs / 1000 / 60;
			}
		}

		// Ensure a minimum width so it's clickable
		return Math.max(durationMinutes * PIXELS_PER_MINUTE, 40);
	}

	function formatTime(dateString) {
		const date = new Date(dateString);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function handleProgramClick(program) {
		dispatch('select', program);
	}
</script>

<div class="h-full w-full overflow-hidden bg-gray-900 text-white">
	{#if channels.length > 0}
		<VirtualList items={channels} let:item>
			<div class="flex h-24 border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
				<!-- Channel Info (Left Column) -->
				<div
					class="sticky left-0 z-10 flex w-24 flex-col items-center justify-center border-r border-gray-800 bg-gray-900 p-2 text-center"
				>
					<div class="text-xl font-bold text-gray-200">{item.ChannelNumber}</div>
					<div class="truncate text-xs text-gray-400 w-full" title={item.Name}>{item.Name}</div>
				</div>

				<!-- Timeline (Right Column) -->
				<div class="no-scrollbar flex flex-1 items-center overflow-x-auto">
					{#each item.programs as program}
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<div
							class="m-1 relative flex h-20 shrink-0 flex-col justify-center overflow-hidden rounded border border-gray-700 bg-gray-800 p-2 text-xs hover:bg-blue-900/40 cursor-pointer"
							class:border-red-500={program.isRecording || program.isSeriesRecording}
							class:border-2={program.isRecording || program.isSeriesRecording}
							style="width: {getProgramWidth(program)}px;"
							on:click={() => handleProgramClick(program)}
							role="button"
							tabindex="0"
						>
							{#if program.isRecording || program.isSeriesRecording}
								<div
									class="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 shadow-sm"
									title={program.isSeriesRecording ? 'Series Recording' : 'Recording'}
								></div>
							{/if}
							<div class="truncate font-semibold text-gray-200">{program.Name}</div>
							<div class="truncate text-gray-500">
								{formatTime(program.StartDate)} - {formatTime(program.EndDate)}
							</div>
						</div>
					{/each}
					{#if item.programs.length === 0}
						<div class="flex h-full items-center px-4 text-gray-500 italic">No program data</div>
					{/if}
				</div>
			</div>
		</VirtualList>
	{:else}
		<div class="flex h-full items-center justify-center text-gray-500">
			No channels available.
		</div>
	{/if}
</div>

<style>
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}
</style>
