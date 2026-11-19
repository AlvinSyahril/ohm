import { getPlainLyrics } from './youtube.js';

export interface LyricLine {
  timeMs?: number;
  text: string;
}

export interface LyricsResult {
  kind: 'synced' | 'plain' | 'instrumental' | 'none';
  source: 'lrclib' | 'youtube' | 'none';
  lines: LyricLine[];
}

interface LrcLibRecord {
  trackName?: string;
  artistName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

const CACHE_LIMIT = 200;
const lyricsCache = new Map<string, LyricsResult>();

const setCached = (key: string, value: LyricsResult) => {
  if (lyricsCache.has(key)) lyricsCache.delete(key);
  else if (lyricsCache.size >= CACHE_LIMIT) {
    const oldest = lyricsCache.keys().next().value;
    if (oldest) lyricsCache.delete(oldest);
  }
  lyricsCache.set(key, value);
};

const cleanTitle = (raw: string): string =>
  raw
    .replace(/\s*[\(\[](?:official\s*(?:music\s*)?(?:video|audio|visualizer|lyric\s*video)|lyrics?|hd|4k|explicit|clean|remastered.*?)[\)\]]/gi, '')
    .replace(/\s*[\(\[](?:feat\.?|ft\.?|with)\s+[^\)\]]+[\)\]]/gi, '')
    .replace(/\s+-\s+(?:official|audio|lyrics).*$/i, '')
    .trim();

const cleanArtist = (raw: string): string =>
  raw
    .split(/\s*(?:&|,|\bfeat\.?|\bft\.?|\bx\b)\s*/i)[0]
    ?.replace(/\s*-\s*Topic$/i, '')
    .trim() || raw.trim();

/** Parse standard [mm:ss.xx] / [mm:ss.xxx] LRC strings into sorted cue lines. */
export const parseLrc = (lrc: string): LyricLine[] => {
  const lines: LyricLine[] = [];
  const tagRe = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

  for (const rawLine of lrc.split(/\r?\n/)) {
    const timestamps: number[] = [];
    let match: RegExpExecArray | null;
    tagRe.lastIndex = 0;

    while ((match = tagRe.exec(rawLine)) !== null) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const fracRaw = match[3] || '0';
      const fracMs =
        fracRaw.length === 1
          ? parseInt(fracRaw, 10) * 100
          : fracRaw.length === 2
          ? parseInt(fracRaw, 10) * 10
          : parseInt(fracRaw.slice(0, 3), 10);
      timestamps.push(mins * 60_000 + secs * 1000 + fracMs);
    }

    if (timestamps.length === 0) continue;
    const text = rawLine.replace(tagRe, '').trim();
    if (!text) continue;

    for (const timeMs of timestamps) {
      lines.push({ timeMs, text });
    }
  }

  return lines.sort((a, b) => (a.timeMs ?? 0) - (b.timeMs ?? 0));
};

const toPlainLines = (plain: string): LyricLine[] =>
  plain
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
    .map((text) => ({ text }));

const fetchJson = async <T>(url: string): Promise<T | null> => {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'OhmPlayer/0.1.0 (https://github.com/ohm)' },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
};

const pickRecord = (record: LrcLibRecord | null): LyricsResult | null => {
  if (!record) return null;
  if (record.instrumental) {
    return { kind: 'instrumental', source: 'lrclib', lines: [] };
  }
  if (record.syncedLyrics) {
    const parsed = parseLrc(record.syncedLyrics);
    if (parsed.length > 0) {
      return { kind: 'synced', source: 'lrclib', lines: parsed };
    }
  }
  if (record.plainLyrics) {
    const plain = toPlainLines(record.plainLyrics);
    if (plain.length > 0) {
      return { kind: 'plain', source: 'lrclib', lines: plain };
    }
  }
  return null;
};

export async function resolveLyrics(params: {
  videoId?: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
}): Promise<LyricsResult> {
  const cacheKey = params.videoId || `${params.artist}:${params.title}`.toLowerCase();
  const cached = lyricsCache.get(cacheKey);
  if (cached) return cached;

  const title = cleanTitle(params.title);
  const artist = cleanArtist(params.artist);
  const targetDuration =
    typeof params.duration === 'number' && isFinite(params.duration) && params.duration > 0
      ? Math.round(params.duration)
      : undefined;

  try {
    // 1. Exact lookup on LRCLIB
    const exactParams = new URLSearchParams({
      track_name: title,
      artist_name: artist,
    });
    if (params.album && params.album.toLowerCase() !== 'single') {
      exactParams.set('album_name', params.album);
    }
    if (targetDuration) exactParams.set('duration', String(targetDuration));

    const exact = await fetchJson<LrcLibRecord>(
      `https://lrclib.net/api/get?${exactParams.toString()}`
    );
    const exactPicked = pickRecord(exact);
    if (exactPicked && exactPicked.kind === 'synced') {
      setCached(cacheKey, exactPicked);
      return exactPicked;
    }

    // 2. Fuzzy search on LRCLIB if exact lookup missed or had only plain lyrics
    const searchParams = new URLSearchParams({ track_name: title, artist_name: artist });
    const candidates = await fetchJson<LrcLibRecord[]>(
      `https://lrclib.net/api/search?${searchParams.toString()}`
    );
    if (Array.isArray(candidates) && candidates.length > 0) {
      const withinDuration = (c: LrcLibRecord) =>
        !targetDuration || !c.duration || Math.abs(c.duration - targetDuration) <= 8;

      const syncedMatch =
        candidates.find((c) => c.syncedLyrics && withinDuration(c)) ||
        candidates.find((c) => c.syncedLyrics);

      const picked = pickRecord(syncedMatch || candidates[0]);
      if (picked) {
        setCached(cacheKey, picked);
        return picked;
      }
    }

    if (exactPicked) {
      setCached(cacheKey, exactPicked);
      return exactPicked;
    }
  } catch {
    // LRCLIB unavailable or timed out: continue to YouTube Music fallback
  }

  // 3. YouTube Music plain lyrics fallback
  if (params.videoId) {
    const ytText = await getPlainLyrics(params.videoId);
    if (ytText) {
      const result: LyricsResult = {
        kind: 'plain',
        source: 'youtube',
        lines: toPlainLines(ytText),
      };
      setCached(cacheKey, result);
      return result;
    }
  }

  const none: LyricsResult = { kind: 'none', source: 'none', lines: [] };
  setCached(cacheKey, none);
  return none;
}
