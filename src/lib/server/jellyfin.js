import { getSetting } from './db.js';

const headers = {
	'Content-Type': 'application/json',
	'X-Emby-Authorization':
		'MediaBrowser Client="Jellyfin Live", Device="Web", DeviceId="jellyfin-live-web", Version="1.0.0"'
};

export async function getHost() {
    const host = await getSetting('jellyfin_url');
    
    // Check if we should ignore SSL errors
    const ignoreSsl = await getSetting('ignore_ssl');
    if (ignoreSsl === 'true') {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    } else {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    }

    if (!host) {
        // This should be caught by hooks, but just in case
        throw new Error('Jellyfin host not configured');
    }
    // Remove trailing slash if present
    return host.replace(/\/$/, '');
}

/**
 * Authenticate with Jellyfin
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{user: any, accessToken: string}>}
 */
export async function authenticate(username, password) {
    const host = await getHost();
	const res = await fetch(`${host}/Users/AuthenticateByName`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			Username: username,
			Pw: password
		})
	});

	if (!res.ok) {
		throw new Error('Authentication failed');
	}

	const data = await res.json();
	return {
		user: data.User,
		accessToken: data.AccessToken
	};
}

/**
 * Get Live TV Channels
 * @param {string} userId
 * @param {string} token
 * @returns {Promise<any[]>}
 */
export async function getChannels(userId, token) {
    const host = await getHost();
	const res = await fetch(
		`${host}/LiveTv/Channels?UserId=${userId}&EnableFavoriteSorting=true&SortBy=ChannelName`,
		{
			headers: {
				...headers,
				'X-Emby-Token': token
			}
		}
	);

	if (!res.ok) {
		throw new Error('Failed to fetch channels');
	}

	const data = await res.json();
	return data.Items || [];
}

/**
 * Get Live TV Programs
 * @param {string} userId
 * @param {string} token
 * @param {number} limit
 * @returns {Promise<any[]>}
 */
export async function getPrograms(userId, token, limit = 100, searchTerm = null) {
	// Fetch programs for the next 48 hours to be safe, or just use limit.
	// We'll use HasAired=false to get future programs.
	const params = new URLSearchParams({
		UserId: userId,
		HasAired: 'false',
		SortBy: 'StartDate',
		Limit: limit.toString(),
		EnableTotalRecordCount: 'false',
		ImageTypeLimit: '1',
		EnableImageTypes: 'Primary',
		      Fields: 'SeriesId,ProgramId,EpisodeTitle,Name,Overview,SeasonId,ParentIndexNumber,IndexNumber,StartDate,EndDate,ChannelName,PremiereDate'
	});

    if (searchTerm) {
        params.append('SearchTerm', searchTerm);
    }

    const host = await getHost();
	const res = await fetch(`${host}/LiveTv/Programs?${params.toString()}`, {
		headers: {
			...headers,
			'X-Emby-Token': token
		}
	});

	if (!res.ok) {
		throw new Error('Failed to fetch programs');
	}

	const data = await res.json();
	return data.Items || [];
}

/**
 * Get Program Details
 * @param {string} userId
 * @param {string} token
 * @param {string} programId
 * @returns {Promise<any>}
 */
export async function getProgram(userId, token, programId) {
    const host = await getHost();
    const params = new URLSearchParams({
        UserId: userId,
        Fields: 'People,Studios,CommunityRating,OfficialRating,Genres,Overview,SeriesId,SeasonId,EpisodeTitle,PremiereDate'
    });

    const res = await fetch(`${host}/LiveTv/Programs/${programId}?${params.toString()}`, {
        headers: {
            ...headers,
            'X-Emby-Token': token
        }
    });

    if (!res.ok) {
        throw new Error('Failed to fetch program details');
    }

    return await res.json();
}

/**
 * Get Items by IDs
 * @param {string} userId
 * @param {string} token
 * @param {string[]} ids
 * @returns {Promise<any[]>}
 */
export async function getItems(userId, token, ids) {
    if (!ids || ids.length === 0) return [];

    const host = await getHost();
    const params = new URLSearchParams({
        Ids: ids.join(','),
        Fields: 'EpisodeTitle,Overview,SeriesName,PremiereDate,PrimaryImageAspectRatio,Genres,Studios,OfficialRating,ProviderIds,DateCreated,CommunityRating,Status,People,BackdropImageTags,ProductionLocations'
    });

    const res = await fetch(`${host}/Users/${userId}/Items?${params.toString()}`, {
        headers: {
            ...headers,
            'X-Emby-Token': token
        }
    });

    if (!res.ok) {
        console.warn('Failed to fetch items by IDs');
        return [];
    }

    const data = await res.json();
    return data.Items || [];
}

