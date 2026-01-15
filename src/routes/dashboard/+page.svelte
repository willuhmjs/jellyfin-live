<script>
	export let data;
</script>

<div class="h-full overflow-y-auto p-6 space-y-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
	<h1 class="text-3xl font-bold">Dashboard</h1>

	{#if data.error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded dark:bg-red-900/30 dark:border-red-800 dark:text-red-200">
			{data.error}
		</div>
	{/if}

	<section>
		<h2 class="text-2xl font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">Scheduled Recordings</h2>
		{#if data.timers.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each data.timers as timer}
					<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 flex gap-4 hover:shadow-md transition-shadow">
                        <div class="w-24 h-36 bg-gray-100 dark:bg-gray-700 flex-shrink-0 relative rounded overflow-hidden">
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
						<div class="flex-grow overflow-hidden">
							<h3 class="font-bold text-lg truncate text-gray-900 dark:text-white" title={timer.Name}>{timer.Name}</h3>
						                       {#if timer.StartDate}
						                          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">{new Date(timer.StartDate).toLocaleString()}</p>
						                      {/if}
							<p class="text-sm text-gray-500 dark:text-gray-400 truncate">{timer.ChannelName || 'Unknown Channel'}</p>
						                      
						                      {#if timer.Status}
						                          <div class="mt-2">
						                              <span class="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800">
						                                  {timer.Status}
						                              </span>
						                          </div>
						                      {/if}
						</div>
					</div>
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
