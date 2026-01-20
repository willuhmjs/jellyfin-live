interface CacheEntry<T> {
    data: T;
    expiry: number;
}

const cache = new Map<string, CacheEntry<any>>();

export async function getCached<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds = 300): Promise<T> {
	const now = Date.now();
	const cached = cache.get(key);

	if (cached && cached.expiry > now) {
		return cached.data as T;
	}

	const data = await fetchFn();
	
	cache.set(key, {
		data,
		expiry: now + ttlSeconds * 1000
	});

	return data;
}

export function clearCache(pattern?: string | RegExp): void {
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
