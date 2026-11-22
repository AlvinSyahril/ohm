import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import {
  searchAll,
  searchTracksPaginated,
  searchAlbumsPaginated,
  searchArtistsPaginated,
  searchPlaylistsPaginated,
  getStreamUrl,
  getAudioStream,
  getSearchSuggestions,
  getRadioTracks,
  getExploreFeed,
  getExploreCategory,
  getPlaylistDetails,
  getArtistProfile,
  getAlbumDetails,
  VIDEO_ID_RE,
  PLAYLIST_ID_RE,
  type SearchType,
} from './resolvers/youtube.js';
import { resolveLyrics } from './resolvers/lyrics.js';
import { fetchUpdateCheck, FriendlyUpdateError, readPackageVersion } from './updates.js';
import { ensureLogDir, logError, logErrorSync } from './logger.js';

const paramString = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v || '').trim();

const queryString = (v: unknown, max = 200): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

function reportServerError(
  event: string,
  label: string,
  err: unknown,
  context?: Record<string, unknown>
) {
  console.error(label, err);
  logError('server', event, err, context);
}

const CLIENT_ERROR_WINDOW_MS = 60_000;
const CLIENT_ERROR_MAX_PER_WINDOW = 20;
let clientErrorWindowStart = Date.now();
let clientErrorWindowCount = 0;

function allowClientErrorReport(): boolean {
  const now = Date.now();
  if (now - clientErrorWindowStart >= CLIENT_ERROR_WINDOW_MS) {
    clientErrorWindowStart = now;
    clientErrorWindowCount = 0;
  }
  if (clientErrorWindowCount >= CLIENT_ERROR_MAX_PER_WINDOW) {
    return false;
  }
  clientErrorWindowCount += 1;
  return true;
}

const ARTIST_ID_RE = /^UC[A-Za-z0-9_-]{10,40}$/;
const ALBUM_ID_RE = /^(MPRE|OLAK|VL|PL)[A-Za-z0-9_-]{4,100}$/;

export interface CreateAppOptions {
  /** Directory containing compiled Vite assets (index.html, assets/) to serve in desktop/production mode. */
  staticDir?: string;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '16kb' }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'nuclear-redesign-resolver' });
});

// Search tracks, albums, artists, playlists, or unified "all" overview (paginated via ?offset=N)
const VALID_SEARCH_TYPES = new Set<SearchType>(['all', 'songs', 'albums', 'artists', 'playlists']);

app.get('/api/search', async (req: Request, res: Response) => {
  const query = queryString(req.query.q);
  if (!query) {
    return res.status(400).json({ error: 'Search query parameter (q) is required' });
  }
  const rawType = queryString(req.query.type, 20).toLowerCase() as SearchType;
  if (rawType && !VALID_SEARCH_TYPES.has(rawType)) {
    return res.status(400).json({ error: 'Invalid search type parameter' });
  }
  const type: SearchType = rawType || 'songs';
  const rawOffset = req.query.offset ? Number(req.query.offset) : 0;
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.min(400, Math.floor(rawOffset)) : 0;

  try {
    if (type === 'all') {
      const overview = await searchAll(query);
      return res.json({ type, query, ...overview });
    }
    if (type === 'albums') {
      const { items, hasMore, totalLoaded } = await searchAlbumsPaginated(query, offset);
      return res.json({ type, query, offset, count: items.length, totalLoaded, hasMore, albums: items });
    }
    if (type === 'artists') {
      const { items, hasMore, totalLoaded } = await searchArtistsPaginated(query, offset);
      return res.json({ type, query, offset, count: items.length, totalLoaded, hasMore, artists: items });
    }
    if (type === 'playlists') {
      const { items, hasMore, totalLoaded } = await searchPlaylistsPaginated(query, offset);
      return res.json({ type, query, offset, count: items.length, totalLoaded, hasMore, playlists: items });
    }
    const { tracks, hasMore, totalLoaded } = await searchTracksPaginated(query, offset);
    res.json({ type: 'songs', query, offset, count: tracks.length, totalLoaded, hasMore, tracks });
  } catch (err) {
    reportServerError('search', 'Search error:', err, { query, type, offset });
    res.status(500).json({ error: 'Failed to search tracks' });
  }
});

