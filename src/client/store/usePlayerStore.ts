import { create } from 'zustand';
import { audioEngine, EQ_PRESETS, EqBands, EqPresetId } from '../audio/audioEngine';
import { DesktopUpdateStatus, type DiscordRpcStatus } from '../lib/desktop';
import { GLOBAL_TRENDING_TRACKS } from '../utils/recommendationEngine';
import { appendPlayEvent, loadPlayEvents, type PlayEvent } from '../utils/playStats';

let lastRecordedPlaySession = -1;
let playSessionSeq = 0;

export type QueueOrigin = 'pinned' | 'context' | 'auto';

export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  duration?: number;
  thumbnail?: string;
  source: 'youtube';
  queueOrigin?: QueueOrigin;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
}

export interface Collection {
  title: string;
  kind: string;
  tracks: Track[];
  albumId?: string;
  playlistId?: string;
  artist?: string;
  year?: string;
  subtitle?: string;
  thumbnail?: string;
}

export interface ExploreSection {
  title: string;
  tracks: Track[];
}

export interface ExploreQuickLink {
  title: string;
  browseId: string;
  params?: string;
}

export interface ExploreMoodItem {
  title: string;
  browseId: string;
  params?: string;
}

export interface ExplorePlaylistCard {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
}

export interface ExploreReleaseCard {
  id: string;
  title: string;
  artist: string;
  kind: 'Album' | 'Single';
  year?: string;
  thumbnail?: string;
}

export interface RelatedArtistCard {
  id: string;
  name: string;
  subtitle?: string;
  thumbnail?: string;
}

export interface ExploreFeed {
  quickLinks: ExploreQuickLink[];
  newReleases: ExploreReleaseCard[];
  moods: ExploreMoodItem[];
  trendingTracks: Track[];
  musicVideos: Track[];
  sections: ExploreSection[];
}

export interface ExploreCategoryRef {
  title: string;
  browseId: string;
  params?: string;
}

export interface ExploreCategoryData {
  title: string;
  browseId: string;
  params?: string;
  playlistShelves: { heading: string; items: ExplorePlaylistCard[] }[];
  releases: ExploreReleaseCard[];
  tracks: Track[];
  artists: RelatedArtistCard[];
  moodGroups: { heading: string; items: ExploreMoodItem[] }[];
}

export type SearchTab = 'all' | 'songs' | 'albums' | 'artists' | 'playlists';

export type SearchTopResult =
  | { kind: 'song'; track: Track; subtitle?: string }
  | { kind: 'album'; album: ExploreReleaseCard; subtitle?: string }
  | { kind: 'artist'; artist: RelatedArtistCard; subtitle?: string }
  | { kind: 'playlist'; playlist: ExplorePlaylistCard; subtitle?: string };

export interface NavSnapshot {
  activeTab: ActiveTab;
  activePlaylistId: string | null;
  collection: Collection | null;
  artistView: string | null;
  artistViewId: string | null;
  exploreCategory: ExploreCategoryRef | null;
  searchQuery: string;
  searchTab: SearchTab;
  searchTopResult: SearchTopResult | null;
  searchResults: Track[];
  searchAlbums: ExploreReleaseCard[];
  searchArtists: RelatedArtistCard[];
  searchPlaylists: ExplorePlaylistCard[];
  searchHasMore: boolean;
}

export type ActiveTab =
  | 'browse'
  | 'songs'
  | 'albums'
  | 'artists'
  | 'radio'
  | 'recent'
  | 'favorites'
  | 'local'
  | 'discover'
  | 'explore'
  | 'library';
export type RepeatMode = 'off' | 'all' | 'one';
export type SleepMode = 'off' | 'track_end' | 'timer';

export interface StreamMeta {
  videoId: string;
  format: string;
  bitrate?: number;
  clientUsed?: string;
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  history: Track[];
  favorites: Track[];
  playlists: Playlist[];
  playEvents: PlayEvent[];
  activePlaylistId: string | null;

  isPlaying: boolean;
  isLoadingStream: boolean;
  currentTime: number;
  seekNonce: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  shuffle: boolean;
  autoplay: boolean;

  crossfadeSeconds: number;
  eqPreset: EqPresetId;
  eqBands: EqBands;
  loudnessNormalization: boolean;
  sleepMode: SleepMode;
  sleepEndsAt: number | null;
  sleepPresetMinutes: number | null;
  streamMeta: StreamMeta | null;

  activeTab: ActiveTab;
  isQueueOpen: boolean;
  isStageOpen: boolean;
  isShortcutsOpen: boolean;
  isAboutOpen: boolean;
  isReceiptOpen: boolean;
  discordRpcEnabled: boolean;
  discordClientId: string;
  discordRpcStatus: DiscordRpcStatus;
  desktopVersion: string | null;
  updateStatus: DesktopUpdateStatus | null;

  searchQuery: string;
  searchTab: SearchTab;
  searchTopResult: SearchTopResult | null;
  searchResults: Track[];
  searchAlbums: ExploreReleaseCard[];
  searchArtists: RelatedArtistCard[];
  searchPlaylists: ExplorePlaylistCard[];
  searchHasMore: boolean;
  isSearching: boolean;
  isLoadingMoreSearch: boolean;
  searchError: boolean;
  recentSearches: string[];
  collection: Collection | null;
  artistView: string | null;
  artistViewId: string | null;
  activeMood: string | null;

  navPast: NavSnapshot[];
  navFuture: NavSnapshot[];

  tasteTracks: Track[];
  isLoadingTaste: boolean;
  exploreFeed: ExploreFeed | null;
  exploreSections: ExploreSection[];
  isLoadingExplore: boolean;
  hasFetchedExplore: boolean;
  exploreError: boolean;
  exploreCategory: ExploreCategoryRef | null;
  exploreCategoryData: ExploreCategoryData | null;
  isLoadingExploreCategory: boolean;

  // Actions
  setActiveTab: (tab: ActiveTab) => void;
  setQueueOpen: (open: boolean) => void;
  setStageOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  setReceiptOpen: (open: boolean) => void;
  setDiscordRpcEnabled: (enabled: boolean) => void;
  setDiscordClientId: (clientId: string) => void;
  setDiscordRpcStatus: (status: DiscordRpcStatus) => void;
  setDesktopVersion: (version: string | null) => void;
  setUpdateStatus: (status: DesktopUpdateStatus | null) => void;
  setStreamMeta: (meta: StreamMeta | null) => void;
  setCrossfadeSeconds: (sec: number) => void;
  setEqPreset: (preset: EqPresetId) => void;
  setEqBand: (band: keyof EqBands, db: number) => void;
  setLoudnessNormalization: (enabled: boolean) => void;
  setSleepTimer: (option: number | 'track_end' | 'off') => void;
  setSearchQuery: (q: string) => void;
  clearSearch: () => void;
  removeRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
  setActiveMood: (mood: string | null) => void;
  setActivePlaylistId: (id: string | null) => void;
  openCollection: (collection: Collection) => void;
  closeCollection: () => void;
  openArtist: (name: string, id?: string) => void;
  openExploreCategory: (cat: ExploreCategoryRef) => Promise<void>;
  clearExploreCategory: () => void;
  goBack: () => void;
  goForward: () => void;
  performSearch: (q: string, tab?: SearchTab) => Promise<void>;
  setSearchTab: (tab: SearchTab) => Promise<void>;
  loadMoreSearch: () => Promise<void>;

