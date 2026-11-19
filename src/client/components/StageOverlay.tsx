import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Radio,
  Music2,
  Shuffle,
  Repeat,
  Repeat1,
  MoreHorizontal,
  Disc3,
  ListMusic,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../store/usePlayerStore';
import { EQ_PRESET_LABELS } from '../audio/audioEngine';
import { primaryArtist } from '../utils/catalog';
import { EASE_OUT, SPRING } from '../utils/motion';
import { ArtistLinks } from './ArtistLinks';
import { HeartButton } from './HeartButton';
import { LyricsPanel } from './LyricsPanel';
import { EmberDriftCanvas } from './EmberDriftCanvas';
import { TrackArtwork, upgradeThumbnail } from './TrackCard';
import { MenuCoords, TrackContextMenu } from './TrackContextMenu';

export const StageOverlay: React.FC = () => {
  const {
    isStageOpen,
    setStageOpen,
    setQueueOpen,
    currentTrack,
    isPlaying,
    shuffle,
    repeatMode,
    toggleShuffle,
    toggleRepeat,
    startRadio,
    queue,
    openCollection,
    eqPreset,
    crossfadeSeconds,
    sleepMode,
    sleepEndsAt,
  } = usePlayerStore(
    useShallow((s) => ({
      isStageOpen: s.isStageOpen,
      setStageOpen: s.setStageOpen,
      setQueueOpen: s.setQueueOpen,
      currentTrack: s.currentTrack,
      isPlaying: s.isPlaying,
      shuffle: s.shuffle,
      repeatMode: s.repeatMode,
      toggleShuffle: s.toggleShuffle,
      toggleRepeat: s.toggleRepeat,
      startRadio: s.startRadio,
      queue: s.queue,
      openCollection: s.openCollection,
      eqPreset: s.eqPreset,
      crossfadeSeconds: s.crossfadeSeconds,
      sleepMode: s.sleepMode,
      sleepEndsAt: s.sleepEndsAt,
    }))
  );

  const [, setSleepTick] = useState(0);
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const upNextTrack = queue[0] ?? null;

  useEffect(() => {
    if (!isStageOpen || sleepMode !== 'timer') return;
    const t = setInterval(() => setSleepTick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, [isStageOpen, sleepMode]);

  useEffect(() => {
    if (!isStageOpen) {
      setMenuCoords(null);
      if (prevFocusRef.current && prevFocusRef.current.isConnected) {
        prevFocusRef.current.focus();
      }
      prevFocusRef.current = null;
      return;
    }
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => closeBtnRef.current?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setStageOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isStageOpen, setStageOpen]);

  const sleepMinLeft =
    sleepMode === 'timer' && sleepEndsAt
      ? Math.max(1, Math.ceil((sleepEndsAt - Date.now()) / 60_000))
      : null;

  const linerNotes = [
    eqPreset !== 'flat' ? EQ_PRESET_LABELS[eqPreset] : null,
    crossfadeSeconds > 0 ? `${crossfadeSeconds}s crossfade` : null,
    sleepMode === 'track_end'
      ? 'Stops after this song'
      : sleepMode === 'timer' && sleepMinLeft
      ? `Sleep timer · ${sleepMinLeft}m left`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const ambientArt = currentTrack
    ? upgradeThumbnail(currentTrack.thumbnail, currentTrack.id, 'xs')
    : '';

  const openTrackAlbum = () => {
    if (!currentTrack || (!currentTrack.albumId && !currentTrack.album)) return;
    setStageOpen(false);
    openCollection({
      title: currentTrack.album || currentTrack.title,
      kind: 'Album',
      albumId: currentTrack.albumId,
      artist: primaryArtist(currentTrack.artist),
      thumbnail: currentTrack.thumbnail,
      tracks: [],
    });
  };

  return (
    <AnimatePresence>
      {isStageOpen && (
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-label="Now playing"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
          className="fixed inset-x-0 top-0 electron-top-bar bottom-[76px] z-40 bg-base/[0.97] border-t border-line flex flex-col overflow-hidden select-none"
        >
          {/* Subtle atmospheric backdrop derived from active cover art */}
          {ambientArt && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              <img
                src={ambientArt}
                alt=""
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover scale-125 blur-[96px] opacity-[0.14] saturate-150 transition-opacity duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-base/70 via-base/80 to-base/95" />
            </div>
          )}

          <EmberDriftCanvas active={isStageOpen} isPlaying={isPlaying} />

          {/* Minimal header bar */}
          <header className="relative z-10 h-14 px-6 sm:px-10 border-b border-line flex items-center justify-between gap-4 shrink-0">
            <span className="text-xs font-medium text-ink-3">Now playing</span>

            <button
              ref={closeBtnRef}
              onClick={() => setStageOpen(false)}
              aria-label="Close now playing (Esc)"
              title="Close (Esc)"
              className="h-8 px-3 rounded-md border border-line hover:bg-surface text-xs text-ink-2 hover:text-ink inline-flex items-center gap-1.5 transition-colors"
            >
              <span className="hidden sm:inline text-xs">Close</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </header>

          {/* Main centered 2-column stage */}
          <div className="relative z-10 flex-1 min-h-0 max-w-6xl w-full mx-auto px-6 sm:px-10 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] gap-8 lg:gap-16">
            {/* Editorial artwork & calm track anchor */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentTrack?.id ?? 'empty'}
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.985 }}
                transition={{ duration: 0.22, ease: EASE_OUT }}
                className="flex flex-row lg:flex-col items-center lg:items-start lg:justify-center gap-5 lg:gap-0 min-w-0"
              >
                <div className="w-20 h-20 sm:w-28 sm:h-28 lg:w-full lg:h-auto lg:max-w-[340px] aspect-square rounded-lg overflow-hidden bg-surface ring-1 ring-white/[0.1] shadow-2xl shrink-0">
                  {currentTrack ? (
                    <TrackArtwork track={currentTrack} size="lg" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-3">
                      <Music2 className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {currentTrack ? (
                  <div className="min-w-0 lg:mt-6 w-full">
                    <h1 className="text-xl sm:text-2xl lg:text-[28px] font-bold leading-[1.14] tracking-[-0.025em] text-ink line-clamp-2">
                      {currentTrack.title}
                    </h1>
                    <div className="mt-2 flex items-center gap-2 text-sm text-ink-2 min-w-0">
                      <ArtistLinks
                        artist={currentTrack.artist}
                        artistId={currentTrack.artistId}
                        onNavigate={() => setStageOpen(false)}
                        className="truncate min-w-0"
                        linkClassName="hover:text-ink hover:underline transition-colors"
                      />
                      {currentTrack.album && (
                        <>
                          <span className="text-ink-3 shrink-0">·</span>
                          <button
                            onClick={openTrackAlbum}
                            className="truncate text-ink-3 hover:text-ink hover:underline transition-colors text-left"
                          >
                            {currentTrack.album}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Non-redundant track actions (player deck below owns transport/seek/EQ) */}
                    <div className="mt-4 lg:mt-5 flex flex-wrap items-center gap-2">
                      <HeartButton track={currentTrack} />
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        transition={SPRING}
                        onClick={() => startRadio(currentTrack)}
                        className="h-9 px-3.5 rounded-md border border-line bg-surface/60 hover:bg-surface text-xs font-medium text-ink-2 hover:text-ink inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Radio</span>
                      </motion.button>
                      {(currentTrack.albumId || currentTrack.album) && (
                        <button
                          onClick={openTrackAlbum}
                          className="hidden sm:inline-flex h-9 px-3.5 rounded-md border border-line bg-surface/60 hover:bg-surface text-xs font-medium text-ink-2 hover:text-ink items-center gap-1.5 transition-colors"
                        >
                          <Disc3 className="w-3.5 h-3.5" />
                          <span>Album</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (menuCoords) {
                            setMenuCoords(null);
                            return;
                          }
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuCoords({ x: rect.left, y: rect.bottom + 6 });
                        }}
                        aria-label="More options"
                        aria-haspopup="menu"
                        aria-expanded={menuCoords !== null}
                        className="w-9 h-9 rounded-md border border-line bg-surface/60 hover:bg-surface text-ink-2 hover:text-ink flex items-center justify-center transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Shuffle / Repeat surfaced only on narrow phones where footer hides them */}
                      <button
                        onClick={toggleShuffle}
                        aria-label="Toggle shuffle"
                        aria-pressed={shuffle}
                        className={`sm:hidden w-9 h-9 rounded-md border flex items-center justify-center transition-colors ${
                          shuffle
                            ? 'border-accent/40 bg-accent/10 text-accent'
                            : 'border-line text-ink-2 hover:text-ink hover:bg-surface'
                        }`}
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={toggleRepeat}
                        aria-label={`Repeat ${repeatMode}`}
                        aria-pressed={repeatMode !== 'off'}
                        className={`sm:hidden w-9 h-9 rounded-md border flex items-center justify-center transition-colors ${
                          repeatMode !== 'off'
                            ? 'border-accent/40 bg-accent/10 text-accent'
                            : 'border-line text-ink-2 hover:text-ink hover:bg-surface'
                        }`}
                      >
                        {repeatMode === 'one' ? (
                          <Repeat1 className="w-3.5 h-3.5" />
                        ) : (
                          <Repeat className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {linerNotes && (
                      <p className="hidden lg:block mt-4 text-xs text-ink-3 leading-relaxed">
                        {linerNotes}
                      </p>
                    )}

                    {upNextTrack && (
                      <button
                        type="button"
                        onClick={() => {
                          setStageOpen(false);
                          setQueueOpen(true);
                        }}
                        aria-label={`Up next: ${upNextTrack.title} by ${upNextTrack.artist}. Open queue`}
                        className="mt-4 pt-3 border-t border-line/70 w-full flex items-center justify-between gap-3 text-left text-xs text-ink-3 hover:text-ink-2 transition-colors group"
                      >
                        <span className="truncate">
                          <span>Up next: </span>
                          <span className="text-ink-2 group-hover:text-ink font-medium">
                            {upNextTrack.title}
                          </span>
                          <span> — {upNextTrack.artist}</span>
                        </span>
                        <ListMusic className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                      </button>
                    )}

                    <TrackContextMenu
                      track={currentTrack}
                      coords={menuCoords}
                      onClose={() => setMenuCoords(null)}
                    />
                  </div>
                ) : (
                  <div className="lg:mt-6">
                    <p className="text-lg font-semibold text-ink">Nothing playing</p>
                    <p className="text-sm text-ink-2 mt-1">
                      Play any song to see lyrics and artwork here.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Focused synced lyrics */}
            <div className="min-h-0 flex flex-col max-w-2xl w-full mx-auto lg:mx-0">
              <LyricsPanel />
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};