// Smart Search Suggestions endpoint
app.get('/api/search/suggestions', async (req: Request, res: Response) => {
  const query = queryString(req.query.q);
  if (!query) {
    return res.json({ suggestions: [] });
  }

  try {
    const suggestions = await getSearchSuggestions(query);
    res.json({ query, suggestions });
  } catch (err) {
    reportServerError('search-suggestions', 'Search suggestions error:', err, { query });
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Smart Radio / Algorithmic Up Next endpoint
app.get('/api/radio/:videoId', async (req: Request, res: Response) => {
  const videoId = paramString(req.params.videoId);
  if (!VIDEO_ID_RE.test(videoId)) {
    return res.status(400).json({ error: 'Invalid videoId parameter' });
  }
  try {
    const fresh = req.query.fresh === '1' || req.query.fresh === 'true';
    const rawExclude = queryString(req.query.exclude, 700);
    const excludeIds = new Set<string>(
      rawExclude
        .split(',')
        .map((id) => id.trim())
        .filter((id) => VIDEO_ID_RE.test(id))
        .slice(0, 40)
    );
    const tracks = await getRadioTracks(videoId, { fresh, excludeIds });
    res.json({ seedVideoId: videoId, count: tracks.length, tracks });
  } catch (err) {
    reportServerError('radio', 'Radio resolve error:', err, { videoId });
    res.status(500).json({ error: 'Failed to resolve radio tracks' });
  }
});

// Synced & plain lyrics lookup (LRCLIB + YouTube Music fallback)
app.get('/api/lyrics', async (req: Request, res: Response) => {
  const videoIdRaw = queryString(req.query.videoId, 40);
  const videoId = videoIdRaw || undefined;
  const title = queryString(req.query.title);
  const artist = queryString(req.query.artist);
  const albumRaw = queryString(req.query.album);
  const album = albumRaw || undefined;
  const rawDuration = req.query.duration ? Number(req.query.duration) : undefined;
  const duration =
    rawDuration !== undefined && Number.isFinite(rawDuration) && rawDuration > 0
      ? rawDuration
      : undefined;

  if (!title && !videoId) {
    return res.status(400).json({ error: 'title or videoId parameter is required' });
  }

  try {
    const payload = await resolveLyrics({ videoId, title, artist, album, duration });
    res.json(payload);
  } catch (err) {
    reportServerError('lyrics', 'Lyrics resolve error:', err, { videoId: videoId ?? null, title });
    res.status(500).json({ error: 'Failed to resolve lyrics' });
  }
});

const ARTWORK_ALLOWED_HOSTS = new Set([
  'yt3.googleusercontent.com',
  'lh3.googleusercontent.com',
  'i.ytimg.com',
  'img.youtube.com',
  'i1.ytimg.com',
  'i2.ytimg.com',
  'i3.ytimg.com',
  'i4.ytimg.com',
]);
const ARTWORK_MAX_BYTES = 5 * 1024 * 1024;

// CORS-safe allowlisted artwork proxy for high-res Canvas lyric card export
app.get('/api/artwork', async (req: Request, res: Response) => {
  const rawUrl = queryString(req.query.url, 1000);
  if (!rawUrl) {
    return res.status(400).json({ error: 'url parameter is required' });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid artwork URL' });
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    (parsed.port && parsed.port !== '443') ||
    !ARTWORK_ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())
  ) {
    return res.status(403).json({ error: 'Artwork host is not allowed' });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OhmAudio/1.0)',
      },
    });

    if (!upstream.ok) {
      await upstream.body?.cancel().catch(() => {});
      return res.status(502).json({ error: 'Failed to fetch artwork' });
    }

    const rawContentType = upstream.headers.get('content-type') || '';
    const mimeType = rawContentType.split(';')[0].trim().toLowerCase();
    const ALLOWED_RASTER_MIMES = new Set([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
    ]);
    if (!ALLOWED_RASTER_MIMES.has(mimeType)) {
      await upstream.body?.cancel().catch(() => {});
      return res.status(415).json({ error: 'Upstream resource is not a supported raster image' });
    }

    const contentLength = Number(upstream.headers.get('content-length') || 0);
    if (contentLength > ARTWORK_MAX_BYTES) {
      await upstream.body?.cancel().catch(() => {});
      return res.status(413).json({ error: 'Artwork exceeds size limit' });
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    if (upstream.body) {
      const reader = upstream.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          totalBytes += value.byteLength;
          if (totalBytes > ARTWORK_MAX_BYTES) {
            await reader.cancel().catch(() => {});
            return res.status(413).json({ error: 'Artwork exceeds size limit' });
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    }

    const buf = Buffer.concat(chunks, totalBytes);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buf);
  } catch (err) {
    reportServerError('artwork', 'Artwork proxy error:', err, { host: parsed.hostname });
    return res.status(502).json({ error: 'Failed to load artwork' });
  }
});

// Live Explore Feed endpoint (defaults to Global; blends local releases when localRatio > 0)
app.get('/api/explore', async (req: Request, res: Response) => {
  const rawRatio = Number(req.query.localRatio);
  const localRatio = Number.isFinite(rawRatio) && rawRatio > 0 ? Math.min(0.4, rawRatio) : 0;
  try {
    const feed = await getExploreFeed({ localRatio });
    res.json(feed);
  } catch (err) {
    reportServerError('explore', 'Explore feed error:', err);
    res.status(500).json({ error: 'Failed to fetch explore feed' });
  }
});

