import { getSetting } from './db';
import { Agent } from 'undici';
import type { JellyfinUser, JellyfinAuthResult, JellyfinChannel, JellyfinProgram } from '$lib/types';

const headers = {
	'Content-Type': 'application/json',
	'X-Emby-Authorization':
		'MediaBrowser Client="Jellyfin Live", Device="Web", DeviceId="jellyfin-live-web", Version="1.0.0"'
};

interface FetchOpts extends RequestInit {
    dispatcher?: Agent;
}

/**
 * Get fetch options based on settings (e.g. SSL handling)
 */
async function getFetchOpts(): Promise<FetchOpts> {
	const ignoreSsl = await getSetting('ignore_ssl');
	if (ignoreSsl === 'true') {
		return {
			dispatcher: new Agent({
				connect: {
					rejectUnauthorized: false
				}
			})
		};
	}
	return {};
}

/**
 * Helper to handle response errors
 */
async function handleResponse<T>(res: Response, errorPrefix: string): Promise<T | null> {
	if (!res.ok) {
		const text = await res.text().catch(() => res.statusText);
		const error = new Error(`${errorPrefix}: ${res.status} ${text}`);
		// @ts-ignore
		error.status = res.status;
		throw error;
	}
	// Check for 204 No Content
	if (res.status === 204) {
		return null;
	}
	try {
		return await res.json() as T;
	} catch {
		return null;
	}
}

/**
 * Get the configured Jellyfin host URL
 * @throws {Error} If host is not configured
 */
export async function getHost(): Promise<string> {
	const host = await getSetting('jellyfin_url');

	if (!host) {
		// This should be caught by hooks, but just in case
		throw new Error('Jellyfin host not configured');
	}
	// Remove trailing slash if present
	return host.replace(/\/$/, '');
}

/**
 * Authenticate with Jellyfin
 * @throws {Error} If authentication fails
 */
export async function authenticate(username: string, password: string): Promise<JellyfinAuthResult> {
	try {
		const host = await getHost();
		const opts = await getFetchOpts();
		const res = await fetch(`${host}/Users/AuthenticateByName`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				Username: username,
				Pw: password
			}),
			...opts
		});

		const data = await handleResponse<{ User: JellyfinUser; AccessToken: string }>(res, 'Authentication failed');
        if (!data) throw new Error('Authentication returned no data');
		return {
			user: data.User,
			accessToken: data.AccessToken
		};
	} catch (e) {
		console.error('Authentication error:', e);
		throw e;
	}
}

/**
 * Get Live TV Channels
 */
export async function getChannels(userId: string, token: string): Promise<JellyfinChannel[]> {
	try {
		const host = await getHost();
		const opts = await getFetchOpts();
		const res = await fetch(
			`${host}/LiveTv/Channels?UserId=${userId}&EnableFavoriteSorting=true&SortBy=ChannelName`,
			{
				headers: {
					...headers,
					'X-Emby-Token': token
				},
				...opts
			}
		);

		const data = await handleResponse<{ Items: JellyfinChannel[] }>(res, 'Failed to fetch channels');
		return data?.Items || [];
	} catch (e: any) {
		if (e?.status === 401) throw e;
		console.error('getChannels error:', e);
		return [];
	}
}

/**
 * Get Live TV Programs
 */
export async function getPrograms(userId: string, token: string, limit = 100, searchTerm: string | null = null, minEndDate: string | null = null): Promise<JellyfinProgram[]> {
	try {
		// Fetch programs for the next 48 hours to be safe, or just use limit.
		// We'll use HasAired=false to get future programs.
		const params = new URLSearchParams({
			UserId: userId,
			SortBy: 'StartDate',
			Limit: limit.toString(),
			EnableTotalRecordCount: 'false',
			ImageTypeLimit: '1',
			EnableImageTypes: 'Primary',
			Fields:
				'SeriesId,ProgramId,EpisodeTitle,Name,SeasonId,ParentIndexNumber,IndexNumber,StartDate,EndDate,SeriesName'
		});

		if (searchTerm) {
			params.append('SearchTerm', searchTerm);
		}

		if (minEndDate) {
			params.append('MinEndDate', minEndDate);
		} else {
			params.append('HasAired', 'false');
		}

		const host = await getHost();
		const opts = await getFetchOpts();
		const res = await fetch(`${host}/LiveTv/Programs?${params.toString()}`, {
			headers: {
				...headers,
				'X-Emby-Token': token
			},
			...opts
		});

		const data = await handleResponse<{ Items: JellyfinProgram[] }>(res, 'Failed to fetch programs');
		return data?.Items || [];
	} catch (e: any) {
		if (e?.status === 401) throw e;
		console.error('getPrograms error:', e);
		return [];
	}
}

