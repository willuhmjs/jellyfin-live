import * as tvmaze from '$lib/server/tvmaze';
import * as jellyfin from '$lib/server/jellyfin';
import * as db from '$lib/server/db';
import { normalizeShow, cleanName } from '$lib/server/normalization';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObject = any;

export const load: PageServerLoad = async ({ params, locals }) => {
    if (!locals.user) {
        return {
            show: null,
            seasons: {},
            isMonitored: false,
            jellyfinSeriesId: null
        };
    }

    const { user, token } = locals.user;
    const tvmazeId = params.id;

    const JELLYFIN_HOST = await jellyfin.getHost();
    
    // 1. Fetch TVMaze Data
    let show: AnyObject | null = null;
    let jellyfinFallback = false;
    let matchedJellyfinItem: AnyObject | null = null;

    // Helper to attempt Jellyfin Fallback
    const attemptJellyfinFallback = async (jellyfinId: string) => {
        try {
            console.log(`Attempting Jellyfin fallback for ID: ${jellyfinId}`);
            const items = await jellyfin.getItems(user.Id, token, [jellyfinId]);
            
            if (items && items.length > 0) {
                let jShow = items[0];
                jellyfinFallback = true;

                // Check if this is an Episode or Program and switch to Series if possible
                if (jShow.SeriesId && jShow.SeriesId !== jShow.Id) {
                     console.log(`Item ${jShow.Id} is an episode/program of series ${jShow.SeriesId}. Fetching series...`);
                     try {
                         const seriesItems = await jellyfin.getItems(user.Id, token, [jShow.SeriesId]);
                         if (seriesItems && seriesItems.length > 0) {
                             jShow = seriesItems[0];
                             console.log(`Switched to Series item: ${jShow.Name} (${jShow.Id})`);
                         } else {
                             // Series not in library (e.g. from EPG program), but we have SeriesId
                             console.warn(`Series ${jShow.SeriesId} not found in library. Using program metadata but forcing Series ID.`);
                             // We keep jShow as the Program, but we will ensure normalizedShow uses SeriesId
                             // We might want to patch jShow to look more like a Series
                             jShow = {
                                 ...jShow,
                                 Id: jShow.SeriesId,
                                 Name: jShow.SeriesName || jShow.Name,
                                 Type: 'Series' // Pretend it's a series
                             };
                         }
                     } catch (e) {
                         console.warn(`Failed to fetch series ${jShow.SeriesId}, falling back to program data with SeriesId patch:`, e);
                         jShow = {
                             ...jShow,
                             Id: jShow.SeriesId,
                             Name: jShow.SeriesName || jShow.Name,
                             Type: 'Series'
                         };
                     }
                }

                const isMovie = jShow.Type === 'Movie';
                
                // Construct "Lite" Show Object using normalization
                let normalizedShow: AnyObject = normalizeShow(jShow, 'jellyfin', JELLYFIN_HOST);
                if (!normalizedShow) {
                     // Should not happen if item exists but handle it
                     return null;
                }
                console.log(`Successfully fell back to Jellyfin ${isMovie ? 'movie' : 'series'}: ${normalizedShow.name}`);

                // Attempt to upgrade to full TVMaze object
                if (!isMovie) {
                    // 1. Try ProviderId first (Most reliable)
                    const providerId = jShow.ProviderIds ? (jShow.ProviderIds.TvMaze || jShow.ProviderIds.tvmaze) : null;
                    if (providerId) {
                        try {
                            console.log(`Found TVMaze ProviderId in Jellyfin: ${providerId}, fetching full show data...`);
                            const fullShow = await tvmaze.getShow(providerId);
                            if (fullShow) {
                                console.log(`Upgraded to full TVMaze show via ProviderId: ${fullShow.name}`);
                                normalizedShow = fullShow;
                                jellyfinFallback = false;
                                matchedJellyfinItem = { Id: jShow.Id, Name: jShow.Name };
                            }
                        } catch (pidErr) {
                            console.warn(`Failed to fetch TVMaze show by ProviderId ${providerId}:`, pidErr);
                        }
                    }

                    // 2. Fallback to Name Search if ProviderId failed or missing
                    if (jellyfinFallback) {
                        try {
                            console.log(`Searching TVMaze by name: ${normalizedShow.name}`);
                            const results = await tvmaze.searchShows(normalizedShow.name);
                            // Use cleanName for better matching
                            const match = results.find((r: AnyObject) => cleanName(r.show.name) === cleanName(normalizedShow.name)) || results[0];

                            if (match) {
                                // 1. Try to fetch full TVMaze object (Upgrade)
                                try {
                                    const fullShow = await tvmaze.getShow(match.show.id);
                                    if (fullShow) {
                                        console.log(`Upgrading "Lite" Jellyfin show to full TVMaze show: ${fullShow.name}`);
                                        normalizedShow = fullShow;
                                        jellyfinFallback = false;
                                        matchedJellyfinItem = { Id: jShow.Id, Name: jShow.Name };
                                    }
                                } catch (upgradeErr) {
                                    console.warn('Failed to upgrade to full TVMaze show, falling back to image update:', upgradeErr);
                                    
                                    // 2. Fallback: Just update image if upgrade failed
                                    if (match.show.image) {
                                        console.log(`Updating image from TVMaze for: ${normalizedShow.name}`);
                                        normalizedShow.image = {
                                            ...normalizedShow.image,
                                            ...match.show.image
                                        };
                                    }
                                }
                            } else {
                                console.log('No matching TVMaze show found by name.');
                            }
                        } catch (err) {
                            console.warn('Failed to search TVMaze for upgrade/image:', err);
                        }
                    }
                }
                return normalizedShow;
            }
        } catch (je) {
            console.error('Jellyfin fallback failed:', je);
        }
        return null;
    };

    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tvmazeId);

    if (isGuid) {
        // It's likely a Jellyfin ID, skip direct TVMaze fetch
        console.log(`ID ${tvmazeId} looks like a GUID, skipping direct TVMaze fetch.`);
        show = await attemptJellyfinFallback(tvmazeId);
    } else {
        // It's likely a TVMaze ID (numeric)
        try {
            console.log(`Loading series details for TVMaze ID: ${tvmazeId}`);
            show = await tvmaze.getShow(tvmazeId);
            if (show && typeof show.id === 'number') {
                tvmaze.manualCacheSearch(show.name, show);
            }
        } catch (e) {
            console.warn('TVMaze fetch failed, trying Jellyfin fallback:', e);
            // Try fallback in case it's a numeric Jellyfin ID (unlikely but possible)
            show = await attemptJellyfinFallback(tvmazeId);
        }
    }

    if (!show) {
        return {
            show: null,
            error: 'Show not found in TVMaze or Jellyfin.'
        };
    }

    // Check for missing images and attempt to enrich via TVMaze lookup
    if (!show.image?.background || !show.image?.original) {
        const imdb = show.externalIds?.imdb || show.externals?.imdb;
        const thetvdb = (show.externalIds?.thetvdb || show.externals?.thetvdb)?.toString();

        if (imdb || thetvdb) {
            console.log(`[Series Page] Missing images for ${show.name}. Attempting lookup via external IDs...`);
            try {
                const lookedUpShowRaw = await tvmaze.lookupShow({ imdb, thetvdb });
                if (lookedUpShowRaw) {
                    const lookedUpShow = normalizeShow(lookedUpShowRaw);
                    if (lookedUpShow && lookedUpShow.image) {
                        if (!show.image) show.image = {};
                        
                        // Fill in missing images
                        if (!show.image.background && lookedUpShow.image.background) {
                            show.image.background = lookedUpShow.image.background;
                            console.log(`[Series Page] Enriched background image for ${show.name}`);
                        }
                        if (!show.image.original && lookedUpShow.image.original) {
                            show.image.original = lookedUpShow.image.original;
                            console.log(`[Series Page] Enriched original image for ${show.name}`);
                        }
                        if (!show.image.medium && lookedUpShow.image.medium) {
                            show.image.medium = lookedUpShow.image.medium;
                        }
                    }
                }
            } catch (err) {
                console.warn('[Series Page] Failed to lookup show for image enrichment:', err);
            }
        }
    }

    let jellyfinEpisodes: AnyObject[] = [];
    let isMonitored = false;
    let seriesTimerId = null;
    let jellyfinSeriesId = jellyfinFallback ? show.id : null;
    let guidePrograms: AnyObject[] = [];
    let scheduledTimers: AnyObject[] = [];


    try {
        let jellyfinSeries;
        const allSeriesTimers = await jellyfin.getSeriesTimers(token);

        if (jellyfinFallback) {
             jellyfinSeries = { Id: show.id, Name: show.name };
        } else if (matchedJellyfinItem) {
             // We upgraded from a fallback, so we know the Jellyfin ID
             jellyfinSeries = matchedJellyfinItem;
        } else {
            // 2. Search Jellyfin for Series (only if not fallback)
            console.log(`Searching Jellyfin for: ${show.name}`);
            const jellyfinSeriesResults = await jellyfin.getSeries(user.Id, token, show.name);
            
            // Match using cleanName for better flexibility
            jellyfinSeries = jellyfinSeriesResults.find((s: AnyObject) =>
                cleanName(s.Name) === cleanName(show!.name)
            );

            // If not found in library, check if it exists as a Series Timer
            // This allows us to save the image for "Scheduled" shows that aren't in the library yet
            if (!jellyfinSeries) {
                const timer = allSeriesTimers.find((t: AnyObject) => cleanName(t.Name) === cleanName(show!.name));
                if (timer) {
                    console.log(`Found Series Timer for ${show.name}, using as Jellyfin Series fallback.`);
                    jellyfinSeries = { Id: timer.SeriesId || timer.Id, Name: timer.Name };
                    isMonitored = true;
                    seriesTimerId = timer.Id;
                }
            }
        }

        // Always try to save the image if we have one, using the best available name
        if (show && show.image && show.image.original) {
            const saveName = jellyfinSeries ? jellyfinSeries.Name : show.name;
            console.log(`[Series Page] Saving series image for ${saveName}`);
            await db.saveSeriesImage(saveName, show.image.original);
        }

        if (jellyfinSeries) {
            if (!jellyfinFallback) {
                 console.log(`Found Jellyfin series/timer: ${jellyfinSeries.Name} (${jellyfinSeries.Id})`);
            }
            
            // Explicitly cache the TVMaze result under the JELLYFIN series name
            if (show && typeof show.id === 'number') {
                tvmaze.manualCacheSearch(jellyfinSeries.Name, show);
            }

            jellyfinSeriesId = jellyfinSeries.Id;
            
            // 3. Fetch Jellyfin Episodes (if not a movie AND it's a real library item)
            // If we only found it via timer (isMonitored=true but might not be in library), getEpisodes might return empty or fail?
            // jellyfin.getEpisodes expects a SeriesId. If we have one, try it.
            if (!show.isMovie && jellyfinSeries.Id) {
                try {
                    jellyfinEpisodes = await jellyfin.getEpisodes(user.Id, token, jellyfinSeries.Id);
                } catch (err) {
                    console.warn('Failed to fetch episodes (might be timer-only):', err);
                }
            }
            
            // Populate show._embedded.episodes if fallback
            if (jellyfinFallback && jellyfinEpisodes.length > 0) {
                show._embedded.episodes = jellyfinEpisodes.map((ep: AnyObject) => ({
                    id: ep.Id,
                    season: ep.ParentIndexNumber || 1,
                    number: ep.IndexNumber || 0,
                    name: ep.Name,
                    airdate: ep.PremiereDate ? ep.PremiereDate.split('T')[0] : null,
                    runtime: (ep.RunTimeTicks ? Math.round(ep.RunTimeTicks / 10000000 / 60) : 0),
                    summary: ep.Overview,
                    airstamp: ep.PremiereDate
                }));
            }

            // 4. Check for Series Timer (to set isMonitored if not already set)
            if (!isMonitored) {
                const timer = allSeriesTimers.find((t: AnyObject) => t.Name === show!.name || (t.SeriesId && t.SeriesId === jellyfinSeries.Id));
                if (timer) {
                    isMonitored = true;
                    seriesTimerId = timer.Id;
                }
            }
        } else {
            console.log('Series not found in Jellyfin library or timers.');
        }

        // Fetch guide data and timers concurrently
        const [programsResult, timersResult] = await Promise.allSettled([
            jellyfin.getPrograms(user.Id, token, 500, show.name),
            jellyfin.getTimers(token)
        ]);
        
        if (programsResult.status === 'fulfilled') {
            guidePrograms = programsResult.value as AnyObject[];
        }
        if (timersResult.status === 'fulfilled') {
            scheduledTimers = timersResult.value as AnyObject[];

            // Enrich timers with missing EpisodeTitle
            const timersToEnrich = scheduledTimers.filter((t: AnyObject) => !t.EpisodeTitle && t.ProgramId);
            if (timersToEnrich.length > 0) {
                 const programIds = [...new Set(timersToEnrich.map((t: AnyObject) => t.ProgramId))];
                 try {
                     const results = await Promise.allSettled(
                         programIds.map((id: unknown) => jellyfin.getProgram(user.Id, token, id as string))
                     );
                     
                     results.forEach((result: PromiseSettledResult<AnyObject>) => {
                         if (result.status === 'fulfilled') {
                             const item = result.value;
                             const matchingTimers = scheduledTimers.filter((t: AnyObject) => t.ProgramId === item.Id);
                             
                             matchingTimers.forEach((t: AnyObject) => {
                                 t.EpisodeTitle = item.EpisodeTitle || item.Name;
                                 
                                 if (t.Name === t.SeriesName && item.Name && item.Name !== t.SeriesName) {
                                     t.Name = item.Name;
                                 }
                                 
                                 if (!t.SeriesName && item.SeriesName) {
                                     t.SeriesName = item.SeriesName;
                                 }
                                 if (!t.SeriesId && item.SeriesId) {
                                     t.SeriesId = item.SeriesId;
                                 }
                             });
                         }
                     });
                 } catch (err) {
                     console.warn('Failed to enrich timers:', err);
                 }
            }
        }

    } catch (e: unknown) {
        const err = e as AnyObject;
    	if (err.status === 401 || (err.message && err.message.includes('401'))) {
                throw redirect(303, '/login');
    	}
    	console.error('Error fetching Jellyfin data (continuing anyway):', e);
    	// We continue without Jellyfin data so the user can still see show info
    }

    // 5. Merge Data
    const seasons: Record<string, AnyObject[]> = {};
    const matchedTimerIds = new Set();
    
    // matchName helper reusing cleanName
    const matchName = (target: string, ...candidates: (string | undefined)[]) => {
        const cleanTarget = cleanName(target);
        if (!cleanTarget) return false;
        return candidates.some(c => cleanName(c) === cleanTarget);
    };

    // Filter timers for this series
    const showTimers = scheduledTimers.filter((t: AnyObject) => {
        // Match by SeriesId if available
        if (jellyfinSeriesId && (t.SeriesId === jellyfinSeriesId || t.ParentId === jellyfinSeriesId)) return true;
        // Match by Name (SeriesName or Name if generic)
        if (t.SeriesName && cleanName(t.SeriesName) === cleanName(show!.name)) return true;
        // Fallback: If Name is series name
        if (cleanName(t.Name) === cleanName(show!.name)) return true;
        return false;
    });

    // Populate Virtual Episodes from Timers if no episodes exist
    if ((!show._embedded || !show._embedded.episodes || show._embedded.episodes.length === 0) && showTimers.length > 0) {
        if (!show._embedded) show._embedded = {};
        
        console.log(`No episodes found. Creating ${showTimers.length} virtual episodes from timers.`);
        
        show._embedded.episodes = showTimers.map((t: AnyObject) => ({
            id: t.Id,
            name: t.EpisodeTitle || t.Name || 'Scheduled Program',
            season: t.ParentIndexNumber || 1,
            number: t.IndexNumber || 0,
            airstamp: t.StartDate,
            airdate: t.StartDate ? t.StartDate.split('T')[0] : null,
            runtime: t.RunTimeTicks ? Math.round(t.RunTimeTicks / 10000000 / 60) : 0,
            status: 'scheduled',
            summary: t.Overview || 'Scheduled Recording',
            image: null
        }));
    }

    if (show._embedded && show._embedded.episodes) {
        for (const ep of show._embedded.episodes) {
            const seasonNum = ep.season;
            if (!seasons[seasonNum]) {
                seasons[seasonNum] = [];
            }

            const jellyfinEpisode = jellyfinEpisodes.find(je => {
                const matchIndex = je.ParentIndexNumber == ep.season &&
                                 je.IndexNumber == ep.number;
                
                if (matchIndex) return true;

                // Fallback: Match by name if indices are missing or mismatch
                // Check Name and EpisodeTitle (if available)
                return matchName(ep.name, je.Name, je.EpisodeTitle);
            });

            const isOwned = !!jellyfinEpisode;
            
            let isUpcoming = false;
            if (ep.airstamp) {
                isUpcoming = new Date(ep.airstamp) > new Date();
            } else if (ep.airdate) {
                // const now = new Date();
                // const todayStr = now.toISOString().split('T')[0];
                const todayStr = new Date().toISOString().split('T')[0];
                isUpcoming = ep.airdate >= todayStr;
            }

            // Check for guide match
            const guideMatch = guidePrograms.find(p => {
                // 1. Strongest Match: SeriesId check
                if (jellyfinSeriesId && p.SeriesId && p.SeriesId !== jellyfinSeriesId) return false;

                // 2. Match by S/E
                // Use loose equality for season/episode numbers to handle string/number mismatch
                if (p.ParentIndexNumber == ep.season && p.IndexNumber == ep.number) return true;
                
                // 3. Match by Name
                if (matchName(ep.name, p.Name, p.EpisodeTitle)) return true;
                
                // 4. Match by PremiereDate (Original Air Date)
                if (ep.airdate && p.PremiereDate && p.PremiereDate.startsWith(ep.airdate)) return true;
                
                return false;
            });

            // Check if ALREADY recording (using timers directly, independent of guide match)
            const recordingTimer = showTimers.find((t: AnyObject) => {
                 // Use loose equality for season/episode numbers
                 if (t.ParentIndexNumber == ep.season && t.IndexNumber == ep.number) return true;
                 if (matchName(ep.name, t.Name, t.EpisodeTitle)) return true;
                 // Match by PremiereDate (Original Air Date)
                 if (ep.airdate && t.PremiereDate && t.PremiereDate.startsWith(ep.airdate)) return true;
                 // Match by Air Date vs Timer Start Date (for daily shows or scheduling exact airings)
                 if (ep.airstamp && t.StartDate && t.StartDate === ep.airstamp) return true;
                 // Fallback: Check if Timer Date matches Air Date day (helpful for daily shows where times might drift slightly)
                 if (ep.airdate && t.StartDate && t.StartDate.startsWith(ep.airdate)) return true;
                 return false;
            });

            if (recordingTimer) {
                matchedTimerIds.add(recordingTimer.Id || recordingTimer.ProgramId);
            }

            const isRecording = !!recordingTimer;

            seasons[seasonNum].push({
                ...ep,
                owned: isOwned,
                jellyfinId: jellyfinEpisode ? jellyfinEpisode.Id : null,
                upcoming: isUpcoming,
                guideProgramId: guideMatch ? guideMatch.Id : null,
                isRecording,
                timerId: recordingTimer ? recordingTimer.Id : null
            });
        }
    }

    const unmappedRecordings = showTimers.filter((t: AnyObject) => !matchedTimerIds.has(t.Id || t.ProgramId));

    return {
        show,
        seasons,
        isMonitored,
        seriesTimerId,
        jellyfinSeriesId,
        unmappedRecordings,
        JELLYFIN_HOST,
        token
    };
}