// Explore sub-category endpoint (New releases, Charts, Moods & genres, or a specific mood)
app.get('/api/explore/category', async (req: Request, res: Response) => {
  const browseId = queryString(req.query.browseId, 100);
  const params = queryString(req.query.params, 200);
  const title = queryString(req.query.title, 200);
  if (!browseId || !/^FEmusic_[a-zA-Z0-9_]+$/.test(browseId)) {
    return res.status(400).json({ error: 'Valid explore browseId parameter is required' });
  }
  try {
    const data = await getExploreCategory({
      browseId,
      params: params || undefined,
      title: title || undefined,
    });
    res.json(data);
  } catch (err) {
    reportServerError('explore-category', 'Explore category error:', err, { browseId, title });
    res.status(500).json({ error: 'Failed to load explore category' });
  }
});

// Curated playlist endpoint (VL... / PL... / RD...)
app.get('/api/playlist', async (req: Request, res: Response) => {
  const id = queryString(req.query.id, 120);
  if (!id || !PLAYLIST_ID_RE.test(id)) {
    return res.status(400).json({ error: 'Valid playlist id parameter is required' });
  }
  try {
    const playlist = await getPlaylistDetails(id);
    res.json(playlist);
  } catch (err) {
    reportServerError('playlist', 'Playlist details error:', err, { id });
    res.status(500).json({ error: 'Failed to load playlist details' });
  }
});

// Artist graph endpoint (top songs, albums, singles, related artists)
app.get('/api/artist', async (req: Request, res: Response) => {
  const id = queryString(req.query.id, 60);
  const name = queryString(req.query.name);
  if (id && !ARTIST_ID_RE.test(id)) {
    return res.status(400).json({ error: 'Invalid artist id parameter' });
  }
  if (!id && !name) {
    return res.status(400).json({ error: 'artist name or id parameter is required' });
  }
  try {
    const profile = await getArtistProfile({ id: id || undefined, name: name || undefined });
    res.json(profile);
  } catch (err) {
    reportServerError('artist', 'Artist profile error:', err, { id: id || null, name: name || null });
    res.status(500).json({ error: 'Failed to load artist profile' });
  }
});

// Album graph endpoint (ordered release tracklist & metadata)
app.get('/api/album', async (req: Request, res: Response) => {
  const id = queryString(req.query.id, 120);
  const title = queryString(req.query.title);
  const artist = queryString(req.query.artist);
  if (id && !ALBUM_ID_RE.test(id)) {
    return res.status(400).json({ error: 'Invalid album id parameter' });
  }
  if (!id && !title && !artist) {
    return res.status(400).json({ error: 'album id or title parameter is required' });
  }
  try {
    const album = await getAlbumDetails({
      id: id || undefined,
      title: title || undefined,
      artist: artist || undefined,
    });
    res.json(album);
  } catch (err) {
    reportServerError('album', 'Album details error:', err, { id: id || null, title: title || null });
    res.status(500).json({ error: 'Failed to load album details' });
  }
});

// Get track stream URL and format info
app.get('/api/track/:videoId', async (req: Request, res: Response) => {
  const videoId = paramString(req.params.videoId);
  if (!VIDEO_ID_RE.test(videoId)) {
    return res.status(400).json({ error: 'Invalid videoId parameter' });
  }
  try {
    const streamInfo = await getStreamUrl(videoId);
    res.json({ videoId, ...streamInfo });
  } catch (err) {
    reportServerError('stream-resolve', 'Track stream resolve error:', err, { videoId });
    res.status(500).json({ error: 'Failed to resolve track stream' });
  }
});

