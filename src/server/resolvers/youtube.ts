import fs from 'node:fs';
import path from 'node:path';
import { Innertube, Parser, Platform, UniversalCache, YTNodes } from 'youtubei.js';

// Register JS evaluator required by youtubei.js 18.x to decipher 'n' throttling tokens & signatures
Platform.shim.eval = async (data: { output: string }) => {
  return new Function(data.output)();
};

let ytInstance: Innertube | null = null;
let ytInitPromise: Promise<Innertube> | null = null;

type StreamClient = 'VISIONOS' | 'IOS' | 'YTMUSIC';

interface CachedStream {
  url: string;
  bitrate?: number;
  format: string;
  codec?: string;
  sampleRate?: number;
  contentLength?: number;
  clientUsed: StreamClient;
  expiresAt: number;
}

// Cache deciphered stream URLs for 20 minutes so HTTP Range seeks are instantaneous
const MAX_STREAM_CACHE = 200;
const MAX_GRAPH_CACHE = 100;
const MAX_DURATION_CACHE = 500;
const GRAPH_TTL_MS = 15 * 60 * 1000;
const SEARCH_TTL_MS = 5 * 60 * 1000;
const streamUrlCache = new Map<string, CachedStream>();
const inFlightStreamRequests = new Map<string, Promise<CachedStream>>();
const radioCache = new Map<string, { value: TrackMetadata[]; expiresAt: number }>();
const durationCache = new Map<string, { value: number; expiresAt: number }>();
interface SearchSession<T> {
  items: T[];
  seenIds: Set<string>;
  cursor: any;
  hasMore: boolean;
  expiresAt: number;
}

const searchSongCache = new Map<string, SearchSession<TrackMetadata>>();
const searchAlbumCache = new Map<string, SearchSession<ExploreReleaseCard>>();
const searchArtistCache = new Map<string, SearchSession<RelatedArtist>>();
const searchPlaylistCache = new Map<string, SearchSession<ExplorePlaylistCard>>();
const searchAllCache = new Map<string, { value: AllSearchResult; expiresAt: number }>();

function getFreshCached<T extends { expiresAt: number }>(
  cache: Map<string, T>,
  key: string,
  now: number
): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= now) {
    cache.delete(key);
    return null;
  }
  // Refresh insertion order for simple LRU eviction
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

function setBoundedCache<T>(cache: Map<string, T>, key: string, value: T, max: number) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > max) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
    else break;
  }
}

function createYoutubeCache(): UniversalCache {
  const rawDir = process.env.OHM_CACHE_DIR;
  const cacheDir = rawDir ? path.resolve(rawDir) : path.resolve('.cache');
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    return new UniversalCache(true, cacheDir);
  } catch {
    return new UniversalCache(false);
  }
}

export async function getInnertube(): Promise<Innertube> {
  if (ytInstance) return ytInstance;
  if (!ytInitPromise) {
    ytInitPromise = Innertube.create({
      cache: createYoutubeCache(),
    })
      .then((instance) => {
        ytInstance = instance;
        return instance;
      })
      .catch((err) => {
        ytInitPromise = null;
        throw err;
      });
  }
  return ytInitPromise;
}

export interface TrackMetadata {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  duration?: number;
  thumbnail?: string;
  source: 'youtube';
}

export interface ArtistRelease {
  id: string;
  title: string;
  kind: 'Album' | 'Single';
  year?: string;
  thumbnail?: string;
}

export interface RelatedArtist {
  id: string;
  name: string;
  subtitle?: string;
  thumbnail?: string;
}

export interface ArtistProfile {
  id?: string;
  name: string;
  description?: string;
  avatar?: string;
  topSongs: TrackMetadata[];
  albums: ArtistRelease[];
  singles: ArtistRelease[];
  relatedArtists: RelatedArtist[];
}

export interface AlbumDetails {
  id?: string;
  title: string;
  artist: string;
  year?: string;
  thumbnail?: string;
  tracks: TrackMetadata[];
}

export type SearchType = 'all' | 'songs' | 'albums' | 'artists' | 'playlists';

export type SearchTopResult =
  | { kind: 'song'; track: TrackMetadata; subtitle?: string }
  | { kind: 'album'; album: ExploreReleaseCard; subtitle?: string }
  | { kind: 'artist'; artist: RelatedArtist; subtitle?: string }
  | { kind: 'playlist'; playlist: ExplorePlaylistCard; subtitle?: string };

export interface AllSearchResult {
  topResult: SearchTopResult | null;
  tracks: TrackMetadata[];
  albums: ExploreReleaseCard[];
  artists: RelatedArtist[];
  playlists: ExplorePlaylistCard[];
}

export interface PaginatedItemsResult<T> {
  items: T[];
  hasMore: boolean;
  totalLoaded: number;
}

export interface PaginatedSearchResult {
  tracks: TrackMetadata[];
  hasMore: boolean;
  totalLoaded: number;
}

function parseSearchSongItem(item: any): TrackMetadata | null {
  const id = item?.id || item?.video_id || item?.endpoint?.payload?.videoId;
  if (typeof id !== 'string' || !VIDEO_ID_RE.test(id)) return null;
  const firstArtist = Array.isArray(item?.artists) ? item.artists[0] : undefined;
  const rawArtistId =
    firstArtist?.channel_id || firstArtist?.endpoint?.payload?.browseId;
  const albumId =
    item?.album?.id || item?.album?.endpoint?.payload?.browseId || undefined;
  return {
    id,
    title: readText(item?.title) || 'Unknown Title',
    artist: extractArtistNames(item?.artists, readText(item?.author?.name) || 'Unknown Artist'),
    artistId:
      typeof rawArtistId === 'string' && rawArtistId.startsWith('UC') ? rawArtistId : undefined,
    album: item?.album?.name || undefined,
    albumId: typeof albumId === 'string' ? albumId : undefined,
    duration:
      typeof item?.duration?.seconds === 'number' && item.duration.seconds > 0
        ? item.duration.seconds
        : undefined,
    thumbnail: readThumb(item, id),
    source: 'youtube',
  };
}

function parseSearchAlbumItem(item: any): ExploreReleaseCard | null {
  const id = item?.id || item?.endpoint?.payload?.browseId;
  const title =
    readText(item?.title) ||
    readText(item?.flex_columns?.[0]?.title) ||
    readText(item?.name);
  if (typeof id !== 'string' || (!id.startsWith('MPRE') && !id.startsWith('OLAK')) || !title) {
    return null;
  }
  const sub = readText(item?.flex_columns?.[1]?.title) || readText(item?.subtitle);
  const parts = sub.split('•').map((s) => s.trim()).filter(Boolean);
  const isSingle = parts.some((p) => /single|ep/i.test(p));
  const artistPart = parts.find((p) => !/^(album|single|ep)$/i.test(p) && !/^\d{4}$/.test(p));
  const artist =
    readText(item?.author?.name) ||
    extractArtistNames(item?.artists || item?.authors, artistPart || '') ||
    'Unknown Artist';
  const year = item?.year || sub.match(/\b(19|20)\d{2}\b/)?.[0];
  return {
    id,
    title,
    artist,
    kind: isSingle ? 'Single' : 'Album',
    year,
    thumbnail: readThumb(item),
  };
}

