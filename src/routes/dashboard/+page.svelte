<script>
    import { enhance } from '$app/forms';
    import { onMount } from 'svelte';

	export let data;
    export let form;

    let now = new Date();

    onMount(() => {
        const interval = setInterval(() => {
            now = new Date();
        }, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    });

    $: isAiring = (start, end) => {
        const startTime = new Date(start);
        const endTime = new Date(end);
        return now >= startTime && now <= endTime;
    };
</script>

<div class="p-6 space-y-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
	<h1 class="text-3xl font-bold">Dashboard</h1>

	{#if data.error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded dark:bg-red-900/30 dark:border-red-800 dark:text-red-200">
			{data.error}
		</div>
	{/if}

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <!-- Search Section -->
        <section class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 class="text-xl font-semibold mb-4">Find Shows</h2>
            <form method="POST" action="?/search" use:enhance class="flex gap-4 mb-4">
                <input
                    type="text"
                    name="query"
                    placeholder="Search TVMaze..."
                    class="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form?.query || ''}
                />
                <button type="submit" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors">
                    Search
                </button>
            </form>

            {#if form?.results}
                <div class="mt-6">
                    <h3 class="text-lg font-medium mb-3">Search Results</h3>
                    {#if form.results.length > 0}
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {#each form.results as result}
                                <a href="/dashboard/series/{result.show.id}" class="block group">
                                    <div class="relative w-full aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mb-2">
                                        {#if result.show.image?.medium}
                                            <img src={result.show.image.medium} alt={result.show.name} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                        {:else}
                                            <div class="w-full h-full flex items-center justify-center text-gray-500">No Image</div>
                                        {/if}
                                    </div>
                                    <h4 class="font-bold text-sm leading-tight group-hover:text-blue-500 transition-colors">{result.show.name}</h4>
                                    <p class="text-xs text-gray-500">{result.show.premiered ? result.show.premiered.substring(0, 4) : 'Unknown'}</p>
                                </a>
                            {/each}
                        </div>
                    {:else}
                        <p class="text-gray-500 italic">No results found.</p>
                    {/if}
                </div>
            {/if}
        </section>

        <!-- Scheduled Recordings Section (Compact Vertical List) -->
        <section class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-[300px] flex flex-col">
             <h2 class="text-lg font-semibold mb-2 flex items-center justify-between">
                <span>Scheduled Recordings</span>
                <span class="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded-full">{data.scheduledRecordings.length}</span>
            </h2>
             {#if data.scheduledRecordings.length > 0}
                <div class="overflow-y-auto pr-1 space-y-1 flex-grow scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                     {#each data.scheduledRecordings as timer}
                        <div class="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                             <!-- Image (Tiny) -->
                            <div class="flex-shrink-0 w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                                {#if timer.ProgramId}
                                    <img
                                        src="{data.JELLYFIN_HOST}/Items/{timer.ProgramId}/Images/Primary"
                                        alt={timer.Name}
                                        class="w-full h-full object-cover"
                                        on:error={(e) => e.currentTarget.style.display='none'}
                                    />
                                {:else if timer.SeriesPrimaryImageTag}
                                     <img
                                        src="{data.JELLYFIN_HOST}/Items/{timer.SeriesId}/Images/Primary?Tag={timer.SeriesPrimaryImageTag}&MaxWidth=100"
                                        alt={timer.Name}
                                        class="w-full h-full object-cover"
                                        on:error={(e) => e.currentTarget.style.display='none'}
                                    />
                                {:else}
                                    <div class="w-full h-full flex items-center justify-center text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                {/if}
                            </div>
                            
                            <!-- Content -->
                             <div class="flex-grow min-w-0 flex items-center justify-between gap-2">
                                <h4 class="font-medium text-xs text-gray-900 dark:text-gray-100 truncate" title={timer.Name}>
                                    {#if timer.SeriesName}
                                        {timer.SeriesName} -
                                    {/if}
                                    {timer.Name}
                                </h4>
                                <div class="flex-shrink-0">
                                     {#if isAiring(timer.StartDate, timer.EndDate)}
                                        <span class="flex items-center text-[10px] text-red-600 dark:text-red-400 font-bold animate-pulse">
                                            <div class="w-1.5 h-1.5 bg-red-600 dark:bg-red-400 rounded-full mr-1"></div>
                                            REC
                                        </span>
                                    {:else}
                                         <span class="text-[10px] text-gray-500 dark:text-gray-400">{new Date(timer.StartDate).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                                    {/if}
                                </div>
                            </div>
                        </div>
                     {/each}
                </div>
            {:else}
                <div class="flex-grow flex items-center justify-center text-gray-500 italic text-sm">No scheduled recordings.</div>
            {/if}
        </section>
    </div>

<!-- My Series Section (Jellyseerr Style - Horizontal Scroll) -->
<section>
    <h2 class="text-2xl font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">My Series</h2>
    {#if data.monitoredSeries.length > 0}
        <div class="flex overflow-x-auto gap-4 pb-6 snap-x scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {#each data.monitoredSeries as series}
                <a href="/dashboard/series/lookup?name={encodeURIComponent(series.name)}" class="flex-shrink-0 w-32 md:w-40 snap-start group relative">
                     <!-- Cover Picture (Poster) -->
                     <!-- Matched style to series page: rounded-xl shadow-lg -->
                    <div class="w-full aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden shadow-lg group-hover:shadow-2xl group-hover:scale-105 transition-all duration-200 relative">
                         {#if series.tvmazeImage || series.imageTag}
                            <img
                                src={series.tvmazeImage || `${data.JELLYFIN_HOST}/Items/${series.id}/Images/Primary?Tag=${series.imageTag}&MaxWidth=400`}
                                alt={series.name}
                                class="w-full h-full object-cover"
                                on:error={(e) => e.currentTarget.style.display='none'}
                            />
                        {:else}
                            <div class="w-full h-full flex items-center justify-center text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        {/if}
                        
                         <!-- Status Badge Overlay -->
                         <div class="absolute top-2 right-2">
                            <span class="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shadow-sm
                                {series.status === 'Recorded' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}">
                                {#if series.status === 'Recorded'}
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                    </svg>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                                    </svg>
                                {/if}
                            </span>
                         </div>
                    </div>

                        <!-- Details -->
                        <div class="mt-2">
                            <h3 class="font-bold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={series.name}>{series.name}</h3>
                        </div>
                    </a>
                {/each}
            </div>
        {:else}
            <p class="text-gray-500 italic">No monitored series found.</p>
        {/if}
    </section>

	<section>
		<h2 class="text-2xl font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">Upcoming Premieres</h2>
		{#if data.premieres.length > 0}
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{#each data.premieres as prog}
					<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
	                       <div class="relative w-full pt-[56.25%] bg-gray-100 dark:bg-gray-700">
                             <img 
                                src="{data.JELLYFIN_HOST}/Items/{prog.Id}/Images/Primary" 
                                alt={prog.Name}
                                class="absolute top-0 left-0 w-full h-full object-cover"
                                loading="lazy"
                                on:error={(e) => e.currentTarget.style.display='none'}
                            />
                        </div>
      <div class="p-4 flex-grow flex flex-col">
       <h3 class="font-bold text-lg mb-1 line-clamp-1 text-gray-900 dark:text-white" title={prog.Name}>{prog.Name}</h3>
       <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{new Date(prog.StartDate).toLocaleString()}</p>
                            {#if prog.EpisodeTitle}
           <p class="text-sm italic text-gray-700 dark:text-gray-300 mb-2 line-clamp-1">{prog.EpisodeTitle}</p>
                            {/if}
       <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mt-auto">{prog.Overview || 'No description available.'}</p>
      </div>
     </div>
    {/each}
   </div>
  {:else}
   <p class="text-gray-500 italic dark:text-gray-400">No upcoming premieres found.</p>
  {/if}
	</section>
</div>
