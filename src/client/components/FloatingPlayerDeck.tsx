import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume1,
  Volume2,
  VolumeX,
  ListMusic,
  Loader2,
  RotateCcw,
  Mic2,
  SlidersHorizontal,
  Moon,
  Maximize2,
  X,
} from 'lucide-react';
import {
  audioEngine,
  DeckId,
  EQ_PRESET_LABELS,
  EqBands,
  EqPresetId,
} from '../audio/audioEngine';
import { StreamMeta, usePlayerStore } from '../store/usePlayerStore';
import { toast } from '../store/useToastStore';
import { primaryArtist } from '../utils/catalog';
import { ArtistLinks } from './ArtistLinks';
import { TrackArtwork, formatDuration } from './TrackCard';
import { HeartButton } from './HeartButton';
import { Slider } from './Slider';
import { EASE_OUT, popoverVariants, SPRING, SPRING_LAYOUT } from '../utils/motion';

const MAX_CLIENT_CACHE = 200;
const trackMetaCache = new Map<string, StreamMeta>();
const prewarmedIds = new Set<string>();
const MAX_CONSECUTIVE_ERRORS = 2;

const fetchAndCacheMeta = async (videoId: string): Promise<StreamMeta | null> => {
  const cached = trackMetaCache.get(videoId);
  if (cached) {
    trackMetaCache.delete(videoId);
    trackMetaCache.set(videoId, cached);
    return cached;
  }
  try {
    const res = await fetch(`/api/track/${encodeURIComponent(videoId)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      format?: string;
      bitrate?: number;
      clientUsed?: string;
    };
    const meta: StreamMeta = {
      videoId,
      format: data.format || 'audio/mp4',
      bitrate: data.bitrate,
      clientUsed: data.clientUsed,
    };
    if (trackMetaCache.size >= MAX_CLIENT_CACHE) {
      const oldestKey = trackMetaCache.keys().next().value;
      if (oldestKey !== undefined) trackMetaCache.delete(oldestKey);
    }
    trackMetaCache.set(videoId, meta);
    return meta;
  } catch {
    return null;
  }
};

interface EqBandSliderProps {
  label: string;
  value: number; // -6..6 step 0.5
  onChange: (next: number) => void;
}

/** Center-zero bipolar slider for EQ bands (-6 to +6) with double-click reset to 0. */
const EqBandSlider: React.FC<EqBandSliderProps> = ({ label, value, onChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [active, setActive] = useState(false);

  const valueFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return value;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = -6 + ratio * 12;
    return Math.round(raw * 2) / 2;
  };

  const ratio = (value + 6) / 12; // 0..1 where 0.5 is 0
  const fillLeftPct = value >= 0 ? 50 : ratio * 100;
  const fillWidthPct = Math.abs(ratio - 0.5) * 100;

  return (
    <div className="grid grid-cols-[56px_1fr_34px] items-center gap-3">
      <button
        type="button"
        onDoubleClick={() => onChange(0)}
        title={`Double-click to reset ${label.toLowerCase()}`}
        className="text-left text-xs text-ink-2 hover:text-ink transition-colors"
      >
        {label}
      </button>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={`${label} level`}
        aria-valuemin={-6}
        aria-valuemax={6}
        aria-valuenow={value}
        aria-valuetext={`${value > 0 ? `+${value}` : value}`}
        onDoubleClick={() => onChange(0)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragging.current = true;
          setActive(true);
          onChange(valueFromClientX(e.clientX));
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          onChange(valueFromClientX(e.clientX));
        }}
        onPointerUp={() => {
          dragging.current = false;
          setActive(false);
        }}
        onPointerCancel={() => {
          dragging.current = false;
          setActive(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            onChange(Math.min(6, value + 0.5));
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            onChange(Math.max(-6, value - 0.5));
          } else if (e.key === 'Home') {
            e.preventDefault();
            onChange(-6);
          } else if (e.key === 'End') {
            e.preventDefault();
            onChange(6);
          } else if (e.key === '0') {
            e.preventDefault();
            onChange(0);
          }
        }}
        className="group relative h-5 flex items-center cursor-pointer touch-none focus:outline-none"
      >
        <div className="relative w-full h-1 rounded-full bg-white/[0.1]">
          {/* Center zero tick mark */}
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-2 rounded-full bg-white/20"
          />
          {fillWidthPct > 0 && (
            <div
              className={`absolute inset-y-0 rounded-full transition-colors ${
                value > 0 ? 'bg-accent' : 'bg-ink-2/60'
              }`}
              style={{ left: `${fillLeftPct}%`, width: `${fillWidthPct}%` }}
            />
          )}
          <div
            className="absolute top-1/2 pointer-events-none"
            style={{ left: `${ratio * 100}%` }}
          >
            <motion.div
              animate={{ scale: active ? 1.2 : 1 }}
              transition={SPRING}
              className={`w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-raised shadow-sm transition-colors ${
                value !== 0 || active
                  ? 'bg-ink group-hover:bg-white'
                  : 'bg-ink-2 group-hover:bg-ink'
              }`}
            />
          </div>
        </div>
      </div>

      <span
        className={`text-[11px] text-right tabular-nums transition-colors ${
          value > 0 ? 'text-accent font-medium' : value < 0 ? 'text-ink-2' : 'text-ink-3'
        }`}
      >
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
};

const AudioTuningPopover: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const {
    crossfadeSeconds,
    setCrossfadeSeconds,
    eqPreset,
    setEqPreset,
    eqBands,
    setEqBand,
    loudnessNormalization,
    setLoudnessNormalization,
    sleepMode,
    sleepEndsAt,
    sleepPresetMinutes,
    setSleepTimer,
  } = usePlayerStore(
    useShallow((s) => ({
      crossfadeSeconds: s.crossfadeSeconds,
      setCrossfadeSeconds: s.setCrossfadeSeconds,
      eqPreset: s.eqPreset,
      setEqPreset: s.setEqPreset,
      eqBands: s.eqBands,
      setEqBand: s.setEqBand,
      loudnessNormalization: s.loudnessNormalization,
      setLoudnessNormalization: s.setLoudnessNormalization,
      sleepMode: s.sleepMode,
      sleepEndsAt: s.sleepEndsAt,
      sleepPresetMinutes: s.sleepPresetMinutes,
      setSleepTimer: s.setSleepTimer,
    }))
  );

  const [, setTick] = useState(0);

  useEffect(() => {
    if (sleepMode !== 'timer') return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [sleepMode]);

  const remainingLabel =
    sleepMode === 'timer' && sleepEndsAt
      ? `${Math.max(1, Math.ceil((sleepEndsAt - Date.now()) / 60_000))}m left`
      : sleepMode === 'track_end'
      ? 'After song'
      : 'Off';

  const hasCustomSound =
    eqPreset !== 'flat' ||
    crossfadeSeconds > 0 ||
    loudnessNormalization ||
    sleepMode !== 'off';

  const resetAll = () => {
    setEqPreset('flat');
    setCrossfadeSeconds(0);
    setLoudnessNormalization(false);
    setSleepTimer('off');
  };

  const presetKeys: Exclude<EqPresetId, 'custom'>[] = ['flat', 'bass', 'vocal', 'night'];
  const bandKeys: { key: keyof EqBands; label: string }[] = [
    { key: 'low', label: 'Bass' },
    { key: 'mid', label: 'Vocals' },
    { key: 'high', label: 'Treble' },
  ];

  return (
    <motion.div
      variants={popoverVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      role="dialog"
      aria-label="Sound settings and sleep timer"
      className="absolute right-0 bottom-full mb-3 w-[324px] p-4 rounded-xl bg-raised/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.65)] z-50 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold tracking-[-0.01em] text-ink">
          Sound settings
        </span>
        <div className="flex items-center gap-1.5">
          {hasCustomSound && (
            <button
              type="button"
              onClick={resetAll}
              className="h-6 px-2 rounded-md text-[11px] font-medium text-ink-3 hover:text-ink hover:bg-white/[0.06] transition-colors"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sound settings"
            className="w-6 h-6 rounded-md flex items-center justify-center text-ink-3 hover:text-ink hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Equalizer */}
      <div className="pt-3 border-t border-white/[0.06] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ink-2">Equalizer</span>
          <span
            className={`text-[11px] font-medium transition-colors ${
              eqPreset !== 'flat' ? 'text-accent' : 'text-ink-3'
            }`}
          >
            {EQ_PRESET_LABELS[eqPreset]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {presetKeys.map((preset) => {
            const active = eqPreset === preset;
            return (
              <motion.button
                key={preset}
                type="button"
                whileTap={{ scale: 0.97 }}
                transition={SPRING}
                onClick={() => {
                  audioEngine.ensureGraph();
                  setEqPreset(preset);
                }}
                className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                  active
                    ? 'bg-white/[0.1] text-ink ring-1 ring-white/[0.14]'
                    : 'bg-base/60 text-ink-2 hover:text-ink hover:bg-white/[0.05]'
                }`}
              >
                <span>{EQ_PRESET_LABELS[preset]}</span>
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="pt-1 space-y-2">
          {bandKeys.map(({ key, label }) => (
            <EqBandSlider
              key={key}
              label={label}
              value={eqBands[key]}
              onChange={(next) => {
                audioEngine.ensureGraph();
                setEqBand(key, next);
              }}
            />
          ))}
        </div>
      </div>

      {/* Crossfade */}
      <div className="pt-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-ink-2">Crossfade</span>
          <span
            className={`text-[11px] font-medium tabular-nums ${
              crossfadeSeconds > 0 ? 'text-accent' : 'text-ink-3'
            }`}
          >
            {crossfadeSeconds === 0 ? 'Off' : `${crossfadeSeconds}s fade`}
          </span>
        </div>
        <div className="p-1 rounded-lg bg-base/80 border border-white/[0.05] grid grid-cols-3 gap-0.5">
          {[0, 3, 6].map((sec) => {
            const active = crossfadeSeconds === sec;
            return (
              <button
                key={sec}
                type="button"
                onClick={() => setCrossfadeSeconds(sec)}
                className={`relative h-7 rounded-md text-xs font-medium tabular-nums transition-colors ${
                  active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="crossfade-seg"
                    transition={SPRING_LAYOUT}
                    className="absolute inset-0 rounded-md bg-raised ring-1 ring-white/[0.1] shadow-sm"
                  />
                )}
                <span className="relative z-10">{sec === 0 ? 'Off' : `${sec}s`}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loudness Normalization */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-xs font-medium text-ink-2">Loudness normalization</span>
          <span className="block text-[10px] text-ink-3">Smooth volume jumps across tracks</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={loudnessNormalization}
          onClick={() => setLoudnessNormalization(!loudnessNormalization)}
          className={`h-7 px-3 rounded-md border text-[11px] font-semibold transition-colors shrink-0 ${
            loudnessNormalization
              ? 'bg-accent border-accent text-black'
              : 'bg-base/80 border-white/[0.08] text-ink-3 hover:text-ink-2'
          }`}
        >
          {loudnessNormalization ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Sleep Timer */}
      <div className="pt-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-ink-2 inline-flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5 text-ink-3" />
            Sleep timer
          </span>
          <span
            className={`text-[11px] font-medium tabular-nums ${
              sleepMode !== 'off' ? 'text-accent' : 'text-ink-3'
            }`}
          >
            {remainingLabel}
          </span>
        </div>
        <div className="p-1 rounded-lg bg-base/80 border border-white/[0.05] grid grid-cols-5 gap-0.5">
          {(
            [
              { id: 'off', label: 'Off' },
              { id: 15, label: '15m' },
              { id: 30, label: '30m' },
              { id: 60, label: '60m' },
              { id: 'track_end', label: 'End' },
            ] as const
          ).map((opt) => {
            const active =
              (opt.id === 'off' && sleepMode === 'off') ||
              (opt.id === 'track_end' && sleepMode === 'track_end') ||
              (typeof opt.id === 'number' &&
                sleepMode === 'timer' &&
                sleepPresetMinutes === opt.id);
            return (
              <button
                key={String(opt.id)}
                type="button"
                onClick={() => setSleepTimer(opt.id)}
                className={`relative h-7 rounded-md text-xs font-medium tabular-nums transition-colors ${
                  active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="sleep-seg"
                    transition={SPRING_LAYOUT}
                    className="absolute inset-0 rounded-md bg-raised ring-1 ring-white/[0.1] shadow-sm"
                  />
                )}
                <span className="relative z-10">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export const FloatingPlayerDeck: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isLoadingStream,
    currentTime,
    seekNonce,
    duration,
    volume,
    isMuted,
    shuffle,
    repeatMode,
    autoplay,
    crossfadeSeconds,
    eqPreset,
    eqBands,
    loudnessNormalization,
    sleepMode,
    sleepEndsAt,
    queue,
    isQueueOpen,
    isStageOpen,
    setQueueOpen,
    setStageOpen,
    setStreamMeta,
    setSleepTimer,
    togglePlay,
    setIsPlaying,
    setIsLoadingStream,
    nextTrack,
    prevTrack,
    seekTo,
    setCurrentTime,
    setDuration,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    openCollection,
    goBack,
    goForward,
    setShortcutsOpen,
  } = usePlayerStore();

  const deckARef = useRef<HTMLAudioElement | null>(null);
  const deckBRef = useRef<HTMLAudioElement | null>(null);
  const activeDeckRef = useRef<DeckId>('a');
  const pendingCrossfadeRef = useRef(false);
  const crossfadeTriggeredForIdRef = useRef<string | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const playSeqRef = useRef(0);
  const activeLoadSeqRef = useRef(0);
  const restoredSeekRef = useRef<{ id: string; time: number } | null>(null);

  const [scrubRatio, setScrubRatio] = useState<number | null>(null);
  const [bufferedRatio, setBufferedRatio] = useState(0);
  const scrubbingRef = useRef(false);
  const [streamError, setStreamError] = useState(false);
  const [tuningOpen, setTuningOpen] = useState(false);
  const tuningWrapRef = useRef<HTMLDivElement>(null);

  // Track initial restored track so we preload without auto-playing on page open
  const restoredPendingRef = useRef<{ id: string; time: number } | null>(
    usePlayerStore.getState().currentTrack && !usePlayerStore.getState().isPlaying
      ? {
          id: usePlayerStore.getState().currentTrack!.id,
          time: usePlayerStore.getState().currentTime,
        }
      : null
  );

  scrubbingRef.current = scrubRatio !== null;

  const getActiveAudio = (): HTMLAudioElement | null =>
    activeDeckRef.current === 'a' ? deckARef.current : deckBRef.current;

  // Bind dual audio elements into AudioEngine once mounted and release on unmount
  useEffect(() => {
    audioEngine.attachDecks(deckARef.current, deckBRef.current);
    return () => {
      audioEngine.attachDecks(null, null);
    };
  }, []);

  // Sync EQ bands & master volume into AudioEngine
  useEffect(() => {
    audioEngine.setMasterVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  useEffect(() => {
    audioEngine.setEqBands(eqBands);
  }, [eqBands]);

  useEffect(() => {
    audioEngine.setLoudnessNormalization(loudnessNormalization);
  }, [loudnessNormalization]);

  // Close tuning popover on outside click / Escape
  useEffect(() => {
    if (!tuningOpen) return;
    const onDown = (e: MouseEvent) => {
      if (tuningWrapRef.current && !tuningWrapRef.current.contains(e.target as Node)) {
        setTuningOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTuningOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [tuningOpen]);

  // Sleep timer countdown + soft final 5s attenuation
  useEffect(() => {
    if (sleepMode !== 'timer' || sleepEndsAt === null) {
      audioEngine.setSleepAttenuation(1);
      return;
    }
    const tick = () => {
      const remainingMs = sleepEndsAt - Date.now();
      if (remainingMs <= 0) {
        audioEngine.setSleepAttenuation(1);
        setIsPlaying(false);
        setSleepTimer('off');
        toast('Sleep timer paused playback');
        return;
      }
      if (remainingMs <= 5000) {
        audioEngine.setSleepAttenuation(Math.max(0.05, remainingMs / 5000));
      } else {
        audioEngine.setSleepAttenuation(1);
      }
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [sleepMode, sleepEndsAt, setIsPlaying, setSleepTimer]);

  // Global shortcuts: Space, seek/track arrows, M (mute), L (stage), Q (queue), N/P, Alt+Arrows (history), ? (help)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (e.code === 'ArrowLeft') {
          e.preventDefault();
          goBack();
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          goForward();
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
        e.preventDefault();
        const state = usePlayerStore.getState();
        setShortcutsOpen(!state.isShortcutsOpen);
        return;
      }

      if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (e.code === 'ArrowRight') {
          e.preventDefault();
          nextTrack();
          return;
        }
        if (e.code === 'ArrowLeft') {
          e.preventDefault();
          prevTrack();
          return;
        }
      }

      if (e.shiftKey) return;

      const audio = getActiveAudio();
      if (e.code === 'Space') {
        const role = el?.getAttribute('role');
        if (tag === 'BUTTON' || role === 'button' || role === 'slider' || role === 'switch') return;
        e.preventDefault();
        audioEngine.ensureGraph();
        togglePlay();
      } else if (e.code === 'ArrowLeft' && audio) {
        e.preventDefault();
        const t = Math.max(0, audio.currentTime - 5);
        audio.currentTime = t;
        setCurrentTime(t);
      } else if (e.code === 'ArrowRight' && audio) {
        e.preventDefault();
        const t = Math.min(audio.duration || 0, audio.currentTime + 5);
        audio.currentTime = t;
        setCurrentTime(t);
      } else if (e.code === 'KeyN') {
        e.preventDefault();
        nextTrack();
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        prevTrack();
      } else if (e.code === 'KeyM') {
        toggleMute();
      } else if (e.code === 'KeyL') {
        const state = usePlayerStore.getState();
        setStageOpen(!state.isStageOpen);
      } else if (e.code === 'KeyQ') {
        const state = usePlayerStore.getState();
        setQueueOpen(!state.isQueueOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    togglePlay,
    toggleMute,
    setCurrentTime,
    setStageOpen,
    setQueueOpen,
    setShortcutsOpen,
    nextTrack,
    prevTrack,
    goBack,
    goForward,
  ]);

  // Load the stream when the track changes (handling crossfade A/B swap vs hard switch)
  useEffect(() => {
    setStreamError(false);
    setBufferedRatio(0);
    crossfadeTriggeredForIdRef.current = null;

    if (!currentTrack) {
      pendingCrossfadeRef.current = false;
      audioEngine.cancelFade(activeDeckRef.current);
      const activeEl = getActiveAudio();
      if (activeEl) {
        activeEl.pause();
        activeEl.removeAttribute('src');
        activeEl.load();
      }
      setStreamMeta(null);
      return;
    }

    const useCrossfade = pendingCrossfadeRef.current && crossfadeSeconds > 0;
    pendingCrossfadeRef.current = false;

    const targetDeck: DeckId = useCrossfade
      ? activeDeckRef.current === 'a'
        ? 'b'
        : 'a'
      : activeDeckRef.current;

    activeDeckRef.current = targetDeck;
    const targetEl = targetDeck === 'a' ? deckARef.current : deckBRef.current;
    if (!targetEl) return;

    if (!useCrossfade) {
      audioEngine.cancelFade(targetDeck);
    }

    // Fetch codec/bitrate telemetry cleanly in background
    fetchAndCacheMeta(currentTrack.id).then((meta) => {
      if (meta && usePlayerStore.getState().currentTrack?.id === currentTrack.id) {
        setStreamMeta(meta);
      }
    });

    const restored = restoredPendingRef.current;
    if (restored && restored.id === currentTrack.id && !isPlaying) {
      restoredPendingRef.current = null;
      restoredSeekRef.current = restored.time > 0 ? restored : null;
      activeLoadSeqRef.current = 0;
      targetEl.src = `/api/stream/${encodeURIComponent(currentTrack.id)}`;
      targetEl.preload = 'metadata';
      targetEl.load();
      return;
    }
    restoredPendingRef.current = null;
    restoredSeekRef.current = null;

    const playSeq = ++playSeqRef.current;
    activeLoadSeqRef.current = playSeq;
    audioEngine.ensureGraph();
    setIsLoadingStream(true);
    targetEl.preload = 'auto';
    targetEl.src = `/api/stream/${encodeURIComponent(currentTrack.id)}`;
    targetEl.load();
    targetEl
      .play()
      .then(() => {
        if (activeLoadSeqRef.current === playSeq) activeLoadSeqRef.current = 0;
        if (playSeq !== playSeqRef.current) return;
        if (useCrossfade) {
          audioEngine.crossfadeTo(targetDeck, crossfadeSeconds);
        }
        setIsPlaying(true);
        setIsLoadingStream(false);
      })
      .catch((err) => {
        if (activeLoadSeqRef.current === playSeq) activeLoadSeqRef.current = 0;
        if (playSeq !== playSeqRef.current) return;
        if (err?.name !== 'AbortError') {
          setIsPlaying(false);
          setIsLoadingStream(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  // Mirror play state onto the active element
  useEffect(() => {
    const audio = getActiveAudio();
    if (!audio || !currentTrack) return;
    if (isPlaying && audio.paused) {
      if (activeLoadSeqRef.current !== 0 && activeLoadSeqRef.current === playSeqRef.current) {
        return;
      }
      const playSeq = ++playSeqRef.current;
      audioEngine.ensureGraph();
      audio.play().catch((err) => {
        if (playSeq === playSeqRef.current && err?.name !== 'AbortError') {
          setIsPlaying(false);
        }
      });
    } else if (!isPlaying) {
      activeLoadSeqRef.current = 0;
      audioEngine.cancelFade(activeDeckRef.current);
      if (!audio.paused) audio.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentTrack?.id, setIsPlaying]);

  // Honour explicit store seeks (prev-track restart, repeat-one, lyrics click-to-seek)
  useEffect(() => {
    const audio = getActiveAudio();
    if (!audio || scrubbingRef.current || seekNonce === 0) return;
    audioEngine.cancelFade(activeDeckRef.current);
    if (isFinite(currentTime)) audio.currentTime = currentTime;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekNonce]);

  // Bounded auto-skip after stream failure when tracks are queued
  useEffect(() => {
    if (!streamError || queue.length === 0) return;
    if (consecutiveErrorsRef.current > MAX_CONSECUTIVE_ERRORS) {
      toast("Couldn't play this song — tap Retry or pick another");
      return;
    }
    const t = setTimeout(() => {
      nextTrack();
    }, 2200);
    return () => clearTimeout(t);
  }, [streamError, queue.length, nextTrack]);

  // Browser & OS Media Session controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    if (!currentTrack) {
      ms.metadata = null;
      ms.playbackState = 'none';
      return;
    }
    try {
      const artworkUrl =
        currentTrack.thumbnail || `https://i.ytimg.com/vi/${currentTrack.id}/mqdefault.jpg`;
      ms.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'Ohm',
        artwork: [{ src: artworkUrl, sizes: '544x544', type: 'image/jpeg' }],
      });
      ms.playbackState = isPlaying ? 'playing' : 'paused';
      ms.setActionHandler('play', () => setIsPlaying(true));
      ms.setActionHandler('pause', () => setIsPlaying(false));
      ms.setActionHandler('previoustrack', () => prevTrack());
      ms.setActionHandler('nexttrack', () => nextTrack());
      ms.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number') seekTo(details.seekTime);
      });
    } catch {
      // Unsupported browser field
    }
  }, [currentTrack, isPlaying, setIsPlaying, prevTrack, nextTrack, seekTo]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack || duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(duration, Math.max(0, currentTime)),
      });
    } catch {
      // Ignore position state errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack, duration, Math.floor(currentTime)]);

  const retryStream = () => {
    const audio = getActiveAudio();
    if (!audio || !currentTrack) return;
    const playSeq = ++playSeqRef.current;
    consecutiveErrorsRef.current = 0;
    audioEngine.cancelFade(activeDeckRef.current);
    audioEngine.ensureGraph();
    setStreamError(false);
    setIsLoadingStream(true);
    audio.src = `/api/stream/${encodeURIComponent(currentTrack.id)}?r=${Date.now()}`;
    audio.load();
    audio
      .play()
      .then(() => {
        if (playSeq !== playSeqRef.current) return;
        setIsPlaying(true);
        setIsLoadingStream(false);
      })
      .catch((err) => {
        if (playSeq !== playSeqRef.current) return;
        if (err?.name !== 'AbortError') {
          setIsPlaying(false);
          setIsLoadingStream(false);
        }
      });
  };

  const syncBuffered = (audio: HTMLAudioElement) => {
    if (!audio.duration || audio.buffered.length === 0) return;
    const end = audio.buffered.end(audio.buffered.length - 1);
    setBufferedRatio(Math.min(1, Math.max(0, end / audio.duration)));
  };

  const handleEnded = (deckId: DeckId) => {
    if (deckId !== activeDeckRef.current) return;
    const audio = getActiveAudio();
    if (sleepMode === 'track_end') {
      setIsPlaying(false);
      setSleepTimer('off');
      toast('Paused after song finished');
      return;
    }
    if (repeatMode === 'one' && audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      nextTrack();
    }
  };

  const bindDeckProps = (deckId: DeckId) => ({
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLAudioElement>) => {
      if (deckId !== activeDeckRef.current) return;
      const audio = e.currentTarget;
      const pendingSeek = restoredSeekRef.current;
      if (pendingSeek && currentTrack && pendingSeek.id === currentTrack.id) {
        restoredSeekRef.current = null;
        if (pendingSeek.time > 0 && isFinite(pendingSeek.time)) {
          audio.currentTime = Math.min(pendingSeek.time, audio.duration || pendingSeek.time);
        }
        return;
      }
      if (!isPlaying && currentTime > 0 && isFinite(currentTime) && Math.abs(audio.currentTime - currentTime) > 0.5) {
        audio.currentTime = Math.min(currentTime, audio.duration || currentTime);
      }
    },
    onProgress: (e: React.SyntheticEvent<HTMLAudioElement>) => {
      if (deckId !== activeDeckRef.current) return;
      syncBuffered(e.currentTarget);
    },
    onTimeUpdate: (e: React.SyntheticEvent<HTMLAudioElement>) => {
      if (deckId !== activeDeckRef.current) return;
      const audio = e.currentTarget;
      if (!scrubbingRef.current) {
        setCurrentTime(audio.currentTime);
        syncBuffered(audio);
      }
      const dur = audio.duration;
      if (!dur || !isFinite(dur) || dur <= 0) return;

      // Pre-warm next track stream cache at 80% progress
      const ratio = audio.currentTime / dur;
      const next = !shuffle ? queue[0] : undefined;
      if (ratio >= 0.8 && next && !prewarmedIds.has(next.id)) {
        if (prewarmedIds.size >= MAX_CLIENT_CACHE) {
          const oldest = prewarmedIds.values().next().value;
          if (oldest !== undefined) prewarmedIds.delete(oldest);
        }
        prewarmedIds.add(next.id);
        fetchAndCacheMeta(next.id);
      }

      // Trigger seamless dual-deck overlap crossfade
      if (
        crossfadeSeconds > 0 &&
        repeatMode !== 'one' &&
        (queue.length > 0 || autoplay) &&
        dur > crossfadeSeconds + 6 &&
        dur - audio.currentTime <= crossfadeSeconds &&
        currentTrack &&
        crossfadeTriggeredForIdRef.current !== currentTrack.id &&
        sleepMode !== 'track_end'
      ) {
        crossfadeTriggeredForIdRef.current = currentTrack.id;
        pendingCrossfadeRef.current = true;
        nextTrack();
      }
    },
    onDurationChange: (e: React.SyntheticEvent<HTMLAudioElement>) => {
      if (deckId !== activeDeckRef.current) return;
      const dur = e.currentTarget.duration;
      if (isFinite(dur)) setDuration(dur || 0);
    },
    onEnded: () => handleEnded(deckId),
    onWaiting: () => {
      if (deckId === activeDeckRef.current) setIsLoadingStream(true);
    },
    onPlaying: () => {
      if (deckId !== activeDeckRef.current) return;
      consecutiveErrorsRef.current = 0;
      setIsLoadingStream(false);
      setStreamError(false);
    },
    onError: () => {
      if (deckId !== activeDeckRef.current || !currentTrack) return;
      consecutiveErrorsRef.current += 1;
      setStreamError(true);
      setIsLoadingStream(false);
      setIsPlaying(false);
    },
  });

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const shown = scrubRatio ?? progress;
  const shownTime = scrubRatio !== null ? scrubRatio * duration : currentTime;

  const getLiveProgress = useCallback(() => {
    if (scrubbingRef.current) return null;
    const audio = activeDeckRef.current === 'a' ? deckARef.current : deckBRef.current;
    const dur = audio?.duration || duration;
    if (!audio || !dur || !isFinite(dur) || dur <= 0) return null;
    return Math.min(1, Math.max(0, audio.currentTime / dur));
  }, [duration]);

  const commitSeek = (ratio: number) => {
    const target = ratio * duration;
    const audio = getActiveAudio();
    if (audio && duration > 0) audio.currentTime = target;
    setCurrentTime(target);
    setScrubRatio(null);
  };

  const changeVolume = (v: number | null) => {
    if (v === null) return;
    setVolume(v);
  };

  const effectiveVolume = isMuted ? 0 : volume;
  const VolumeIcon = effectiveVolume === 0 ? VolumeX : effectiveVolume < 0.5 ? Volume1 : Volume2;

  const toggleBtn = (active: boolean) =>
    `relative w-8 h-8 flex items-center justify-center transition-colors ${
      active ? 'text-accent' : 'text-ink-2 hover:text-ink'
    }`;

  const soundCustomActive =
    eqPreset !== 'flat' ||
    crossfadeSeconds > 0 ||
    loudnessNormalization ||
    sleepMode !== 'off';

  return (
    <footer
      aria-label="Player"
      className="relative z-[45] h-[76px] shrink-0 bg-base px-4 sm:px-6 grid grid-cols-[minmax(0,1fr)_auto_auto] md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6"
    >
      <div className="absolute -top-2 inset-x-0 z-20">
        <Slider
          variant="rail"
          className="w-full"
          label="Seek"
          value={shown}
          buffered={bufferedRatio}
          getLiveValue={getLiveProgress}
          liveActive={isPlaying && !isLoadingStream && scrubRatio === null && duration > 0}
          valueText={`${formatDuration(shownTime)} of ${formatDuration(duration)}`}
          formatTooltip={(r) => formatDuration(r * duration)}
          onScrub={setScrubRatio}
          onCommit={commitSeek}
        />
      </div>

      <audio ref={deckARef} preload="auto" {...bindDeckProps('a')} />
      <audio ref={deckBRef} preload="auto" {...bindDeckProps('b')} />

      {/* Now playing */}
      <div className="flex items-center gap-3 min-w-0">
        <AnimatePresence mode="wait" initial={false}>
          {currentTrack ? (
            <motion.div
              key={currentTrack.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="flex items-center gap-3 min-w-0"
            >
              <button
                onClick={() => setStageOpen(!isStageOpen)}
                aria-label={isStageOpen ? 'Close now playing' : 'Open now playing'}
                title={isStageOpen ? 'Close now playing (Esc)' : 'Open now playing (L)'}
                className="group relative w-12 h-12 rounded-md overflow-hidden bg-surface ring-1 ring-white/[0.08] shrink-0"
              >
                <TrackArtwork track={currentTrack} />
                {isLoadingStream ? (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-ink" />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-3.5 h-3.5 text-ink" />
                  </div>
                )}
              </button>
              <div className="min-w-0">
                <button
                  onClick={() => {
                    if (currentTrack.albumId || currentTrack.album) {
                      openCollection({
                        title: currentTrack.album || currentTrack.title,
                        kind: 'Album',
                        albumId: currentTrack.albumId,
                        artist: primaryArtist(currentTrack.artist),
                        thumbnail: currentTrack.thumbnail,
                        tracks: [],
                      });
                    } else {
                      setStageOpen(true);
                    }
                  }}
                  title={
                    currentTrack.albumId || currentTrack.album
                      ? `Open ${currentTrack.album || 'album'}`
                      : 'Open now playing (L)'
                  }
                  className="block max-w-full text-sm font-medium text-ink truncate hover:underline text-left"
                >
                  {currentTrack.title}
                </button>
                {streamError ? (
                  <div className="flex items-center gap-2 text-xs text-danger">
                    <span className="truncate">Couldn&apos;t play song</span>
                    <button
                      onClick={retryStream}
                      className="inline-flex items-center gap-1 text-ink hover:underline shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry
                    </button>
                  </div>
                ) : (
                  <ArtistLinks
                    artist={currentTrack.artist}
                    artistId={currentTrack.artistId}
                    className="block max-w-full text-xs text-ink-2 truncate"
                    linkClassName="hover:text-ink hover:underline transition-colors"
                  />
                )}
              </div>
              <HeartButton track={currentTrack} />
            </motion.div>
          ) : (
            <motion.span
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-ink-3"
            >
              Nothing playing
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Transport */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={SPRING}
          onClick={toggleShuffle}
          aria-label="Shuffle"
          aria-pressed={shuffle}
          className={`hidden sm:flex ${toggleBtn(shuffle)}`}
        >
          <Shuffle className="w-4 h-4" />
          {shuffle && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={SPRING}
              className="absolute bottom-0 w-1 h-1 rounded-full bg-accent"
            />
          )}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={SPRING}
          onClick={prevTrack}
          aria-label="Previous"
          className="w-8 h-8 flex items-center justify-center text-ink-2 hover:text-ink transition-colors"
        >
          <SkipBack className="w-5 h-5 fill-current" />
        </motion.button>
        <motion.button
          onClick={() => {
            audioEngine.ensureGraph();
            togglePlay();
          }}
          disabled={!currentTrack}
          whileHover={currentTrack ? { scale: 1.06 } : undefined}
          whileTap={currentTrack ? { scale: 0.92 } : undefined}
          transition={SPRING}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="w-9 h-9 rounded-full bg-ink disabled:bg-hover disabled:text-ink-3 text-black flex items-center justify-center"
        >
          <AnimatePresence mode="wait" initial={false}>
            {isPlaying ? (
              <motion.span
                key="pause"
                initial={{ opacity: 0, scale: 0.78 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.78 }}
                transition={{ duration: 0.11, ease: EASE_OUT }}
                className="flex items-center justify-center"
              >
                <Pause className="w-4 h-4 fill-current" />
              </motion.span>
            ) : (
              <motion.span
                key="play"
                initial={{ opacity: 0, scale: 0.78 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.78 }}
                transition={{ duration: 0.11, ease: EASE_OUT }}
                className="flex items-center justify-center"
              >
                <Play className="w-4 h-4 fill-current translate-x-[1px]" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={SPRING}
          onClick={nextTrack}
          aria-label="Next"
          className="w-8 h-8 flex items-center justify-center text-ink-2 hover:text-ink transition-colors"
        >
          <SkipForward className="w-5 h-5 fill-current" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={SPRING}
          onClick={toggleRepeat}
          aria-label={`Repeat ${repeatMode}`}
          aria-pressed={repeatMode !== 'off'}
          className={`hidden sm:flex ${toggleBtn(repeatMode !== 'off')}`}
        >
          {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          {repeatMode !== 'off' && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={SPRING}
              className="absolute bottom-0 w-1 h-1 rounded-full bg-accent"
            />
          )}
        </motion.button>
      </div>

      {/* Timecode, Lyrics, Sound Settings, Queue and Volume */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
        <span className="hidden lg:inline text-xs text-ink-3 tabular-nums mr-1">
          {formatDuration(shownTime)} <span className="text-ink-3/60">/</span> {formatDuration(duration)}
        </span>

        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={SPRING}
          onClick={() => setStageOpen(!isStageOpen)}
          aria-label="Now playing and lyrics (L)"
          title="Now playing & lyrics (L)"
          aria-pressed={isStageOpen}
          className={`hidden sm:flex ${toggleBtn(isStageOpen)}`}
        >
          <Mic2 className="w-4 h-4" />
        </motion.button>

        <div ref={tuningWrapRef} className="relative">
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={SPRING}
            onClick={() => setTuningOpen((v) => !v)}
            aria-label="Sound settings and sleep timer"
            title="Sound settings & sleep timer"
            aria-expanded={tuningOpen}
            className={toggleBtn(tuningOpen || soundCustomActive)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {soundCustomActive && !tuningOpen && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={SPRING}
                className="absolute bottom-0 w-1 h-1 rounded-full bg-accent"
              />
            )}
          </motion.button>
          <AnimatePresence>
            {tuningOpen && <AudioTuningPopover onClose={() => setTuningOpen(false)} />}
          </AnimatePresence>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={SPRING}
          onClick={() => setQueueOpen(!isQueueOpen)}
          aria-label="Queue (Q)"
          title="Queue (Q)"
          aria-pressed={isQueueOpen}
          className={toggleBtn(isQueueOpen)}
        >
          <ListMusic className="w-4 h-4" />
          {queue.length > 0 && !isQueueOpen && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={SPRING}
              className="absolute bottom-0 w-1 h-1 rounded-full bg-ink-2"
            />
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={SPRING}
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute (M)' : 'Mute (M)'}
          className="hidden sm:flex w-8 h-8 items-center justify-center text-ink-2 hover:text-ink transition-colors"
        >
          <VolumeIcon className="w-4 h-4" />
        </motion.button>
        <div className="hidden md:block w-[88px]">
          <Slider
            className="w-full"
            label="Volume"
            value={effectiveVolume}
            valueText={`${Math.round(effectiveVolume * 100)} percent`}
            onScrub={changeVolume}
            onCommit={(v) => changeVolume(v)}
          />
        </div>
      </div>
    </footer>
  );
};