/**
	* Get currently airing programs
	*/
export async function getOnAir(userId: string, token: string): Promise<JellyfinProgram[]> {
	try {
		const now = new Date().toISOString();
		const params = new URLSearchParams({
			UserId: userId,
			SortBy: 'StartDate',
			EnableTotalRecordCount: 'false',
			ImageTypeLimit: '1',
			EnableImageTypes: 'Primary',
			MaxStartDate: now,
			MinEndDate: now,
			Fields:
				'SeriesId,ProgramId,EpisodeTitle,Name,SeasonId,ParentIndexNumber,IndexNumber,StartDate,EndDate,SeriesName,ChannelName,ChannelId,ImageTags,SeriesPrimaryImageTag,BackdropImageTags'
		});

		const host = await getHost();
		const opts = await getFetchOpts();
		const res = await fetch(`${host}/LiveTv/Programs?${params.toString()}`, {
			headers: {
				...headers,
				'X-Emby-Token': token
			},
			...opts
		});

		const data = await handleResponse<{ Items: JellyfinProgram[] }>(res, 'Failed to fetch on-air programs');
		return data?.Items || [];
	} catch (e: any) {
		if (e?.status === 401) throw e;
		console.error('getOnAir error:', e);
		return [];
	}
}

/**
	* Get Program Details
 */
export async function getProgram(userId: string, token: string, programId: string): Promise<JellyfinProgram | null> {
	try {
		const host = await getHost();
		const opts = await getFetchOpts();
		const params = new URLSearchParams({
			UserId: userId,
			Fields:
				'People,Studios,CommunityRating,OfficialRating,Genres,Overview,SeriesId,SeasonId,EpisodeTitle,PremiereDate,ChannelId,ProviderIds,ImageTags,BackdropImageTags'
		});

		const res = await fetch(`${host}/LiveTv/Programs/${programId}?${params.toString()}`, {
			headers: {
				...headers,
				'X-Emby-Token': token
			},
			...opts
		});

		return await handleResponse<JellyfinProgram>(res, 'Failed to fetch program details');
	} catch (e: any) {
		if (e?.status === 401) throw e;
		console.error('getProgram error:', e);
		return null;
	}
}

/**
 * Get Items by IDs
 */
export async function getItems(userId: string, token: string, ids: string[]): Promise<any[]> {
	if (!ids || ids.length === 0) return [];

	try {
		const host = await getHost();
		const opts = await getFetchOpts();
		const params = new URLSearchParams({
			Ids: ids.join(','),
			Fields:
				'EpisodeTitle,Overview,SeriesName,PremiereDate,PrimaryImageAspectRatio,Genres,Studios,OfficialRating,ProviderIds,DateCreated,CommunityRating,Status,People,BackdropImageTags,ProductionLocations'
		});

		const res = await fetch(`${host}/Users/${userId}/Items?${params.toString()}`, {
			headers: {
				...headers,
				'X-Emby-Token': token
			},
			...opts
		});

		const data = await handleResponse<{ Items: any[] }>(res, 'Failed to fetch items by IDs').catch(e => {
			console.warn(e.message);
			return { Items: [] };
		});
		return data?.Items || [];
	} catch (e: any) {
		if (e?.status === 401) throw e;
		console.error('getItems error:', e);
		return [];
	}
}

