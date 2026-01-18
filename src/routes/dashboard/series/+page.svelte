<script>
    import { fade, fly } from 'svelte/transition';
    import { flip } from 'svelte/animate';

    export let data;

    let searchQuery = '';
    let filter = 'all'; // 'all', 'Scheduled', 'Recorded'

    $: filteredSeries = data.monitoredSeries.filter(series => {
        const matchesSearch = series.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'all' ? true : series.status === filter;
        return matchesSearch && matchesFilter;
    });

    /** @param {Event} e */
    function handleImageError(e) {
        const target = /** @type {HTMLImageElement} */ (e.currentTarget);
        target.style.display = 'none';
    }
</script>

<div class="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
             <h1 class="text-3xl font-bold text-white tracking-tight mb-2">My Shows</h1>
             <p class="text-gray-400">Manage your monitored series and recordings.</p>
        </div>

        <div class="flex flex-col sm:flex-row gap-4">
            <!-- Search -->
            <div class="relative">
                 <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Filter shows..."
                    class="block w-full sm:w-64 pl-10 pr-3 py-2 border border-white/10 rounded-lg bg-card text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-card-hover focus:ring-1 focus:ring-accent sm:text-sm transition-colors"
                />
            </div>

            <!-- Filter Buttons -->
             <div class="flex bg-white/5 p-1 rounded-lg border border-white/5 gap-1">
                {#each ['all', 'Scheduled', 'Recorded'] as f}
                    <button
                        class="px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap {filter === f ? 'bg-accent text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}"
                        on:click={() => filter = f}
                    >
                        {f === 'all' ? 'All' : f}
                    </button>
                {/each}
            </div>
        </div>
    </div>

    {#if filteredSeries.length > 0}
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {#each filteredSeries as series (series.name)}
                <a
                    href="/dashboard/series/{series.id}"
                    class="group relative flex flex-col gap-3"
                    animate:flip={{duration: 300}}
                    in:fly={{y: 20, duration: 300}}
                >
                    <div class="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-card shadow-lg border border-white/5 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-accent/10">
                        {#if series.tvmazeImage}
                            <img src={series.tvmazeImage} alt={series.name} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        {:else if series.id && series.imageTag}
                            <img
                                src="{data.JELLYFIN_HOST}/Items/{series.id}/Images/Primary?Tag={series.imageTag}&MaxWidth=400&api_key={data.token}"
                                alt={series.name}
                                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                on:error={handleImageError}
                            />
                        {:else}
                            <div class="w-full h-full flex items-center justify-center text-gray-500 bg-card">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        {/if}
                        
                        <div class="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                            <div class="flex justify-center">
                                <span class="w-full text-center py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md
                                    {series.status === 'Recorded' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}">
                                    {series.status === 'Recorded' ? 'Available' : 'Monitored'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="px-1">
                        <h3 class="font-bold text-sm text-gray-200 truncate group-hover:text-white transition-colors" title={series.name}>{series.name}</h3>
                    </div>
                </a>
            {/each}
        </div>
    {:else}
        <div class="py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
            <div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <h3 class="text-lg font-medium text-white mb-1">No shows found</h3>
            <p class="text-gray-500">Try adjusting your search or filters.</p>
        </div>
    {/if}
</div>
