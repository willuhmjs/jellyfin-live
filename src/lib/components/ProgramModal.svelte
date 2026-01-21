<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { enhance } from '$app/forms';
    import { toast } from '$lib/stores/toast';

	let { program, host = '', token = '' }: { program: any, host?: string, token?: string } = $props();

	const dispatch = createEventDispatcher();
    
    let richDetails: any = $state(null);
    let episodes: any[] = $state([]);
    let loadingDetails = $state(true);
    let loadingEpisodes = $state(false);

	function close() {
		dispatch('close');
	}

	function formatDateTime(dateString: string | Date) {
		const date = new Date(dateString);
		return date.toLocaleString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
	}

    onMount(async () => {
        try {
            const res = await fetch(`/api/jellyfin/program/${program.Id}`);
            if (res.ok) {
                richDetails = await res.json();
                
                // If part of a series, fetch episodes
                if (richDetails.SeriesId) {
                    loadingEpisodes = true;
                    try {
                        const epRes = await fetch(`/api/jellyfin/shows/${richDetails.SeriesId}/episodes?seasonId=${richDetails.SeasonId || ''}`);
                        if (epRes.ok) {
                            episodes = await epRes.json();
                        }
                    } catch (e) {
                        console.error('Failed to fetch episodes', e);
                    } finally {
                        loadingEpisodes = false;
                    }
                }
            }
        } catch (e) {
            console.error('Failed to fetch program details', e);
        } finally {
            loadingDetails = false;
        }
    });

    const submitHandler = () => {
        return async ({ result, update }: any) => {
            if (result.type === 'success') {
                if (result.data?.success) {
                    toast.add('Operation successful', 'success');
                    await update();
                    close();
                } else {
                    toast.add(result.data?.error || 'Operation failed', 'error');
                }
            } else {
                toast.add('An error occurred', 'error');
            }
        };
    };

    let isLive = $derived.by(() => {
        if (!program.StartDate || !program.EndDate) return false;
        const start = new Date(program.StartDate);
        const end = new Date(program.EndDate);
        const current = new Date();
        return current >= start && current < end;
    });
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onclick={(e) => e.target === e.currentTarget && close()} role="dialog" aria-modal="true" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && close()}>
	<div class="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 shadow-xl flex flex-col">
        <!-- Header Image & Title -->
        <div class="relative h-48 sm:h-64 bg-gray-800 shrink-0 overflow-hidden">
             {#if richDetails?.BackdropImageTags && richDetails.BackdropImageTags[0]}
                 <img
                    src="{host}/Items/{richDetails.Id}/Images/Backdrop/0?Tag={richDetails.BackdropImageTags[0]}&maxWidth=1280&quality=80&api_key={token}"
                    alt={richDetails.Name}
                    class="absolute inset-0 w-full h-full object-cover"
                 />
                 <div class="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent z-10"></div>
            {:else if richDetails?.ImageTags?.Primary}
                 <img
                    src="{host}/Items/{richDetails.Id}/Images/Primary?Tag={richDetails.ImageTags.Primary}&maxWidth=800&quality=80&api_key={token}"
                    alt={richDetails.Name}
                    class="absolute inset-0 w-full h-full object-cover"
                 />
                 <div class="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent z-10"></div>
            {:else}
                 <div class="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent z-10"></div>
            {/if}
            
            <div class="absolute bottom-0 left-0 p-6 z-20 w-full">
                <div class="flex justify-between items-end">
                    <div>
                        <h2 class="text-3xl font-bold text-white mb-2">{richDetails?.Name || program.Name}</h2>
                        <div class="flex items-center gap-3 text-sm text-gray-300">
                            {#if richDetails?.OfficialRating}
                                <span class="border border-gray-500 px-1 rounded text-xs">{richDetails.OfficialRating}</span>
                            {/if}
                             {#if richDetails?.CommunityRating}
                                <span class="flex items-center gap-1 text-yellow-400">
                                    ★ {richDetails.CommunityRating.toFixed(1)}
                                </span>
                            {/if}
                             <span>{formatDateTime(program.StartDate)}</span>
                        </div>
                    </div>
                    
                    <button onclick={close} class="text-gray-400 hover:text-white mb-2 p-2 bg-black/40 rounded-full backdrop-blur-md" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>

		<div class="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Main Content -->
            <div class="lg:col-span-2 space-y-6">
                <!-- Overview -->
                <div class="space-y-2 text-gray-300">
                    {#if richDetails?.EpisodeTitle}
                        <div class="font-semibold text-blue-400 text-lg">{richDetails.EpisodeTitle}</div>
                    {/if}
        
                    <p class="leading-relaxed text-gray-300">
                        {richDetails?.Overview || program.Overview || 'No description available.'}
                    </p>
                    
                    {#if richDetails?.Genres && richDetails.Genres.length > 0}
                        <div class="flex flex-wrap gap-2 mt-4">
                            {#each richDetails.Genres as genre}
                                <span class="bg-gray-800 text-gray-400 px-2 py-1 rounded text-xs font-medium">{genre}</span>
                            {/each}
                        </div>
                    {/if}
                </div>

                <!-- Cast -->
                 {#if richDetails?.People && richDetails.People.length > 0}
                    <div>
                        <h3 class="text-white font-bold mb-3">Cast</h3>
                        <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700">
                            {#each richDetails.People as person}
                                <div class="flex-shrink-0 w-24 text-center">
                                    <div class="w-20 h-20 mx-auto bg-gray-800 rounded-full mb-2 overflow-hidden flex items-center justify-center text-gray-600">
                                        {#if person.PrimaryImageTag}
                                             <img
                                                src="{host}/Items/{person.Id}/Images/Primary?Tag={person.PrimaryImageTag}&fillWidth=100&quality=90&api_key={token}"
                                                alt={person.Name}
                                                class="w-full h-full object-cover"
                                             />
                                        {:else}
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                                            </svg>
                                        {/if}
                                    </div>
                                    <div class="text-xs font-medium text-gray-200 truncate">{person.Name}</div>
                                    <div class="text-[10px] text-gray-500 truncate">{person.Role || ''}</div>
                                </div>
                            {/each}
                        </div>
                    </div>
                 {/if}
            </div>

            <!-- Sidebar -->
            <div class="space-y-6">
                <!-- Actions -->
                <div class="bg-gray-800 p-4 rounded-lg space-y-3">
                    {#if isLive}
                        <a
                            href="{host}/web/index.html#!/details?id={program.Id}"
                            target="_blank"
                            class="w-full rounded bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                            Watch on Jellyfin
                        </a>
                    {/if}

                    {#if program.isRecording}
                        <form method="POST" action="?/cancelRecording" use:enhance={submitHandler}>
                            <input type="hidden" name="timerId" value={program.timerId} />
                            <button
                                type="submit"
                                class="w-full rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                </svg>
                                Cancel Recording
                            </button>
                        </form>
                    {:else}
                        <form method="POST" action="?/record" use:enhance={submitHandler}>
                            <input type="hidden" name="programId" value={program.Id} />
                            <button
                                type="submit"
                                class="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM10 2a8 8 0 100 16 8 8 0 000-16z" clip-rule="evenodd" />
                                    <circle cx="10" cy="10" r="3" />
                                </svg>
                                Record Episode
                            </button>
                        </form>
                    {/if}

                    {#if program.SeriesId}
                        {#if program.isSeriesRecording}
                            <form method="POST" action="?/cancelSeriesRecording" use:enhance={submitHandler}>
                                <input type="hidden" name="seriesTimerId" value={program.seriesTimerId} />
                                <button
                                    type="submit"
                                    class="w-full rounded bg-red-800 px-4 py-2 font-medium text-white hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                    </svg>
                                    Cancel Series
                                </button>
                            </form>
                        {:else}
                            <form method="POST" action="?/recordSeries" use:enhance={submitHandler}>
                                <input type="hidden" name="programId" value={program.Id} />
                                <button
                                    type="submit"
                                    class="w-full rounded bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
                                    </svg>
                                    Record Series
                                </button>
                            </form>
                        {/if}
                    {/if}
                </div>

                <!-- Series Context -->
                {#if loadingEpisodes}
                     <div class="animate-pulse space-y-3">
                        <div class="h-4 bg-gray-800 rounded w-1/2"></div>
                        <div class="h-12 bg-gray-800 rounded"></div>
                        <div class="h-12 bg-gray-800 rounded"></div>
                     </div>
                {:else if episodes.length > 0}
                    <div>
                        <h3 class="text-white font-bold mb-3 flex items-center justify-between">
                            <span>Season Context</span>
                            {#if richDetails?.SeasonName}
                                <span class="text-xs text-gray-500 font-normal">{richDetails.SeasonName}</span>
                            {/if}
                        </h3>
                        <div class="bg-gray-800 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                            {#each episodes as ep}
                                <div class="p-3 border-b border-gray-700 hover:bg-gray-700/50 transition-colors flex gap-3 {ep.Id === program.Id ? 'bg-blue-900/20 border-l-2 border-l-blue-500' : ''}">
                                    <div class="text-gray-400 font-mono text-xs pt-1">{ep.IndexNumber}</div>
                                    <div class="flex-1 min-w-0">
                                        <div class="text-sm font-medium text-gray-200 truncate">{ep.Name}</div>
                                        <div class="text-xs text-gray-500 truncate">{ep.Overview || ''}</div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
		</div>
	</div>
</div>
