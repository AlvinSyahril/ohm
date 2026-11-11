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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isSwitchingTrackRef = useRef<boolean>(false);

  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  // Generate 160 organic acoustic base profile bars for the track
  const TOTAL_BARS = 160;
  const baseProfile = useMemo(() => {
    const seed = currentTrack?.id || 'ohm-audio-seed';
    return Array.from({ length: TOTAL_BARS }, (_, i) => {
      const norm = i / TOTAL_BARS;
      const envelope =
        Math.sin(norm * Math.PI) *
        (0.6 + 0.35 * Math.sin(norm * Math.PI * 4 + 0.5) + 0.1 * Math.cos(norm * Math.PI * 9));
      const code = seed.charCodeAt(i % seed.length) || 68;
      const rand = ((code * (i + 17) * 31) % 100) / 100;
      return Math.max(0.18, Math.min(1.0, envelope * 0.72 + rand * 0.28));
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
        // Handled in onCanPlay
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

  // High-performance 60fps / 120fps Canvas Waveform Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const render = () => {
      const audio = audioRef.current;
      const cur = audio ? audio.currentTime : 0;
      const dur = audio && isFinite(audio.duration) && audio.duration > 0 ? audio.duration : duration;
      const curRatio = dur > 0 ? Math.min(1, Math.max(0, cur / dur)) : 0;

      if (isPlaying) {
        tick += 0.045;
      }

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      // Only resize canvas backing store when dimensions actually change
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const width = rect.width;
      const height = rect.height;
      const barWidth = Math.max(1.5, (width / TOTAL_BARS) * 0.72);
      const gap = Math.max(0.8, (width / TOTAL_BARS) * 0.28);
      const centerY = height / 2;

      for (let i = 0; i < TOTAL_BARS; i++) {
        const x = i * (barWidth + gap);
        const norm = i / TOTAL_BARS;
        const isPlayed = norm <= curRatio;
        const isHovered = hoverRatio !== null && norm <= hoverRatio;

        // Smooth live frequency pulse when playing
        const liveWave = isPlaying
          ? Math.sin(tick + i * 0.16) * 0.14 + Math.cos(tick * 1.3 + i * 0.22) * 0.1
          : 0;

        const scale = Math.max(0.12, Math.min(1.0, baseProfile[i] + liveWave));
        const barHeight = Math.max(3, scale * (height - 6));
        const topY = centerY - barHeight / 2;
        const radius = barWidth / 2;

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, topY, barWidth, barHeight, radius);
        } else {
          ctx.rect(x, topY, barWidth, barHeight);
        }

        if (isPlayed) {
          ctx.fillStyle = '#c8ff00';
        } else if (isHovered) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        }

        ctx.fill();
      }

      // Smooth hairline playhead indicator
      const playheadX = curRatio * width;
      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(playheadX - 1, 1, 2, height - 2, 1);
      } else {
        ctx.rect(playheadX - 1, 1, 2, height - 2);
      }
      ctx.fill();

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [baseProfile, duration, isPlaying, hoverRatio]);

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

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverRatio(ratio);
    setHoverX(e.clientX - rect.left);
  };

  const effectiveVolume = isMuted ? 0 : volume;
  const isFav = currentTrack ? favorites.some((t) => t.id === currentTrack.id) : false;

  return (
    <footer className="relative bg-[#090a0c] border-t border-white/[0.08] select-none z-30 shrink-0">
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

      {/* DEDICATED 60FPS SOUNDWAVE TRACK (Seamlessly Framed Inside Player Header) */}
      <div className="w-full bg-[#0d0f14] border-b border-white/[0.06] px-6 py-2">
        <div
          onClick={handleSeek}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverRatio(null)}
          title="Click anywhere to scrub seamlessly"
          className="relative h-6 w-full cursor-pointer group"
        >
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Interactive Floating Hover Pill */}
          {hoverRatio !== null && duration > 0 && (
            <div
              style={{ left: `${Math.max(24, Math.min(window.innerWidth - 64, hoverX))}px` }}
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-[#181b24] border border-white/[0.18] font-mono text-[10px] text-white shadow-xl pointer-events-none tabular-nums z-50"
            >
              {formatDuration(hoverRatio * duration)}
            </div>
          )}
        </div>
      </div>

      {/* MAIN PLAYER DECK CONTROLS */}
      <div className="h-[74px] px-6 flex items-center justify-between gap-6">
        {/* Left: Active Track Metadata */}
        <div className="w-72 flex items-center gap-3.5 min-w-0">
          {currentTrack ? (
            <>
              <div className="w-12 h-12 rounded-lg bg-[#111318] border border-white/[0.08] overflow-hidden shrink-0 shadow-md">
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
                  Ready to Stream
                </div>
                <div className="font-mono text-[10px] text-zinc-600 uppercase">
                  Select a track
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center: Ergonomic Transport Controls with Silky Timestamps */}
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
              className="w-11 h-11 rounded-full bg-white hover:bg-[#c8ff00] text-[#090a0c] shadow-[0_4px_16px_rgba(255,255,255,0.18)] flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-40 active:scale-95"
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
      </div>
    </footer>
  );
};
