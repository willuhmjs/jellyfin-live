<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import VirtualList from 'svelte-virtual-list';

	export let channels = [];

	const dispatch = createEventDispatcher();
	const PIXELS_PER_MINUTE = 4; // 1 min = 4px
	const CHANNEL_COLUMN_WIDTH = 96; // w-24 = 6rem = 96px

	let headerEl;
	let gridContainer;
	let now = new Date();

	// Reactive computations for grid dimensions
	$: allPrograms = channels.flatMap((c) => c.programs || []);

	// Determine grid start/end based on available programs or fallback to now
	// User Request: "start the graph / cut it off at the current time"
	// So we ignore past programs for the start time calculation.
	$: gridStartTime = new Date(Math.floor(now.getTime() / (30 * 60 * 1000)) * 30 * 60 * 1000 - 30 * 60 * 1000);

	$: maxDate =
		allPrograms.length > 0
			? new Date(
					Math.max(
						...allPrograms
							.map((p) => new Date(p.EndDate).getTime())
							.filter((t) => !isNaN(t))
					)
				)
			: new Date(Date.now() + 24 * 60 * 60 * 1000);

	// Ensure grid end time is at least 24 hours from start if data is sparse, or follows maxDate
	$: gridEndTime = new Date(
		Math.max(
			Math.ceil(maxDate.getTime() / (30 * 60 * 1000)) * 30 * 60 * 1000,
			gridStartTime.getTime() + 24 * 60 * 60 * 1000
		)
	);

	// Safety check if dates are invalid
	$: if (isNaN(gridStartTime.getTime())) {
		gridStartTime = new Date();
		gridStartTime.setMinutes(0, 0, 0); // Round to hour
	}
	$: if (isNaN(gridEndTime.getTime())) {
		gridEndTime = new Date(gridStartTime.getTime() + 24 * 60 * 60 * 1000);
	}

	$: totalDurationMinutes = (gridEndTime - gridStartTime) / 1000 / 60;
	$: totalWidth = Math.max(totalDurationMinutes * PIXELS_PER_MINUTE, 100);

	$: {
		console.log('[GuideGrid] Debug:', {
			channelsCount: channels.length,
			programsCount: allPrograms.length,
			gridStartTime,
			totalWidth
		});
	}

	$: timeSlots = (() => {
		const slots = [];
		let current = new Date(gridStartTime);
		while (current < gridEndTime) {
			slots.push(new Date(current));
			current = new Date(current.getTime() + 30 * 60 * 1000);
		}
		return slots;
	})();
	
	// Helper to calculate width
	function getProgramWidth(program) {
		let durationMinutes = 30; // Default fallback

		if (program.RunTimeTicks && program.RunTimeTicks > 0) {
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

	function getProgramLeft(program) {
		const start = new Date(program.StartDate);
		if (isNaN(start.getTime())) return 0;
		const diffMs = start - gridStartTime;
		const diffMinutes = diffMs / 1000 / 60;
		// Allow negative values so programs starting before grid start are positioned correctly (and clipped)
		return diffMinutes * PIXELS_PER_MINUTE;
	}

	function formatTime(dateString) {
		const date = new Date(dateString);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function handleProgramClick(program) {
		dispatch('select', program);
	}

	onMount(() => {
		// Sync horizontal scroll from virtual list to header
		// Try multiple selectors as svelte-virtual-list structure varies
		const viewport =
			gridContainer?.querySelector('svelte-virtual-list-viewport') || // Custom element
			gridContainer?.querySelector('.svelte-virtual-list-viewport') || // Class
			gridContainer?.querySelector('.viewport') || // Common class
			gridContainer?.firstElementChild; // Fallback to root element

		if (viewport) {
			console.log('[GuideGrid] Found viewport for scroll sync');
			viewport.addEventListener('scroll', () => {
				if (headerEl) {
					headerEl.scrollLeft = viewport.scrollLeft;
				}
			});

			// Ensure we start at the beginning (current time)
			viewport.scrollLeft = 0;
		}
	});
</script>

<div class="flex h-full w-full flex-col overflow-hidden bg-gray-900 text-white">
	{#if channels.length > 0}
		<!-- Timeline Header (Synced Scroll) -->
		<div
			bind:this={headerEl}
			class="flex h-12 w-full shrink-0 overflow-hidden border-b border-gray-700 bg-gray-900 text-xs font-semibold text-gray-400"
		>
			<div class="relative flex h-full" style="min-width: {totalWidth + CHANNEL_COLUMN_WIDTH}px;">
				<!-- Corner Spacer (Sticky Left) -->
				<div
					class="sticky left-0 z-40 w-24 shrink-0 border-r border-gray-800 bg-gray-900"
				></div>
				<!-- Time Slots -->
				<div class="relative flex-1 h-full">
					{#each timeSlots as slot, i}
						<div
							class="absolute top-0 bottom-0 flex items-center border-l border-gray-800 pl-2 whitespace-nowrap overflow-hidden text-gray-400"
							style="width: {30 * PIXELS_PER_MINUTE}px; left: {i * 30 * PIXELS_PER_MINUTE}px;"
						>
							{formatTime(slot)}
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Grid Content -->
		<div class="flex-1 relative h-full" bind:this={gridContainer}>
			<VirtualList items={channels} height="100%" itemHeight={96} let:item>
				<!-- Row Wrapper with explicit width to force horizontal scroll -->
				<div
					class="flex h-24 border-b border-gray-800 hover:bg-gray-800/30 transition-colors relative"
					style="min-width: {totalWidth + CHANNEL_COLUMN_WIDTH}px;"
				>
					<!-- Channel Info (Left Column - Sticky) -->
					<div
						class="sticky left-0 z-20 flex w-24 shrink-0 flex-col items-center justify-center border-r border-gray-800 bg-gray-900 p-2 text-center"
					>
						<div class="text-xl font-bold text-gray-200">{item.ChannelNumber}</div>
						<div class="truncate text-xs text-gray-400 w-full" title={item.Name}>
							{item.Name}
						</div>
					</div>

					<!-- Timeline Programs (Absolute positioning) -->
					<div class="relative flex-1 h-full overflow-hidden">
						{#each item.programs as program}
							<!-- svelte-ignore a11y-click-events-have-key-events -->
							<div
								class="absolute top-1 bottom-1 flex flex-col justify-center overflow-hidden rounded border border-gray-700 bg-gray-800 p-1 text-xs hover:bg-blue-900/40 cursor-pointer transition-colors z-10"
								class:border-red-500={program.isRecording || program.isSeriesRecording}
								class:border-2={program.isRecording || program.isSeriesRecording}
								style="width: {getProgramWidth(program) - 4}px; left: {getProgramLeft(program)}px;"
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
								<div class="truncate font-semibold text-gray-200 w-full" title={program.Name}>
									{program.Name || 'Unknown Program'}
								</div>
								{#if program.EpisodeTitle && program.EpisodeTitle !== program.Name}
									<div class="truncate text-gray-400 w-full" title={program.EpisodeTitle}>
										{program.EpisodeTitle}
									</div>
								{/if}
								<div class="truncate text-gray-500 w-full">
									{formatTime(program.StartDate)} - {formatTime(program.EndDate)}
								</div>
							</div>
						{/each}
						{#if !item.programs || item.programs.length === 0}
							<div class="flex h-full items-center px-4 text-gray-500 italic">
								No program data
							</div>
						{/if}
					</div>
				</div>
			</VirtualList>
		</div>
	{:else}
		<div class="flex h-full items-center justify-center text-gray-500">
			No channels available.
		</div>
	{/if}
</div>

<style>
	/* Force horizontal scroll on the virtual list viewport */
	:global(svelte-virtual-list-viewport),
	:global(.svelte-virtual-list-viewport),
	:global(.viewport) {
		overflow-x: auto !important;
		overflow-y: auto !important;
	}
</style>