  playTrack: (track: Track, newQueue?: Track[]) => void;
  startRadio: (track: Track) => Promise<void>;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  setIsLoadingStream: (loading: boolean) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (time: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  toggleAutoplay: () => void;

  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  saveQueueAsPlaylist: (name?: string) => string | null;

  toggleFavorite: (track: Track) => void;
  isFavorite: (id: string) => boolean;

  createPlaylist: (name: string) => string;
  createPlaylistWithTrack: (track: Track) => Playlist;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  reorderPlaylistTrack: (playlistId: string, fromIndex: number, toIndex: number) => void;

  fetchTasteRecommendations: () => Promise<void>;
  fetchExploreFeed: () => Promise<void>;
}

const isValidTrack = (t: unknown): t is Track =>
  !!t &&
  typeof t === 'object' &&
  typeof (t as Track).id === 'string' &&
  typeof (t as Track).title === 'string' &&
  typeof (t as Track).artist === 'string';

const loadFavorites = (): Track[] => {
  try {
    const raw = localStorage.getItem('ohm_favorites');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isValidTrack) : [];
  } catch {
    return [];
  }
};

const saveFavorites = (tracks: Track[]) => {
  try {
    localStorage.setItem('ohm_favorites', JSON.stringify(tracks));
  } catch {
    // Ignore storage errors
  }
};

const HISTORY_KEY = 'ohm_history';
const loadHistory = (): Track[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isValidTrack).slice(0, 30) : [];
  } catch {
    return [];
  }
};

const SESSION_KEY = 'ohm_session';
interface SavedSession {
  currentTrack: Track | null;
  queue: Track[];
  currentTime: number;
}
const loadSession = (): Partial<SavedSession> => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<SavedSession>;
    const currentTrack = isValidTrack(parsed.currentTrack) ? parsed.currentTrack : null;
    const rawQueue = Array.isArray(parsed.queue) ? parsed.queue.filter(isValidTrack) : [];
    const seen = new Set<string>();
    const queue = rawQueue.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    const currentTime =
      typeof parsed.currentTime === 'number' && isFinite(parsed.currentTime) && parsed.currentTime >= 0
        ? parsed.currentTime
        : 0;
    return {
      currentTrack,
      queue,
      currentTime: currentTrack ? currentTime : 0,
    };
  } catch {
    return {};
  }
};

const pickById = (ids: string[]): Track[] =>
  ids
    .map((id) => GLOBAL_TRENDING_TRACKS.find((t) => t.id === id))
    .filter((t): t is Track => !!t);

const loadPlaylists = (): Playlist[] => {
  try {
    const raw = localStorage.getItem('ohm_playlists');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (p): p is Playlist =>
              !!p &&
              typeof p === 'object' &&
              typeof p.id === 'string' &&
              typeof p.name === 'string' &&
              Array.isArray(p.tracks)
          )
          .map((p) => ({
            id: p.id,
            name: p.name,
            tracks: p.tracks.filter(isValidTrack),
            createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
          }));
      }
    }
  } catch {
    // fallback
  }
  return [
    {
      id: 'pl-synth-classics',
      name: 'After Hours',
      tracks: pickById(['UEajTd306bg', 'cCfPDrRQp9k', 'dEyPelEU4IE', 'tyd-Vs0MHH4']),
      createdAt: Date.now() - 86400000,
    },
    {
      id: 'pl-late-night',
      name: 'Late Night Chill',
      tracks: pickById(['DlFXDl_ROAM', 'WKZO-CWeOVA', 'ZqSlV5LmrTg', '8yXGI3kcLsw']),
      createdAt: Date.now() - 43200000,
    },
  ];
};

const RECENT_SEARCHES_KEY = 'ohm_recent_searches';
const loadRecentSearches = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((q): q is string => typeof q === 'string' && q.trim().length > 0).slice(0, 6)
      : [];
  } catch {
    return [];
  }
};
const saveRecentSearches = (queries: string[]) => {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(queries));
  } catch {
    // Ignore storage errors
  }
};

const snapshotOf = (s: PlayerState): NavSnapshot => ({
  activeTab: s.activeTab,
  activePlaylistId: s.activePlaylistId,
  collection: s.collection,
  artistView: s.artistView,
  artistViewId: s.artistViewId,
  exploreCategory: s.exploreCategory,
  searchQuery: s.searchQuery,
  searchTab: s.searchTab,
  searchTopResult: s.searchTopResult,
  searchResults: s.searchResults,
  searchAlbums: s.searchAlbums,
  searchArtists: s.searchArtists,
  searchPlaylists: s.searchPlaylists,
  searchHasMore: s.searchHasMore,
});

const sameSnapshot = (a: NavSnapshot, b: NavSnapshot): boolean =>
  a.activeTab === b.activeTab &&
  a.activePlaylistId === b.activePlaylistId &&
  a.artistView === b.artistView &&
  a.artistViewId === b.artistViewId &&
  a.exploreCategory?.browseId === b.exploreCategory?.browseId &&
  a.exploreCategory?.params === b.exploreCategory?.params &&
  a.searchQuery === b.searchQuery &&
  a.searchTab === b.searchTab &&
  a.collection?.kind === b.collection?.kind &&
  a.collection?.albumId === b.collection?.albumId &&
  a.collection?.playlistId === b.collection?.playlistId &&
  a.collection?.title === b.collection?.title;

const pushPast = (state: PlayerState, nextPartial: Partial<NavSnapshot>) => {
  const cur = snapshotOf(state);
  const next: NavSnapshot = { ...cur, ...nextPartial };
  if (sameSnapshot(cur, next)) return {};
  const past =
    state.navPast.length > 0 && sameSnapshot(state.navPast[state.navPast.length - 1], cur)
      ? state.navPast
      : [...state.navPast.slice(-29), cur];
  return { navPast: past, navFuture: [] as NavSnapshot[] };
};

const savePlaylists = (playlists: Playlist[]) => {
  try {
    localStorage.setItem('ohm_playlists', JSON.stringify(playlists));
  } catch {
    // Ignore storage errors
  }
};

// Listener preferences survive a reload
const PREFS_KEY = 'ohm_prefs';
interface Prefs {
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  shuffle: boolean;
  autoplay: boolean;
  crossfadeSeconds: number;
  eqPreset: EqPresetId;
  eqBands: EqBands;
  loudnessNormalization: boolean;
}

const isValidBands = (b: unknown): b is EqBands =>
  !!b &&
  typeof b === 'object' &&
  typeof (b as EqBands).low === 'number' &&
  typeof (b as EqBands).mid === 'number' &&
  typeof (b as EqBands).high === 'number';