/**
 * Get Episodes for a Series/Season
 * @param {string} userId
 * @param {string} token
 * @param {string} seriesId
 * @param {string} seasonId
 * @returns {Promise<any[]>}
 */
export async function getEpisodes(userId, token, seriesId, seasonId = null) {
    const host = await getHost();
    const params = new URLSearchParams({
        UserId: userId,
        SeriesId: seriesId,
        Fields: 'Overview,PrimaryImageAspectRatio,PremiereDate,RunTimeTicks,ParentIndexNumber,IndexNumber,MediaSources,OfficialRating',
        SortBy: 'IndexNumber',
        SortOrder: 'Ascending'
    });

    if (seasonId) {
        params.append('SeasonId', seasonId);
    }

    // Note: Jellyfin uses /Shows/{Id}/Episodes
    const res = await fetch(`${host}/Shows/${seriesId}/Episodes?${params.toString()}`, {
        headers: {
            ...headers,
            'X-Emby-Token': token
        }
    });

    if (!res.ok) {
        throw new Error('Failed to fetch episodes');
    }

    const data = await res.json();
    return data.Items || [];
}

/**
 * Get Recordings
 * @param {string} userId
 * @param {string} token
 * @returns {Promise<any[]>}
 */
export async function getRecordings(userId, token) {
	const params = new URLSearchParams({
		UserId: userId,
		SortBy: 'DateCreated',
		SortOrder: 'Descending',
		EnableTotalRecordCount: 'false',
		Fields: 'Overview,EpisodeTitle,ChannelName,ChannelId,SeriesId,SeriesName,SeasonId,IsSeries,DateCreated,StartDate,EndDate,ImageTags'
	});

    const host = await getHost();
	const res = await fetch(`${host}/LiveTv/Recordings?${params.toString()}`, {
		headers: {
			...headers,
			'X-Emby-Token': token
		}
	});

	if (!res.ok) {
		throw new Error('Failed to fetch recordings');
	}

	const data = await res.json();
	return data.Items || [];
}

/**
 * Get Series from Library
 * @param {string} userId
 * @param {string} token
 * @param {string} searchTerm
 * @returns {Promise<any[]>}
 */
export async function getSeries(userId, token, searchTerm = null) {
    return searchItems(userId, token, searchTerm, ['Series']);
}

/**
 * Search for Items (Series, Movie, etc)
 * @param {string} userId
 * @param {string} token
 * @param {string} searchTerm
 * @param {string[]} types
 * @returns {Promise<any[]>}
 */
export async function searchItems(userId, token, searchTerm, types = ['Series']) {
    const host = await getHost();
    const params = new URLSearchParams({
        UserId: userId,
        Recursive: 'true',
        IncludeItemTypes: types.join(','),
        Fields: 'Overview,PrimaryImageAspectRatio,ProviderIds,Type',
        SortBy: 'SortName',
        SortOrder: 'Ascending'
    });

    if (searchTerm) {
        params.append('SearchTerm', searchTerm);
    }

    const res = await fetch(`${host}/Users/${userId}/Items?${params.toString()}`, {
        headers: {
            ...headers,
            'X-Emby-Token': token
        }
    });

    if (!res.ok) {
        throw new Error('Failed to search items');
    }

    const data = await res.json();
    return data.Items || [];
}

/**
 * Get Channel Details
 * @param {string} userId
 * @param {string} token
 * @param {string} channelId
 * @returns {Promise<any>}
 */
export async function getChannel(userId, token, channelId) {
    const host = await getHost();
    const res = await fetch(`${host}/LiveTv/Channels/${channelId}?UserId=${userId}`, {
        headers: {
            ...headers,
            'X-Emby-Token': token
        }
    });

    if (!res.ok) {
        throw new Error('Failed to fetch channel details');
    }

    return await res.json();
}

/**
 * Schedule a recording
 * @param {string} token
 * @param {string} programId
 * @param {boolean} isSeries
 * @param {string} userId
 */