/**
 * Get Episodes for a Series/Season
 */
export async function getEpisodes(userId: string, token: string, seriesId: string, seasonId: string | null = null): Promise<any[]> {
	try {
		const host = await getHost();
		const opts = await getFetchOpts();
		const params = new URLSearchParams({
			UserId: userId,
			SeriesId: seriesId,
			Fields:
				'Overview,PrimaryImageAspectRatio,PremiereDate,RunTimeTicks,ParentIndexNumber,IndexNumber,MediaSources,OfficialRating',
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
			},
			...opts
		});

		const data = await handleResponse<{ Items: any[] }>(res, 'Failed to fetch episodes');
		return data?.Items || [];
	} catch (e: any) {
		if (e?.status === 401) throw e;
		console.error('getEpisodes error:', e);
		return [];
	}
}

/**
 * Get Recordings
 */
export async function getRecordings(userId: string, token: string): Promise<any[]> {
	try {
		const params = new URLSearchParams({
			UserId: userId,
			SortBy: 'DateCreated',
			SortOrder: 'Descending',
			EnableTotalRecordCount: 'false',
			Fields:
				'Overview,EpisodeTitle,ChannelName,ChannelId,SeriesId,SeriesName,SeasonId,IsSeries,DateCreated,StartDate,EndDate,ImageTags,SeriesPrimaryImageTag'
		});

		const host = await getHost();
		const opts = await getFetchOpts();
		const res = await fetch(`${host}/LiveTv/Recordings?${params.toString()}`, {
			headers: {
				...headers,
				'X-Emby-Token': token
			},
			...opts
		});

		const data = await handleResponse<{ Items: any[] }>(res, 'Failed to fetch recordings');
		return data?.Items || [];
	} catch (e: any) {
		if (e?.status === 401) throw e;
		console.error('getRecordings error:', e);
		return [];
	}
}

/**
 * Get Series from Library
 */
export async function getSeries(userId: string, token: string, searchTerm: string | null = null): Promise<any[]> {
	return searchItems(userId, token, searchTerm, ['Series']);
}

/**
 * Search for Items (Series, Movie, etc)
 */
export async function searchItems(userId: string, token: string, searchTerm: string | null, types: string[] = ['Series']): Promise<any[]> {
	try {
		const host = await getHost();
		const opts = await getFetchOpts();
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
			},
			...opts
		});

		const data = await handleResponse<{ Items: any[] }>(res, 'Failed to search items');
		return data?.Items || [];
	} catch (e: any) {
		if (e?.status === 401) throw e;
		console.error('searchItems error:', e);
		return [];
	}
}

/**
 * Get Channel Details
 */
export async function getChannel(userId: string, token: string, channelId: string): Promise<JellyfinChannel | null> {
	try {
		const host = await getHost();
		const opts = await getFetchOpts();
		const res = await fetch(`${host}/LiveTv/Channels/${channelId}?UserId=${userId}`, {
			headers: {
				...headers,
				'X-Emby-Token': token
			},
			...opts
		});

		return await handleResponse<JellyfinChannel>(res, 'Failed to fetch channel details');
	} catch (e: any) {
		if (e?.status === 401) throw e;
		console.error('getChannel error:', e);
		return null;
	}
}

/**
 * Schedule a recording
 * @throws {Error} If scheduling fails
 */
