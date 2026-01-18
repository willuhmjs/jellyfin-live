import { getTvMazeCache, setTvMazeCache } from '$lib/server/db';

const BASE_URL = 'https://api.tvmaze.com';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function fetchFromTvMaze(endpoint, skipCache = false) {
    const cached = skipCache ? null : await getTvMazeCache(endpoint);

    if (cached) {
        const now = Date.now();
        if (now - cached.updated_at < CACHE_DURATION) {
            try {
                const data = cached.data;
                if (data) {
                    return data;
                }
                console.warn('[TVMaze] Cached data is null/empty, refetching.');
            } catch (e) {
                console.error('Error parsing cached TVMaze data', e);
            }
        }
    }

    const url = `${BASE_URL}${endpoint}`;
    try {
        console.log(`[TVMaze] Fetching URL: ${url}`);
        const response = await fetch(url);
        console.log(`[TVMaze] Response Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorBody = await response.text().catch(() => 'No body');
            console.error(`[TVMaze] API Error Body: ${errorBody.substring(0, 500)}`);
            throw new Error(`TVMaze API error: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        console.log(`[TVMaze] Response Body Length: ${text.length}`);
        
        const data = JSON.parse(text);

        if (data) {
            await setTvMazeCache(endpoint, data, Date.now());
        } else {
             console.warn('[TVMaze] Fetched data is null/empty, not caching.');
        }

        return data;
    } catch (error) {
        console.error(`[TVMaze] Failed to fetch: ${url}`, error);
        // If fetch fails but we have stale cache, return it?
        // For now, let's just return null or re-throw. 
        // If we have stale cache, maybe returning it is better than failing.
        if (cached) {
            try {
                console.warn('Returning stale cache for TVMaze');
                const staleData = cached.data;
                if (staleData) {
                    return staleData;
                }
            } catch (parseError) {
                 console.error('Error parsing stale cached TVMaze data', parseError);
            }
        }
        throw error;
    }
}

export async function searchShows(query) {
    const encodedQuery = encodeURIComponent(query);
    const endpoint = `/search/shows?q=${encodedQuery}`;
    let results = await fetchFromTvMaze(endpoint);

    let filtered = [];
    if (Array.isArray(results)) {
        filtered = results.filter(r => r.show && typeof r.show.id === 'number');
    }

    // If cache returned results but they were all filtered out (invalid), try fresh
    if (Array.isArray(results) && results.length > 0 && filtered.length === 0) {
        console.warn(`[TVMaze] Cached results for "${query}" were invalid. Fetching fresh...`);
        results = await fetchFromTvMaze(endpoint, true);
        if (Array.isArray(results)) {
            filtered = results.filter(r => r.show && typeof r.show.id === 'number');
        }
    }

    return filtered;
}

export async function getShow(id) {
    const show = await fetchFromTvMaze(`/shows/${id}?embed=episodes`);
    
    if (show && show.name && typeof show.id === 'number') {
        try {
            // Synthetically cache the search result for this show's name
            // This helps the Dashboard find the image without hitting the search API
            // if the user has already visited the series page.
            const searchKey = `/search/shows?q=${encodeURIComponent(show.name)}`;
            const searchResult = [{
                score: 10,
                show: {
                    id: show.id,
                    name: show.name,
                    image: show.image,
                    summary: show.summary,
                    genres: show.genres,
                    status: show.status,
                    premiered: show.premiered
                }
            }];

            await setTvMazeCache(searchKey, searchResult, Date.now());
            console.log(`[TVMaze] Synthetically cached search result for: ${show.name}`);
        } catch (e) {
            console.warn('[TVMaze] Failed to update synthetic search cache:', e);
        }
    }

    return show;
}

export async function manualCacheSearch(query, show) {
    if (!query || !show || typeof show.id !== 'number') return;
    
    try {
        const cleanQuery = query.trim();
        const searchKey = `/search/shows?q=${encodeURIComponent(cleanQuery)}`;
        const searchResult = [{
            score: 10,
            show: {
                id: show.id,
                name: show.name,
                image: show.image,
                summary: show.summary,
                genres: show.genres,
                status: show.status,
                premiered: show.premiered
            }
        }];

        await setTvMazeCache(searchKey, searchResult, Date.now());
        console.log(`[TVMaze] Manually cached search result for query "${query}" -> ${show.name}`);
    } catch (e) {
        console.warn('[TVMaze] Failed to manual cache:', e);
    }
}
