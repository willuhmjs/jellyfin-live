import { db } from '$lib/server/db';

const BASE_URL = 'https://api.tvmaze.com';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const getCacheStmt = db.prepare('SELECT data, updated_at FROM tvmaze_cache WHERE endpoint = ?');
const setCacheStmt = db.prepare('INSERT OR REPLACE INTO tvmaze_cache (endpoint, data, updated_at) VALUES (?, ?, ?)');

async function fetchFromTvMaze(endpoint) {
    const cached = getCacheStmt.get(endpoint);

    if (cached) {
        const now = Date.now();
        if (now - cached.updated_at < CACHE_DURATION) {
            try {
                const data = JSON.parse(cached.data);
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
            setCacheStmt.run(endpoint, JSON.stringify(data), Date.now());
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
                const staleData = JSON.parse(cached.data);
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
    return fetchFromTvMaze(`/search/shows?q=${encodedQuery}`);
}

export async function getShow(id) {
    return fetchFromTvMaze(`/shows/${id}?embed=episodes`);
}
