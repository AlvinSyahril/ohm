import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Loader2,
  Disc,
  Heart,
  ListMusic,
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { TrackArtwork, formatDuration } from './TrackCard';

export const PlayerBar: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isLoadingStream,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    shuffle,
    queue,
    favorites,
    isQueueOpen,
    setQueueOpen,
    toggleFavorite,
    togglePlay,
    setIsPlaying,
    setIsLoadingStream,
    nextTrack,
    prevTrack,
    setCurrentTime,
    setDuration,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSwitchingTrackRef = useRef<boolean>(false);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const [hoverClientX, setHoverClientX] = useState<number>(0);

  // 190 dense micro-bars for full-width organic soundwave along top edge
  const TOTAL_BARS = 190;
  const waveformBars = useMemo(() => {
    const seed = currentTrack?.id || 'ohm-studio-wave';
    return Array.from({ length: TOTAL_BARS }, (_, i) => {
      const norm = i / TOTAL_BARS;
      // Multi-sine acoustic envelope that swells organically in center regions
      const env =
        Math.sin(norm * Math.PI) *
        (0.6 + 0.3 * Math.sin(norm * Math.PI * 4 + 0.6) + 0.1 * Math.cos(norm * Math.PI * 10));
      const code = seed.charCodeAt(i % seed.length) || 68;
      const pseudoRand = ((code * (i + 19) * 31) % 100) / 100;
      const heightPercent = Math.max(
        15,
        Math.min(100, Math.round((env * 0.72 + pseudoRand * 0.28) * 100))
      );
      return heightPercent;
    });
  }, [currentTrack?.id]);

  // Load new track stream into HTML5 audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const streamUrl = `/api/stream/${encodeURIComponent(currentTrack.id)}`;
    isSwitchingTrackRef.current = true;
    audio.src = streamUrl;
    audio.load();

    audio
      .play()
      .then(() => {
        isSwitchingTrackRef.current = false;
        setIsLoadingStream(false);
        setIsPlaying(true);
      })
      .catch(() => {
        // Retried inside onCanPlay once stream headers arrive
      });
  }, [currentTrack?.id]);

  // Sync play/pause toggle from store
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack || isSwitchingTrackRef.current) return;

    if (isPlaying && audio.paused) {
      audio.play().catch(() => {});
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  // Sync volume & mute
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Global Spacebar shortcut to toggle play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  const handleWaveformSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = ratio * duration;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
    if (!isPlaying) {
      setIsPlaying(true);
      audio.play().catch(() => {});
    }
  };

  const handleWaveformMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverRatio(ratio);
    setHoverClientX(e.clientX);
  };

  const progressPercent =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const effectiveVolume = isMuted ? 0 : volume;
  const isFav = currentTrack
    ? favorites.some((t) => t.id === currentTrack.id)
    : false;

  return (
    <footer className="relative h-[78px] bg-[#090a0c] border-t border-white/[0.08] px-6 flex items-center justify-between gap-6 select-none z-30 shrink-0">
      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          if (e.currentTarget.duration && isFinite(e.currentTarget.duration)) {
            setDuration(e.currentTarget.duration);
          }
        }}
        onCanPlay={(e) => {
          isSwitchingTrackRef.current = false;
          setIsLoadingStream(false);
          if (usePlayerStore.getState().isPlaying && e.currentTarget.paused) {
            e.currentTarget.play().catch(() => {});
          }
        }}
        onWaiting={() => setIsLoadingStream(true)}
        onPlaying={() => {
          isSwitchingTrackRef.current = false;
          setIsLoadingStream(false);
          setIsPlaying(true);
        }}
        onPause={(e) => {
          if (isSwitchingTrackRef.current || e.currentTarget.ended) return;
          setIsPlaying(false);
        }}
        onError={() => {
          isSwitchingTrackRef.current = false;
          setIsLoadingStream(false);
        }}
        onEnded={(e) => {
          if (usePlayerStore.getState().repeatMode === 'one') {
            e.currentTarget.currentTime = 0;
            e.currentTarget.play().catch(() => {});
          } else {
            nextTrack();
          }
        }}
      />

      {/* FULL-WIDTH TOP-EDGE SOUNDWAVE SCRUBBER */}
      <div
        ref={waveformRef}
        onClick={handleWaveformSeek}
        onMouseMove={handleWaveformMouseMove}
        onMouseLeave={() => setHoverRatio(null)}
        title="Click or scrub along the waveform to seek"
        className="absolute -top-[14px] left-0 right-0 h-[28px] flex items-center justify-between gap-[2px] px-2 cursor-pointer z-40 group"
      >
        {/* Hover Target Timestamp Pill */}
        {hoverRatio !== null && duration > 0 && (
          <div
            style={{
              left: `${Math.max(30, Math.min(window.innerWidth - 30, hoverClientX))}px`,
            }}
            className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-[#161922] border border-white/[0.18] font-mono text-[10px] text-white shadow-lg pointer-events-none tabular-nums z-50"
          >
            {formatDuration(hoverRatio * duration)}
          </div>
        )}

        {/* 190 Dense Micro-bars */}
        {waveformBars.map((heightPercent, idx) => {
          const barPercent = (idx / TOTAL_BARS) * 100;
          const isPlayed = barPercent <= progressPercent;
          const isHovered = hoverRatio !== null && barPercent <= hoverRatio * 100;

          return (
            <div
              key={idx}
              style={{ height: `${Math.max(3, Math.round((heightPercent / 100) * 18))}px` }}
              className={`flex-1 rounded-[1px] transition-all duration-75 ${
                isPlayed
                  ? 'bg-[#c8ff00]'
                  : isHovered
                  ? 'bg-zinc-300'
                  : 'bg-white/[0.14] group-hover:bg-white/[0.22]'
              }`}
            />
          );
        })}
      </div>

      {/* Left: Active Track Metadata */}
      <div className="w-72 flex items-center gap-3.5 min-w-0">
        {currentTrack ? (
          <>
            <div className="w-12 h-12 rounded-lg bg-[#111318] border border-white/[0.08] overflow-hidden shrink-0">
              <TrackArtwork
                track={currentTrack}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display font-semibold text-[13px] text-white truncate">
                {currentTrack.title}
              </div>
              <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                {currentTrack.artist}
              </div>
            </div>
            <button
              onClick={() => toggleFavorite(currentTrack)}
              className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                isFav ? 'text-[#c8ff00]' : 'text-zinc-500 hover:text-white'
              }`}
              title="Save to Library"
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 text-zinc-500">
            <div className="w-12 h-12 rounded-lg bg-[#0f1115] border border-white/[0.06] flex items-center justify-center">
              <Disc className="w-5 h-5 text-zinc-600" />
            </div>
            <div>
              <div className="font-display font-medium text-[13px] text-zinc-400">
                No Active Stream
              </div>
              <div className="font-mono text-[10px] text-zinc-600 uppercase">
                Ready
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Center: Ergonomic Transport Controls with Flanking Timestamps */}
      <div className="flex items-center gap-5">
        {/* Elapsed Time */}
        <span className="font-mono text-[12px] text-zinc-400 tabular-nums w-10 text-right">
          {formatDuration(currentTime)}
        </span>

        {/* Transport Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            aria-label="Toggle shuffle"
            className={`p-1 transition-colors cursor-pointer ${
              shuffle ? 'text-[#c8ff00]' : 'text-zinc-500 hover:text-white'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={prevTrack}
            aria-label="Previous track"
            className="p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Previous"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            disabled={!currentTrack && queue.length === 0}
            aria-label="Play or pause"
            className="w-11 h-11 rounded-full bg-white hover:bg-[#c8ff00] text-[#090a0c] shadow-[0_4px_16px_rgba(255,255,255,0.18)] flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-40"
            title="Play / Pause (Space)"
          >
            {isLoadingStream ? (
              <Loader2 className="w-5 h-5 animate-spin stroke-[2.5]" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            aria-label="Next track"
            className="p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Next"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={toggleRepeat}
            aria-label="Toggle repeat"
            className={`p-1 transition-colors cursor-pointer ${
              repeatMode !== 'off' ? 'text-[#c8ff00]' : 'text-zinc-500 hover:text-white'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Total Duration */}
        <span className="font-mono text-[12px] text-zinc-500 tabular-nums w-10">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Right: Volume & Queue Controls */}
      <div className="w-72 flex items-center justify-end gap-3.5">
        <button
          onClick={toggleMute}
          aria-label="Toggle mute"
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4 text-zinc-500" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        <div className="relative w-24 h-4 flex items-center">
          <div className="w-full h-1 bg-white/[0.12] rounded-full overflow-hidden">
            <div
              style={{ width: `${effectiveVolume * 100}%` }}
              className="h-full bg-white"
            />
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={effectiveVolume}
            aria-label="Volume"
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <button
          onClick={() => setQueueOpen(!isQueueOpen)}
          className={`px-3 py-1.5 rounded-md border font-mono text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors ${
            isQueueOpen
              ? 'bg-white/[0.1] border-white/[0.2] text-white'
              : 'bg-transparent border-white/[0.08] text-zinc-400 hover:text-white'
          }`}
          title="Toggle Queue & Inspector"
        >
          <ListMusic className="w-3.5 h-3.5" />
          <span className="tabular-nums">{queue.length}</span>
        </button>
      </div>
    </footer>
  );
};
