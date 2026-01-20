import { getSetting } from './db.js';
import { Agent } from 'undici';

/**
 * @typedef {Object} JellyfinUser
 * @property {string} Id
 * @property {string} Name
 * @property {string} [Policy]
 */

/**
 * @typedef {Object} JellyfinAuthResult
 * @property {JellyfinUser} user
 * @property {string} accessToken
 */

/**
 * @typedef {Object} JellyfinChannel
 * @property {string} Id
 * @property {string} Name
 * @property {string} ChannelNumber
 * @property {string} [ChannelType]
 */

/**
 * @typedef {Object} JellyfinProgram
 * @property {string} Id
 * @property {string} Name
 * @property {string} ChannelId
 * @property {string} [SeriesId]
 * @property {string} [EpisodeTitle]
 * @property {string} StartDate
 * @property {string} EndDate
 * @property {string} [Overview]
 * @property {string} [SeriesName]
 * @property {string} [ServiceName]
 * @property {string} [SeasonId]
 * @property {number} [ParentIndexNumber]
 * @property {number} [IndexNumber]
 * @property {boolean} [IsPremiere]
 * @property {string} [PremiereDate]
 * @property {any} [ImageTags]
 * @property {string} [ChannelName]
 * @property {any} [CommunityRating]
 * @property {string} [OfficialRating]
 * @property {string[]} [Genres]
 */

const headers = {
	'Content-Type': 'application/json',
	'X-Emby-Authorization':
		'MediaBrowser Client="Jellyfin Live", Device="Web", DeviceId="jellyfin-live-web", Version="1.0.0"'
};

/**
 * Get fetch options based on settings (e.g. SSL handling)
 * @returns {Promise<RequestInit & { dispatcher?: Agent }>}
 */
async function getFetchOpts() {
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
 * @param {Response} res
 * @param {string} errorPrefix
 * @returns {Promise<any>}
 */
async function handleResponse(res, errorPrefix) {
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
		return await res.json();
	} catch {
		return null;
	}
}

/**
 * Get the configured Jellyfin host URL
 * @returns {Promise<string>}
 * @throws {Error} If host is not configured
 */
export async function getHost() {
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
 * @param {string} username
 * @param {string} password
 * @returns {Promise<JellyfinAuthResult>}
 * @throws {Error} If authentication fails
 */
export async function authenticate(username, password) {
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

		const data = await handleResponse(res, 'Authentication failed');
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
 * @param {string} userId
 * @param {string} token
 * @returns {Promise<JellyfinChannel[]>}
 */
export async function getChannels(userId, token) {
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

		const data = await handleResponse(res, 'Failed to fetch channels');
		return data.Items || [];
	} catch (e) {
		console.error('getChannels error:', e);
		// @ts-expect-error: ignore status
		if (e?.status === 401) throw e;
		return [];
	}
}

/**
 * Get Live TV Programs
 * @param {string} userId
 * @param {string} token
 * @param {number} [limit=100]
 * @param {string|null} [searchTerm=null]
 * @param {string|null} [minEndDate=null]
 * @returns {Promise<JellyfinProgram[]>}
 */
export async function getPrograms(userId, token, limit = 100, searchTerm = null, minEndDate = null) {
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

		const data = await handleResponse(res, 'Failed to fetch programs');
		return data.Items || [];
	} catch (e) {
		console.error('getPrograms error:', e);
		// @ts-expect-error: ignore status
		if (e?.status === 401) throw e;
		return [];
	}
}

/**
	* Get currently airing programs
	* @param {string} userId
	* @param {string} token
	* @returns {Promise<JellyfinProgram[]>}
	*/
export async function getOnAir(userId, token) {
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

		const data = await handleResponse(res, 'Failed to fetch on-air programs');
		return data.Items || [];
	} catch (e) {
		console.error('getOnAir error:', e);
		// @ts-expect-error: ignore status
		if (e?.status === 401) throw e;
		return [];
	}
}

/**
	* Get Program Details
 * @param {string} userId
 * @param {string} token
 * @param {string} programId
 * @returns {Promise<JellyfinProgram|null>}
 */
export async function getProgram(userId, token, programId) {
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

		return await handleResponse(res, 'Failed to fetch program details');
	} catch (e) {
		console.error('getProgram error:', e);
		// @ts-expect-error: ignore status
		if (e?.status === 401) throw e;
		return null;
	}
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

		const data = await handleResponse(res, 'Failed to fetch items by IDs').catch(e => {
			console.warn(e.message);
			return { Items: [] };
		});
		return data.Items || [];
	} catch (e) {
		console.error('getItems error:', e);
		// @ts-expect-error: ignore status
		if (e?.status === 401) throw e;
		return [];
	}
}