function parseSearchArtistItem(item: any): RelatedArtist | null {
  const id = item?.id || item?.endpoint?.payload?.browseId;
  const name =
    readText(item?.title) ||
    readText(item?.flex_columns?.[0]?.title) ||
    readText(item?.name);
  if (typeof id !== 'string' || !id.startsWith('UC') || !name) return null;
  const subtitle =
    readText(item?.subtitle) || readText(item?.flex_columns?.[1]?.title) || undefined;
  return {
    id,
    name,
    subtitle,
    thumbnail: readThumb(item),
  };
}

function parseSearchPlaylistItem(item: any): ExplorePlaylistCard | null {
  const id = item?.id || item?.endpoint?.payload?.browseId;
  const title =
    readText(item?.title) ||
    readText(item?.flex_columns?.[0]?.title) ||
    readText(item?.name);
  if (typeof id !== 'string' || !title || !PLAYLIST_ID_RE.test(id)) return null;
  const isPlaylist =
    item?.item_type === 'playlist' ||
    id.startsWith('VL') ||
    id.startsWith('PL') ||
    id.startsWith('RD') ||
    id.startsWith('OL');
  if (!isPlaylist) return null;
  const flexSub = readText(item?.flex_columns?.[1]?.title) || readText(item?.subtitle);
  const fallbackSub = [
    readText(item?.author?.name),
    item?.item_count ? `${item.item_count} songs` : '',
  ]
    .filter(Boolean)
    .join(' • ');
  return {
    id,
    title,
    subtitle: flexSub || fallbackSub || undefined,
    thumbnail: readThumb(item),
  };
}