export async function scheduleRecording(token, programId, isSeries = false, userId = '') {
 const endpoint = isSeries ? '/LiveTv/SeriesTimers' : '/LiveTv/Timers';
 
    const host = await getHost();
    let payload;

    if (isSeries) {
        payload = {
            ProgramId: programId,
            RecordAnyTime: true,
            RecordAnyChannel: false,
            RecordNewOnly: false
        };
    } else {
        // For single recording, we need to fetch program details first to construct a valid TimerInfo
        if (!userId) {
             console.warn('UserId missing for single recording schedule, might fail if defaults are insufficient.');
        }
        
        try {
            const program = await getProgram(userId, token, programId);
            console.log('Program Details:', JSON.stringify(program));

            payload = {
                ChannelId: program.ChannelId,
                ProgramId: program.Id,
                StartDate: program.StartDate,
                EndDate: program.EndDate,
                Status: 'New',
                Name: program.Name,
                Overview: program.Overview || '',
                TimerType: 'Program',
                RecordAnyTime: false
            };

            // Only add ServiceName if it exists in the program details
            if (program.ServiceName) {
                payload.ServiceName = program.ServiceName;
            }
        } catch (e) {
            console.error('Failed to fetch program details for recording, falling back to minimal payload', e);
            payload = {
                ProgramId: programId,
                Status: 'New',
                TimerType: 'Program',
                RecordAnyTime: false
            };
        }
    }
            
 console.log(`Scheduling recording (${isSeries ? 'Series' : 'Single'}) Payload:`, JSON.stringify(payload));

	const res = await fetch(`${host}${endpoint}`, {
		method: 'POST',
		headers: {
			...headers,
			'X-Emby-Token': token
		},
		body: JSON.stringify(payload)
	});

	if (!res.ok) {
		const errorText = await res.text();
		console.error('Jellyfin Schedule Error:', res.status, errorText);
		// Jellyfin might return 204 No Content for success, or JSON error
		throw new Error(`Failed to schedule recording: ${res.status} ${errorText}`);
	}
    
    // Sometimes returns created object, sometimes empty
    try {
        return await res.json();
    } catch {
        return true;
    }
}

/**
 * Get Timers (Scheduled Recordings)
 * @param {string} token
 * @returns {Promise<any[]>}
 */
export async function getTimers(token) {
    const host = await getHost();
    const params = new URLSearchParams({
        Fields: 'SeriesId,ProgramId,EpisodeTitle,Name,Overview,SeasonId,ParentIndexNumber,IndexNumber,StartDate,EndDate,ChannelName,Status,SeriesPrimaryImageTag,SeriesName,PremiereDate,ImageTags'
    });

	const res = await fetch(`${host}/LiveTv/Timers?${params.toString()}`, {
		headers: {
			...headers,
			'X-Emby-Token': token
		}
	});

	if (!res.ok) {
		throw new Error('Failed to fetch timers');
	}

	const data = await res.json();
	return data.Items || [];
}

/**
 * Get Series Timers
 * @param {string} token
 * @returns {Promise<any[]>}
 */
export async function getSeriesTimers(token) {
    const host = await getHost();
	const res = await fetch(`${host}/LiveTv/SeriesTimers`, {
		headers: {
			...headers,
			'X-Emby-Token': token
		}
	});

	if (!res.ok) {
		throw new Error('Failed to fetch series timers');
	}

	const data = await res.json();
	return data.Items || [];
}

/**
 * Delete a recording
 * @param {string} token
 * @param {string} recordingId
 */
export async function deleteRecording(token, recordingId) {
    // NOTE: This usually deletes the recording FILE.
    // To cancel a TIMER, you would use DELETE /LiveTv/Timers/{Id}
    // But the requirements said "deleteRecording", and listed /LiveTv/Recordings/${recordingId}
    
    const host = await getHost();
	const res = await fetch(`${host}/LiveTv/Recordings/${recordingId}`, {
		method: 'DELETE',
		headers: {
			...headers,
			'X-Emby-Token': token
		}
	});

	if (!res.ok) {
		throw new Error('Failed to delete recording');
	}
    
    return true;
}

/**
 * Cancel a timer
 * @param {string} token
 * @param {string} timerId
 */
export async function cancelTimer(token, timerId) {
    const host = await getHost();
    const res = await fetch(`${host}/LiveTv/Timers/${timerId}`, {
        method: 'DELETE',
        headers: {
            ...headers,
            'X-Emby-Token': token
        }
    });

    if (!res.ok) {
        throw new Error('Failed to cancel timer');
    }

    return true;
}
