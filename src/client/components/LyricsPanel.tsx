import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, Check, Clock, Mic2, Music2, Share2, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../store/usePlayerStore';
import { EASE_OUT } from '../utils/motion';
import { findBestLyricMoments } from '../utils/lyricHighlightFinder';
import { LyricCardModal } from './LyricCardModal';

interface LyricLine {
  timeMs?: number;
  text: string;
}

interface LyricsPayload {
  kind: 'synced' | 'plain' | 'instrumental' | 'none';
  source: 'lrclib' | 'youtube' | 'none';
  lines: LyricLine[];
}

const MAX_LYRICS_CACHE = 100;
const clientCache = new Map<string, LyricsPayload>();

const scrollLineInsideContainer = (container: HTMLElement | null, el: HTMLElement | null) => {
  if (!container || !el) return;
  const cRect = container.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  const targetTop =
    container.scrollTop + (eRect.top - cRect.top) - container.clientHeight / 2 + eRect.height / 2;
  container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
};

const LYRIC_OFFSETS_KEY = 'ohm_lyric_offsets';

function loadLyricOffset(videoId?: string): number {
  if (!videoId) return 0;
  try {
    const raw = localStorage.getItem(LYRIC_OFFSETS_KEY);
    if (!raw) return 0;
    const map = JSON.parse(raw) as Record<string, number>;
    const val = map?.[videoId];
    return typeof val === 'number' && Number.isFinite(val) ? val : 0;
  } catch {
    return 0;
  }
}