function parseDurationLabel(text: string): number | undefined {
  const match = text.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  if (!match) return undefined;
  if (match[3]) {
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function parseTopResultCard(shelf: any): SearchTopResult | null {
  if (!shelf || shelf.type !== 'MusicCardShelf') return null;
  const title = readText(shelf.title);
  if (!title) return null;
  const subtitle = readText(shelf.subtitle) || undefined;
  const payload = shelf.on_tap?.payload || shelf.title?.endpoint?.payload || {};
  const thumb = readThumb(shelf, payload.videoId);

  if (typeof payload.videoId === 'string' && VIDEO_ID_RE.test(payload.videoId)) {
    const parts = (subtitle || '').split('•').map((s) => s.trim()).filter(Boolean);
    const artist =
      parts.find(
        (p) =>
          !/^(song|video|episode)$/i.test(p) &&
          !/\b(views|plays)\b/i.test(p) &&
          !/^\d{1,2}:\d{2}/.test(p)
      ) || 'Unknown Artist';
    return {
      kind: 'song',
      subtitle,
      track: {
        id: payload.videoId,
        title,
        artist,
        duration: subtitle ? parseDurationLabel(subtitle) : undefined,
        thumbnail: thumb,
        source: 'youtube',
      },
    };
  }

  const browseId = payload.browseId;
  if (typeof browseId !== 'string') return null;

  if (browseId.startsWith('UC')) {
    return {
      kind: 'artist',
      subtitle,
      artist: { id: browseId, name: title, subtitle, thumbnail: thumb },
    };
  }

  if (browseId.startsWith('MPRE') || browseId.startsWith('OLAK')) {
    const parts = (subtitle || '').split('•').map((s) => s.trim()).filter(Boolean);
    const isSingle = parts.some((p) => /single|ep/i.test(p));
    const artist =
      parts.find((p) => !/^(album|single|ep)$/i.test(p) && !/^\d{4}$/.test(p)) ||
      'Unknown Artist';
    const year = subtitle?.match(/\b(19|20)\d{2}\b/)?.[0];
    return {
      kind: 'album',
      subtitle,
      album: {
        id: browseId,
        title,
        artist,
        kind: isSingle ? 'Single' : 'Album',
        year,
        thumbnail: thumb,
      },
    };
  }

  if (PLAYLIST_ID_RE.test(browseId)) {
    return {
      kind: 'playlist',
      subtitle,
      playlist: { id: browseId, title, subtitle, thumbnail: thumb },
    };
  }

  return null;
}

function appendUniqueItems<T extends { id: string }>(
  target: T[],
  seenIds: Set<string>,
  rawItems: any[],
  parseItem: (raw: any) => T | null
) {
  for (const raw of rawItems) {
    const parsed = parseItem(raw);
    if (parsed && !seenIds.has(parsed.id)) {
      seenIds.add(parsed.id);
      target.push(parsed);
    }
  }
}

async function runPaginatedSearch<T extends { id: string }>(opts: {
  cache: Map<string, SearchSession<T>>;
  query: string;
  offset: number;
  initialPages: number;
  morePages: number;
  initSearch: (yt: Innertube, q: string) => Promise<{ items: any[]; cursor: any }>;
  extractContItems: (page: any) => any[];
  parseItem: (raw: any) => T | null;
}): Promise<PaginatedItemsResult<T>> {
  const cleanQuery = opts.query.trim();
  const cacheKey = cleanQuery.toLowerCase();
  const now = Date.now();

  let session = getFreshCached(opts.cache, cacheKey, now);
  if (!session) {
    const yt = await getInnertube();
    const items: T[] = [];
    const seenIds = new Set<string>();
    const first = await opts.initSearch(yt, cleanQuery);
    appendUniqueItems(items, seenIds, first.items, opts.parseItem);

    session = {
      items,
      seenIds,
      cursor: first.cursor,
      hasMore: Boolean(
        first.cursor?.has_continuation && typeof first.cursor?.getContinuation === 'function'
      ),
      expiresAt: now + SEARCH_TTL_MS,
    };
    setBoundedCache(opts.cache, cacheKey, session, MAX_GRAPH_CACHE);
  }

  const targetCount =
    opts.offset === 0 ? opts.initialPages * 20 : opts.offset + opts.morePages * 20;
  while (
    session.items.length < targetCount &&
    session.hasMore &&
    typeof session.cursor?.getContinuation === 'function'
  ) {
    try {
      const nextPage = await session.cursor.getContinuation();
      const pageItems = opts.extractContItems(nextPage);
      const before = session.items.length;
      appendUniqueItems(session.items, session.seenIds, pageItems, opts.parseItem);
      session.cursor = nextPage;
      session.hasMore = Boolean(
        nextPage?.has_continuation &&
          typeof nextPage?.getContinuation === 'function' &&
          session.items.length > before
      );
    } catch {
      session.hasMore = false;
      break;
    }
  }
  session.expiresAt = Date.now() + SEARCH_TTL_MS;

  return {
    items: session.items.slice(opts.offset),
    hasMore: session.hasMore,
    totalLoaded: session.items.length,
  };
}

/**
 * Paginated song search supporting YouTube Music continuations so results
 * aren't capped at the initial 20-track page.
 */
export async function searchTracksPaginated(
  query: string,
  offset = 0,
  initialPages = 3,
  morePages = 2
): Promise<PaginatedSearchResult> {
  const result = await runPaginatedSearch<TrackMetadata>({
    cache: searchSongCache,
    query,
    offset,
    initialPages,
    morePages,
    initSearch: async (yt, q) => {
      const sr = await yt.music.search(q, { type: 'song' });
      const songItems = sr?.songs?.contents || [];
      if (songItems.length > 0) {
        return { items: songItems, cursor: sr };
      }
      const general = await yt.search(q);
      return { items: general.videos || [], cursor: general };
    },
    extractContItems: (page) =>
      page?.songs?.contents || page?.contents?.contents || page?.videos || [],
    parseItem: (item) => {
      const parsed = parseSearchSongItem(item);
      if (parsed) return parsed;
      if (item && 'id' in item && typeof item.id === 'string' && VIDEO_ID_RE.test(item.id)) {
        return {
          id: item.id,
          title: item.title?.text || item.title || 'Unknown Title',
          artist: item.author?.name || 'Unknown Artist',
          duration: item.duration?.seconds,
          thumbnail: readThumb(item, item.id),
          source: 'youtube',
        };
      }
      return null;
    },
  });

  return {
    tracks: result.items,
    hasMore: result.hasMore,
    totalLoaded: result.totalLoaded,
  };
}

export async function searchAlbumsPaginated(
  query: string,
  offset = 0,
  initialPages = 1,
  morePages = 1
): Promise<PaginatedItemsResult<ExploreReleaseCard>> {
  return runPaginatedSearch<ExploreReleaseCard>({
    cache: searchAlbumCache,
    query,
    offset,
    initialPages,
    morePages,
    initSearch: async (yt, q) => {
      const sr = await yt.music.search(q, { type: 'album' });
      return { items: (sr as any)?.albums?.contents || [], cursor: sr };
    },
    extractContItems: (page) =>
      page?.albums?.contents || page?.contents?.contents || [],
    parseItem: parseSearchAlbumItem,
  });
}

export async function searchArtistsPaginated(
  query: string,
  offset = 0,
  initialPages = 1,
  morePages = 1
): Promise<PaginatedItemsResult<RelatedArtist>> {
  return runPaginatedSearch<RelatedArtist>({
    cache: searchArtistCache,
    query,
    offset,
    initialPages,
    morePages,
    initSearch: async (yt, q) => {
      const sr = await yt.music.search(q, { type: 'artist' });
      return { items: (sr as any)?.artists?.contents || [], cursor: sr };
    },
    extractContItems: (page) =>
      page?.artists?.contents || page?.contents?.contents || [],
    parseItem: parseSearchArtistItem,
  });
}

export async function searchPlaylistsPaginated(
  query: string,
  offset = 0,
  initialPages = 1,
  morePages = 1
): Promise<PaginatedItemsResult<ExplorePlaylistCard>> {
  return runPaginatedSearch<ExplorePlaylistCard>({
    cache: searchPlaylistCache,
    query,
    offset,
    initialPages,
    morePages,
    initSearch: async (yt, q) => {
      const sr = await yt.music.search(q, { type: 'playlist' });
      return { items: (sr as any)?.playlists?.contents || [], cursor: sr };
    },
    extractContItems: (page) =>
      page?.playlists?.contents || page?.contents?.contents || [],
    parseItem: parseSearchPlaylistItem,
  });
}

/**
 * Unified "All" search combining YouTube Music's Top Result card with clean,
 * categorized Songs (with full durations), Albums, Artists, and Playlists,
 * while priming each tab's cache for zero-wait tab switching.
 */
export async function searchAll(query: string): Promise<AllSearchResult> {
  const cleanQuery = query.trim();
  const cacheKey = cleanQuery.toLowerCase();
  const now = Date.now();
  const hit = getFreshCached(searchAllCache, cacheKey, now);
  if (hit) return hit.value;

  const yt = await getInnertube();
  const [rawAll, songRes, albumRes, artistRes, playlistRes] = await Promise.all([
    yt.music.search(cleanQuery).catch(() => null),
    searchTracksPaginated(cleanQuery, 0, 1, 1).catch(() => ({
      tracks: [] as TrackMetadata[],
      hasMore: false,
      totalLoaded: 0,
    })),
    searchAlbumsPaginated(cleanQuery, 0, 1, 1).catch(() => ({
      items: [] as ExploreReleaseCard[],
      hasMore: false,
      totalLoaded: 0,
    })),
    searchArtistsPaginated(cleanQuery, 0, 1, 1).catch(() => ({
      items: [] as RelatedArtist[],
      hasMore: false,
      totalLoaded: 0,
    })),
    searchPlaylistsPaginated(cleanQuery, 0, 1, 1).catch(() => ({
      items: [] as ExplorePlaylistCard[],
      hasMore: false,
      totalLoaded: 0,
    })),
  ]);

  let topResult: SearchTopResult | null = null;
  for (const shelf of ((rawAll as any)?.contents || []) as any[]) {
    if (shelf?.type === 'MusicCardShelf') {
      topResult = parseTopResultCard(shelf);
      if (topResult) break;
    }
  }

  const value: AllSearchResult = {
    topResult,
    tracks: songRes.tracks,
    albums: albumRes.items,
    artists: artistRes.items,
    playlists: playlistRes.items,
  };

  setBoundedCache(
    searchAllCache,
    cacheKey,
    { value, expiresAt: Date.now() + SEARCH_TTL_MS },
    MAX_GRAPH_CACHE
  );
  return value;
}

export async function searchTracks(query: string, maxPages = 3): Promise<TrackMetadata[]> {
  const { tracks } = await searchTracksPaginated(query, 0, maxPages, maxPages);
  return tracks;
}

/**
 * Smart Search Suggestions from YouTube Music internal API
 */
export async function getSearchSuggestions(query: string): Promise<string[]> {
  if (!query || query.trim().length === 0) return [];
  const yt = await getInnertube();
  try {
    const suggestions = await yt.music.getSearchSuggestions(query.trim());
    const results: string[] = [];
    for (const section of suggestions || []) {
      for (const item of (section as any).contents || []) {
        const text =
          item.suggestion?.text ||
          item.title?.text ||
          item.query ||
          (typeof item.title === 'string' ? item.title : null);
        if (text && !results.includes(text)) {
          results.push(text);
        }
      }
    }
    return results.slice(0, 8);
  } catch (err) {
    console.warn('Failed to fetch search suggestions:', err);
    return [];
  }
}

/**
 * Smart Radio & Up Next Engine from YouTube Music recommendation model
 */
export async function getRadioTracks(videoId: string): Promise<TrackMetadata[]> {
  const now = Date.now();
  const hit = getFreshCached(radioCache, videoId, now);
  if (hit) return hit.value;

  const yt = await getInnertube();
  const upNext = await yt.music.getUpNext(videoId);
  const tracks: TrackMetadata[] = [];

  for (const item of (upNext as any).contents || []) {
    const vId = item.video_id || item.endpoint?.payload?.videoId;
    if (vId && !tracks.some((t) => t.id === vId)) {
      const rawArtistId =
        item.artists?.[0]?.channel_id || item.artists?.[0]?.endpoint?.payload?.browseId;
      const albumId = item.album?.id || item.album?.endpoint?.payload?.browseId || undefined;
      tracks.push({
        id: vId,
        title: item.title?.text || (typeof item.title === 'string' ? item.title : 'Unknown Track'),
        artist: extractArtistNames(item.artists, item.author?.name || 'Unknown Artist'),
        artistId:
          typeof rawArtistId === 'string' && rawArtistId.startsWith('UC') ? rawArtistId : undefined,
        album: item.album?.name,
        albumId: typeof albumId === 'string' ? albumId : undefined,
        duration: item.duration?.seconds,
        thumbnail: readThumb(item, vId),
        source: 'youtube',
      });
    }
  }

  if (tracks.length > 0) {
    setBoundedCache(radioCache, videoId, { value: tracks, expiresAt: now + GRAPH_TTL_MS }, MAX_GRAPH_CACHE);
  }
  return tracks;
}

/**
 * Live Explore Feed from YouTube Music
 */
export const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

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

export interface ExploreFeed {
  quickLinks: ExploreQuickLink[];
  newReleases: ExploreReleaseCard[];
  moods: ExploreMoodItem[];
  trendingTracks: TrackMetadata[];
  musicVideos: TrackMetadata[];
  sections: { title: string; tracks: TrackMetadata[] }[];
}

export interface ExploreCategoryData {
  title: string;
  browseId: string;
  params?: string;
  playlistShelves: { heading: string; items: ExplorePlaylistCard[] }[];
  releases: ExploreReleaseCard[];
  tracks: TrackMetadata[];
  artists: RelatedArtist[];
  moodGroups: { heading: string; items: ExploreMoodItem[] }[];
}

export interface PlaylistDetails {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  tracks: TrackMetadata[];
}

const EXPLORE_BROWSE_RE = /^FEmusic_[a-zA-Z0-9_]+$/;
export const PLAYLIST_ID_RE = /^[A-Za-z0-9_-]{6,100}$/;

const parseExploreRelease = (item: any): ExploreReleaseCard | null => {
  const browseId = item?.id || item?.endpoint?.payload?.browseId;
  const title = readText(item?.title) || readText(item?.name);
  if (typeof browseId !== 'string' || !browseId.startsWith('MPRE') || !title) return null;

  const sub = readText(item?.subtitle);
  const parts = sub.split('•').map((s) => s.trim()).filter(Boolean);
  const isSingle = parts.some((p) => /single|ep/i.test(p));
  const artistPart = parts.find((p) => !/^(album|single|ep)$/i.test(p) && !/^\d{4}$/.test(p));
  const artist =
    extractArtistNames(item?.artists || item?.authors, artistPart || '') || 'Unknown Artist';
  const year = item?.year || sub.match(/\b(19|20)\d{2}\b/)?.[0];

  return {
    id: browseId,
    title,
    artist,
    kind: isSingle ? 'Single' : 'Album',
    year,
    thumbnail: readThumb(item),
  };
};

const parseExploreTrack = (item: any, fallbackArtist?: string): TrackMetadata | null => {
  const vId = item?.id || item?.video_id || item?.endpoint?.payload?.videoId;
  if (typeof vId !== 'string' || !VIDEO_ID_RE.test(vId)) return null;

  const title =
    readText(item?.title) ||
    readText(item?.flex_columns?.[0]?.title) ||
    readText(item?.name) ||
    'Untitled';

  const sub = readText(item?.subtitle);
  const subtitleFirst = sub ? sub.split('•')[0].trim() : '';
  const flexRaw = readText(item?.flex_columns?.[1]?.title);
  const flexArtist = flexRaw ? flexRaw.split('•')[0].trim() : '';
  const firstAuthor = Array.isArray(item?.authors) ? item.authors[0] : undefined;
  const firstArtist = Array.isArray(item?.artists) ? item.artists[0] : undefined;
  const artist = extractArtistNames(
    item?.artists?.length ? item.artists : item?.authors,
    subtitleFirst || flexArtist || fallbackArtist
  );
  const artistId =
    firstArtist?.channel_id ||
    firstAuthor?.channel_id ||
    firstArtist?.endpoint?.payload?.browseId ||
    firstAuthor?.endpoint?.payload?.browseId;

  return {
    id: vId,
    title,
    artist,
    artistId: typeof artistId === 'string' && artistId.startsWith('UC') ? artistId : undefined,
    album: item?.album?.name || readText(item?.flex_columns?.[2]?.title) || undefined,
    albumId: item?.album?.id || item?.album?.endpoint?.payload?.browseId,
    duration: item?.duration?.seconds,
    thumbnail: readThumb(item, vId),
    source: 'youtube',
  };
};

const parseExplorePlaylist = (item: any): ExplorePlaylistCard | null => {
  const rawId = item?.id || item?.endpoint?.payload?.browseId;
  const title = readText(item?.title) || readText(item?.name);
  if (typeof rawId !== 'string' || !title) return null;
  const isPlaylist =
    item?.item_type === 'playlist' ||
    rawId.startsWith('VL') ||
    rawId.startsWith('PL') ||
    rawId.startsWith('RD') ||
    rawId.startsWith('OL');
  if (!isPlaylist) return null;

  return {
    id: rawId,
    title,
    subtitle: readText(item?.subtitle) || undefined,
    thumbnail: readThumb(item),
  };
};

const parseExploreMood = (item: any): ExploreMoodItem | null => {
  const title = readText(item?.button_text) || readText(item?.title);
  const browseId = item?.endpoint?.payload?.browseId;
  const params = item?.endpoint?.payload?.params;
  if (!title || typeof browseId !== 'string' || !EXPLORE_BROWSE_RE.test(browseId)) return null;
  return { title, browseId, params: typeof params === 'string' ? params : undefined };
};

const parseExploreArtist = (item: any): RelatedArtist | null => {
  const id = item?.id || item?.endpoint?.payload?.browseId;
  const name =
    readText(item?.title) ||
    readText(item?.flex_columns?.[0]?.title) ||
    readText(item?.name);
  if (typeof id !== 'string' || !id.startsWith('UC') || !name) return null;
  return {
    id,
    name,
    subtitle: readText(item?.subtitle) || undefined,
    thumbnail: readThumb(item),
  };
};

let exploreFeedCache: { value: ExploreFeed; expiresAt: number } | null = null;
const categoryCache = new Map<string, { value: ExploreCategoryData; expiresAt: number }>();
const playlistCache = new Map<string, { value: PlaylistDetails; expiresAt: number }>();

/**
 * Populate missing track durations via cached `yt.getBasicInfo` lookups with
 * bounded concurrency so Explore / Category track rows show real lengths instead of 0:00.
 */
async function enrichMissingDurations(
  tracks: TrackMetadata[],
  maxLookups = 25
): Promise<void> {
  const now = Date.now();
  const missing: TrackMetadata[] = [];
  for (const t of tracks) {
    if (typeof t.duration === 'number' && t.duration > 0) {
      setBoundedCache(
        durationCache,
        t.id,
        { value: t.duration, expiresAt: now + GRAPH_TTL_MS },
        MAX_DURATION_CACHE
      );
      continue;
    }
    const cached = getFreshCached(durationCache, t.id, now);
    if (cached) {
      t.duration = cached.value;
    } else if (missing.length < maxLookups) {
      missing.push(t);
    }
  }
  if (missing.length === 0) return;

  const yt = await getInnertube();
  const CONCURRENCY = 6;
  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const batch = missing.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (track) => {
        try {
          const info = await yt.getBasicInfo(track.id);
          const sec = Number((info as any)?.basic_info?.duration);
          if (Number.isFinite(sec) && sec > 0) {
            track.duration = sec;
            setBoundedCache(
              durationCache,
              track.id,
              { value: sec, expiresAt: Date.now() + GRAPH_TTL_MS },
              MAX_DURATION_CACHE
            );
          }
        } catch {
          // Leave duration undefined if upstream metadata lookup fails
        }
      })
    );
  }
}

