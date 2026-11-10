import express, { Request, Response } from 'express';
import cors from 'cors';
import { Readable } from 'node:stream';
import { searchTracks, getStreamUrl, getAudioStream } from './resolvers/youtube.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'nuclear-redesign-resolver' });
});

// Search tracks across sources
app.get('/api/search', async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Search query parameter (q) is required' });
  }

  try {
    const results = await searchTracks(query);
    res.json({ query, count: results.length, tracks: results });
  } catch (err: any) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search tracks', details: err?.message || String(err) });
  }
});

// Get track stream URL and format info
app.get('/api/track/:videoId', async (req: Request, res: Response) => {
  const { videoId } = req.params;
  try {
    const streamInfo = await getStreamUrl(videoId);
    res.json({ videoId, ...streamInfo });
  } catch (err: any) {
    console.error('Track stream resolve error:', err);
    res.status(500).json({ error: 'Failed to resolve track stream', details: err?.message || String(err) });
  }
});

// Stream audio directly with Range support for HTML5 <audio> elements
app.get('/api/stream/:videoId', async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const rangeHeader = req.headers.range;

  try {
    let range: { start?: number; end?: number } | undefined;
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : undefined;
      range = { start, end };
    }

    const { body, status, headers } = await getAudioStream(videoId, range);
    
    // Pass along upstream response status and headers
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

    // Pipe stream to client
    const nodeStream = Readable.fromWeb(body as any);
    req.on('close', () => {
      nodeStream.destroy();
    });

    nodeStream.pipe(res);
  } catch (err: any) {
    console.error('Audio streaming error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream audio', details: err?.message || String(err) });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Nuclear Redesign Backend running on http://localhost:${PORT}`);
});
