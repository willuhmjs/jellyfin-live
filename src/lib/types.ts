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

export interface JellyfinImageTags {
    Primary?: string;
    [key: string]: string | string[] | undefined;
}

export interface JellyfinProviderIds {
    Tvdb?: string;
    Imdb?: string;
    TvMaze?: string;
    [key: string]: string | undefined;
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
    ImageTags?: JellyfinImageTags;
    ChannelName?: string;
    CommunityRating?: number;
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
    ProviderIds?: JellyfinProviderIds;
    startTimeMs?: number;
    endTimeMs?: number;
}

export interface JellyfinTimer {
    Id: string;
    ProgramId?: string;
    ChannelId?: string;
    Name?: string;
    SeriesName?: string;
    EpisodeTitle?: string;
    StartDate: string;
    EndDate: string;
    Overview?: string;
    SeriesId?: string;
    SeasonId?: string;
    ParentIndexNumber?: number;
    IndexNumber?: number;
    Status?: string;
    SeriesPrimaryImageTag?: string;
    PremiereDate?: string;
    ImageTags?: JellyfinImageTags;
    ChannelName?: string;
    Type?: string;
    TimerType?: 'Program' | 'DateTime' | 'Series';
}

export interface JellyfinSeriesTimer {
    Id: string;
    SeriesId?: string;
    ChannelId?: string;
    Name?: string;
    SeriesName?: string;
    ProgramId?: string;
    RecordAnyTime?: boolean;
    RecordAnyChannel?: boolean;
    RecordNewOnly?: boolean;
    DayPattern?: string;
    Days?: string[];
    ImageTags?: JellyfinImageTags;
    Type?: string;
}

export interface JellyfinRecording {
    Id: string;
    Name: string;
    EpisodeTitle?: string;
    Overview?: string;
    ChannelName?: string;
    ChannelId?: string;
    SeriesId?: string;
    SeriesName?: string;
    SeasonId?: string;
    IsSeries?: boolean;
    DateCreated?: string;
    StartDate?: string;
    EndDate?: string;
    ImageTags?: JellyfinImageTags;
    SeriesPrimaryImageTag?: string;
    Status?: string;
}

export interface JellyfinItem {
    Id: string;
    Name: string;
    Type: string;
    EpisodeTitle?: string;
    Overview?: string;
    SeriesName?: string;
    PremiereDate?: string;
    PrimaryImageAspectRatio?: number;
    Genres?: string[];
    Studios?: JellyfinStudio[];
    OfficialRating?: string;
    ProviderIds?: JellyfinProviderIds;
    DateCreated?: string;
    CommunityRating?: number;
    Status?: string;
    People?: JellyfinPerson[];
    BackdropImageTags?: string[];
    ProductionLocations?: string[];
    ImageTags?: JellyfinImageTags;
    RunTimeTicks?: number;
    ParentIndexNumber?: number;
    IndexNumber?: number;
    MediaSources?: unknown[];
    SeriesId?: string;
    SeasonId?: string;
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
