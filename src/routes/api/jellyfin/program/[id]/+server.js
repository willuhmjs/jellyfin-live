import * as jellyfin from '$lib/server/jellyfin';
import * as tvmaze from '$lib/server/tvmaze';
import { json } from '@sveltejs/kit';

export async function GET({ params, cookies }) {
    const { id } = params;
    const sessionId = cookies.get('session_id');
    const userId = cookies.get('user_id');

    if (!sessionId || !userId) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const program = await jellyfin.getProgram(userId, sessionId, id);

        // Enhance with TVMaze data if possible
        if (program) {
            const searchName = program.SeriesName || program.Name;
            if (searchName) {
                try {
                    const results = await tvmaze.searchShows(searchName);
                    if (results && results.length > 0) {
                        const show = results[0].show;
                        
                        // Merge metadata, preferring Jellyfin if already present but filling gaps
                        if (!program.Overview && show.summary) {
                            // Strip HTML tags from summary for cleaner display if needed,
                            // but our component handles HTML via @html usually.
                            // However, ProgramModal uses text mostly, except one part.
                            // ProgramModal.svelte line 121: {richDetails?.Overview || ...}
                            // It renders as text. TVMaze summary has <p> tags.
                            // We should probably strip them or keep them if we change component to use @html.
                            // For now, let's just assign it. The component logic is:
                            // <p class="leading-relaxed text-gray-300">
                            //    {richDetails?.Overview || program.Overview || 'No description available.'}
                            // </p>
                            // This implies text content. TVMaze sends HTML.
                            program.Overview = show.summary.replace(/<[^>]*>?/gm, '');
                        }

                        if (!program.Genres && show.genres) {
                            program.Genres = show.genres;
                        }

                        if (!program.CommunityRating && show.rating?.average) {
                            program.CommunityRating = show.rating.average;
                        }

                        if (!program.OfficialRating && show.status) {
                             // Not really a rating, but useful metadata
                             // program.OfficialRating = show.status;
                        }
                        
                        // Add extra fields for the modal to use
                        program.ExternalImage = show.image?.original || show.image?.medium;
                        program.Network = show.network?.name;
                        program.Status = show.status;
                        
                        // If we have a show ID, we might want to pass it for linking
                        program.TvMazeId = show.id;
                    }
                } catch (tvError) {
                    console.error('Failed to enhance with TVMaze data:', tvError);
                    // Continue with just Jellyfin data
                }
            }
        }

        return json(program);
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