export async function scheduleRecording(token: string, programId: string, isSeries = false, userId = ''): Promise<any> {
	try {
		const endpoint = isSeries ? '/LiveTv/SeriesTimers' : '/LiveTv/Timers';
		const host = await getHost();
		const opts = await getFetchOpts();

		const defaults = {
			PrePaddingSeconds: 0,
			PostPaddingSeconds: 0,
			IsPrePaddingRequired: false,
			IsPostPaddingRequired: false,
			Priority: 0,
			KeepUntil: 'UntilDeleted'
		};

		// Always try to fetch program details to populate ChannelId, etc.
		let program: JellyfinProgram | null = null;
		try {
			if (userId) {
				program = await getProgram(userId, token, programId);
				console.log('Program Details:', JSON.stringify(program));
			}
		} catch (e) {
			console.error('Failed to fetch program details for recording', e);
		}

		// Check if already scheduled (Single Timer)
		if (!isSeries && program && program.TimerId) {
			console.log(`Program ${programId} is already scheduled (TimerId: ${program.TimerId}). Skipping.`);
			return { Status: 'Completed', Id: program.TimerId, AlreadyExists: true };
		}

		/** @type {any} */
		let payload: any;

		if (isSeries) {
			// Try to fetch default series timer payload from server
			try {
				const defaultsRes = await fetch(`${host}/LiveTv/Timers/Defaults?ProgramId=${programId}`, {
					headers: { ...headers, 'X-Emby-Token': token },
					...opts
				});
				if (defaultsRes.ok) {
					payload = await defaultsRes.json();
					console.log('Got series recording defaults:', JSON.stringify(payload));
				} else {
					console.warn(
						`Fetch series recording defaults failed: ${defaultsRes.status} ${defaultsRes.statusText}`
					);
				}
			} catch (e) {
				console.warn('Failed to fetch series recording defaults', e);
			}

			if (!payload) {
				payload = {
					...defaults,
					ProgramId: programId,
					RecordAnyTime: true,
					RecordAnyChannel: false,
					RecordNewOnly: false
				};

				if (program) {
					if (program.ChannelId) payload.ChannelId = program.ChannelId;
					if (program.SeriesId) payload.SeriesId = program.SeriesId;
					if (program.Name) payload.Name = program.Name;
				}
			}
		} else {
			// Try to fetch default timer payload from server
			try {
				const defaultsRes = await fetch(`${host}/LiveTv/Timers/Defaults?ProgramId=${programId}`, {
					headers: { ...headers, 'X-Emby-Token': token },
					...opts
				});
				if (defaultsRes.ok) {
					payload = await defaultsRes.json();
					console.log('Got recording defaults:', JSON.stringify(payload));
				} else {
					console.warn(
						`Fetch recording defaults failed: ${defaultsRes.status} ${defaultsRes.statusText}`
					);
				}
			} catch (e) {
				console.warn('Failed to fetch recording defaults', e);
			}

			// Ensure Type is correct for Single Recording
			if (payload && payload.Type === 'SeriesTimer') {
				console.warn('Defaults returned SeriesTimer for a single recording. Converting to Program Timer.');
				payload.Type = 'Timer'; // Or remove it
				delete payload.Id; // Don't use the ID generated for a SeriesTimer
				// Reset some series specific fields if needed
				payload.RecordAnyTime = false;
				payload.RecordNewOnly = false;
				// Ensure TimerType is set
				payload.TimerType = 'Program';
			}

			if (!payload) {
				if (!program) {
					console.warn(
						'Program details missing for single recording schedule, using minimal payload.'
					);
					payload = {
						...defaults,
						ProgramId: programId,
						TimerType: 'Program'
					};
				} else {
					payload = {
						...defaults,
						ChannelId: program.ChannelId,
						ProgramId: program.Id,
						StartDate: program.StartDate,
						EndDate: program.EndDate,
						Name: program.Name,
						TimerType: 'Program',
						RecordAnyTime: false,
						RecordAnyChannel: false
					};

					if (program.Overview) payload.Overview = program.Overview;
					if (program.ServiceName) payload.ServiceName = program.ServiceName;
					if (program.EpisodeTitle) payload.EpisodeTitle = program.EpisodeTitle;
					if (program.SeriesId) payload.SeriesId = program.SeriesId;
					if (program.SeasonId) payload.SeasonId = program.SeasonId;
					if (program.ParentIndexNumber) payload.ParentIndexNumber = program.ParentIndexNumber;
					if (program.IndexNumber) payload.IndexNumber = program.IndexNumber;
				}
			}
		}

		console.log(
			`Scheduling recording (${isSeries ? 'Series' : 'Single'}) Payload:`,
			JSON.stringify(payload)
		);

		const res = await fetch(`${host}${endpoint}`, {
			method: 'POST',
			headers: {
				...headers,
				'X-Emby-Token': token
			},
			body: JSON.stringify(payload),
			...opts
		});

		return await handleResponse(res, 'Failed to schedule recording');
	} catch (e) {
		console.error('scheduleRecording error:', e);
		throw e;
	}
}