/**
 * Live Explore Feed from YouTube Music (`FEmusic_explore`): quick links,
 * new albums & singles, moods & genres, trending tracks, and music videos.
 */
export async function getExploreFeed(): Promise<ExploreFeed> {
  const now = Date.now();
  if (exploreFeedCache && exploreFeedCache.expiresAt > now) {
    return exploreFeedCache.value;
  }

  const yt = await getInnertube();
  try {
    const explore = await yt.music.getExplore();
    const quickLinks: ExploreQuickLink[] = [];
    const newReleases: ExploreReleaseCard[] = [];
    const moods: ExploreMoodItem[] = [];
    const trendingTracks: TrackMetadata[] = [];
    const musicVideos: TrackMetadata[] = [];
    const sections: { title: string; tracks: TrackMetadata[] }[] = [];
    const sectionPlaylistIds: string[] = [];

    for (const btn of (explore as any).top_buttons || []) {
      const link = parseExploreMood(btn);
      if (link) quickLinks.push(link);
    }

    for (const sec of (explore as any).sections || []) {
      const sectionTitle = readText(sec.header?.title || sec.title) || 'Trending';
      const secTracks: TrackMetadata[] = [];
      const headerPlId =
        sec.header?.more_content?.endpoint?.payload?.browseId ||
        sec.header?.title?.endpoint?.payload?.browseId;
      if (
        typeof headerPlId === 'string' &&
        (headerPlId.startsWith('VL') ||
          headerPlId.startsWith('PL') ||
          headerPlId.startsWith('OL') ||
          headerPlId.startsWith('RD')) &&
        PLAYLIST_ID_RE.test(headerPlId)
      ) {
        sectionPlaylistIds.push(headerPlId);
      }

      for (const item of sec.contents || []) {
        const mood = parseExploreMood(item);
        if (mood) {
          if (!moods.some((m) => m.title === mood.title && m.params === mood.params)) {
            moods.push(mood);
          }
          continue;
        }

        const rel = parseExploreRelease(item);
        if (rel) {
          if (!newReleases.some((r) => r.id === rel.id)) newReleases.push(rel);
          continue;
        }

        const track = parseExploreTrack(item);
        if (track) {
          if (!secTracks.some((t) => t.id === track.id)) secTracks.push(track);
          if (/video/i.test(sectionTitle)) {
            if (!musicVideos.some((t) => t.id === track.id)) musicVideos.push(track);
          } else if (!trendingTracks.some((t) => t.id === track.id)) {
            trendingTracks.push(track);
          }
        }
      }

      if (secTracks.length > 0) {
        sections.push({ title: sectionTitle, tracks: secTracks });
      }
    }

    // Trending shelf on FEmusic_explore omits track durations; its header links to a VL playlist that includes them.
    if (sectionPlaylistIds.length > 0) {
      const playlists = await Promise.all(
        sectionPlaylistIds.map((plId) => getPlaylistDetails(plId).catch(() => null))
      );
      const richById = new Map<string, TrackMetadata>();
      for (const pl of playlists) {
        if (!pl) continue;
        for (const t of pl.tracks) {
          if (!richById.has(t.id)) richById.set(t.id, t);
        }
      }
      const mergeMeta = (t: TrackMetadata) => {
        const rich = richById.get(t.id);
        if (!rich) return;
        if (!t.duration && rich.duration) t.duration = rich.duration;
        if (!t.album && rich.album) t.album = rich.album;
        if (!t.albumId && rich.albumId) t.albumId = rich.albumId;
        if (!t.artistId && rich.artistId) t.artistId = rich.artistId;
      };
      trendingTracks.forEach(mergeMeta);
      musicVideos.forEach(mergeMeta);
      sections.forEach((s) => s.tracks.forEach(mergeMeta));
    }

    // Fill any remaining missing durations for Trending and New Music Videos
    await enrichMissingDurations([...trendingTracks, ...musicVideos], 30);
    const durById = new Map<string, number>();
    for (const t of [...trendingTracks, ...musicVideos]) {
      if (t.duration && t.duration > 0) durById.set(t.id, t.duration);
    }
    for (const s of sections) {
      for (const t of s.tracks) {
        if (!t.duration) {
          const d = durById.get(t.id);
          if (d) t.duration = d;
        }
      }
    }

    const feed: ExploreFeed = {
      quickLinks,
      newReleases,
      moods,
      trendingTracks,
      musicVideos,
      sections,
    };

    if (
      newReleases.length > 0 ||
      moods.length > 0 ||
      trendingTracks.length > 0 ||
      musicVideos.length > 0
    ) {
      exploreFeedCache = { value: feed, expiresAt: now + GRAPH_TTL_MS };
    }
    return feed;
  } catch (err) {
    console.warn('Failed to fetch explore feed:', err);
    return {
      quickLinks: [],
      newReleases: [],
      moods: [],
      trendingTracks: [],
      musicVideos: [],
      sections: [],
    };
  }
}

