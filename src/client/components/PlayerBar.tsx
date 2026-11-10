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
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);

  // Generate 72 crisp geometric bar heights for the track waveform
  const waveformBars = useMemo(() => {
    const seed = currentTrack?.id || 'ohm-studio-wave';
    const total = 72;
    return Array.from({ length: total }, (_, i) => {
      const norm = i / total;
      const env = Math.sin(norm * Math.PI) * 0.65 + 0.35;
      const code = seed.charCodeAt(i % seed.length) || 70;
      const rand = ((code * (i + 17) * 31) % 100) / 100;
      return Math.max(20, Math.min(100, Math.round((env * 0.6 + rand * 0.4) * 100)));
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

  const progressPercent =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const effectiveVolume = isMuted ? 0 : volume;
  const isFav = currentTrack
    ? favorites.some((t) => t.id === currentTrack.id)
    : false;

  return (
    <footer className="h-20 bg-[#090a0c] border-t border-white/[0.08] px-5 flex items-center justify-between gap-6 select-none z-30 shrink-0">
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

      {/* Left: Active Track Metadata */}
      <div className="w-72 flex items-center gap-3 min-w-0">
        {currentTrack ? (
          <>
            <div className="w-12 h-12 rounded bg-[#111318] border border-white/[0.08] overflow-hidden shrink-0">
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
                isFav
                  ? 'text-[#c8ff00]'
                  : 'text-zinc-500 hover:text-white'
              }`}
              title="Save to Library"
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 text-zinc-500">
            <div className="w-12 h-12 rounded bg-[#0f1115] border border-white/[0.06] flex items-center justify-center">
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

      {/* Center: Transport Controls + Flat Geometric Waveform Scrubber */}
      <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            aria-label="Toggle shuffle"
            className={`p-1 transition-colors cursor-pointer ${
              shuffle ? 'text-[#c8ff00]' : 'text-zinc-500 hover:text-white'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-3.5 h-3.5" />
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
            className="w-9 h-9 rounded-md bg-white hover:bg-[#c8ff00] text-[#090a0c] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
            title="Play / Pause (Space)"
          >
            {isLoadingStream ? (
              <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
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
              repeatMode !== 'off'
                ? 'text-[#c8ff00]'
                : 'text-zinc-500 hover:text-white'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-3.5 h-3.5" />
            ) : (
              <Repeat className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Precision Flat Waveform Scrubber with Time Readouts */}
        <div className="w-full flex items-center gap-3">
          <span className="font-mono text-[11px] text-zinc-400 tabular-nums w-9 text-right">
            {hoverRatio !== null && duration > 0
              ? formatDuration(hoverRatio * duration)
              : formatDuration(currentTime)}
          </span>

          <div
            onClick={handleSeek}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const r = Math.max(
                0,
                Math.min(1, (e.clientX - rect.left) / rect.width)
              );
              setHoverRatio(r);
            }}
            onMouseLeave={() => setHoverRatio(null)}
            className="flex-1 h-5 flex items-center justify-between gap-[2px] cursor-pointer group"
          >
            {waveformBars.map((heightPct, idx) => {
              const barPct = (idx / waveformBars.length) * 100;
              const isPlayed = barPct <= progressPercent;
              const isHovered =
                hoverRatio !== null && barPct <= hoverRatio * 100;

              return (
                <div
                  key={idx}
                  style={{ height: `${currentTrack ? heightPct : 25}%` }}
                  className={`flex-1 rounded-[1px] transition-colors duration-75 ${
                    isPlayed
                      ? 'bg-[#c8ff00]'
                      : isHovered
                      ? 'bg-zinc-400'
                      : 'bg-white/[0.12] group-hover:bg-white/[0.18]'
                  }`}
                />
              );
            })}
          </div>

          <span className="font-mono text-[11px] text-zinc-500 tabular-nums w-9">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Right: Volume & Queue Controls */}
      <div className="w-72 flex items-center justify-end gap-3">
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
          <div className="w-full h-1 bg-white/[0.12] rounded-sm overflow-hidden">
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
          className={`px-2.5 py-1 rounded border font-mono text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors ${
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
