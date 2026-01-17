<script>
    import { enhance } from '$app/forms';
    import { onMount } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import { flip } from 'svelte/animate';

    export let data;
    export let form;

    let now = new Date();

    onMount(() => {
        const interval = setInterval(() => {
            now = new Date();
        }, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    });

    // @ts-ignore
    $: isAiring = (start, end) => {
        const startTime = new Date(start);
        const endTime = new Date(end);
        return now >= startTime && now <= endTime;
    };

    let libraryFilter = 'all';

    $: filteredSeries = data.monitoredSeries.filter(series => {
        if (libraryFilter === 'Recorded') return series.status === 'Recorded';
        return true;
    });

    /** @param {string} tag */
    function handleHeroAction(tag) {
        if (tag === 'Upcoming' || tag === 'Premieres') {
            const el = document.getElementById('premieres');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        } else if (tag === 'Favorites') {
            libraryFilter = 'all';
            const el = document.getElementById('library');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        } else if (tag === 'Recorded') {
            libraryFilter = 'Recorded';
            const el = document.getElementById('library');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /** @param {Event} e */
    function handleImageError(e) {
        const target = /** @type {HTMLImageElement} */ (e.currentTarget);
        target.style.display = 'none';
    }
</script>

<div class="p-6 md:p-10 space-y-10 max-w-7xl mx-auto">
    
    <!-- Top Search Bar -->
    <header class="flex items-center gap-4">
        <div class="relative flex-1 max-w-2xl">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <form method="POST" action="?/search" use:enhance>
                <input
                    type="text"
                    name="query"
                    placeholder="Search for movies, TV shows..."
                    class="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-card text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-card-hover focus:ring-1 focus:ring-accent sm:text-sm transition-colors duration-200"
                    value={form?.query || ''}
                />
            </form>
        </div>
        <div class="flex items-center gap-4">
             <!-- User Profile / Settings placeholders could go here -->
        </div>
    </header>

    {#if form?.results}
        <section in:fly={{ y: 20, duration: 500 }} class="space-y-6">
             <div class="flex items-center justify-between">
                <h2 class="text-2xl font-bold text-white tracking-tight">Search Results</h2>
                <button class="text-sm text-gray-400 hover:text-white transition-colors" on:click={() => form.results = null}>Clear</button>
            </div>
            {#if form.results.length > 0}
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {#each form.results as result}
                        <a href="/dashboard/series/{result.show.id}" class="group relative flex flex-col gap-3">
                             <div class="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-card shadow-lg group-hover:shadow-accent/20 transition-all duration-300 group-hover:-translate-y-1">
                                {#if result.show.image?.medium}
                                    <img src={result.show.image.medium} alt={result.show.name} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                {:else}
                                    <div class="w-full h-full flex items-center justify-center text-gray-500 bg-card">No Image</div>
                                {/if}
                                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                            <div class="space-y-1">
                                <h4 class="font-bold text-base leading-tight text-white group-hover:text-accent transition-colors truncate">{result.show.name}</h4>
                                <p class="text-xs text-gray-500">{result.show.premiered ? result.show.premiered.substring(0, 4) : 'Unknown'}</p>
                            </div>
                        </a>
                    {/each}
                </div>
            {:else}
                <p class="text-gray-500 italic">No results found.</p>
            {/if}
        </section>
    {/if}

    {#if !form?.results}
    <!-- Hero / Discovery Section -->
    <section class="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#1e3a8a] to-[#0f172a] shadow-2xl border border-white/5">
        <div class="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none"></div> <!-- Optional noise texture if available, otherwise invisible -->
        <div class="absolute top-0 right-0 p-12 opacity-50 pointer-events-none">
             <div class="w-64 h-64 bg-accent/20 rounded-full blur-3xl"></div>
        </div>
        
        <div class="relative z-10 p-8 md:p-12 lg:p-16 flex flex-col justify-center min-h-[400px]">
            <div class="flex items-center gap-2 text-accent-glow font-medium mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 5a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1V8a1 1 0 011-1zm5-5a1 1 0 011 1v1h1a1 1 0 010 2h-1v1a1 1 0 01-2 0V6h-1a1 1 0 010-2h1V3a1 1 0 011-1zm0 5a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1V8a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
                <span>Your Dashboard</span>
            </div>
            <h1 class="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
                Welcome Back
            </h1>
            <p class="text-lg md:text-xl text-gray-300 max-w-2xl mb-8 leading-relaxed">
                Track your favorite shows, manage recordings, and discover new content from your Jellyfin library.
            </p>
            

            <div class="absolute bottom-8 right-8 text-xs text-gray-500 bg-black/20 px-3 py-1 rounded-full backdrop-blur-md">
                Updated {new Date().toLocaleDateString()}
            </div>
        </div>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Content Column -->
        <div class="lg:col-span-2 space-y-10">
            
            <!-- Upcoming Premieres -->
            {#if data.premieres.length > 0}
            <section id="premieres" class="scroll-mt-24">
                 <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Upcoming Premieres
                    </h2>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {#each data.premieres.slice(0, 4) as prog}
                        <div class="bg-card hover:bg-card-hover border border-white/5 rounded-2xl p-4 flex gap-4 transition-all duration-300 hover:shadow-lg hover:shadow-black/20 group">
                            <div class="relative w-24 h-36 flex-shrink-0 rounded-xl overflow-hidden bg-gray-800 shadow-md">
                                <img
                                    src="{data.JELLYFIN_HOST}/Items/{prog.Id}/Images/Primary"
                                    alt={prog.Name}
                                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    on:error={handleImageError}
                                />
                            </div>
                            <div class="flex flex-col justify-center flex-1 min-w-0">
                                <h3 class="font-bold text-lg text-white leading-tight mb-1 truncate" title={prog.Name}>{prog.Name}</h3>
                                {#if prog.EpisodeTitle}
                                    <p class="text-accent text-sm font-medium mb-2 truncate">{prog.EpisodeTitle}</p>
                                {/if}
                                <div class="flex items-center gap-2 text-xs text-gray-400 mb-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {new Date(prog.StartDate).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                                </div>
                                <div class="mt-auto">
                                    <span class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider border border-green-500/20">
                                        Premiere
                                    </span>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </section>
            {/if}

            <!-- Recently Added / Library -->
             <section>
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Recently Added
                    </h2>
                     <a href="/dashboard/series" class="text-sm font-medium text-accent hover:text-accent-glow transition-colors">View All</a>
                </div>

                {#if filteredSeries.length > 0}
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                        {#each filteredSeries.slice(0, 8) as series (series.name)}
                             <a href="/dashboard/series/lookup?name={encodeURIComponent(series.name)}" class="group relative flex flex-col gap-3" animate:flip={{duration: 300}}>
                                <div class="relative w-full aspect-[1/1] sm:aspect-[2/3] rounded-2xl overflow-hidden bg-card shadow-lg border border-white/5 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-accent/10">
                                    {#if series.tvmazeImage}
                                        <img src={series.tvmazeImage} alt={series.name} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    {:else if series.id && series.imageTag}
                                        <img
                                            src="{data.JELLYFIN_HOST}/Items/{series.id}/Images/Primary?Tag={series.imageTag}&MaxWidth=400"
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
                                    
                                     <!-- Status Badge Overlay -->
                                     <div class="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                                         <div class="flex justify-center">
                                            <span class="w-full text-center py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md
                                                {series.status === 'Recorded' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}">
                                                {series.status === 'Recorded' ? 'Available' : 'Monitored'}
                                            </span>
                                         </div>
                                     </div>
                                </div>
                                <div class="text-center px-1">
                                    <h3 class="font-bold text-sm text-gray-200 truncate group-hover:text-white transition-colors" title={series.name}>{series.name}</h3>
                                    <!-- <p class="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Artist</p> Placeholder for 'Artist' from image, using 'Artist' style label -->
                                </div>
                            </a>
                        {/each}
                    </div>
                {:else}
                     <div class="p-8 text-center border border-dashed border-gray-700 rounded-2xl">
                        <p class="text-gray-500 italic">No series found with current filter.</p>
                    </div>
                {/if}
            </section>
        </div>

        <!-- Sidebar / Right Column -->
        <div class="space-y-8">
            <!-- Scheduled Recordings Widget -->
            <div id="scheduled" class="bg-card border border-white/5 rounded-2xl p-6 shadow-xl sticky top-8 scroll-mt-24">
                <h2 class="text-xl font-bold text-white mb-6 flex items-center justify-between">
                    <span>Scheduled</span>
                    <span class="text-xs font-bold text-black bg-white px-2 py-1 rounded-full">{data.scheduledRecordings.length}</span>
                </h2>
                
                {#if data.scheduledRecordings.length > 0}
                    <div class="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                        {#each data.scheduledRecordings as timer}
                            <div class="flex gap-3 group">
                                <div class="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                                    {#if timer.ProgramId}
                                        <img
                                            src="{data.JELLYFIN_HOST}/Items/{timer.ProgramId}/Images/Primary"
                                            alt={timer.Name}
                                            class="w-full h-full object-cover"
                                            on:error={handleImageError}
                                        />
                                    {:else if timer.SeriesId}
                                            <img
                                            src="{data.JELLYFIN_HOST}/Items/{timer.SeriesId}/Images/Primary?{timer.SeriesPrimaryImageTag ? `Tag=${timer.SeriesPrimaryImageTag}&` : ''}MaxWidth=100"
                                            alt={timer.Name}
                                            class="w-full h-full object-cover"
                                            on:error={handleImageError}
                                        />
                                    {:else}
                                        <div class="w-full h-full flex items-center justify-center text-gray-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    {/if}
                                </div>
                                <div class="flex-1 min-w-0 flex flex-col justify-center">
                                    <h4 class="text-sm font-bold text-gray-200 truncate group-hover:text-white transition-colors" title={timer.EpisodeTitle || timer.Name}>
                                        {timer.EpisodeTitle || timer.Name}
                                    </h4>
                                    {#if timer.SeriesName}
                                        <p class="text-xs text-gray-500 truncate">{timer.SeriesName}</p>
                                    {/if}
                                    <div class="mt-1">
                                        {#if isAiring(timer.StartDate, timer.EndDate)}
                                            <span class="inline-flex items-center gap-1 text-[10px] text-red-400 font-bold animate-pulse">
                                                <div class="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                                RECORDING
                                            </span>
                                        {:else}
                                            <span class="text-[10px] text-gray-400 font-medium">
                                                {new Date(timer.StartDate).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="text-center py-8">
                        <div class="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <p class="text-gray-500 text-sm">No scheduled recordings.</p>
                    </div>
                {/if}
                
                <div class="mt-6 pt-6 border-t border-white/5">
                     <a href="/guide" class="block w-full py-2.5 rounded-lg bg-white/5 text-center text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                        View Full Guide
                     </a>
                </div>
            </div>
        </div>
    </div>
    {/if}
</div>