/** Browse a YouTube Music Explore subpage (New releases, Charts, Moods & genres, or a Mood category). */
export async function getExploreCategory(opts: {
  browseId: string;
  params?: string;
  title?: string;
}): Promise<ExploreCategoryData> {
  const cleanBrowseId = opts.browseId.trim();
  if (!EXPLORE_BROWSE_RE.test(cleanBrowseId)) {
    throw new Error('Invalid explore browseId');
  }
  const cleanParams = opts.params?.trim() || undefined;
  const cacheKey = `${cleanBrowseId}::${cleanParams || ''}`;
  const now = Date.now();
  const hit = getFreshCached(categoryCache, cacheKey, now);
  if (hit) return hit.value;

  const yt = await getInnertube();
  const raw = await yt.actions.execute('/browse', {
    browseId: cleanBrowseId,
    ...(cleanParams ? { params: cleanParams } : {}),
    client: 'YTMUSIC',
  });
  const page = Parser.parseResponse((raw as any).data);
  const headerTitle =
    readText((page.header as any)?.title) || opts.title?.trim() || 'Explore';
  const sectionList = page.contents_memo?.getType(YTNodes.SectionList)?.[0];

  const playlistShelves: { heading: string; items: ExplorePlaylistCard[] }[] = [];
  const releases: ExploreReleaseCard[] = [];
  const tracks: TrackMetadata[] = [];
  const artists: RelatedArtist[] = [];
  const moodGroups: { heading: string; items: ExploreMoodItem[] }[] = [];

  for (const sec of (sectionList?.contents || []) as any[]) {
    const heading = readText(sec.header?.title || sec.title) || 'Featured';
    const items = (Array.isArray(sec.contents) ? sec.contents : Array.isArray(sec.items) ? sec.items : []) as any[];

    const shelfPlaylists: ExplorePlaylistCard[] = [];
    const shelfMoods: ExploreMoodItem[] = [];

    for (const item of items) {
      const mood = parseExploreMood(item);
      if (mood) {
        shelfMoods.push(mood);
        continue;
      }
      const pl = parseExplorePlaylist(item);
      if (pl) {
        shelfPlaylists.push(pl);
        continue;
      }
      const rel = parseExploreRelease(item);
      if (rel) {
        if (!releases.some((r) => r.id === rel.id)) releases.push(rel);
        continue;
      }
      const art = parseExploreArtist(item);
      if (art) {
        if (!artists.some((a) => a.id === art.id)) artists.push(art);
        continue;
      }
      const tr = parseExploreTrack(item);
      if (tr && !tracks.some((t) => t.id === tr.id)) {
        tracks.push(tr);
      }
    }

    if (shelfMoods.length > 0) moodGroups.push({ heading, items: shelfMoods });
    if (shelfPlaylists.length > 0) playlistShelves.push({ heading, items: shelfPlaylists });
  }

  await enrichMissingDurations(tracks, 25);

  const data: ExploreCategoryData = {
    title: headerTitle,
    browseId: cleanBrowseId,
    params: cleanParams,
    playlistShelves,
    releases,
    tracks,
    artists,
    moodGroups,
  };

  setBoundedCache(
    categoryCache,
    cacheKey,
    { value: data, expiresAt: now + GRAPH_TTL_MS },
    MAX_GRAPH_CACHE
  );
  return data;
}

