export interface JellyfinUser {
    Id: string;
    Name: string;
    Policy?: string;
}

export interface JellyfinAuthResult {
    user: JellyfinUser;
    accessToken: string;
}

export interface JellyfinChannel {
    Id: string;
    Name: string;
    ChannelNumber: string;
    ChannelType?: string;
}

export interface JellyfinProgram {
    Id: string;
    Name: string;
    ChannelId: string;
    SeriesId?: string;
    EpisodeTitle?: string;
    StartDate: string;
    EndDate: string;
    Overview?: string;
    SeriesName?: string;
    ServiceName?: string;
    SeasonId?: string;
    ParentIndexNumber?: number;
    IndexNumber?: number;
    IsPremiere?: boolean;
    PremiereDate?: string;
    ImageTags?: any;
    ChannelName?: string;
    CommunityRating?: any;
    OfficialRating?: string;
    Genres?: string[];
    TimerId?: string;
    RunTimeTicks?: number;
    People?: JellyfinPerson[];
    Studios?: JellyfinStudio[];
    Status?: string;
    BackdropImageTags?: string[];
    ExternalImage?: string | null;
    Network?: string;
    TvMazeId?: number;
    SeriesPrimaryImageTag?: string;
}

export interface JellyfinPerson {
    Name: string;
    Id: string;
    Role?: string;
    Type?: string;
    PrimaryImageTag?: string;
}

export interface JellyfinStudio {
    Name: string;
}

export interface TvMazeShow {
    id: number;
    name: string;
    summary: string;
    genres: string[];
    premiered: string;
    rating?: { average: number | null };
    type?: string;
    image?: { medium: string; original: string };
    network?: { name: string };
    webChannel?: { name: string };
    externals?: {
        tvrage: number | null;
        thetvdb: number | null;
        imdb: string | null;
    };
    status: string;
    _embedded?: {
        episodes: TvMazeEpisode[];
        cast: TvMazeCast[];
        images?: TvMazeImage[];
    };
}

export interface TvMazeImage {
    id: number;
    type: string;
    main: boolean;
    resolutions: {
        original: {
            url: string;
            width: number;
            height: number;
        };
        medium?: {
            url: string;
            width: number;
            height: number;
        };
    };
}

export interface TvMazeEpisode {
    id: number;
    season: number;
    number: number;
    name: string;
    airdate: string;
    runtime: number;
    summary: string;
    airstamp: string;
}

export interface TvMazeCast {
    person: {
        name: string;
        image?: { medium: string };
    };
    character: {
        name: string;
    };
}

export interface TvMazeSearchResult {
    score: number;
    show: TvMazeShow;
}

export interface NormalizedShow {
    id: string | number;
    name: string;
    summary: string;
    genres: string[];
    premiered: string | null;
    rating: { average: number | null };
    contentRating: string | null;
    image: { medium?: string; original: string | null; background: string | null } | null;
    network: { name: string } | null;
    status: string;
    _embedded: {
        episodes: NormalizedEpisode[];
        cast: NormalizedCast[];
    };
    isJellyfinFallback: boolean;
    isMovie: boolean;
    externalIds: {
        imdb?: string | null;
        thetvdb?: string | null;
        tvmaze?: string | null;
    };
}

export interface NormalizedEpisode {
    id: string | number;
    season: number;
    number: number;
    name: string;
    airdate: string | null;
    runtime: number;
    summary: string | null;
    airstamp: string | null;
    jellyfinId?: string;
}

export interface NormalizedCast {
    person: {
        name: string;
        image: { medium: string } | null;
    };
    character: {
        name: string;
    };
}