// Stream audio directly with Range support for HTML5 <audio> elements
app.get('/api/stream/:videoId', async (req: Request, res: Response) => {
  const videoId = paramString(req.params.videoId);
  if (!VIDEO_ID_RE.test(videoId)) {
    return res.status(400).json({ error: 'Invalid videoId parameter' });
  }
  const rangeHeader = req.headers.range;

  try {
    let range: { start?: number; end?: number } | undefined;
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : undefined;
      if (!isNaN(start) && start >= 0 && (end === undefined || (!isNaN(end) && end >= start))) {
        range = { start, end };
      }
    }

    const { body, status, headers } = await getAudioStream(videoId, range);

    res.status(status);
    const contentType = headers.get('content-type') || 'audio/mp4';
    const contentRange = headers.get('content-range');
    const contentLength = headers.get('content-length');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (contentLength) res.setHeader('Content-Length', contentLength);

    if (!body) {
      return res.end();
    }

    const nodeStream = Readable.fromWeb(body as any);
    const ac = new AbortController();
    req.on('close', () => {
      ac.abort();
      nodeStream.destroy();
    });

    try {
      await pipeline(nodeStream, res, { signal: ac.signal });
    } catch (pipeErr: any) {
      // Client range seek aborts and premature close are expected during scrubbing
      if (pipeErr?.code !== 'ERR_STREAM_PREMATURE_CLOSE' && pipeErr?.name !== 'AbortError') {
        reportServerError('audio-pipeline', 'Audio pipeline error:', pipeErr, { videoId });
      }
    }
  } catch (err) {
    reportServerError('audio-stream', 'Audio streaming error:', err, { videoId });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream audio' });
    }
  }
});

  app.post('/api/client-error', (req: Request, res: Response) => {
    if (!allowClientErrorReport()) {
      return res.status(429).json({ ok: false });
    }
    const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
    const message = queryString(body?.message, 500);
    if (!message) {
      return res.status(400).json({ ok: false });
    }
    const event = queryString(body?.event, 64) || 'renderer-error';
    const stack = queryString(body?.stack, 2000);
    const context =
      body?.context && typeof body.context === 'object' && !Array.isArray(body.context)
        ? (body.context as Record<string, unknown>)
        : undefined;
    const err = new Error(message);
    if (stack) err.stack = stack;
    logError('client', event, err, context);
    return res.status(202).json({ ok: true });
  });

  app.get('/api/updates', async (_req: Request, res: Response) => {
    const currentVersion = readPackageVersion();
    try {
      const { status } = await fetchUpdateCheck(currentVersion);
      return res.json(status);
    } catch (err) {
      return res.json({
        phase: 'error',
        currentVersion,
        error:
          err instanceof FriendlyUpdateError
            ? err.message
            : 'Could not check for updates. Check your internet connection and try again.',
      });
    }
  });

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  if (options.staticDir && fs.existsSync(options.staticDir)) {
    const resolvedStatic = path.resolve(options.staticDir);
    const indexHtml = path.join(resolvedStatic, 'index.html');
    app.use(express.static(resolvedStatic, { maxAge: '1h', index: false }));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api/')) return next();
      if (fs.existsSync(indexHtml)) {
        return res.sendFile(indexHtml);
      }
      return next();
    });
  }

  return app;
}

export interface StartServerOptions {
  host?: string;
  port?: number;
  fallbackPorts?: number[];
  staticDir?: string;
}

export interface StartedServer {
  app: express.Express;
  server: Server;
  host: string;
  port: number;
  url: string;
  close: () => Promise<void>;
}

/** Boot the resolver HTTP server, trying deterministic fallback ports before an ephemeral port. */
export async function startServer(options: StartServerOptions = {}): Promise<StartedServer> {
  await ensureLogDir();
  const host = options.host ?? process.env.HOST ?? '127.0.0.1';
  const preferredPort = options.port ?? (Number(process.env.PORT) || 4000);
  const candidates = [preferredPort, ...(options.fallbackPorts ?? []), 0];
  const app = createApp({ staticDir: options.staticDir });

  const listenOn = (targetPort: number): Promise<Server> =>
    new Promise((resolve, reject) => {
      const server = app.listen(targetPort, host);
      const onError = (err: NodeJS.ErrnoException) => {
        server.removeListener('listening', onListening);
        reject(err);
      };
      const onListening = () => {
        server.removeListener('error', onError);
        resolve(server);
      };
      server.once('error', onError);
      server.once('listening', onListening);
    });

  let boundServer: Server | null = null;
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      boundServer = await listenOn(candidate);
      break;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'EADDRINUSE' && candidate !== 0) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  if (!boundServer) {
    throw lastError ?? new Error('Unable to bind HTTP server');
  }

  const address = boundServer.address();
  const boundPort = typeof address === 'object' && address ? address.port : preferredPort;
  const url = `http://${host}:${boundPort}`;
  const close = () =>
    new Promise<void>((resolve) => {
      boundServer!.closeAllConnections?.();
      boundServer!.close(() => resolve());
    });
  return { app, server: boundServer, host, port: boundPort, url, close };
}

const normalizeEntryPath = (p: string) => {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};

const isDirectEntry =
  !!process.argv[1] &&
  normalizeEntryPath(fileURLToPath(import.meta.url)) === normalizeEntryPath(process.argv[1]);

if (isDirectEntry) {
  process.on('uncaughtException', (err) => {
    console.error('Uncaught server exception:', err);
    logErrorSync('server', 'uncaught-exception', err);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled server rejection:', reason);
    logError('server', 'unhandled-rejection', reason);
  });

  startServer()
    .then(({ url }) => {
      console.log(`Nuclear Redesign Backend running on ${url}`);
    })
    .catch((err) => {
      console.error('Failed to start backend server:', err);
      logErrorSync('server', 'server-boot', err);
      process.exit(1);
    });
}
