import type { Track } from '../store/usePlayerStore';

export type ReceiptPeriod = 'week' | 'all';

export interface PlayEvent {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  thumbnail?: string;
  playedAt: number;
  listenedSec: number;
}

export interface ReceiptTrackRow {
  rank: string;
  id: string;
  title: string;
  artist: string;
  plays: number;
  durationSec: number;
}

export interface ReceiptSummary {
  periodLabel: string;
  dateLabel: string;
  topArtist: string;
  totalSeconds: number;
  totalPlays: number;
  tracks: ReceiptTrackRow[];
  isFallbackSample: boolean;
}

const PLAY_EVENTS_KEY = 'ohm_play_events';
const MAX_PLAY_EVENTS = 600;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function loadPlayEvents(): PlayEvent[] {
  try {
    const raw = localStorage.getItem(PLAY_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is PlayEvent =>
          Boolean(e && typeof e.id === 'string' && typeof e.title === 'string' && typeof e.playedAt === 'number')
      )
      .slice(-MAX_PLAY_EVENTS);
  } catch {
    return [];
  }
}

export function appendPlayEvent(track: Track, listenedSec: number): PlayEvent[] {
  const events = loadPlayEvents();
  const safeDuration =
    typeof track.duration === 'number' && Number.isFinite(track.duration) && track.duration > 0
      ? Math.round(track.duration)
      : Math.max(30, Math.round(listenedSec));

  const next: PlayEvent[] = [
    ...events,
    {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: safeDuration,
      thumbnail: track.thumbnail,
      playedAt: Date.now(),
      listenedSec: Math.max(15, Math.round(listenedSec)),
    },
  ].slice(-MAX_PLAY_EVENTS);

  try {
    localStorage.setItem(PLAY_EVENTS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}

function formatDateRange(nowMs: number, period: ReceiptPeriod): string {
  if (period === 'all') return 'OHM ARCHIVE';
  const end = new Date(nowMs);
  const start = new Date(nowMs - WEEK_MS);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  return `${fmt(start)} - ${fmt(end)}`;
}

export function formatReceiptDuration(sec: number): string {
  const safe = Math.max(0, Math.round(sec));
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function formatTotalListeningTime(totalSec: number): string {
  const safe = Math.max(0, Math.round(totalSec));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${Math.max(1, mins)}m`;
}

export function computeReceiptSummary(options: {
  period: ReceiptPeriod;
  events: PlayEvent[];
  history: Track[];
  favorites: Track[];
  currentTrack: Track | null;
}): ReceiptSummary {
  const { period, events, history, favorites, currentTrack } = options;
  const now = Date.now();
  const filtered =
    period === 'week' ? events.filter((e) => now - e.playedAt <= WEEK_MS) : events;

  const byTrack = new Map<
    string,
    { id: string; title: string; artist: string; plays: number; durationSec: number; listenedSec: number }
  >();
  const byArtist = new Map<string, number>();

  let totalSeconds = 0;

  for (const ev of filtered) {
    totalSeconds += ev.listenedSec;
    const existing = byTrack.get(ev.id);
    if (existing) {
      existing.plays += 1;
      existing.listenedSec += ev.listenedSec;
    } else {
      byTrack.set(ev.id, {
        id: ev.id,
        title: ev.title,
        artist: ev.artist,
        plays: 1,
        durationSec: ev.duration || 210,
        listenedSec: ev.listenedSec,
      });
    }
    const artistKey = ev.artist.split(',')[0].trim() || ev.artist;
    byArtist.set(artistKey, (byArtist.get(artistKey) ?? 0) + 1);
  }

  let isFallbackSample = false;

  // Gracefully seed from local history/favorites if play log is still sparse
  if (byTrack.size < 3) {
    const seedPool: Track[] = [
      ...(currentTrack ? [currentTrack] : []),
      ...history,
      ...favorites,
    ];
    const seenIds = new Set(byTrack.keys());
    for (const t of seedPool) {
      if (seenIds.has(t.id)) continue;
      seenIds.add(t.id);
      const dur = t.duration && t.duration > 0 ? Math.round(t.duration) : 215;
      byTrack.set(t.id, {
        id: t.id,
        title: t.title,
        artist: t.artist,
        plays: 1,
        durationSec: dur,
        listenedSec: dur,
      });
      totalSeconds += dur;
      const artistKey = t.artist.split(',')[0].trim() || t.artist;
      byArtist.set(artistKey, (byArtist.get(artistKey) ?? 0) + 1);
      if (byTrack.size >= 5) break;
    }
    if (filtered.length === 0 && byTrack.size > 0) {
      isFallbackSample = true;
    }
  }

  const rankedTracks = Array.from(byTrack.values())
    .sort((a, b) => b.plays - a.plays || b.listenedSec - a.listenedSec)
    .slice(0, 5)
    .map((item, idx) => ({
      rank: String(idx + 1).padStart(2, '0'),
      id: item.id,
      title: item.title,
      artist: item.artist,
      plays: item.plays,
      durationSec: item.durationSec,
    }));

  const rankedArtists = Array.from(byArtist.entries()).sort((a, b) => b[1] - a[1]);
  const topArtist = rankedArtists[0]?.[0] ?? currentTrack?.artist ?? 'Ohm Listener';
  const totalPlays = Math.max(
    filtered.length,
    rankedTracks.reduce((sum, t) => sum + t.plays, 0)
  );

  return {
    periodLabel: period === 'week' ? 'THIS WEEK' : 'ALL TIME',
    dateLabel: formatDateRange(now, period),
    topArtist,
    totalSeconds,
    totalPlays,
    tracks: rankedTracks,
    isFallbackSample,
  };
}
