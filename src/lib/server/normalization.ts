import type { NormalizedShow, TvMazeShow } from '$lib/types';

export const cleanName = (n: string | null | undefined) => n ? n.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

export function normalizeShow(source: any, type = 'tvmaze', host: string | null = null): NormalizedShow | null {
    if (!source) return null;

    if (type === 'tvmaze') {
        const s = source as TvMazeShow;
        return {
            id: s.id,
            name: s.name,
            summary: s.summary,
            genres: s.genres || [],
            premiered: s.premiered,
            rating: s.rating || { average: null },
            contentRating: s.type === 'Scripted' ? null : null, // TVMaze often doesn't give content rating in main object
            image: s.image ? {
                medium: s.image.medium,
                original: s.image.original,
                background: null
            } : null,
            network: s.network || (s.webChannel ? { name: s.webChannel.name } : null),
            status: s.status,
            _embedded: {
                episodes: (s._embedded?.episodes || []).map(e => ({
                     id: e.id,
                     season: e.season,
                     number: e.number,
                     name: e.name,
                     airdate: e.airdate,
                     runtime: e.runtime,
                     summary: e.summary,
                     airstamp: e.airstamp
                })),
                cast: (s._embedded?.cast || []).map(c => ({
                    person: {
                        name: c.person.name,
                        image: c.person.image ? { medium: c.person.image.medium } : null
                    },
                    character: {
                        name: c.character.name
                    }
                }))
            },
            isJellyfinFallback: false,
            isMovie: false // TVMaze shows are series
        };
    } else if (type === 'jellyfin') {
        const isMovie = source.Type === 'Movie';
        
        const show: NormalizedShow = {
            id: source.Id,
            name: source.Name,
            summary: source.Overview || '',
            genres: source.Genres || [],
            premiered: source.PremiereDate ? source.PremiereDate.split('T')[0] : null,
            rating: { average: source.CommunityRating },
            contentRating: source.OfficialRating || null,
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
                cast: (source.People || []).map((p: any) => ({
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
                 summary: source.Overview || null,
                 airstamp: source.PremiereDate || null,
                 jellyfinId: source.Id
             }];
        }

        return show;
    }
    
    return source as NormalizedShow;
}