/** Resolve a YouTube Music playlist (`VL...` / `PL...` / `RD...`) into a full playable tracklist. */
export async function getPlaylistDetails(id: string): Promise<PlaylistDetails> {
  const cleanId = id.trim();
  if (!PLAYLIST_ID_RE.test(cleanId)) {
    throw new Error('Invalid playlist id');
  }
  const normalizedId = cleanId.startsWith('VL') ? cleanId : `VL${cleanId}`;
  const now = Date.now();
  const hit = getFreshCached(playlistCache, normalizedId, now);
  if (hit) return hit.value;

  const yt = await getInnertube();
  const pl = await yt.music.getPlaylist(normalizedId);
  const header = (pl as any).header || {};
  const title = readText(header.title) || 'Playlist';
  const subtitle = readText(header.subtitle) || undefined;
  const headerThumb = readThumb(header);

  const tracks: TrackMetadata[] = [];
  for (const item of ((pl as any).items || []) as any[]) {
    const tr = parseExploreTrack(item);
    if (tr && !tracks.some((t) => t.id === tr.id)) {
      tracks.push(tr);
    }
  }

  const details: PlaylistDetails = {
    id: normalizedId,
    title,
    subtitle,
    thumbnail: headerThumb || tracks[0]?.thumbnail,
    tracks,
  };

  setBoundedCache(
    playlistCache,
    normalizedId,
    { value: details, expiresAt: now + GRAPH_TTL_MS },
    MAX_GRAPH_CACHE
  );
  return details;
}

function parseAudioCodec(mimeType?: string): string | undefined {
  if (!mimeType) return undefined;
  const lower = mimeType.toLowerCase();
  if (lower.includes('opus')) return 'opus';
  if (lower.includes('mp4a') || lower.includes('aac')) return 'aac';
  if (lower.includes('flac')) return 'flac';
  if (lower.includes('vorbis')) return 'vorbis';
  return undefined;
}

function pickBestAudioFormat(info: Awaited<ReturnType<Innertube['getBasicInfo']>>) {
  const adaptive = info.streaming_data?.adaptive_formats ?? [];
  const audioOnly = adaptive.filter(
    (fmt) => fmt.has_audio && !fmt.has_video && typeof fmt.bitrate === 'number' && fmt.bitrate > 0
  );

  if (audioOnly.length > 0) {
    // Prefer Opus (~130-160 kbps VBR) over 128 kbps AAC-LC for cleaner transients & stereo imaging
    const scoreFormat = (fmt: (typeof audioOnly)[number]) => {
      const bitrate = fmt.bitrate ?? 0;
      const mime = (fmt.mime_type || '').toLowerCase();
      const isOpus = mime.includes('opus') || fmt.itag === 251 || fmt.itag === 774;
      return isOpus ? bitrate * 1.25 : bitrate;
    };

    audioOnly.sort((a, b) => scoreFormat(b) - scoreFormat(a));
    return audioOnly[0];
  }

  return info.chooseFormat({
    type: 'audio',
    quality: 'best',
  });
}