/**
 * Cancel a series timer
 * @throws {Error} If cancellation fails
 */
export async function cancelSeriesTimer(token: string, timerId: string): Promise<boolean> {
	try {
		const host = await getHost();
		const opts = await getFetchOpts();
		const res = await fetch(`${host}/LiveTv/SeriesTimers/${timerId}`, {
			method: 'DELETE',
			headers: {
				...headers,
				'X-Emby-Token': token
			},
			...opts
		});

		await handleResponse(res, 'Failed to cancel series timer');
		return true;
	} catch (e) {
		console.error('cancelSeriesTimer error:', e);
		throw e;
	}
}

/**
 * Get Timers (Scheduled Recordings)
 */
export async function getTimers(token: string): Promise<any[]> {
	try {
		const host = await getHost();
		const opts = await getFetchOpts();
		const params = new URLSearchParams({
			Fields:
				'SeriesId,ProgramId,EpisodeTitle,Name,Overview,SeasonId,ParentIndexNumber,IndexNumber,StartDate,EndDate,ChannelName,Status,SeriesPrimaryImageTag,SeriesName,PremiereDate,ImageTags,ChannelId'
		});

		const res = await fetch(`${host}/LiveTv/Timers?${params.toString()}`, {
			headers: {
				...headers,
				'X-Emby-Token': token
			},
			...opts
		});

		const data = await handleResponse<{ Items: any[] }>(res, 'Failed to fetch timers');
		return data?.Items || [];
	} catch (e: any) {
		if (e?.status === 401) throw e;
		console.error('getTimers error:', e);
		return [];
	}
}

/**
 * Get Series Timers
 */
export async function getSeriesTimers(token: string): Promise<any[]> {
	try {
		const host = await getHost();
		const opts = await getFetchOpts();
		const res = await fetch(`${host}/LiveTv/SeriesTimers`, {
			headers: {
				...headers,
				'X-Emby-Token': token
			},
			...opts
		});

		const data = await handleResponse<{ Items: any[] }>(res, 'Failed to fetch series timers');
		return data?.Items || [];
	} catch (e: any) {
		if (e?.status === 401) throw e;
		console.error('getSeriesTimers error:', e);
		return [];
	}
}

/**
 * Delete a recording
 * @throws {Error} If deletion fails
 */
export async function deleteRecording(token: string, recordingId: string): Promise<boolean> {
	try {
		const host = await getHost();
		const opts = await getFetchOpts();
		// NOTE: This usually deletes the recording FILE.
		// To cancel a TIMER, you would use DELETE /LiveTv/Timers/{Id}
		// But the requirements said "deleteRecording", and listed /LiveTv/Recordings/${recordingId}

		const res = await fetch(`${host}/LiveTv/Recordings/${recordingId}`, {
			method: 'DELETE',
			headers: {
				...headers,
				'X-Emby-Token': token
			},
			...opts
		});

		await handleResponse(res, 'Failed to delete recording');
		return true;
	} catch (e) {
		console.error('deleteRecording error:', e);
		throw e;
	}
}

/**
 * Cancel a timer
 * @throws {Error} If cancellation fails
 */
export async function cancelTimer(token: string, timerId: string): Promise<boolean> {
	try {
		const host = await getHost();
		const opts = await getFetchOpts();
		const res = await fetch(`${host}/LiveTv/Timers/${timerId}`, {
			method: 'DELETE',
			headers: {
				...headers,
				'X-Emby-Token': token
			},
			...opts
		});

		await handleResponse(res, 'Failed to cancel timer');
		return true;
	} catch (e) {
		console.error('cancelTimer error:', e);
		throw e;
	}
}