const loadPrefs = (): Partial<Prefs> => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as Partial<Prefs>;
    const out: Partial<Prefs> = {};
    if (typeof p.volume === 'number') out.volume = Math.max(0, Math.min(1, p.volume));
    if (typeof p.isMuted === 'boolean') out.isMuted = p.isMuted;
    if (p.repeatMode === 'off' || p.repeatMode === 'all' || p.repeatMode === 'one') out.repeatMode = p.repeatMode;
    if (typeof p.shuffle === 'boolean') out.shuffle = p.shuffle;
    if (typeof p.autoplay === 'boolean') out.autoplay = p.autoplay;
    if (typeof p.crossfadeSeconds === 'number' && [0, 3, 6].includes(p.crossfadeSeconds)) {
      out.crossfadeSeconds = p.crossfadeSeconds;
    }
    if (typeof p.loudnessNormalization === 'boolean') {
      out.loudnessNormalization = p.loudnessNormalization;
    }
    if (
      p.eqPreset === 'flat' ||
      p.eqPreset === 'bass' ||
      p.eqPreset === 'vocal' ||
      p.eqPreset === 'night' ||
      p.eqPreset === 'custom'
    ) {
      out.eqPreset = p.eqPreset;
    }
    if (isValidBands(p.eqBands)) {
      out.eqBands = {
        low: Math.max(-6, Math.min(6, p.eqBands.low)),
        mid: Math.max(-6, Math.min(6, p.eqBands.mid)),
        high: Math.max(-6, Math.min(6, p.eqBands.high)),
      };
    }
    return out;
  } catch {
    return {};
  }
};

// Sequence tokens for dropping out-of-order async responses
let searchSeq = 0;
let radioSeq = 0;
let autoplaySeq = 0;
let tasteSeq = 0;
let exploreCatSeq = 0;
const exploreCategoryCache = new Map<string, ExploreCategoryData>();
const restoredSession = loadSession();

const INFINITY_LOW_WATER = 3;

let lastNonZeroVolume = 0.85;

const clampVol = (v: number) => Math.max(0, Math.min(1, v));

