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
    // Do NOT pass generate_session_locally: true so YouTube issues a genuine visitor session required by VISIONOS
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
            `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
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
              `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            source: 'youtube',
          });
        }
      }
    }
  }

  return tracks;
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
  // VISIONOS provides unrestricted full-length byte-range streaming without PoToken 1MB cutoffs
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

  // If cached URL expired or returned 403, refresh once with fresh decipher
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
