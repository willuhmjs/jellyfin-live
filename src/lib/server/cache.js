const cache = new Map();

/**
 * Get data from cache or fetch it and cache the result
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data if cache miss
 * @param {number} ttlSeconds - Time to live in seconds
 * @returns {Promise<any>}
 */
export async function getCached(key, fetchFn, ttlSeconds = 300) {
	const now = Date.now();
	const cached = cache.get(key);

	if (cached && cached.expiry > now) {
		return cached.data;
	}

	// Double-check locking (simple promise caching could go here to prevent stampedes, 
    // but for now simple overwrite is fine)
	const data = await fetchFn();
	
	cache.set(key, {
		data,
		expiry: now + ttlSeconds * 1000
	});

	return data;
}

/**
 * Clear cache for a specific key pattern
 * @param {string|RegExp} pattern
 */
export function clearCache(pattern) {
    if (!pattern) {
        cache.clear();
        return;
    }
    
    for (const key of cache.keys()) {
        if (pattern instanceof RegExp ? pattern.test(key) : key.includes(pattern)) {
            cache.delete(key);
        }
    }
}