export async function getStreamUrl(
  videoId: string,
  forceRefresh = false
): Promise<CachedStream> {
  const now = Date.now();
  if (!forceRefresh) {
    const cached = getFreshCached(streamUrlCache, videoId, now);
    if (cached) {
      return cached;
    }
    const inflight = inFlightStreamRequests.get(videoId);
    if (inflight) {
      return inflight;
    }
  }

  const resolvePromise = (async (): Promise<CachedStream> => {
    const yt = await getInnertube();
    const clientsToTry: StreamClient[] = ['VISIONOS', 'IOS', 'YTMUSIC'];
    let lastError: Error | null = null;

    for (const client of clientsToTry) {
      try {
        const info = await yt.getBasicInfo(videoId, { client });
        const audioFormat = pickBestAudioFormat(info);

        if (!audioFormat) continue;

        const decipheredUrl = await audioFormat.decipher(yt.session.player);
        if (!decipheredUrl) continue;

        const resolved: CachedStream = {
          url: decipheredUrl,
          bitrate: audioFormat.bitrate,
          format: audioFormat.mime_type?.split(';')[0] || 'audio/mp4',
          codec: parseAudioCodec(audioFormat.mime_type),
          sampleRate:
            typeof audioFormat.audio_sample_rate === 'number' && audioFormat.audio_sample_rate > 0
              ? audioFormat.audio_sample_rate
              : undefined,
          contentLength: audioFormat.content_length,
          clientUsed: client,
          expiresAt: Date.now() + 20 * 60 * 1000,
        };

        setBoundedCache(streamUrlCache, videoId, resolved, MAX_STREAM_CACHE);
        return resolved;
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('No compatible audio stream found for this track');
  })();

  if (!forceRefresh) {
    inFlightStreamRequests.set(videoId, resolvePromise);
    resolvePromise.finally(() => {
      if (inFlightStreamRequests.get(videoId) === resolvePromise) {
        inFlightStreamRequests.delete(videoId);
      }
    });
  }

  return resolvePromise;
}

export async function getAudioStream(
  videoId: string,
  range?: { start?: number; end?: number }
) {
  const attemptFetch = async (forceRefresh: boolean) => {
    const streamInfo = await getStreamUrl(videoId, forceRefresh);

    const headers: Record<string, string> = {
      'User-Agent':
        streamInfo.clientUsed === 'VISIONOS'
          ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15'
          : streamInfo.clientUsed === 'IOS'
          ? 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    };

    if (range && range.start !== undefined && !isNaN(range.start)) {
      headers['Range'] = `bytes=${range.start}-${
        range.end !== undefined && !isNaN(range.end) ? range.end : ''
      }`;
    } else {
      headers['Range'] = 'bytes=0-';
    }

    const response = await fetch(streamInfo.url, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    return { response, streamInfo };
  };

  let { response } = await attemptFetch(false);

  if (!response.ok && response.status !== 206) {
    const retry = await attemptFetch(true);
    response = retry.response;
  }

  if (!response.ok && response.status !== 206) {
    throw new Error(
      `Failed to fetch audio stream from upstream: ${response.status} ${response.statusText}`
    );
  }

  return {
    body: response.body,
    status: response.status,
    headers: response.headers,
  };
}

/** Plain lyrics fallback from YouTube Music for a track videoId. */
export async function getPlainLyrics(videoId: string): Promise<string | null> {
  if (!videoId) return null;
  try {
    const yt = await getInnertube();
    const res = await yt.music.getLyrics(videoId);
    const text = (res as any)?.description?.text;
    return typeof text === 'string' && text.trim().length > 0 ? text.trim() : null;
  } catch {
    return null;
  }
}

const artistCache = new Map<string, { value: ArtistProfile; expiresAt: number }>();
const albumCache = new Map<string, { value: AlbumDetails; expiresAt: number }>();

const readText = (val: unknown): string => {
  if (typeof val === 'string') return val.trim();
  if (val && typeof val === 'object' && 'text' in val && typeof (val as any).text === 'string') {
    return (val as any).text.trim();
  }
  return '';
};

const pickLargestThumbUrl = (list: unknown): string | undefined => {
  if (!Array.isArray(list) || list.length === 0) return undefined;
  let bestUrl: string | undefined;
  let bestArea = -1;
  for (const entry of list) {
    const u = (entry as any)?.url;
    if (typeof u !== 'string' || u.length === 0) continue;
    const w = Number((entry as any)?.width) || 0;
    const h = Number((entry as any)?.height) || 0;
    const area = w > 0 && h > 0 ? w * h : w;
    if (area >= bestArea) {
      bestArea = area;
      bestUrl = u;
    }
  }
  if (!bestUrl) return undefined;
  if (/=w\d+-h\d+/.test(bestUrl)) {
    return bestUrl.replace(/=w\d+-h\d+/, '=w1200-h1200');
  }
  if (/=s\d+/.test(bestUrl)) {
    return bestUrl.replace(/=s\d+/, '=s1200');
  }
  return bestUrl;
};

const readThumb = (obj: any, fallbackVideoId?: string): string | undefined => {
  const url =
    pickLargestThumbUrl(obj?.thumbnail?.contents) ||
    pickLargestThumbUrl(obj?.thumbnails) ||
    pickLargestThumbUrl(obj?.thumbnail);
  if (url) return url;
  return fallbackVideoId ? `https://i.ytimg.com/vi/${fallbackVideoId}/hqdefault.jpg` : undefined;
};

const extractArtistNames = (artistsVal: any, fallback?: string): string => {
  if (typeof artistsVal === 'string' && artistsVal.trim()) return artistsVal.trim();
  if (Array.isArray(artistsVal) && artistsVal.length > 0) {
    const names = artistsVal
      .map((a) => (typeof a === 'string' ? a : a?.name))
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
    if (names.length > 0) return names.join(', ');
  }
  return fallback || 'Unknown Artist';
};

/** Resolve full artist profile, top songs, albums/singles, and related artists. */
export async function getArtistProfile(opts: {
  id?: string;
  name?: string;
}): Promise<ArtistProfile> {
  const cleanId = opts.id?.trim() || undefined;
  const cleanName = opts.name?.trim() || '';
  const cacheKey = cleanId ? `id:${cleanId}` : `name:${cleanName.toLowerCase()}`;

  const now = Date.now();
  const hit = cacheKey ? getFreshCached(artistCache, cacheKey, now) : null;
  if (hit) {
    return hit.value;
  }

  const yt = await getInnertube();
  let channelId = cleanId;

  if (!channelId && cleanName) {
    try {
      const sr = await yt.music.search(cleanName, { type: 'artist' });
      const first = (sr as any)?.artists?.contents?.[0];
      channelId = first?.id || first?.endpoint?.payload?.browseId;
    } catch {
      // Fall back to search tracks below
    }
  }

  if (channelId) {
    try {
      const artist = await yt.music.getArtist(channelId);
      const resolvedName = readText((artist.header as any)?.title) || cleanName || 'Artist';
      const description = readText((artist.header as any)?.description) || undefined;
      let avatar = readThumb(artist.header);

      const topSongs: TrackMetadata[] = [];
      const albums: ArtistRelease[] = [];
      const singles: ArtistRelease[] = [];
      const relatedArtists: RelatedArtist[] = [];

      for (const sec of ((artist as any).sections || []) as any[]) {
        const secTitle = readText(sec.header?.title || sec.title).toLowerCase();
        const contents = Array.isArray(sec.contents) ? sec.contents : [];

        for (const item of contents) {
          const itemType = item?.item_type;
          if (itemType === 'song' && topSongs.length < 15) {
            const vId = item.id || item.endpoint?.payload?.videoId;
            if (typeof vId === 'string' && VIDEO_ID_RE.test(vId) && !topSongs.some((t) => t.id === vId)) {
              const songThumb = readThumb(item, vId);
              if (!avatar) avatar = songThumb;
              topSongs.push({
                id: vId,
                title: readText(item.title) || 'Untitled',
                artist: extractArtistNames(item.artists, resolvedName),
                artistId: channelId,
                album: item.album?.name,
                albumId: item.album?.id,
                duration: item.duration?.seconds,
                thumbnail: songThumb,
                source: 'youtube',
              });
            }
          } else if (itemType === 'album') {
            const browseId = item.id || item.endpoint?.payload?.browseId;
            const releaseTitle = readText(item.title);
            if (!browseId || !releaseTitle) continue;
            const isSingle = secTitle.includes('single') || readText(item.subtitle).toLowerCase().includes('single');
            const release: ArtistRelease = {
              id: browseId,
              title: releaseTitle,
              kind: isSingle ? 'Single' : 'Album',
              year: item.year || readText(item.subtitle).match(/\b(19|20)\d{2}\b/)?.[0],
              thumbnail: readThumb(item),
            };
            const target = isSingle ? singles : albums;
            if (!target.some((r) => r.id === release.id)) {
              target.push(release);
            }
          } else if (itemType === 'artist' && relatedArtists.length < 10) {
            const relId = item.id || item.endpoint?.payload?.browseId;
            const relName = readText(item.title) || readText(item.name);
            if (relId && relName && !relatedArtists.some((r) => r.id === relId)) {
              relatedArtists.push({
                id: relId,
                name: relName,
                subtitle: readText(item.subtitle) || undefined,
                thumbnail: readThumb(item),
              });
            }
          }
        }
      }

      if (topSongs.length > 0 || albums.length > 0 || singles.length > 0) {
        const profile: ArtistProfile = {
          id: channelId,
          name: resolvedName,
          description,
          avatar: avatar || topSongs[0]?.thumbnail || albums[0]?.thumbnail,
          topSongs,
          albums: albums.slice(0, 12),
          singles: singles.slice(0, 12),
          relatedArtists,
        };
        if (cacheKey) {
          setBoundedCache(artistCache, cacheKey, { value: profile, expiresAt: now + GRAPH_TTL_MS }, MAX_GRAPH_CACHE);
        }
        if (channelId) {
          setBoundedCache(artistCache, `id:${channelId}`, { value: profile, expiresAt: now + GRAPH_TTL_MS }, MAX_GRAPH_CACHE);
        }
        return profile;
      }
    } catch (err) {
      console.warn('getArtist fallback triggered:', err);
    }
  }

  // Graceful fallback to filtered song search when Innertube artist browse is unavailable
  const fallbackTracks = cleanName ? await searchTracks(cleanName, 1) : [];
  const profile: ArtistProfile = {
    id: channelId,
    name: cleanName || 'Artist',
    avatar: fallbackTracks[0]?.thumbnail,
    topSongs: fallbackTracks.slice(0, 15),
    albums: [],
    singles: [],
    relatedArtists: [],
  };
  if (cacheKey && profile.topSongs.length > 0) {
    setBoundedCache(artistCache, cacheKey, { value: profile, expiresAt: now + GRAPH_TTL_MS }, MAX_GRAPH_CACHE);
  }
  return profile;
}

/** Resolve ordered album tracklist and metadata by browseId or title+artist lookup. */
export async function getAlbumDetails(opts: {
  id?: string;
  title?: string;
  artist?: string;
}): Promise<AlbumDetails> {
  const cleanId = opts.id?.trim() || undefined;
  const cleanTitle = opts.title?.trim() || '';
  const cleanArtist = opts.artist?.trim() || '';
  const cacheKey = cleanId
    ? `id:${cleanId}`
    : cleanArtist || cleanTitle
    ? `query:${cleanArtist.toLowerCase()}::${cleanTitle.toLowerCase()}`
    : '';

  const now = Date.now();
  const hit = cacheKey ? getFreshCached(albumCache, cacheKey, now) : null;
  if (hit) {
    return hit.value;
  }

  const yt = await getInnertube();
  let browseId = cleanId;

  if (!browseId && (cleanTitle || cleanArtist)) {
    try {
      const q = `${cleanArtist} ${cleanTitle}`.trim();
      const sr = await yt.music.search(q, { type: 'album' });
      const first = (sr as any)?.albums?.contents?.[0];
      browseId = first?.id || first?.endpoint?.payload?.browseId;
    } catch {
      // Fall back to song search below
    }
  }

  if (browseId) {
    try {
      const album = await yt.music.getAlbum(browseId);
      const header = (album as any).header || {};
      const resolvedTitle = readText(header.title) || cleanTitle || 'Album';
      const subText = readText(header.subtitle);
      const year = subText.match(/\b(19|20)\d{2}\b/)?.[0];
      const albumThumb = readThumb(header);

      const firstFlexArtist = readText(
        (album as any).contents?.[0]?.flex_columns?.[1]?.title
      );
      const resolvedArtist =
        readText(header.author) ||
        readText(header.strapline_text_one) ||
        cleanArtist ||
        firstFlexArtist ||
        'Unknown Artist';

      const tracks: TrackMetadata[] = [];
      for (const item of ((album as any).contents || []) as any[]) {
        const vId = item?.id || item?.endpoint?.payload?.videoId;
        if (typeof vId !== 'string' || !VIDEO_ID_RE.test(vId) || tracks.some((t) => t.id === vId)) {
          continue;
        }
        const itemArtist = extractArtistNames(item.artists, resolvedArtist);
        tracks.push({
          id: vId,
          title: readText(item.title) || 'Untitled',
          artist: itemArtist,
          album: resolvedTitle,
          albumId: browseId,
          duration: item.duration?.seconds,
          thumbnail: readThumb(item) || albumThumb || `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
          source: 'youtube',
        });
      }

      if (tracks.length > 0) {
        const details: AlbumDetails = {
          id: browseId,
          title: resolvedTitle,
          artist: resolvedArtist,
          year,
          thumbnail: albumThumb || tracks[0]?.thumbnail,
          tracks,
        };
        if (cacheKey) {
          setBoundedCache(albumCache, cacheKey, { value: details, expiresAt: now + GRAPH_TTL_MS }, MAX_GRAPH_CACHE);
        }
        setBoundedCache(albumCache, `id:${browseId}`, { value: details, expiresAt: now + GRAPH_TTL_MS }, MAX_GRAPH_CACHE);
        return details;
      }
    } catch (err) {
      console.warn('getAlbum fallback triggered:', err);
    }
  }

  const q = `${cleanArtist} ${cleanTitle}`.trim();
  const fallbackTracks = q ? await searchTracks(q, 1) : [];
  const details: AlbumDetails = {
    id: browseId,
    title: cleanTitle || 'Album',
    artist: cleanArtist || fallbackTracks[0]?.artist || 'Unknown Artist',
    thumbnail: fallbackTracks[0]?.thumbnail,
    tracks: fallbackTracks.slice(0, 15),
  };
  if (cacheKey && details.tracks.length > 0) {
    setBoundedCache(albumCache, cacheKey, { value: details, expiresAt: now + GRAPH_TTL_MS }, MAX_GRAPH_CACHE);
  }
  return details;
}
