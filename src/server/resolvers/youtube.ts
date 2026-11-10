import { Innertube, UniversalCache } from 'youtubei.js';

let ytInstance: Innertube | null = null;

export async function getInnertube(): Promise<Innertube> {
  if (!ytInstance) {
    ytInstance = await Innertube.create({
      cache: new UniversalCache(true, './.cache'),
      generate_session_locally: true
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
  
  // Search YouTube Music tracks first
  const searchResult = await yt.music.search(query, { type: 'song' });
  const tracks: TrackMetadata[] = [];

  if (searchResult.songs && searchResult.songs.contents) {
    for (const item of searchResult.songs.contents) {
      if ('id' in item && item.id) {
        tracks.push({
          id: item.id,
          title: item.title || 'Unknown Title',
          artist: item.artists && item.artists[0]?.name ? item.artists[0].name : 'Unknown Artist',
          album: item.album?.name,
          duration: item.duration?.seconds,
          thumbnail: item.thumbnails?.[0]?.url,
          source: 'youtube'
        });
      }
    }
  }

  // Fallback to standard YouTube search if music-specific search returned few results
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
            thumbnail: item.thumbnails?.[0]?.url,
            source: 'youtube'
          });
        }
      }
    }
  }

  return tracks;
}

export async function getStreamUrl(videoId: string): Promise<{ url: string; bitrate?: number; format: string }> {
  const yt = await getInnertube();
  
  // Using the iOS client delivers direct audio URLs without web decipher issues
  const info = await yt.getInfo(videoId, { client: 'IOS' });
  
  const audioFormat = info.chooseFormat({
    type: 'audio',
    quality: 'best'
  });

  if (!audioFormat || !audioFormat.url) {
    throw new Error('No direct audio stream URL found for this track');
  }

  return {
    url: audioFormat.url,
    bitrate: audioFormat.bitrate,
    format: audioFormat.mime_type?.split(';')[0] || 'audio/mp4'
  };
}

export async function getAudioStream(videoId: string, range?: { start?: number; end?: number }) {
  const { url } = await getStreamUrl(videoId);
  
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  };

  if (range && range.start !== undefined) {
    headers['Range'] = `bytes=${range.start}-${range.end !== undefined ? range.end : ''}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok && response.status !== 206) {
    throw new Error(`Failed to fetch audio stream from upstream: ${response.status} ${response.statusText}`);
  }

  return {
    body: response.body,
    status: response.status,
    headers: response.headers
  };
}