/**
 * Get Episodes for a Series/Season
 * @param {string} userId
 * @param {string} token
 * @param {string} seriesId
 * @param {string|null} [seasonId=null]
 * @returns {Promise<any[]>}
 */
export async function getEpisodes(userId, token, seriesId, seasonId = null) {
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

		const data = await handleResponse(res, 'Failed to fetch episodes');
		return data.Items || [];
	} catch (e) {
		console.error('getEpisodes error:', e);
		// @ts-expect-error: ignore status
		if (e?.status === 401) throw e;
		return [];
	}
}

/**
 * Get Recordings
 * @param {string} userId
 * @param {string} token
 * @returns {Promise<any[]>}
 */
export async function getRecordings(userId, token) {
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

		const data = await handleResponse(res, 'Failed to fetch recordings');
		return data.Items || [];
	} catch (e) {
		console.error('getRecordings error:', e);
		// @ts-expect-error: ignore status
		if (e?.status === 401) throw e;
		return [];
	}
}

/**
 * Get Series from Library
 * @param {string} userId
 * @param {string} token
 * @param {string|null} [searchTerm=null]
 * @returns {Promise<any[]>}
 */
export async function getSeries(userId, token, searchTerm = null) {
	return searchItems(userId, token, searchTerm, ['Series']);
}

/**
 * Search for Items (Series, Movie, etc)
 * @param {string} userId
 * @param {string} token
 * @param {string|null} searchTerm
 * @param {string[]} [types=['Series']]
 * @returns {Promise<any[]>}
 */
export async function searchItems(userId, token, searchTerm, types = ['Series']) {
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

		const data = await handleResponse(res, 'Failed to search items');
		return data.Items || [];
	} catch (e) {
		console.error('searchItems error:', e);
		// @ts-expect-error: ignore status
		if (e?.status === 401) throw e;
		return [];
	}
}

/**
 * Get Channel Details
 * @param {string} userId
 * @param {string} token
 * @param {string} channelId
 * @returns {Promise<JellyfinChannel|null>}
 */
export async function getChannel(userId, token, channelId) {
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

		return await handleResponse(res, 'Failed to fetch channel details');
	} catch (e) {
		console.error('getChannel error:', e);
		// @ts-expect-error: ignore status
		if (e?.status === 401) throw e;
		return null;
	}
}

/**
 * Schedule a recording
 * @param {string} token
 * @param {string} programId
 * @param {boolean} [isSeries=false]
 * @param {string} [userId='']
 * @returns {Promise<boolean|any>}
 * @throws {Error} If scheduling fails
 */
export async function scheduleRecording(token, programId, isSeries = false, userId = '') {
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
		let program = null;
		try {
			if (userId) {
				program = await getProgram(userId, token, programId);
				console.log('Program Details:', JSON.stringify(program));
			}
		} catch (e) {
			console.error('Failed to fetch program details for recording', e);
		}

		/** @type {any} */
		let payload;

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
 * @param {string} token
 * @param {string} timerId
 * @returns {Promise<boolean>}
 * @throws {Error} If cancellation fails
 */
export async function cancelSeriesTimer(token, timerId) {
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
 * @param {string} token
 * @returns {Promise<any[]>}
 */
export async function getTimers(token) {
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

		const data = await handleResponse(res, 'Failed to fetch timers');
		return data.Items || [];
	} catch (e) {
		console.error('getTimers error:', e);
		// @ts-expect-error: ignore status
		if (e?.status === 401) throw e;
		return [];
	}
}

/**
 * Get Series Timers
 * @param {string} token
 * @returns {Promise<any[]>}
 */
export async function getSeriesTimers(token) {
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

		const data = await handleResponse(res, 'Failed to fetch series timers');
		return data.Items || [];
	} catch (e) {
		console.error('getSeriesTimers error:', e);
		// @ts-expect-error: ignore status
		if (e?.status === 401) throw e;
		return [];
	}
}

/**
 * Delete a recording
 * @param {string} token
 * @param {string} recordingId
 * @returns {Promise<boolean>}
 * @throws {Error} If deletion fails
 */
export async function deleteRecording(token, recordingId) {
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
 * @param {string} token
 * @param {string} timerId
 * @returns {Promise<boolean>}
 * @throws {Error} If cancellation fails
 */
export async function cancelTimer(token, timerId) {
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