function saveLyricOffset(videoId: string, offsetSec: number): void {
  try {
    const raw = localStorage.getItem(LYRIC_OFFSETS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    if (Math.abs(offsetSec) < 0.01) {
      delete map[videoId];
    } else {
      map[videoId] = Math.round(offsetSec * 10) / 10;
    }
    const entries = Object.entries(map).slice(-200);
    localStorage.setItem(LYRIC_OFFSETS_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Ignore storage errors
  }
}

const findActiveIndex = (lines: LyricLine[], currentMs: number): number => {
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  // Slight lookahead matches vocal phrasing naturally
  const target = currentMs + 150;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = lines[mid].timeMs ?? 0;
    if (t <= target) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
};

export const LyricsPanel: React.FC = () => {
  const { currentTrack, currentTime, seekTo } = usePlayerStore(
    useShallow((s) => ({
      currentTrack: s.currentTrack,
      currentTime: s.currentTime,
      seekTo: s.seekTo,
    }))
  );
  const [payload, setPayload] = useState<LyricsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualScroll, setManualScroll] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [bestPartCursor, setBestPartCursor] = useState(0);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [syncOffset, setSyncOffset] = useState<number>(() => loadLyricOffset(currentTrack?.id));
  const [syncOpen, setSyncOpen] = useState(false);

  useEffect(() => {
    setSyncOffset(loadLyricOffset(currentTrack?.id));
    setSyncOpen(false);
  }, [currentTrack?.id]);

  const nudgeSync = (delta: number) => {
    if (!currentTrack?.id) return;
    const next = delta === 0 ? 0 : Math.max(-10, Math.min(10, Math.round((syncOffset + delta) * 10) / 10));
    setSyncOffset(next);
    saveLyricOffset(currentTrack.id, next);
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setManualScroll(false);
    setSelectionMode(false);
    setSelectedIndices([]);
    setBestPartCursor(0);
    setCardModalOpen(false);
    if (!currentTrack) {
      setPayload(null);
      setLoading(false);
      return;
    }

    const cached = clientCache.get(currentTrack.id);
    if (cached) {
      setPayload(cached);
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setPayload(null);

    const params = new URLSearchParams({
      videoId: currentTrack.id,
      title: currentTrack.title,
      artist: currentTrack.artist,
    });
    if (currentTrack.album) params.set('album', currentTrack.album);
    if (currentTrack.duration) params.set('duration', String(Math.round(currentTrack.duration)));

    fetch(`/api/lyrics?${params.toString()}`, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Lyrics request failed'))))
      .then((data: LyricsPayload) => {
        if (data.kind !== 'none') {
          if (clientCache.size >= MAX_LYRICS_CACHE) {
            const oldestKey = clientCache.keys().next().value;
            if (oldestKey !== undefined) clientCache.delete(oldestKey);
          }
          clientCache.set(currentTrack.id, data);
        }
        setPayload(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setPayload({ kind: 'none', source: 'none', lines: [] });
        setLoading(false);
      });

    return () => ctrl.abort();
  }, [currentTrack?.id]);

  const activeIdx = useMemo(() => {
    if (!payload || payload.kind !== 'synced') return -1;
    return findActiveIndex(payload.lines, (currentTime + syncOffset) * 1000);
  }, [payload, currentTime, syncOffset]);

  const selectedLines = useMemo(() => {
    if (!payload?.lines) return [];
    return selectedIndices
      .map((idx) => payload.lines[idx])
      .filter((line): line is LyricLine => Boolean(line && line.text.trim().length > 0));
  }, [selectedIndices, payload?.lines]);

  const recommendations = useMemo(() => {
    if (!payload?.lines || (payload.kind !== 'synced' && payload.kind !== 'plain')) return [];
    return findBestLyricMoments(payload.lines, 3);
  }, [payload]);

  useEffect(() => {
    lineRefs.current.length = payload?.lines ? payload.lines.length : 0;
  }, [payload]);

  useEffect(() => {
    if (manualScroll || activeIdx < 0) return;
    scrollLineInsideContainer(scrollRef.current, lineRefs.current[activeIdx]);
  }, [activeIdx, manualScroll]);

  const pauseAutoScroll = () => {
    if (payload?.kind !== 'synced') return;
    setManualScroll(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => setManualScroll(false), 4500);
  };

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  if (!currentTrack) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <Mic2 className="w-8 h-8 text-ink-3 mb-3" />
        <p className="text-sm font-bold text-ink">No track playing</p>
        <p className="text-sm text-ink-2 mt-1">Play a song to view lyrics.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 px-4 py-4 space-y-4 overflow-hidden" aria-busy="true" aria-label="Loading lyrics">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded-sm bg-raised animate-pulse"
            style={{ width: `${50 + ((i * 19) % 42)}%`, animationDelay: `${i * 70}ms` }}
          />
        ))}
      </div>
    );
  }

  if (!payload || payload.kind === 'none' || (payload.kind !== 'instrumental' && payload.lines.length === 0)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <Mic2 className="w-8 h-8 text-ink-3 mb-3" />
        <p className="text-sm font-bold text-ink">No lyrics available</p>
        <p className="text-sm text-ink-2 mt-1">
          Could not find lyrics for {currentTrack.title}.
        </p>
      </div>
    );
  }

  if (payload.kind === 'instrumental') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <Music2 className="w-8 h-8 text-ink-3 mb-3" />
        <p className="text-sm font-bold text-ink">Instrumental</p>
        <p className="text-sm text-ink-2 mt-1">Enjoy the music.</p>
      </div>
    );
  }

  const enterSelectionMode = () => {
    setSelectionMode(true);
    setManualScroll(true);
    setBestPartCursor(0);
    const activeText = activeIdx >= 0 ? payload?.lines[activeIdx]?.text.trim() ?? '' : '';
    if (activeText && activeText.split(/\s+/).length >= 2) {
      setSelectedIndices([activeIdx]);
      return;
    }
    if (recommendations.length > 0) {
      const topRec = recommendations[0];
      setSelectedIndices(topRec.indices);
      setBestPartCursor(1 % recommendations.length);
      const anchor = topRec.indices[0];
      if (typeof anchor === 'number') {
        requestAnimationFrame(() => {
          scrollLineInsideContainer(scrollRef.current, lineRefs.current[anchor]);
        });
      }
      return;
    }
    const firstNonEmpty = payload.lines.findIndex((l) => l.text.trim().length > 0);
    setSelectedIndices(firstNonEmpty >= 0 ? [firstNonEmpty] : []);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIndices([]);
    setBestPartCursor(0);
    setManualScroll(false);
  };

  const applyBestPart = () => {
    if (recommendations.length === 0) return;
    const recIdx = bestPartCursor % recommendations.length;
    const rec = recommendations[recIdx];
    setSelectedIndices(rec.indices);
    setBestPartCursor((c) => c + 1);
    const anchor = rec.indices[0];
    if (typeof anchor === 'number') {
      requestAnimationFrame(() => {
        scrollLineInsideContainer(scrollRef.current, lineRefs.current[anchor]);
      });
    }
  };

  const topHookIndex = recommendations[0]?.indices[0] ?? -1;

  const isAdjacentAcrossEmpty = (a: number, b: number) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    for (let k = lo + 1; k < hi; k += 1) {
      if (payload.lines[k]?.text.trim().length > 0) return false;
    }
    return true;
  };

  const toggleLineSelection = (index: number) => {
    setSelectedIndices((prev) => {
      if (prev.includes(index)) {
        const remaining = prev.filter((i) => i !== index);
        if (remaining.length <= 1) return remaining;
        // Keep contiguous if user deselected a middle line by keeping the larger remaining side
        const idxPos = prev.indexOf(index);
        if (idxPos === 0 || idxPos === prev.length - 1) return remaining;
        const before = prev.slice(0, idxPos);
        const after = prev.slice(idxPos + 1);
        return before.length >= after.length ? before : after;
      }
      if (prev.length === 0) return [index];
      const min = prev[0];
      const max = prev[prev.length - 1];
      if (index < min && isAdjacentAcrossEmpty(index, min)) {
        const next = [index, ...prev];
        return next.length > 4 ? next.slice(0, 4) : next;
      }
      if (index > max && isAdjacentAcrossEmpty(index, max)) {
        const next = [...prev, index];
        return next.length > 4 ? next.slice(next.length - 4) : next;
      }
      // Tapping a distant line starts a clean new block there
      return [index];
    });
  };

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div className="h-9 pb-2 flex items-center justify-between gap-2 shrink-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={selectionMode ? 'sel-count' : 'read-label'}
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 3 }}
            transition={{ duration: 0.14, ease: EASE_OUT }}
            className="text-[11px] font-medium text-ink-3 tabular-nums truncate"
          >
            {selectionMode
              ? `${selectedIndices.length}/4 selected`
              : payload.kind === 'synced'
                ? 'Synced lyrics'
                : 'Lyrics'}
          </motion.span>
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {selectionMode ? (
            <motion.div
              key="sel-actions"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15, ease: EASE_OUT }}
              className="flex items-center gap-1.5 shrink-0"
            >
              {recommendations.length > 0 && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={applyBestPart}
                  title="Jump to recommended lyric moment"
                  className="h-7 px-2.5 rounded-md bg-raised hover:bg-hover border border-line text-[11px] font-medium text-ink flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    className="w-3 h-3 text-accent shrink-0"
                  >
                    <path
                      d="M3.5 5.5v5M8 2.5v11M12.5 4.5v7"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                  Best part{recommendations.length > 1 && bestPartCursor > 0 ? ` ${((bestPartCursor - 1) % recommendations.length) + 1}/${recommendations.length}` : ''}
                </motion.button>
              )}
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                disabled={selectedLines.length === 0}
                onClick={() => setCardModalOpen(true)}
                className="h-7 px-2.5 rounded-md bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-black text-[11px] font-semibold flex items-center gap-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <Check className="w-3 h-3" />
                Create card
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={exitSelectionMode}
                aria-label="Cancel lyric selection"
                className="w-7 h-7 rounded-md border border-line bg-transparent hover:bg-hover text-ink-2 hover:text-ink flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="share-trigger"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15, ease: EASE_OUT }}
              className="flex items-center gap-1.5 shrink-0"
            >
              {payload.kind === 'synced' &&
                (syncOpen || syncOffset !== 0 ? (
                  <div
                    className="h-7 px-1 rounded-md border border-line bg-transparent flex items-center gap-0.5 text-[11px] text-ink-3 tabular-nums"
                    title="Adjust lyric timing offset"
                  >
                    <button
                      type="button"
                      onClick={() => nudgeSync(-0.5)}
                      aria-label="Delay lyrics by 0.5 seconds"
                      className="px-1.5 h-5 rounded-sm hover:bg-hover hover:text-ink transition-colors"
                    >
                      -0.5s
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        nudgeSync(0);
                        setSyncOpen(false);
                      }}
                      title="Reset and close lyric sync offset"
                      className={`px-1 h-5 rounded-sm transition-colors ${
                        syncOffset !== 0
                          ? 'text-accent hover:bg-hover'
                          : 'text-ink-2 hover:bg-hover hover:text-ink'
                      }`}
                    >
                      {syncOffset > 0 ? `+${syncOffset.toFixed(1)}s` : `${syncOffset.toFixed(1)}s`}
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeSync(0.5)}
                      aria-label="Advance lyrics by 0.5 seconds"
                      className="px-1.5 h-5 rounded-sm hover:bg-hover hover:text-ink transition-colors"
                    >
                      +0.5s
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSyncOpen(true)}
                    aria-label="Adjust lyric timing offset"
                    title="Lyric sync offset"
                    className="h-7 px-2 rounded-md border border-line bg-transparent hover:bg-hover text-[11px] font-medium text-ink-3 hover:text-ink inline-flex items-center gap-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Sync</span>
                  </button>
                ))}
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={enterSelectionMode}
                className="h-7 px-2.5 rounded-md border border-line bg-transparent hover:bg-hover text-[11px] font-medium text-ink-2 hover:text-ink flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <Share2 className="w-3 h-3 text-accent" />
                Share lyric
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        ref={scrollRef}
        onWheel={pauseAutoScroll}
        onTouchMove={pauseAutoScroll}
        className="no-scrollbar flex-1 min-h-0 overflow-y-auto -mx-3.5 pb-24 pt-1 space-y-2.5"
      >
        {payload.kind === 'synced' ? (
          payload.lines.map((line, i) => {
            const isActive = i === activeIdx;
            const isPast = activeIdx >= 0 && i < activeIdx;
            const isSelected = selectionMode && selectedIndices.includes(i);
            const prevSelected = selectionMode && selectedIndices.includes(i - 1);
            const nextSelected = selectionMode && selectedIndices.includes(i + 1);
            const blockRadius = `${!prevSelected ? 'rounded-tr-lg' : ''} ${
              !nextSelected ? 'rounded-br-lg' : ''
            }`;
            return (
              <button
                key={`${line.timeMs}-${i}`}
                ref={(el) => {
                  lineRefs.current[i] = el;
                }}
                onClick={() => {
                  if (selectionMode) {
                    if (line.text.trim()) toggleLineSelection(i);
                    return;
                  }
                  if (typeof line.timeMs === 'number') {
                    setManualScroll(false);
                    seekTo(Math.max(0, line.timeMs / 1000 - syncOffset));
                  }
                }}
                className={`block w-full text-left text-xl sm:text-[25px] leading-[1.42] tracking-[-0.02em] font-bold border-l-2 px-3.5 py-1.5 origin-left transition-[color,opacity,background-color,border-color,transform] duration-200 ease-out active:scale-[0.992] focus:outline-none ${
                  selectionMode
                    ? isSelected
                      ? `border-accent bg-white/[0.06] text-ink opacity-100 ${blockRadius}`
                      : 'border-transparent text-ink-2 opacity-40 hover:opacity-80'
                    : isActive
                      ? 'border-transparent text-ink opacity-100'
                      : isPast
                        ? 'border-transparent text-ink-2 opacity-35 hover:opacity-85'
                        : 'border-transparent text-ink-2 opacity-60 hover:opacity-95'
                }`}
              >
                {selectionMode && i === topHookIndex && (
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-accent mb-1">
                    {recommendations[0].reason}
                  </span>
                )}
                {line.text}
              </button>
            );
          })
        ) : (
          payload.lines.map((line, i) => {
            const isSelected = selectionMode && selectedIndices.includes(i);
            const prevSelected = selectionMode && selectedIndices.includes(i - 1);
            const nextSelected = selectionMode && selectedIndices.includes(i + 1);
            const blockRadius = `${!prevSelected ? 'rounded-tr-lg' : ''} ${
              !nextSelected ? 'rounded-br-lg' : ''
            }`;
            return line.text === '' ? (
              <div key={i} className="h-4" aria-hidden />
            ) : selectionMode ? (
              <button
                key={i}
                ref={(el) => {
                  lineRefs.current[i] = el;
                }}
                type="button"
                onClick={() => toggleLineSelection(i)}
                className={`block w-full text-left text-lg sm:text-xl leading-[1.65] font-medium border-l-2 px-3.5 py-1.5 origin-left transition-[color,opacity,background-color,border-color,transform] duration-200 ease-out active:scale-[0.992] focus:outline-none ${
                  isSelected
                    ? `border-accent bg-white/[0.06] text-ink opacity-100 ${blockRadius}`
                    : 'border-transparent text-ink-2 opacity-45 hover:opacity-85'
                }`}
              >
                {i === topHookIndex && (
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-accent mb-1">
                    {recommendations[0].reason}
                  </span>
                )}
                {line.text}
              </button>
            ) : (
              <p
                key={i}
                className="border-l-2 border-transparent px-3.5 py-1.5 text-lg sm:text-xl leading-[1.65] font-medium text-ink-2"
              >
                {line.text}
              </p>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {!selectionMode && manualScroll && payload.kind === 'synced' && activeIdx >= 0 && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            onClick={() => {
              setManualScroll(false);
              scrollLineInsideContainer(scrollRef.current, lineRefs.current[activeIdx]);
            }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 h-8 px-3.5 rounded-md bg-raised hover:bg-hover border border-line text-xs font-medium text-ink flex items-center gap-1.5"
          >
            <ArrowDown className="w-3.5 h-3.5 text-accent" />
            Follow lyrics
          </motion.button>
        )}
      </AnimatePresence>

      <LyricCardModal
        open={cardModalOpen}
        onClose={() => setCardModalOpen(false)}
        track={currentTrack}
        lines={selectedLines}
      />
    </div>
  );
};
