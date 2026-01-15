<script>
    import { enhance } from '$app/forms';
    import { fade, fly } from 'svelte/transition';

    export let data;

    let selectedSeries = null;

    function selectSeries(group) {
        selectedSeries = group;
    }

    function clearSelection() {
        selectedSeries = null;
    }

    function formatDate(dateString) {
        try {
            if (!dateString) return 'Unknown Date';
            return new Date(dateString).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Invalid Date';
        }
    }
</script>

<div class="h-full overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
    {#if data.error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200">
            {data.error}
        </div>
    {/if}

    {#if !selectedSeries}
        <!-- Grid View -->
        <div in:fade={{ duration: 200 }}>
            <h1 class="text-3xl font-bold mb-6">Library</h1>
            
            {#if !data.groupedRecordings || data.groupedRecordings.length === 0}
                 <div class="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p class="text-xl">No recordings found.</p>
                </div>
            {:else}
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {#each data.groupedRecordings as group}
                        <button 
                            class="group bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col h-full border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all text-left"
                            on:click={() => selectSeries(group)}
                        >
                            <div class="relative w-full pt-[56.25%] bg-gray-200 dark:bg-gray-700">
                                <img
                                    src="{data.JELLYFIN_HOST}/Items/{group.imageId}/Images/Primary"
                                    alt={group.name}
                                    class="absolute top-0 left-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                    on:error={(e) => e.currentTarget.style.display='none'}
                                />
                                <div class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium backdrop-blur-sm">
                                    {group.recordings.length} {group.recordings.length === 1 ? 'Item' : 'Items'}
                                </div>
                            </div>
                            <div class="p-4 flex-grow flex flex-col justify-between w-full">
                                <div>
                                    <h2 class="font-bold text-lg mb-1 line-clamp-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {group.name}
                                    </h2>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">
                                        Last recorded: {group.lastRecorded ? formatDate(new Date(group.lastRecorded)) : 'Unknown Date'}
                                    </p>
                                </div>
                            </div>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    {:else}
        <!-- Detail View -->
        <div in:fly={{ x: 20, duration: 200 }}>
            <div class="flex items-center gap-4 mb-6">
                <button 
                    on:click={clearSelection}
                    class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Back to Library"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                     <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{selectedSeries.name}</h1>
                     <p class="text-gray-500 dark:text-gray-400 text-sm">
                         {selectedSeries.recordings.length} {selectedSeries.recordings.length === 1 ? 'Episode' : 'Episodes'}
                     </p>
                </div>
            </div>

            <div class="space-y-4 max-w-5xl mx-auto">
                {#each selectedSeries.recordings as rec}
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col sm:flex-row transition-colors">
                        <!-- Episode Image -->
                        <div class="sm:w-64 w-full relative bg-gray-200 dark:bg-gray-700 shrink-0 aspect-video sm:aspect-auto">
                             <img
                                src="{data.JELLYFIN_HOST}/Items/{rec.Id}/Images/Primary"
                                alt={rec.Name}
                                class="absolute top-0 left-0 w-full h-full object-cover"
                                loading="lazy"
                                on:error={(e) => e.currentTarget.style.display='none'}
                            />
                        </div>
                        
                        <!-- Content -->
                        <div class="p-4 flex-grow flex flex-col">
                             <div class="flex justify-between items-start gap-4">
                                <div>
                                    <h3 class="font-bold text-xl text-gray-900 dark:text-white mb-1">
                                        {rec.EpisodeTitle || rec.Name}
                                    </h3>
                                    {#if rec.Name && rec.Name !== selectedSeries.name && rec.Name !== rec.EpisodeTitle}
                                         <p class="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                                            {rec.Name}
                                         </p>
                                    {/if}
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                        Recorded on {formatDate(rec.DateCreated || rec.StartDate)} • {rec.ChannelName || 'Unknown Channel'}
                                    </p>
                                </div>
                             </div>

                             <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
                                 {rec.Overview || 'No description available.'}
                             </p>

                             <div class="mt-auto flex flex-wrap gap-3">
                                 <!-- Delete Form -->
                                <form action="?/delete" method="POST" use:enhance>
                                    <input type="hidden" name="recordingId" value={rec.Id} />
                                    <button
                                        type="submit"
                                        class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/40 dark:hover:bg-red-900/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                        on:click={(e) => {
                                            if (!confirm('Are you sure you want to delete this recording?')) {
                                                e.preventDefault();
                                            }
                                        }}
                                    >
                                        <svg class="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete
                                    </button>
                                </form>

                                <!-- Trim Ads (Disabled) -->
                                <button
                                    disabled
                                    class="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded text-gray-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60"
                                    title="Coming soon"
                                >
                                    <svg class="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm8.486-8.486a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243z" />
                                    </svg>
                                    Trim Ads
                                </button>
                             </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>
