<script>
    import { enhance } from '$app/forms';
    import { fade, slide } from 'svelte/transition';
    import { toast } from '$lib/stores/toast';

    export let data;
    export let form;

    $: show = data.show;
    $: seasons = data.seasons;
    $: isMonitored = data.isMonitored;

    let processing = false;
    let expandedSeasons = {};

    function toggleSeason(seasonNum) {
        expandedSeasons[seasonNum] = !expandedSeasons[seasonNum];
    }

    // React to form result
    $: if (form?.success) {
        toast.set({ message: 'Series recording scheduled!', type: 'success' });
        // Optimistic update could happen here, but we rely on page reload for isMonitored update
    } else if (form?.message) {
        toast.set({ message: form.message, type: 'error' });
    }
</script>

<div class="p-6 max-w-7xl mx-auto space-y-8">
    {#if !show}
        <div class="text-center py-12">
            <h1 class="text-2xl font-bold text-red-500">Series Not Found</h1>
            <p class="text-gray-400 mt-2">{data.error || 'Could not load series details.'}</p>
            <a href="/dashboard" class="mt-4 inline-block text-blue-400 hover:underline">&larr; Back to Dashboard</a>
        </div>
    {:else}
        <!-- Header Section -->
        <div class="flex flex-col md:flex-row gap-8">
            <!-- Poster -->
            <div class="flex-shrink-0 w-full md:w-64">
                {#if show.image?.original}
                    <img src={show.image.original} alt={show.name} class="w-full rounded-xl shadow-lg" />
                {:else}
                    <div class="w-full aspect-[2/3] bg-gray-800 rounded-xl flex items-center justify-center text-gray-500">
                        No Image
                    </div>
                {/if}
            </div>

            <!-- Info -->
            <div class="flex-grow space-y-4">
                <div class="flex items-start justify-between">
                    <div>
                        <h1 class="text-4xl font-bold text-white">{show.name}</h1>
                        <div class="flex flex-wrap gap-2 mt-2 text-sm text-gray-400">
                            {#if show.premiered}<span>{show.premiered.split('-')[0]}</span>{/if}
                            {#if show.network}<span>• {show.network.name}</span>{/if}
                            {#if show.status}<span>• {show.status}</span>{/if}
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="flex gap-2">
                        {#if isMonitored}
                            <div class="px-4 py-2 bg-red-900/50 text-red-200 border border-red-800 rounded-lg flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 9a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 00-1-1H8z" clip-rule="evenodd" />
                                </svg>
                                Recording Series
                            </div>
                        {:else}
                            <form 
                                method="POST" 
                                action="?/recordSeries" 
                                use:enhance={() => {
                                    processing = true;
                                    return async ({ update }) => {
                                        processing = false;
                                        await update();
                                    };
                                }}
                            >
                                <input type="hidden" name="seriesName" value={show.name} />
                                <button 
                                    disabled={processing}
                                    class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {#if processing}
                                        <span class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                        Scheduling...
                                    {:else}
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 9a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 00-1-1H8z" clip-rule="evenodd" />
                                        </svg>
                                        Record Series
                                    {/if}
                                </button>
                            </form>
                        {/if}
                    </div>
                </div>

                <div class="flex flex-wrap gap-2">
                    {#each show.genres as genre}
                        <span class="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-full">{genre}</span>
                    {/each}
                </div>

                {#if show.summary}
                    <div class="prose prose-invert max-w-none text-gray-300" >
                        {@html show.summary}
                    </div>
                {/if}
                
                {#if data.jellyfinSeriesId}
                     <div class="inline-flex items-center gap-2 text-green-400 text-sm bg-green-900/20 px-3 py-1 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                        In Library
                    </div>
                {/if}
            </div>
        </div>

        <!-- Seasons & Episodes -->
        <div class="space-y-8">
            {#if data.unmappedRecordings && data.unmappedRecordings.length > 0}
                <div class="space-y-4">
                    <h2 class="text-2xl font-bold border-b border-gray-800 pb-2">Scheduled Recordings</h2>
                    <div class="bg-gray-900/50 rounded-xl overflow-hidden border border-gray-800 divide-y divide-gray-800">
                        {#each data.unmappedRecordings as timer}
                            <div class="px-6 py-4 flex items-center gap-4">
                                <div class="flex-shrink-0 w-20 aspect-video bg-gray-800 rounded overflow-hidden hidden sm:block shadow-sm">
                                    {#if timer.ProgramId}
                                        <img
                                            src="{data.JELLYFIN_HOST}/Items/{timer.ProgramId}/Images/Primary"
                                            alt={timer.Name}
                                            class="w-full h-full object-cover"
                                            on:error={(e) => e.currentTarget.style.display='none'}
                                        />
                                     {:else if timer.SeriesId}
                                        <img
                                            src="{data.JELLYFIN_HOST}/Items/{timer.SeriesId}/Images/Primary?{timer.SeriesPrimaryImageTag ? `Tag=${timer.SeriesPrimaryImageTag}&` : ''}MaxWidth=200"
                                            alt={timer.Name}
                                            class="w-full h-full object-cover"
                                            on:error={(e) => e.currentTarget.style.display='none'}
                                        />
                                    {/if}
                                </div>
                                <div class="flex-grow">
                                    <h4 class="font-medium text-white">{timer.EpisodeTitle || timer.Name || 'Unknown Episode'}</h4>
                                    <div class="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                                        {#if timer.StartDate}
                                            <span>{new Date(timer.StartDate).toLocaleString()}</span>
                                        {/if}
                                        {#if timer.ChannelName}
                                            <span>• {timer.ChannelName}</span>
                                        {/if}
                                    </div>
                                    {#if timer.Overview}
                                        <p class="text-xs text-gray-400 mt-1 line-clamp-1">{timer.Overview}</p>
                                    {/if}
                                </div>
                                <span class="flex-shrink-0 px-3 py-1 bg-red-900/30 text-red-400 rounded-full text-xs font-medium border border-red-900/50 flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 9a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 00-1-1H8z" clip-rule="evenodd" />
                                    </svg>
                                    Recording
                                </span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <h2 class="text-2xl font-bold border-b border-gray-800 pb-2">Episodes</h2>
            
            {#if Object.keys(seasons).length === 0}
                <p class="text-gray-500">No episode information available.</p>
            {/if}

            {#each Object.entries(seasons).reverse() as [seasonNum, episodes]}
                {@const ownedCount = episodes.filter(e => e.owned).length}
                {@const hasUpcoming = episodes.some(e => e.guideProgramId)}
                {@const hasRecording = episodes.some(e => e.isRecording)}
                <div class="bg-gray-900/50 rounded-xl overflow-hidden border border-gray-800">
                    <button
                        class="w-full px-6 py-4 bg-gray-800/50 flex justify-between items-center hover:bg-gray-800 transition-colors text-left"
                        class:border-b={expandedSeasons[seasonNum]}
                        class:border-gray-800={expandedSeasons[seasonNum]}
                        on:click={() => toggleSeason(seasonNum)}
                    >
                        <div class="flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 transform transition-transform duration-200 {expandedSeasons[seasonNum] ? 'rotate-180' : ''}" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                            <h3 class="font-bold text-lg">Season {seasonNum}</h3>
                            {#if hasUpcoming}
                                <span class="text-blue-400 ml-2" title="Upcoming Airings">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                    </svg>
                                </span>
                            {/if}
                        </div>
                        <div class="flex items-center gap-3">
                            {#if hasRecording}
                                <span class="text-red-500 animate-pulse" title="Recording Scheduled">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 9a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 00-1-1H8z" clip-rule="evenodd" />
                                    </svg>
                                </span>
                            {/if}
                            <span class="text-sm text-gray-500">{ownedCount} / {episodes.length} Episodes</span>
                        </div>
                    </button>
                    
                    {#if expandedSeasons[seasonNum]}
                        <div class="divide-y divide-gray-800" transition:slide>
                            {#each episodes as ep}
                                <div class="px-6 py-4 hover:bg-gray-800/30 transition-colors flex items-center justify-between gap-4">
                                    <div class="flex-grow min-w-0">
                                        <div class="flex items-baseline gap-3">
                                            <span class="text-sm font-mono text-gray-500 w-8 flex-shrink-0">E{ep.number}</span>
                                            <h4 class="font-medium text-white truncate">{ep.name}</h4>
                                        </div>
                                        <div class="pl-11 mt-1 flex items-center gap-4 text-xs text-gray-500">
                                            {#if ep.airdate}
                                                <span>{ep.airdate}</span>
                                            {/if}
                                            {#if ep.runtime}
                                                <span>{ep.runtime} min</span>
                                            {/if}
                                        </div>
                                        {#if ep.summary}
                                            <p class="pl-11 mt-2 text-sm text-gray-400 line-clamp-2">{@html ep.summary.replace(/<[^>]*>?/gm, '')}</p>
                                        {/if}
                                    </div>

                                    <div class="flex-shrink-0">
                                        {#if ep.owned}
                                            <span class="px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-xs font-medium border border-green-900/50">
                                                Library
                                            </span>
                                        {:else if ep.isRecording}
                                            <form method="POST" action="?/cancelRecording" use:enhance>
                                                <input type="hidden" name="timerId" value={ep.timerId} />
                                                <button class="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-full text-xs font-medium border border-red-900/50 flex items-center gap-1 transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 9a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 00-1-1H8z" clip-rule="evenodd" />
                                                    </svg>
                                                    Cancel Recording
                                                </button>
                                            </form>
                                        {:else if ep.guideProgramId}
                                             <form method="POST" action="?/recordEpisode" use:enhance>
                                                <input type="hidden" name="programId" value={ep.guideProgramId} />
                                                <button class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-medium transition-colors flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 9a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 00-1-1H8z" clip-rule="evenodd" />
                                                    </svg>
                                                    Record
                                                </button>
                                             </form>
                                        {:else if ep.upcoming}
                                            <button disabled class="px-3 py-1 bg-gray-700 text-gray-400 rounded-full text-xs font-medium border border-gray-600 cursor-not-allowed flex items-center gap-1" title="Airing soon but not yet in guide">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 9a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 00-1-1H8z" clip-rule="evenodd" />
                                                </svg>
                                                Record
                                            </button>
                                        {:else}
                                            <span class="px-3 py-1 bg-gray-800 text-gray-500 rounded-full text-xs font-medium border border-gray-700">
                                                Missing
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>