async function fetchRadioCandidates(
  seedId: string,
  excludeIds: Set<string>
): Promise<Track[]> {
  const res = await fetch(`/api/radio/${encodeURIComponent(seedId)}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { tracks?: Track[] };
  return (data.tracks || [])
    .filter((t) => isValidTrack(t) && !excludeIds.has(t.id))
    .map((t) => ({ ...t, queueOrigin: 'auto' as const }));
}

function seedQueueInBackground(
  seedId: string,
  exclude: Set<string>,
  apSeq: number,
  set: (partial: Partial<PlayerState> | ((s: PlayerState) => Partial<PlayerState>)) => void,
  get: () => PlayerState
) {
  fetchRadioCandidates(seedId, exclude)
    .then((candidates) => {
      if (apSeq !== autoplaySeq || !get().autoplay || candidates.length === 0) return;
      set((s) => {
        const existing = new Set<string>([
          ...(s.currentTrack ? [s.currentTrack.id] : []),
          ...s.queue.map((q) => q.id),
        ]);
        const fresh = candidates.filter((c) => !existing.has(c.id));
        return fresh.length > 0 ? { queue: [...s.queue, ...fresh] } : {};
      });
    })
    .catch(() => {});
}

const SEARCH_RESET = {
  searchQuery: '',
  searchTab: 'all' as SearchTab,
  searchTopResult: null as SearchTopResult | null,
  searchResults: [] as Track[],
  searchAlbums: [] as ExploreReleaseCard[],
  searchArtists: [] as RelatedArtistCard[],
  searchPlaylists: [] as ExplorePlaylistCard[],
  searchHasMore: false,
  searchError: false,
  isSearching: false,
  isLoadingMoreSearch: false,
};

const snapshotSearchReset = {
  searchQuery: '',
  searchTab: 'all' as SearchTab,
  searchTopResult: null as SearchTopResult | null,
  searchResults: [] as Track[],
  searchAlbums: [] as ExploreReleaseCard[],
  searchArtists: [] as RelatedArtistCard[],
  searchPlaylists: [] as ExplorePlaylistCard[],
  searchHasMore: false,
};

interface CachedSearchEntry {
  topResult: SearchTopResult | null;
  tracks: Track[];
  albums: ExploreReleaseCard[];
  artists: RelatedArtistCard[];
  playlists: ExplorePlaylistCard[];
  hasMore: boolean;
}

const MAX_CLIENT_SEARCH_CACHE = 50;
const searchTabCache = new Map<string, CachedSearchEntry>();

function saveSearchTabCache(query: string, tab: SearchTab, entry: CachedSearchEntry) {
  const key = `${query.toLowerCase()}::${tab}`;
  if (searchTabCache.has(key)) searchTabCache.delete(key);
  else if (searchTabCache.size >= MAX_CLIENT_SEARCH_CACHE) {
    const oldest = searchTabCache.keys().next().value;
    if (oldest !== undefined) searchTabCache.delete(oldest);
  }
  searchTabCache.set(key, entry);
}

function getSearchTabCache(query: string, tab: SearchTab): CachedSearchEntry | undefined {
  const key = `${query.toLowerCase()}::${tab}`;
  const hit = searchTabCache.get(key);
  if (!hit) return undefined;
  searchTabCache.delete(key);
  searchTabCache.set(key, hit);
  return hit;
}

function mergeUniqueById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const seen = new Set(existing.map((item) => item.id));
  return [...existing, ...incoming.filter((item) => !seen.has(item.id))];
}

async function runSearchTabFetch(
  query: string,
  tab: SearchTab,
  seq: number,
  set: (partial: Partial<PlayerState> | ((s: PlayerState) => Partial<PlayerState>)) => void
) {
  try {
    const res = await fetch(
      `/api/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(tab)}`
    );
    if (!res.ok) throw new Error('Search request failed');
    const data = (await res.json()) as {
      topResult?: SearchTopResult | null;
      tracks?: Track[];
      albums?: ExploreReleaseCard[];
      artists?: RelatedArtistCard[];
      playlists?: ExplorePlaylistCard[];
      hasMore?: boolean;
    };
    if (seq !== searchSeq) return;

    set((state) => {
      const topResult = tab === 'all' ? (data.topResult ?? null) : state.searchTopResult;
      const tracks =
        tab === 'all' || tab === 'songs' ? (data.tracks || []) : state.searchResults;
      const albums =
        tab === 'all' || tab === 'albums' ? (data.albums || []) : state.searchAlbums;
      const artists =
        tab === 'all' || tab === 'artists' ? (data.artists || []) : state.searchArtists;
      const playlists =
        tab === 'all' || tab === 'playlists' ? (data.playlists || []) : state.searchPlaylists;
      const hasMore = tab === 'all' ? false : Boolean(data.hasMore);

      saveSearchTabCache(query, tab, {
        topResult,
        tracks,
        albums,
        artists,
        playlists,
        hasMore,
      });

      return {
        searchTopResult: topResult,
        searchResults: tracks,
        searchAlbums: albums,
        searchArtists: artists,
        searchPlaylists: playlists,
        searchHasMore: hasMore,
        isSearching: false,
        searchError: false,
      };
    });
  } catch (err) {
    if (seq !== searchSeq) return;
    console.error('Search failed:', err);
    set({
      searchHasMore: false,
      isSearching: false,
      searchError: true,
    });
  }
}

async function hydrateExploreCategory(
  cat: ExploreCategoryRef,
  seq: number,
  set: (partial: Partial<PlayerState>) => void
) {
  const cacheKey = `${cat.browseId}::${cat.params || ''}`;
  try {
    const qs = new URLSearchParams({ browseId: cat.browseId, title: cat.title });
    if (cat.params) qs.set('params', cat.params);
    const res = await fetch(`/api/explore/category?${qs.toString()}`);
    if (seq !== exploreCatSeq) return;
    if (res.ok) {
      const data = (await res.json()) as ExploreCategoryData;
      if (seq !== exploreCatSeq) return;
      exploreCategoryCache.set(cacheKey, data);
      set({ exploreCategoryData: data, isLoadingExploreCategory: false });
    } else {
      set({ isLoadingExploreCategory: false });
    }
  } catch {
    if (seq === exploreCatSeq) set({ isLoadingExploreCategory: false });
  }
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: restoredSession.currentTrack ?? null,
  queue: restoredSession.queue ?? [],
  history: loadHistory(),
  favorites: loadFavorites(),
  playEvents: loadPlayEvents(),
  playlists: loadPlaylists(),
  activePlaylistId: null,

  isPlaying: false,
  isLoadingStream: false,
  currentTime: restoredSession.currentTime ?? 0,
  seekNonce: 0,
  duration: restoredSession.currentTrack?.duration || 0,
  volume: 0.85,
  isMuted: false,
  repeatMode: 'off',
  shuffle: false,
  autoplay: true,

  activeTab: 'browse',
  isQueueOpen: false,
  isStageOpen: false,
  isShortcutsOpen: false,
  isAboutOpen: false,
  isReceiptOpen: false,
  discordRpcEnabled: (() => {
    try {
      return localStorage.getItem('ohm_discord_rpc') === 'true';
    } catch {
      return false;
    }
  })(),
  discordClientId: (() => {
    try {
      return localStorage.getItem('ohm_discord_client_id') || '';
    } catch {
      return '';
    }
  })(),
  discordRpcStatus: 'disabled',
  desktopVersion: null,
  updateStatus: null,

  crossfadeSeconds: 0,
  eqPreset: 'flat',
  eqBands: { ...EQ_PRESETS.flat },
  loudnessNormalization: false,
  sleepMode: 'off',
  sleepEndsAt: null,
  sleepPresetMinutes: null,
  streamMeta: null,

  searchQuery: '',
  searchTab: 'all',
  searchTopResult: null,
  searchResults: [],
  searchAlbums: [],
  searchArtists: [],
  searchPlaylists: [],
  searchHasMore: false,
  isSearching: false,
  isLoadingMoreSearch: false,
  searchError: false,
  recentSearches: loadRecentSearches(),
  collection: null,
  artistView: null,
  artistViewId: null,
  activeMood: 'All',

  navPast: [],
  navFuture: [],

  tasteTracks: [],
  isLoadingTaste: false,
  exploreFeed: null,
  exploreSections: [],
  isLoadingExplore: false,
  hasFetchedExplore: false,
  exploreError: false,
  exploreCategory: null,
  exploreCategoryData: null,
  isLoadingExploreCategory: false,

  ...loadPrefs(),

  setActiveTab: (tab) => {
    ++searchSeq;
    ++exploreCatSeq;
    set((state) => ({
      ...pushPast(state, {
        activeTab: tab,
        activePlaylistId: null,
        collection: null,
        artistView: null,
        artistViewId: null,
        exploreCategory: null,
        ...snapshotSearchReset,
      }),
      activeTab: tab,
      activePlaylistId: null,
      collection: null,
      artistView: null,
      artistViewId: null,
      exploreCategory: null,
      exploreCategoryData: null,
      isLoadingExploreCategory: false,
      ...SEARCH_RESET,
      isStageOpen: false,
    }));
  },

  setQueueOpen: (open) => {
    set({ isQueueOpen: open });
  },

  setStageOpen: (open) => {
    set({ isStageOpen: open });
  },

  setShortcutsOpen: (open) => {
    set({ isShortcutsOpen: open });
  },

  setAboutOpen: (open) => {
    set({ isAboutOpen: open });
  },
  setReceiptOpen: (open) => {
    set({ isReceiptOpen: open });
  },
  setDiscordRpcEnabled: (enabled) => {
    try {
      localStorage.setItem('ohm_discord_rpc', String(enabled));
    } catch {
      // Ignore storage errors
    }
    set({ discordRpcEnabled: enabled });
  },
  setDiscordClientId: (clientId) => {
    const trimmed = clientId.trim();
    try {
      localStorage.setItem('ohm_discord_client_id', trimmed);
    } catch {
      // Ignore storage errors
    }
    set({ discordClientId: trimmed });
  },
  setDiscordRpcStatus: (status) => set({ discordRpcStatus: status }),

  setDesktopVersion: (version) => {
    set({ desktopVersion: version });
  },

  setUpdateStatus: (status) => {
    set({ updateStatus: status });
  },

  setStreamMeta: (meta) => set({ streamMeta: meta }),

  setCrossfadeSeconds: (sec) => set({ crossfadeSeconds: Math.max(0, Math.min(12, sec)) }),

  setEqPreset: (preset) => {
    if (preset === 'custom') {
      set({ eqPreset: 'custom' });
      return;
    }
    set({ eqPreset: preset, eqBands: { ...EQ_PRESETS[preset] } });
  },

  setEqBand: (band, db) =>
    set((state) => ({
      eqPreset: 'custom',
      eqBands: { ...state.eqBands, [band]: Math.max(-6, Math.min(6, db)) },
    })),

  setLoudnessNormalization: (enabled) => {
    audioEngine.setLoudnessNormalization(enabled);
    set({ loudnessNormalization: enabled });
  },

  setSleepTimer: (option) => {
    if (option === 'off') {
      set({ sleepMode: 'off', sleepEndsAt: null, sleepPresetMinutes: null });
    } else if (option === 'track_end') {
      set({ sleepMode: 'track_end', sleepEndsAt: null, sleepPresetMinutes: null });
    } else {
      set({
        sleepMode: 'timer',
        sleepEndsAt: Date.now() + option * 60_000,
        sleepPresetMinutes: option,
      });
    }
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  clearSearch: () => {
    ++searchSeq;
    set((state) => ({
      ...pushPast(state, snapshotSearchReset),
      ...SEARCH_RESET,
    }));
  },
  removeRecentSearch: (q) => {
    const updated = get().recentSearches.filter((item) => item !== q);
    saveRecentSearches(updated);
    set({ recentSearches: updated });
  },
  clearRecentSearches: () => {
    saveRecentSearches([]);
    set({ recentSearches: [] });
  },
  setActiveMood: (mood) => set({ activeMood: mood }),
  setActivePlaylistId: (id) => {
    ++searchSeq;
    set((state) => ({
      ...pushPast(state, {
        activeTab: id ? 'songs' : state.activeTab,
        activePlaylistId: id,
        collection: null,
        artistView: null,
        artistViewId: null,
        ...snapshotSearchReset,
      }),
      activeTab: id ? 'songs' : state.activeTab,
      activePlaylistId: id,
      collection: null,
      artistView: null,
      artistViewId: null,
      ...SEARCH_RESET,
      isStageOpen: false,
    }));
  },
  openCollection: (collection) => {
    ++searchSeq;
    set((state) => ({
      ...pushPast(state, {
        collection,
        artistView: null,
        artistViewId: null,
        ...snapshotSearchReset,
      }),
      collection,
      artistView: null,
      artistViewId: null,
      ...SEARCH_RESET,
      isStageOpen: false,
    }));
  },
  closeCollection: () => {
    if (get().navPast.length > 0) {
      get().goBack();
    } else {
      set({ collection: null });
    }
  },
  openArtist: (name, id) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    ++searchSeq;
    const cleanId = id?.trim() || null;
    set((state) => ({
      ...pushPast(state, {
        artistView: trimmed,
        artistViewId: cleanId,
        collection: null,
        ...snapshotSearchReset,
      }),
      artistView: trimmed,
      artistViewId: cleanId,
      collection: null,
      ...SEARCH_RESET,
      isStageOpen: false,
    }));
  },
  openExploreCategory: async (cat) => {
    ++searchSeq;
    const seq = ++exploreCatSeq;
    const cacheKey = `${cat.browseId}::${cat.params || ''}`;
    const cached = exploreCategoryCache.get(cacheKey);
    set((state) => ({
      ...pushPast(state, {
        activeTab: 'explore',
        activePlaylistId: null,
        collection: null,
        artistView: null,
        artistViewId: null,
        exploreCategory: cat,
        ...snapshotSearchReset,
      }),
      activeTab: 'explore',
      activePlaylistId: null,
      collection: null,
      artistView: null,
      artistViewId: null,
      exploreCategory: cat,
      exploreCategoryData: cached ?? null,
      isLoadingExploreCategory: !cached,
      ...SEARCH_RESET,
      isStageOpen: false,
    }));
    if (cached) return;
    await hydrateExploreCategory(cat, seq, set);
  },
  clearExploreCategory: () => {
    ++exploreCatSeq;
    if (get().navPast.length > 0 && get().navPast[get().navPast.length - 1].exploreCategory === null) {
      get().goBack();
      return;
    }
    set((state) => ({
      ...pushPast(state, { exploreCategory: null }),
      exploreCategory: null,
      exploreCategoryData: null,
      isLoadingExploreCategory: false,
    }));
  },
  goBack: () => {
    const state = get();
    if (state.navPast.length === 0) return;
    ++searchSeq;
    ++exploreCatSeq;
    const target = state.navPast[state.navPast.length - 1];
    const playlistExists =
      !target.activePlaylistId ||
      state.playlists.some((pl) => pl.id === target.activePlaylistId);
    const current = snapshotOf(state);
    const cachedCat = target.exploreCategory
      ? exploreCategoryCache.get(`${target.exploreCategory.browseId}::${target.exploreCategory.params || ''}`) ?? null
      : null;
    set({
      navPast: state.navPast.slice(0, -1),
      navFuture: [current, ...state.navFuture.slice(0, 29)],
      activeTab: playlistExists ? target.activeTab : 'browse',
      activePlaylistId: playlistExists ? target.activePlaylistId : null,
      collection: target.collection,
      artistView: target.artistView,
      artistViewId: target.artistViewId,
      exploreCategory: target.exploreCategory,
      exploreCategoryData: cachedCat,
      isLoadingExploreCategory: !!target.exploreCategory && !cachedCat,
      searchQuery: target.searchQuery,
      searchTab: target.searchTab,
      searchTopResult: target.searchTopResult,
      searchResults: target.searchResults,
      searchAlbums: target.searchAlbums,
      searchArtists: target.searchArtists,
      searchPlaylists: target.searchPlaylists,
      searchHasMore: target.searchHasMore,
      searchError: false,
      isSearching: false,
      isLoadingMoreSearch: false,
      isStageOpen: false,
    });
    if (target.exploreCategory && !cachedCat) {
      void hydrateExploreCategory(target.exploreCategory, exploreCatSeq, set);
    }
  },
  goForward: () => {
    const state = get();
    if (state.navFuture.length === 0) return;
    ++searchSeq;
    ++exploreCatSeq;
    const target = state.navFuture[0];
    const playlistExists =
      !target.activePlaylistId ||
      state.playlists.some((pl) => pl.id === target.activePlaylistId);
    const current = snapshotOf(state);
    const cachedCat = target.exploreCategory
      ? exploreCategoryCache.get(`${target.exploreCategory.browseId}::${target.exploreCategory.params || ''}`) ?? null
      : null;
    set({
      navPast: [...state.navPast.slice(-29), current],
      navFuture: state.navFuture.slice(1),
      activeTab: playlistExists ? target.activeTab : 'browse',
      activePlaylistId: playlistExists ? target.activePlaylistId : null,
      collection: target.collection,
      artistView: target.artistView,
      artistViewId: target.artistViewId,
      exploreCategory: target.exploreCategory,
      exploreCategoryData: cachedCat,
      isLoadingExploreCategory: !!target.exploreCategory && !cachedCat,
      searchQuery: target.searchQuery,
      searchTab: target.searchTab,
      searchTopResult: target.searchTopResult,
      searchResults: target.searchResults,
      searchAlbums: target.searchAlbums,
      searchArtists: target.searchArtists,
      searchPlaylists: target.searchPlaylists,
      searchHasMore: target.searchHasMore,
      searchError: false,
      isSearching: false,
      isLoadingMoreSearch: false,
      isStageOpen: false,
    });
    if (target.exploreCategory && !cachedCat) {
      void hydrateExploreCategory(target.exploreCategory, exploreCatSeq, set);
    }
  },

  performSearch: async (q, explicitTab) => {
    const query = q.trim();
    if (!query) return;
    const targetTab: SearchTab = explicitTab ?? (get().searchQuery ? get().searchTab : 'all');
    const seq = ++searchSeq;
    const recent = [
      query,
      ...get().recentSearches.filter((r) => r.toLowerCase() !== query.toLowerCase()),
    ].slice(0, 6);
    saveRecentSearches(recent);

    const cached = getSearchTabCache(query, targetTab);
    set((state) => ({
      ...pushPast(state, {
        searchQuery: query,
        searchTab: targetTab,
        collection: null,
        artistView: null,
        artistViewId: null,
      }),
      isSearching: !cached,
      isLoadingMoreSearch: false,
      searchQuery: query,
      searchTab: targetTab,
      searchTopResult: cached?.topResult ?? null,
      searchResults: cached?.tracks ?? [],
      searchAlbums: cached?.albums ?? [],
      searchArtists: cached?.artists ?? [],
      searchPlaylists: cached?.playlists ?? [],
      searchHasMore: cached?.hasMore ?? false,
      searchError: false,
      collection: null,
      artistView: null,
      artistViewId: null,
      recentSearches: recent,
      isStageOpen: false,
    }));
    if (cached) return;

    await runSearchTabFetch(query, targetTab, seq, set);
  },

  setSearchTab: async (tab) => {
    const { searchQuery, searchTab, searchError } = get();
    if (!searchQuery || (tab === searchTab && !searchError)) return;
    const seq = ++searchSeq;
    const cached = getSearchTabCache(searchQuery, tab);
    set((state) => ({
      ...pushPast(state, { searchTab: tab }),
      searchTab: tab,
      isSearching: !cached,
      isLoadingMoreSearch: false,
      searchError: false,
      searchTopResult: cached?.topResult ?? state.searchTopResult,
      searchResults: cached?.tracks ?? (tab === 'songs' ? [] : state.searchResults),
      searchAlbums: cached?.albums ?? (tab === 'albums' ? [] : state.searchAlbums),
      searchArtists: cached?.artists ?? (tab === 'artists' ? [] : state.searchArtists),
      searchPlaylists: cached?.playlists ?? (tab === 'playlists' ? [] : state.searchPlaylists),
      searchHasMore: cached?.hasMore ?? false,
    }));
    if (cached) return;

    await runSearchTabFetch(searchQuery, tab, seq, set);
  },

  loadMoreSearch: async () => {
    const {
      searchQuery,
      searchTab,
      searchResults,
      searchAlbums,
      searchArtists,
      searchPlaylists,
      searchHasMore,
      isSearching,
      isLoadingMoreSearch,
    } = get();
    if (
      !searchQuery ||
      searchTab === 'all' ||
      !searchHasMore ||
      isSearching ||
      isLoadingMoreSearch
    ) {
      return;
    }
    const offset =
      searchTab === 'songs'
        ? searchResults.length
        : searchTab === 'albums'
        ? searchAlbums.length
        : searchTab === 'artists'
        ? searchArtists.length
        : searchPlaylists.length;
    const seq = searchSeq;
    set({ isLoadingMoreSearch: true });
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&type=${encodeURIComponent(searchTab)}&offset=${offset}`
      );
      if (!res.ok) throw new Error('Load more failed');
      const data = (await res.json()) as {
        tracks?: Track[];
        albums?: ExploreReleaseCard[];
        artists?: RelatedArtistCard[];
        playlists?: ExplorePlaylistCard[];
        hasMore?: boolean;
      };
      if (seq !== searchSeq) return;
      set((state) => {
        const incomingCount =
          searchTab === 'songs'
            ? (data.tracks || []).length
            : searchTab === 'albums'
            ? (data.albums || []).length
            : searchTab === 'artists'
            ? (data.artists || []).length
            : (data.playlists || []).length;
        const nextTracks =
          searchTab === 'songs'
            ? mergeUniqueById(state.searchResults, data.tracks || [])
            : state.searchResults;
        const nextAlbums =
          searchTab === 'albums'
            ? mergeUniqueById(state.searchAlbums, data.albums || [])
            : state.searchAlbums;
        const nextArtists =
          searchTab === 'artists'
            ? mergeUniqueById(state.searchArtists, data.artists || [])
            : state.searchArtists;
        const nextPlaylists =
          searchTab === 'playlists'
            ? mergeUniqueById(state.searchPlaylists, data.playlists || [])
            : state.searchPlaylists;
        const nextHasMore = Boolean(data.hasMore) && incomingCount > 0;
        saveSearchTabCache(searchQuery, searchTab, {
          topResult: state.searchTopResult,
          tracks: nextTracks,
          albums: nextAlbums,
          artists: nextArtists,
          playlists: nextPlaylists,
          hasMore: nextHasMore,
        });
        return {
          searchResults: nextTracks,
          searchAlbums: nextAlbums,
          searchArtists: nextArtists,
          searchPlaylists: nextPlaylists,
          searchHasMore: nextHasMore,
          isLoadingMoreSearch: false,
        };
      });
    } catch {
      if (seq === searchSeq) set({ isLoadingMoreSearch: false });
    }
  },

  playTrack: (track, newQueue) => {
    audioEngine.ensureGraph();
    radioSeq++;
    playSessionSeq++;
    const apSeq = ++autoplaySeq;
    const { currentTrack, history, queue, autoplay } = get();
    const updatedHistory = currentTrack
      ? [currentTrack, ...history.filter((t) => t.id !== currentTrack.id)].slice(0, 30)
      : history;

    const pinnedTracks = queue.filter(
      (t) => t.queueOrigin === 'pinned' && t.id !== track.id
    );
    const nextQueue: Track[] =
      newQueue !== undefined
        ? [
            ...pinnedTracks,
            ...newQueue
              .filter((t) => t.id !== track.id && !pinnedTracks.some((p) => p.id === t.id))
              .map((t) => ({ ...t, queueOrigin: 'context' as const })),
          ]
        : pinnedTracks;

    set({
      currentTrack: track,
      isPlaying: true,
      isLoadingStream: true,
      currentTime: 0,
      duration: track.duration || 0,
      history: updatedHistory,
      queue: nextQueue,
    });

    // Silently seed Infinity Queue Up Next when playing a single song (or short context)
    if (autoplay && nextQueue.length <= INFINITY_LOW_WATER) {
      const seed = nextQueue[nextQueue.length - 1] ?? track;
      const exclude = new Set<string>([
        track.id,
        ...nextQueue.map((t) => t.id),
        ...updatedHistory.slice(0, 15).map((t) => t.id),
      ]);
      seedQueueInBackground(seed.id, exclude, apSeq, set, get);
    }

    get().fetchTasteRecommendations();
  },

  startRadio: async (track) => {
    audioEngine.ensureGraph();
    const seq = ++radioSeq;
    autoplaySeq++;
    const { currentTrack, history } = get();
    const updatedHistory = currentTrack
      ? [currentTrack, ...history.filter((t) => t.id !== currentTrack.id)].slice(0, 30)
      : history;

    set({
      currentTrack: track,
      isPlaying: true,
      isLoadingStream: true,
      currentTime: 0,
      duration: track.duration || 0,
      history: updatedHistory,
      queue: [],
      isQueueOpen: true,
    });

    try {
      const candidates = await fetchRadioCandidates(
        track.id,
        new Set<string>([track.id])
      );
      if (seq !== radioSeq) return;
      set({
        queue: candidates,
        tasteTracks: candidates.slice(0, 16),
      });
    } catch (err) {
      console.warn('Failed to start radio:', err);
    }
  },

  togglePlay: () => {
    audioEngine.ensureGraph();
    const { currentTrack, isPlaying, queue } = get();
    if (!currentTrack && queue.length > 0) {
      get().playTrack(queue[0], queue.slice(1));
      return;
    }
    if (currentTrack) {
      set({ isPlaying: !isPlaying });
    }
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsLoadingStream: (loading) => set({ isLoadingStream: loading }),

  nextTrack: () => {
    const { queue, currentTrack, repeatMode, shuffle, history, autoplay } = get();
    const apSeq = ++autoplaySeq;

    if (repeatMode === 'one' && currentTrack) {
      set((state) => ({ currentTime: 0, seekNonce: state.seekNonce + 1, isPlaying: true }));
      return;
    }

    if (queue.length === 0) {
      if (repeatMode === 'all') {
        const cycle = [
          ...history.slice().reverse(),
          ...(currentTrack ? [currentTrack] : []),
        ];
        if (cycle.length === 1 && currentTrack) {
          set((state) => ({ currentTime: 0, seekNonce: state.seekNonce + 1, isPlaying: true }));
          return;
        }
        if (cycle.length > 1) {
          set({
            currentTrack: cycle[0],
            queue: cycle.slice(1),
            history: [],
            currentTime: 0,
            duration: cycle[0].duration || 0,
            isPlaying: true,
            isLoadingStream: true,
          });
          return;
        }
      }
      if (autoplay && currentTrack) {
        const exclude = new Set<string>([
          currentTrack.id,
          ...history.slice(0, 15).map((t) => t.id),
        ]);
        fetchRadioCandidates(currentTrack.id, exclude)
          .then((candidates) => {
            if (apSeq !== autoplaySeq) return;
            if (candidates.length > 0) {
              get().playTrack(candidates[0], []);
            } else {
              set({ isPlaying: false });
            }
          })
          .catch(() => {
            if (apSeq === autoplaySeq) set({ isPlaying: false });
          });
      } else {
        set({ isPlaying: false });
      }
      return;
    }

    let nextIndex = 0;
    if (shuffle && queue.length > 1) {
      nextIndex = Math.floor(Math.random() * queue.length);
    }

    const next = queue[nextIndex];
    const remainingQueue = queue.filter((_, idx) => idx !== nextIndex);
    const updatedHistory = currentTrack
      ? [currentTrack, ...history.filter((t) => t.id !== currentTrack.id)].slice(0, 30)
      : history;

    set({
      currentTrack: next,
      queue: remainingQueue,
      history: updatedHistory,
      currentTime: 0,
      duration: next.duration || 0,
      isPlaying: true,
      isLoadingStream: true,
    });

    // Proactive rolling Infinity Queue refill before queue hits empty
    if (autoplay && repeatMode === 'off' && remainingQueue.length <= INFINITY_LOW_WATER) {
      const tailSeed = remainingQueue[remainingQueue.length - 1] ?? next;
      const exclude = new Set<string>([
        next.id,
        ...remainingQueue.map((q) => q.id),
        ...updatedHistory.slice(0, 15).map((h) => h.id),
      ]);
      seedQueueInBackground(tailSeed.id, exclude, apSeq, set, get);
    }

    get().fetchTasteRecommendations();
  },

  prevTrack: () => {
    const { currentTime, history, currentTrack, queue } = get();

    const updated = [...queue];
    if (currentTime > 4 || history.length === 0) {
      set((state) => ({ currentTime: 0, seekNonce: state.seekNonce + 1 }));
      return;
    }

    const prev = history[0];
    const remainingHistory = history.slice(1);
    const updatedQueue = currentTrack ? [currentTrack, ...updated] : updated;

    set({
      currentTrack: prev,
      history: remainingHistory,
      queue: updatedQueue,
      currentTime: 0,
      duration: prev.duration || 0,
      isPlaying: true,
      isLoadingStream: true,
    });
  },

  seekTo: (time) => {
    const clamped = Math.max(0, time);
    set((state) => ({ currentTime: clamped, seekNonce: state.seekNonce + 1 }));
  },

  setCurrentTime: (time) => {
    const { currentTrack } = get();
    if (currentTrack && time >= 15 && lastRecordedPlaySession !== playSessionSeq) {
      lastRecordedPlaySession = playSessionSeq;
      const listenedSec =
        currentTrack.duration && currentTrack.duration > 0
          ? currentTrack.duration
          : Math.max(15, time);
      const updatedEvents = appendPlayEvent(currentTrack, listenedSec);
      set({ currentTime: time, playEvents: updatedEvents });
      return;
    }
    set({ currentTime: time });
  },
  setDuration: (duration) => set({ duration }),

  setVolume: (vol) => {
    const clamped = clampVol(vol);
    if (clamped > 0.05) lastNonZeroVolume = clamped;
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  toggleMute: () => {
    set((state) => {
      if (state.isMuted) {
        return {
          isMuted: false,
          volume: state.volume > 0 ? state.volume : lastNonZeroVolume,
        };
      }
      if (state.volume > 0.05) lastNonZeroVolume = state.volume;
      return { isMuted: true };
    });
  },

  toggleRepeat: () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const current = get().repeatMode;
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    set({ repeatMode: next });
  },

  toggleShuffle: () => {
    set((state) => ({ shuffle: !state.shuffle }));
  },

  toggleAutoplay: () => {
    const turningOn = !get().autoplay;
    const apSeq = ++autoplaySeq;
    set((state) => ({
      autoplay: turningOn,
      queue: turningOn ? state.queue : state.queue.filter((t) => t.queueOrigin !== 'auto'),
    }));
    if (turningOn) {
      const { currentTrack, queue, history } = get();
      if (currentTrack && queue.length <= INFINITY_LOW_WATER) {
        const seed = queue[queue.length - 1] ?? currentTrack;
        const exclude = new Set<string>([
          currentTrack.id,
          ...queue.map((q) => q.id),
          ...history.slice(0, 15).map((h) => h.id),
        ]);
        seedQueueInBackground(seed.id, exclude, apSeq, set, get);
      }
    }
  },

  addToQueue: (track) => {
    const tagged: Track = { ...track, queueOrigin: 'pinned' };
    set((state) => {
      if (state.queue.some((t) => t.id === track.id)) return state;
      const autoIdx = state.queue.findIndex((t) => t.queueOrigin === 'auto');
      if (autoIdx === -1) return { queue: [...state.queue, tagged] };
      const next = [...state.queue];
      next.splice(autoIdx, 0, tagged);
      return { queue: next };
    });
  },

  playNext: (track) => {
    const tagged: Track = { ...track, queueOrigin: 'pinned' };
    set((state) => ({
      queue: [tagged, ...state.queue.filter((t) => t.id !== track.id)],
    }));
  },

  removeFromQueue: (id) => {
    set((state) => ({ queue: state.queue.filter((t) => t.id !== id) }));
  },

  clearQueue: () => {
    set({ queue: [] });
  },

  reorderQueue: (fromIndex, toIndex) => {
    const { queue } = get();
    if (
      fromIndex < 0 ||
      fromIndex >= queue.length ||
      toIndex < 0 ||
      toIndex >= queue.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    const updated = [...queue];
    const [moved] = updated.splice(fromIndex, 1);
    const firstAutoAfterRemove = updated.findIndex((t) => t.queueOrigin === 'auto');
    const movedIntoManualZone =
      moved.queueOrigin === 'auto' &&
      (firstAutoAfterRemove === -1 || toIndex <= firstAutoAfterRemove);
    const nextTrackItem: Track = movedIntoManualZone
      ? { ...moved, queueOrigin: 'pinned' }
      : moved;
    updated.splice(toIndex, 0, nextTrackItem);
    set({ queue: updated });
  },

  saveQueueAsPlaylist: (customName) => {
    const { currentTrack, queue, playlists } = get();
    const seen = new Set<string>();
    const combined: Track[] = [];
    for (const t of [...(currentTrack ? [currentTrack] : []), ...queue]) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        combined.push({ ...t, queueOrigin: undefined });
      }
    }
    if (combined.length === 0) return null;

    const baseName =
      customName?.trim() ||
      (currentTrack ? `${currentTrack.title} Mix` : `Queue Mix #${playlists.length + 1}`);
    const newPlaylist: Playlist = {
      id: `pl-${Date.now()}`,
      name: baseName,
      tracks: combined,
      createdAt: Date.now(),
    };
    const updated = [...playlists, newPlaylist];
    savePlaylists(updated);
    set({ playlists: updated });
    get().fetchTasteRecommendations();
    return baseName;
  },

  toggleFavorite: (track) => {
    const { favorites } = get();
    const exists = favorites.some((t) => t.id === track.id);
    const updated = exists
      ? favorites.filter((t) => t.id !== track.id)
      : [track, ...favorites];
    saveFavorites(updated);
    set({ favorites: updated });

    // Dynamically update recommendations based on favorite shift
    get().fetchTasteRecommendations();
  },

  isFavorite: (id) => get().favorites.some((t) => t.id === id),

  createPlaylist: (name) => {
    ++searchSeq;
    const newPlaylist: Playlist = {
      id: `pl-${Date.now()}`,
      name: name.trim() || 'Untitled Playlist',
      tracks: [],
      createdAt: Date.now(),
    };
    const updated = [...get().playlists, newPlaylist];
    savePlaylists(updated);
    set((state) => ({
      ...pushPast(state, {
        activePlaylistId: newPlaylist.id,
        activeTab: 'songs',
        collection: null,
        artistView: null,
        artistViewId: null,
        searchQuery: '',
        searchResults: [],
      }),
      playlists: updated,
      activePlaylistId: newPlaylist.id,
      activeTab: 'songs',
      collection: null,
      artistView: null,
      artistViewId: null,
      searchQuery: '',
      searchResults: [],
      searchError: false,
      isSearching: false,
      isStageOpen: false,
    }));
    return newPlaylist.id;
  },

  createPlaylistWithTrack: (track) => {
    const newPlaylist: Playlist = {
      id: `pl-${Date.now()}`,
      name: `My Playlist #${get().playlists.length + 1}`,
      tracks: [track],
      createdAt: Date.now(),
    };
    const updated = [...get().playlists, newPlaylist];
    savePlaylists(updated);
    set({ playlists: updated });
    get().fetchTasteRecommendations();
    return newPlaylist;
  },

  renamePlaylist: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = get().playlists.map((pl) => (pl.id === id ? { ...pl, name: trimmed } : pl));
    savePlaylists(updated);
    set({ playlists: updated });
  },

  deletePlaylist: (id) => {
    const updated = get().playlists.filter((p) => p.id !== id);
    savePlaylists(updated);
    set((state) => ({
      playlists: updated,
      activePlaylistId: state.activePlaylistId === id ? null : state.activePlaylistId,
      navPast: state.navPast.filter((s) => s.activePlaylistId !== id),
      navFuture: state.navFuture.filter((s) => s.activePlaylistId !== id),
    }));
  },

  addTrackToPlaylist: (playlistId, track) => {
    const updated = get().playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      if (pl.tracks.some((t) => t.id === track.id)) return pl;
      return { ...pl, tracks: [...pl.tracks, track] };
    });
    savePlaylists(updated);
    set({ playlists: updated });

    get().fetchTasteRecommendations();
  },

  removeTrackFromPlaylist: (playlistId, trackId) => {
    const updated = get().playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      return { ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) };
    });
    savePlaylists(updated);
    set({ playlists: updated });
  },

  reorderPlaylistTrack: (playlistId, fromIndex, toIndex) => {
    const pl = get().playlists.find((p) => p.id === playlistId);
    if (!pl || fromIndex < 0 || fromIndex >= pl.tracks.length || toIndex < 0 || toIndex >= pl.tracks.length) {
      return;
    }
    const tracks = [...pl.tracks];
    const [moved] = tracks.splice(fromIndex, 1);
    tracks.splice(toIndex, 0, moved);
    const updated = get().playlists.map((p) => (p.id === playlistId ? { ...p, tracks } : p));
    savePlaylists(updated);
    set({ playlists: updated });
  },

  fetchTasteRecommendations: async () => {
    const { favorites, history, playlists, currentTrack } = get();
    const seedTrack = currentTrack || favorites[0] || history[0] || playlists[0]?.tracks[0];
    if (!seedTrack) return;

    const seq = ++tasteSeq;
    set({ isLoadingTaste: true });
    try {
      const res = await fetch(`/api/radio/${encodeURIComponent(seedTrack.id)}`);
      if (seq !== tasteSeq) return;
      if (res.ok) {
        const data = await res.json();
        if (seq !== tasteSeq) return;
        const tracks: Track[] = (data.tracks || []).slice(0, 16);
        set({ tasteTracks: tracks, isLoadingTaste: false });
      } else {
        set({ isLoadingTaste: false });
      }
    } catch {
      if (seq === tasteSeq) set({ isLoadingTaste: false });
    }
  },

  fetchExploreFeed: async () => {
    if (get().hasFetchedExplore || get().isLoadingExplore) return;
    set({ isLoadingExplore: true, exploreError: false });
    try {
      const res = await fetch('/api/explore');
      if (res.ok) {
        const data = (await res.json()) as ExploreFeed;
        const hasContent = Boolean(
          data.newReleases?.length ||
            data.moods?.length ||
            data.trendingTracks?.length ||
            data.musicVideos?.length ||
            data.sections?.length
        );
        set({
          exploreFeed: data,
          exploreSections: Array.isArray(data.sections) ? data.sections : [],
          isLoadingExplore: false,
          hasFetchedExplore: hasContent,
          exploreError: !hasContent,
        });
      } else {
        set({ isLoadingExplore: false, hasFetchedExplore: false, exploreError: true });
      }
    } catch {
      set({ isLoadingExplore: false, hasFetchedExplore: false, exploreError: true });
    }
  },
}));

