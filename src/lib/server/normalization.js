/**
 * Normalize show data from different sources (TVMaze, Jellyfin) into a consistent structure.
 * 
 * Target Structure (TVMaze-like):
 * {
 *   id: string|number,
 *   name: string,
 *   summary: string,
 *   genres: string[],
 *   premiered: string (YYYY-MM-DD),
 *   rating: { average: number },
 *   contentRating: string,
 *   image: { medium: string, original: string, background: string },
 *   network: { name: string },
 *   status: string,
 *   _embedded: {
 *     episodes: Array<{
 *       id, season, number, name, airdate, runtime, summary, airstamp
 *     }>,
 *     cast: Array<{
 *       person: { name, image: { medium } },
 *       character: { name }
 *     }>
 *   },
 *   isJellyfinFallback: boolean,
 *   isMovie: boolean
 * }
 */

export const cleanName = (n) => n ? n.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

export function normalizeShow(source, type = 'tvmaze', host = null) {
    if (!source) return null;

    if (type === 'tvmaze') {
        return {
            id: source.id,
            name: source.name,
            summary: source.summary,
            genres: source.genres || [],
            premiered: source.premiered,
            rating: source.rating || { average: null },
            contentRating: source.type === 'Scripted' ? null : null, // TVMaze often doesn't give content rating in main object
            image: source.image || null,
            network: source.network || (source.webChannel ? { name: source.webChannel.name } : null),
            status: source.status,
            _embedded: source._embedded || { episodes: [], cast: [] },
            isJellyfinFallback: false,
            isMovie: false // TVMaze shows are series
        };
    } else if (type === 'jellyfin') {
        const isMovie = source.Type === 'Movie';
        
        const show = {
            id: source.Id,
            name: source.Name,
            summary: source.Overview,
            genres: source.Genres || [],
            premiered: source.PremiereDate ? source.PremiereDate.split('T')[0] : null,
            rating: { average: source.CommunityRating },
            contentRating: source.OfficialRating,
            image: {
                original: host ? `${host}/Items/${source.Id}/Images/Primary` : null,
                background: (host && source.BackdropImageTags && source.BackdropImageTags.length > 0)
                    ? `${host}/Items/${source.Id}/Images/Backdrop/0`
                    : null
            },
            network: source.Studios && source.Studios.length > 0 ? { name: source.Studios[0].Name } : null,
            status: source.Status || 'Unknown',
            _embedded: {
                episodes: [],
                cast: (source.People || []).map(p => ({
                    person: {
                        name: p.Name,
                        image: (host && p.PrimaryImageTag) ? {
                            medium: `${host}/Items/${p.Id}/Images/Primary`
                        } : null
                    },
                    character: {
                        name: p.Role || p.Type
                    }
                }))
            },
            isJellyfinFallback: true,
            isMovie
        };

        // For movies, we manufacture a single episode so the UI can display/record it
        if (isMovie) {
             show._embedded.episodes = [{
                 id: source.Id,
                 season: 1,
                 number: 1,
                 name: source.Name,
                 airdate: source.PremiereDate ? source.PremiereDate.split('T')[0] : null,
                 runtime: (source.RunTimeTicks ? Math.round(source.RunTimeTicks / 10000000 / 60) : 0),
                 summary: source.Overview,
                 airstamp: source.PremiereDate,
                 jellyfinId: source.Id
             }];
        }

        return show;
    }
    
    return source;
}