export const actions: Actions = {
    recordSeries: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const seriesName = data.get('seriesName');

        if (!seriesName) {
            return fail(400, { message: 'Series name required' });
        }

        try {
            // 1. Search Guide for any airing of this show to get a ProgramId
            // We need a ProgramId to create a Series Timer in Jellyfin (API requirement usually)
            const programs = await jellyfin.getPrograms(locals.user.user.Id, locals.user.token, 50, seriesName as string);
            
            if (!programs || programs.length === 0) {
                 return fail(404, { message: 'No upcoming airings found in guide.' });
            }

            // Filter strictly by name to avoid partial matches on other shows
            const match = programs.find((p: AnyObject) => p.Name.toLowerCase() === (seriesName as string).toLowerCase());

            if (!match) {
                return fail(404, { message: 'No upcoming airings found in guide.' });
            }

            // 2. Schedule Series Recording
            await jellyfin.scheduleRecording(locals.user.token, match.Id, true, locals.user.user.Id);

            return { success: true };
        } catch (e) {
            console.error('Failed to record series:', e);
            return fail(500, { message: 'Failed to schedule recording' });
        }
    },

    recordEpisode: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const programId = data.get('programId');

        if (!programId) {
            return fail(400, { message: 'Program ID required' });
        }

        try {
            await jellyfin.scheduleRecording(locals.user.token, programId as string, false, locals.user.user.Id);
            return { success: true, message: 'Recording scheduled' };
        } catch (e) {
            console.error('Failed to record episode:', e);
            return fail(500, { message: 'Failed to schedule recording' });
        }
    },

    cancelRecording: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const timerId = data.get('timerId');

        if (!timerId) {
            return fail(400, { message: 'Timer ID required' });
        }

        try {
            await jellyfin.cancelTimer(locals.user.token, timerId as string);
            return { success: true, message: 'Recording cancelled' };
        } catch (e) {
            console.error('Failed to cancel recording:', e);
            return fail(500, { message: 'Failed to cancel recording' });
        }
    },

    cancelSeries: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const seriesTimerId = data.get('seriesTimerId');

        if (!seriesTimerId) {
            return fail(400, { message: 'Series Timer ID required' });
        }

        try {
            await jellyfin.cancelSeriesTimer(locals.user.token, seriesTimerId as string);
            return { success: true, message: 'Series recording cancelled' };
        } catch (e) {
            console.error('Failed to cancel series recording:', e);
            return fail(500, { message: 'Failed to cancel series recording' });
        }
    }
};