let lastSavedSessionBucket = -1;

usePlayerStore.subscribe((s, prev) => {
  if (s.currentTrack?.id !== prev.currentTrack?.id) {
    playSessionSeq++;
  }
  if (s.history !== prev.history) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(s.history));
    } catch {
      // Ignore storage errors
    }
  }

  const bucket = Math.floor(s.currentTime / 3);
  if (
    s.currentTrack !== prev.currentTrack ||
    s.queue !== prev.queue ||
    (s.currentTrack && bucket !== lastSavedSessionBucket)
  ) {
    lastSavedSessionBucket = bucket;
    try {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          currentTrack: s.currentTrack,
          queue: s.queue,
          currentTime: s.currentTime,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }

  if (
    s.volume === prev.volume &&
    s.isMuted === prev.isMuted &&
    s.repeatMode === prev.repeatMode &&
    s.shuffle === prev.shuffle &&
    s.autoplay === prev.autoplay &&
    s.crossfadeSeconds === prev.crossfadeSeconds &&
    s.eqPreset === prev.eqPreset &&
    s.eqBands === prev.eqBands &&
    s.loudnessNormalization === prev.loudnessNormalization
  ) {
    return;
  }
  try {
    const prefs: Prefs = {
      volume: s.volume,
      isMuted: s.isMuted,
      repeatMode: s.repeatMode,
      shuffle: s.shuffle,
      autoplay: s.autoplay,
      crossfadeSeconds: s.crossfadeSeconds,
      eqPreset: s.eqPreset,
      eqBands: s.eqBands,
      loudnessNormalization: s.loudnessNormalization,
    };
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
});
