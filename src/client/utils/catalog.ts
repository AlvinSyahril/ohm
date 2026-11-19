import { Track } from '../store/usePlayerStore';

export interface ArtistCreditToken {
  name: string;
  separatorAfter?: string;
}

export interface AlbumEntry {
  key: string;
  title: string;
  artist: string;
  kind: 'Album' | 'Single';
  tracks: Track[];
}

export interface ArtistEntry {
  name: string;
  tracks: Track[];
}

const dedupe = (tracks: Track[]): Track[] => {
  const seen = new Set<string>();
  return tracks.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
};

// Split collaboration strings while preserving separators and avoiding false splits like "Tyler, The Creator" or "Lil Nas X".
const ARTIST_SPLIT_RE =
  /(\s*(?:,(?!\s*The\b)|&|\b[Ff][Ee][Aa][Tt]\.?|\b[Ff][Tt]\.?|(?<=\s)[x×](?=\s))\s*)/;

export function splitArtistCredits(artist: string): ArtistCreditToken[] {
  const trimmed = artist.trim();
  if (!trimmed) return [];
  const rawParts = trimmed.split(ARTIST_SPLIT_RE);
  if (rawParts.length <= 1) return [{ name: trimmed }];

  const tokens: ArtistCreditToken[] = [];
  for (let i = 0; i < rawParts.length; i += 2) {
    const name = rawParts[i]?.trim();
    const sep = rawParts[i + 1];
    if (!name) continue;
    tokens.push({
      name,
      ...(sep && rawParts[i + 2]?.trim() ? { separatorAfter: sep } : {}),
    });
  }
  return tokens.length > 0 ? tokens : [{ name: trimmed }];
}

export const primaryArtist = (artist: string): string =>
  splitArtistCredits(artist)[0]?.name || artist;

/** Build dynamic "Selected cuts" for Home by interleaving live Explore, taste, and library tracks with cold-start fallback. */
export function buildHomeCuts(opts: {
  exploreTrending: Track[];
  tasteTracks: Track[];
  favorites: Track[];
  playlists: Track[];
  fallbackTracks: Track[];
  excludeIds: Set<string>;
  limit?: number;
}): Track[] {
  const limit = opts.limit ?? 9;
  const seen = new Set<string>(opts.excludeIds);
  const out: Track[] = [];

  const buckets: Track[][] = [
    opts.exploreTrending,
    opts.tasteTracks,
    [...opts.favorites, ...opts.playlists],
  ];
  const cursors = [0, 0, 0];

  while (out.length < limit) {
    let progressed = false;
    for (let b = 0; b < buckets.length && out.length < limit; b++) {
      const list = buckets[b];
      while (cursors[b] < list.length) {
        const candidate = list[cursors[b]++];
        if (!seen.has(candidate.id)) {
          seen.add(candidate.id);
          out.push(candidate);
          progressed = true;
          break;
        }
      }
    }
    if (!progressed) break;
  }

  if (out.length < limit) {
    for (const candidate of opts.fallbackTracks) {
      if (out.length >= limit) break;
      if (!seen.has(candidate.id)) {
        seen.add(candidate.id);
        out.push(candidate);
      }
    }
  }

  return out;
}

/** Build dynamic Home Artists rail prioritizing user favorites/history alongside live Explore & taste tracks. */
export function buildHomeArtists(opts: {
  favorites: Track[];
  history: Track[];
  playlists: Track[];
  exploreTrending: Track[];
  tasteTracks: Track[];
  fallbackTracks: Track[];
  limit?: number;
}): ArtistEntry[] {
  const limit = opts.limit ?? 12;
  const pool = [
    ...opts.favorites,
    ...opts.history,
    ...opts.playlists,
    ...opts.exploreTrending,
    ...opts.tasteTracks,
    ...opts.fallbackTracks,
  ];
  return buildArtists(pool).slice(0, limit);
}

/** Group tracks by album. Tracks without a real album become singles. */
export function buildAlbums(source: Track[]): AlbumEntry[] {
  const map = new Map<string, AlbumEntry>();
  for (const track of dedupe(source)) {
    const isSingle = !track.album || track.album.toLowerCase() === 'single';
    const title = isSingle ? track.title : (track.album as string);
    const key = `${isSingle ? 'single' : 'album'}:${title}:${primaryArtist(track.artist)}`;
    const existing = map.get(key);
    if (existing) {
      existing.tracks.push(track);
    } else {
      map.set(key, {
        key,
        title,
        artist: track.artist,
        kind: isSingle ? 'Single' : 'Album',
        tracks: [track],
      });
    }
  }
  return Array.from(map.values());
}

/** Group tracks by their primary artist. */
export function buildArtists(source: Track[]): ArtistEntry[] {
  const map = new Map<string, ArtistEntry>();
  for (const track of dedupe(source)) {
    const name = primaryArtist(track.artist);
    const existing = map.get(name);
    if (existing) {
      existing.tracks.push(track);
    } else {
      map.set(name, { name, tracks: [track] });
    }
  }
  return Array.from(map.values());
}

export const trackCountLabel = (n: number): string => `${n} ${n === 1 ? 'song' : 'songs'}`;
