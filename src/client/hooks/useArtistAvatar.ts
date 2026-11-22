import { useEffect, useState } from 'react';
import { upgradeThumbnail } from '../components/TrackCard';

interface CachedAvatar {
  url: string;
  at: number;
}

const STORAGE_KEY = 'ohm_artist_avatars';
const HIT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CONCURRENT = 3;

const memoryCache = new Map<string, CachedAvatar>();
const pendingRequests = new Map<string, Promise<string>>();
let storageLoaded = false;
let activeCount = 0;
const waitQueue: Array<() => void> = [];

function loadStorageCache(): void {
  if (storageLoaded) return;
  storageLoaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return;
    const now = Date.now();
    for (const [key, entry] of Object.entries(parsed)) {
      if (
        entry &&
        typeof entry === 'object' &&
        typeof (entry as CachedAvatar).url === 'string' &&
        typeof (entry as CachedAvatar).at === 'number'
      ) {
        const item = entry as CachedAvatar;
        const ttl = item.url ? HIT_TTL_MS : MISS_TTL_MS;
        if (now - item.at < ttl) {
          memoryCache.set(key, item);
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistStorageCache(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      const now = Date.now();
      const out: Record<string, CachedAvatar> = {};
      for (const [key, entry] of memoryCache.entries()) {
        const ttl = entry.url ? HIT_TTL_MS : MISS_TTL_MS;
        if (now - entry.at < ttl) {
          out[key] = entry;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
    } catch {
      // Ignore storage write errors
    }
  }, 300);
}

function getFreshEntry(key: string): CachedAvatar | null {
  loadStorageCache();
  const entry = memoryCache.get(key);
  if (!entry) return null;
  const ttl = entry.url ? HIT_TTL_MS : MISS_TTL_MS;
  if (Date.now() - entry.at >= ttl) {
    memoryCache.delete(key);
    return null;
  }
  return entry;
}

function runWithLimit<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      activeCount += 1;
      fn()
        .then(resolve, reject)
        .finally(() => {
          activeCount = Math.max(0, activeCount - 1);
          const next = waitQueue.shift();
          if (next) next();
        });
    };

    if (activeCount < MAX_CONCURRENT) {
      run();
    } else {
      waitQueue.push(run);
    }
  });
}

function cacheKeyFor(name: string, artistId?: string): string {
  const cleanId = artistId?.trim();
  if (cleanId) return `id:${cleanId}`;
  return `name:${name.trim().toLowerCase()}`;
}

function fetchArtistAvatar(name: string, artistId?: string): Promise<string> {
  const key = cacheKeyFor(name, artistId);
  const cached = getFreshEntry(key);
  if (cached) return Promise.resolve(cached.url);

  const existing = pendingRequests.get(key);
  if (existing) return existing;

  const task = runWithLimit(async () => {
    try {
      const params = new URLSearchParams();
      if (artistId) params.set('id', artistId);
      if (name) params.set('name', name);
      const res = await fetch(`/api/artist?${params.toString()}`);
      if (!res.ok) {
        memoryCache.set(key, { url: '', at: Date.now() });
        persistStorageCache();
        return '';
      }
      const data = (await res.json()) as { avatar?: unknown };
      const url = typeof data?.avatar === 'string' ? data.avatar : '';
      memoryCache.set(key, { url, at: Date.now() });
      persistStorageCache();
      return url;
    } catch {
      memoryCache.set(key, { url: '', at: Date.now() });
      persistStorageCache();
      return '';
    } finally {
      pendingRequests.delete(key);
    }
  });

  pendingRequests.set(key, task);
  return task;
}

/**
 * Fetches and caches artist portrait artwork from `/api/artist` with a 3-slot concurrency limit
 * so large artist grids do not stampede the server.
 */
export function useArtistAvatar(name: string, artistId?: string): string | undefined {
  const cleanName = name.trim();
  const key = cleanName ? cacheKeyFor(cleanName, artistId) : '';
  const [url, setUrl] = useState<string>(() => (key ? getFreshEntry(key)?.url ?? '' : ''));

  useEffect(() => {
    if (!key) {
      setUrl('');
      return;
    }
    const fresh = getFreshEntry(key);
    if (fresh) {
      setUrl(fresh.url);
      return;
    }

    let cancelled = false;
    setUrl('');
    void fetchArtistAvatar(cleanName, artistId).then((resolved) => {
      if (!cancelled) {
        setUrl(resolved);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [key, cleanName, artistId]);

  return url ? upgradeThumbnail(url, undefined, 'md') : undefined;
}
