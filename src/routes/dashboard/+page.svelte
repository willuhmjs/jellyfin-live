<script>
    import { enhance } from '$app/forms';
	export let data;
    export let form;
</script>

<div class="p-6 space-y-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
	<h1 class="text-3xl font-bold">Dashboard</h1>

	{#if data.error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded dark:bg-red-900/30 dark:border-red-800 dark:text-red-200">
			{data.error}
		</div>
	{/if}

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
                    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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

    <!-- My Series Section -->
    <section>
        <h2 class="text-2xl font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">My Series</h2>
        {#if data.monitoredSeries.length > 0}
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {#each data.monitoredSeries as series}
                    <a href="/dashboard/series/lookup?name={encodeURIComponent(series.name)}" class="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow text-inherit no-underline">
                        <div class="flex items-center gap-3 mb-2">
                             {#if series.imageTag}
                                <img
                                    src="{data.JELLYFIN_HOST}/Items/{series.id}/Images/Primary?Tag={series.imageTag}&MaxWidth=100"
                                    alt={series.name}
                                    class="w-10 h-10 rounded object-cover bg-gray-200 dark:bg-gray-700"
                                    on:error={(e) => e.currentTarget.style.display='none'}
                                />
                            {:else}
                                <div class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            {/if}
                            <h3 class="font-bold text-sm line-clamp-2" title={series.name}>{series.name}</h3>
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
                            <span>{series.status}</span>
                        </div>
                    </a>
                {/each}
            </div>
        {:else}
            <p class="text-gray-500 italic">No monitored series found.</p>
        {/if}
    </section>

	<section>
		<h2 class="text-2xl font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">Scheduled Recordings</h2>
		{#if data.groupedTimers.length > 0}
			<div class="space-y-4">
				{#each data.groupedTimers as group}
					<details class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm group overflow-hidden">
						<summary class="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 select-none transition-colors">
							<div class="flex items-center gap-4">
								{#if !group.isSingle && group.seriesImageTag}
									<img
										src="{data.JELLYFIN_HOST}/Items/{group.seriesId}/Images/Primary?Tag={group.seriesImageTag}&MaxWidth=100"
										alt={group.seriesName}
										class="w-10 h-10 rounded object-cover border border-gray-200 dark:border-gray-700"
										on:error={(e) => e.currentTarget.style.display='none'}
									/>
								{:else if !group.isSingle}
									<div class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
										</svg>
									</div>
								{/if}
								<h3 class="font-bold text-lg text-gray-900 dark:text-white">{group.seriesName}</h3>
								<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
									{group.timers.length}
								</span>
							</div>
							<div class="transform group-open:rotate-180 transition-transform duration-200 text-gray-500">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
								</svg>
							</div>
						</summary>
						<div class="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
							{#each group.timers as timer}
								<div class="p-4 flex gap-4 hover:bg-white dark:hover:bg-gray-800 transition-colors border-b last:border-0 border-gray-100 dark:border-gray-700/50">
									<div class="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0 overflow-hidden relative">
										{#if timer.ProgramId}
											<img
												src="{data.JELLYFIN_HOST}/Items/{timer.ProgramId}/Images/Primary"
												alt={timer.Name}
												class="absolute top-0 left-0 w-full h-full object-cover"
												on:error={(e) => e.currentTarget.style.display='none'}
											/>
										{:else}
											<div class="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center p-1">No Image</div>
										{/if}
									</div>
									<div class="flex-grow min-w-0">
										<div class="flex items-start justify-between gap-2">
											<div>
												<h4 class="font-semibold text-gray-900 dark:text-gray-100 truncate pr-2">
													{#if timer.ParentIndexNumber != null && timer.IndexNumber != null}
														<span class="mr-1">S{String(timer.ParentIndexNumber).padStart(2, '0')}E{String(timer.IndexNumber).padStart(2, '0')} -</span>
													{/if}
													{#if timer.EpisodeTitle}
														{timer.EpisodeTitle}
													{:else}
														{timer.Name}
													{/if}
												</h4>
											</div>
											{#if timer.Status}
												<span class="flex-shrink-0 inline-block px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800">
													{timer.Status}
												</span>
											{/if}
										</div>
										
										<div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
											{#if timer.StartDate}
												<span class="flex items-center gap-1">
													<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
														<path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
													</svg>
													{new Date(timer.StartDate).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
												</span>
											{/if}
											{#if timer.ChannelName}
												<span class="flex items-center gap-1">
													<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
														<path fill-rule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.344c2.672 0 4.01-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.47-.156a4 4 0 00-2.172-.102l1.027-1.028A3 3 0 009 8.172zM9.99 14.1a6 6 0 01-3.86.779l-.134-.029a6 6 0 013.86.779 6 6 0 013.86-.779l-.134.029a6 6 0 01-3.86-.78z" clip-rule="evenodd" />
													</svg>
													{timer.ChannelName}
												</span>
											{/if}
										</div>
										{#if timer.Overview}
											<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{timer.Overview}</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</details>
				{/each}
			</div>
		{:else}
			<p class="text-gray-500 italic">No scheduled recordings.</p>
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
