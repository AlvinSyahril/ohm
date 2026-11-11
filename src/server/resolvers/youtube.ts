import { Innertube, Platform, UniversalCache } from 'youtubei.js';

// Register JS evaluator required by youtubei.js 18.x to decipher 'n' throttling tokens & signatures
Platform.shim.eval = async (data: { output: string }) => {
  return new Function(data.output)();
};

let ytInstance: Innertube | null = null;

type StreamClient = 'VISIONOS' | 'IOS' | 'YTMUSIC';

interface CachedStream {
  url: string;
  bitrate?: number;
  format: string;
  contentLength?: number;
  clientUsed: StreamClient;
  expiresAt: number;
}

// Cache deciphered stream URLs for 20 minutes so HTTP Range seeks are instantaneous
const streamUrlCache = new Map<string, CachedStream>();

export async function getInnertube(): Promise<Innertube> {
  if (!ytInstance) {
    ytInstance = await Innertube.create({
      cache: new UniversalCache(true, './.cache'),
    });
  }
  return ytInstance;
}

export interface TrackMetadata {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  thumbnail?: string;
  source: 'youtube';
}

export async function searchTracks(query: string): Promise<TrackMetadata[]> {
  const yt = await getInnertube();

  const searchResult = await yt.music.search(query, { type: 'song' });
  const tracks: TrackMetadata[] = [];

  if (searchResult.songs && searchResult.songs.contents) {
    for (const item of searchResult.songs.contents) {
      if ('id' in item && item.id) {
        tracks.push({
          id: item.id,
          title: item.title || 'Unknown Title',
          artist:
            item.artists && item.artists[0]?.name
              ? item.artists[0].name
              : 'Unknown Artist',
          album: item.album?.name,
          duration: item.duration?.seconds,
          thumbnail:
            item.thumbnails?.[0]?.url ||
            `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`,
          source: 'youtube',
        });
      }
    }
  }

  if (tracks.length === 0) {
    const generalSearch = await yt.search(query);
    const videos = generalSearch.videos;
    if (videos) {
      for (const item of videos) {
        if ('id' in item && item.id) {
          tracks.push({
            id: item.id,
            title: item.title?.text || 'Unknown Title',
            artist: item.author?.name || 'Unknown Artist',
            duration: item.duration?.seconds,
            thumbnail:
              item.thumbnails?.[0]?.url ||
              `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`,
            source: 'youtube',
          });
        }
      }
    }
  }

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
  const yt = await getInnertube();
  const upNext = await yt.music.getUpNext(videoId);
  const tracks: TrackMetadata[] = [];

  for (const item of (upNext as any).contents || []) {
    const vId = item.video_id || item.endpoint?.payload?.videoId;
    if (vId && !tracks.some((t) => t.id === vId)) {
      tracks.push({
        id: vId,
        title: item.title?.text || (typeof item.title === 'string' ? item.title : 'Unknown Track'),
        artist:
          item.artists?.[0]?.name ||
          item.author?.name ||
          (item.artists && typeof item.artists === 'string' ? item.artists : 'Unknown Artist'),
        album: item.album?.name,
        duration: item.duration?.seconds,
        thumbnail:
          item.thumbnail?.contents?.[0]?.url ||
          `https://i.ytimg.com/vi/${vId}/mqdefault.jpg`,
        source: 'youtube',
      });
    }
  }

  return tracks;
}

/**
 * Live Explore Feed from YouTube Music
 */
export async function getExploreFeed(): Promise<{ title: string; tracks: TrackMetadata[] }[]> {
  const yt = await getInnertube();
  try {
    const explore = await yt.music.getExplore();
    const sections: { title: string; tracks: TrackMetadata[] }[] = [];

    for (const sec of (explore as any).sections || []) {
      const sectionTitle = sec.title?.text || 'Trending Releases';
      const secTracks: TrackMetadata[] = [];

      for (const item of sec.contents || []) {
        const vId = item.id || item.video_id || item.endpoint?.payload?.videoId;
        if (vId) {
          secTracks.push({
            id: vId,
            title: item.title?.text || (typeof item.title === 'string' ? item.title : 'Featured Track'),
            artist: item.artists?.[0]?.name || item.author?.name || 'Various Artists',
            album: item.album?.name,
            duration: item.duration?.seconds,
            thumbnail:
              item.thumbnails?.[0]?.url ||
              item.thumbnail?.contents?.[0]?.url ||
              `https://i.ytimg.com/vi/${vId}/mqdefault.jpg`,
            source: 'youtube',
          });
        }
      }

      if (secTracks.length > 0) {
        sections.push({ title: sectionTitle, tracks: secTracks });
      }
    }
    return sections;
  } catch (err) {
    console.warn('Failed to fetch explore feed:', err);
    return [];
  }
}

export async function getStreamUrl(
  videoId: string,
  forceRefresh = false
): Promise<CachedStream> {
  const now = Date.now();
  if (!forceRefresh) {
    const cached = streamUrlCache.get(videoId);
    if (cached && cached.expiresAt > now) {
      return cached;
    }
  }

  const yt = await getInnertube();
  const clientsToTry: StreamClient[] = ['VISIONOS', 'IOS', 'YTMUSIC'];
  let lastError: Error | null = null;

  for (const client of clientsToTry) {
    try {
      const info = await yt.getBasicInfo(videoId, { client });
      const audioFormat = info.chooseFormat({
        type: 'audio',
        quality: 'best',
      });

      if (!audioFormat) continue;

      const decipheredUrl = await audioFormat.decipher(yt.session.player);
      if (!decipheredUrl) continue;

      const resolved: CachedStream = {
        url: decipheredUrl,
        bitrate: audioFormat.bitrate,
        format: audioFormat.mime_type?.split(';')[0] || 'audio/mp4',
        contentLength: audioFormat.content_length,
        clientUsed: client,
        expiresAt: now + 20 * 60 * 1000,
      };

      streamUrlCache.set(videoId, resolved);
      return resolved;
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('No compatible audio stream found for this track');
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

    const response = await fetch(streamInfo.url, { headers });
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
