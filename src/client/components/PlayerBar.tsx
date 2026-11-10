import React, { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { TrackArtwork } from './TrackCard';

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

  // Generate 120 center-symmetric waveform bars matching the concept image
  const waveformBars = useMemo(() => {
    const seed = currentTrack?.id || 'ohm-default-wave';
    const total = 120;
    return Array.from({ length: total }, (_, i) => {
      // Create organic envelope that swells in the middle-left and middle-right like the concept
      const norm = i / total;
      const envelope =
        Math.sin(norm * Math.PI) *
        (0.55 + 0.45 * Math.sin(norm * Math.PI * 5 + 0.8));
      const charCode = seed.charCodeAt(i % seed.length) || 70;
      const pseudoRand = ((charCode * (i + 13) * 29) % 100) / 100;
      const heightPx = Math.max(
        3,
        Math.round((envelope * 0.72 + pseudoRand * 0.28) * 28)
      );
      return heightPx;
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
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 45;
  const effectiveVolume = isMuted ? 0 : volume;

  return (
    <footer className="relative h-[88px] bg-[#0c0e12]/95 backdrop-blur-xl px-7 flex items-center justify-between gap-6 select-none z-30 shrink-0">
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

      {/* Ambient Radial Lime & Cyan Underglow (Exact Match to Concept Image) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-6 left-[24%] w-72 h-28 bg-[#b8ff01]/20 blur-[36px] rounded-full" />
        <div className="absolute -top-6 left-[60%] w-64 h-28 bg-[#00e5ff]/15 blur-[36px] rounded-full" />
      </div>

      {/* Top Edge Full-Width Interactive Waveform Scrubber */}
      <div
        onClick={handleSeek}
        title="Click anywhere along the waveform to seek"
        className="absolute -top-[15px] left-0 right-0 h-[30px] flex items-center cursor-pointer z-40 group"
      >
        {/* Left Solid Lime Lead-In Line */}
        <div className="w-[18%] h-[2px] bg-[#b8ff01] shadow-[0_0_8px_#b8ff01]" />

        {/* Center Symmetric Soundwave Bars */}
        <div className="flex-1 h-full flex items-center justify-between gap-[2px] px-1">
          {waveformBars.map((barHeight, idx) => {
            const pct = (idx / waveformBars.length) * 100;
            const isPlayed = pct <= progressPercent;
            const isCyanZone = pct > 68;

            return (
              <div
                key={idx}
                style={{ height: `${barHeight}px` }}
                className={`w-[2px] rounded-full transition-all duration-150 ${
                  isPlaying && isPlayed ? 'waveform-playing' : ''
                } ${
                  isPlayed
                    ? 'bg-[#b8ff01] shadow-[0_0_8px_rgba(184,255,1,0.75)]'
                    : isCyanZone
                    ? 'bg-[#00e5ff]/80 group-hover:bg-[#00e5ff]'
                    : 'bg-[#7ab800]/65 group-hover:bg-[#b8ff01]/80'
                }`}
              />
            );
          })}
        </div>

        {/* Right Subtle Tail Line */}
        <div className="w-[10%] h-[1px] bg-white/10" />
      </div>

      {/* Left: Currently Playing Track Info */}
      <div className="relative z-10 w-72 flex items-center gap-3.5 min-w-0">
        {currentTrack ? (
          <>
            <div className="w-12 h-12 rounded-lg bg-[#14171c] overflow-hidden shrink-0 shadow-md">
              <TrackArtwork
                track={currentTrack}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display font-bold text-[14px] text-white truncate">
                {currentTrack.title}
              </div>
              <div className="text-[12px] text-zinc-400 truncate mt-0.5">
                {currentTrack.artist}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3.5 text-zinc-500">
            <div className="w-12 h-12 rounded-lg bg-[#14171c] border border-white/[0.06] flex items-center justify-center">
              <Disc className="w-5 h-5 text-zinc-600" />
            </div>
            <div>
              <div className="font-display font-bold text-[14px] text-zinc-300">
                Ready to Stream
              </div>
              <div className="text-[12px] text-zinc-500">Select a track</div>
            </div>
          </div>
        )}
      </div>

      {/* Center: Clean Classic Transport Controls with White Circular Play Button */}
      <div className="relative z-10 flex items-center gap-6">
        <button
          onClick={toggleShuffle}
          aria-label="Toggle shuffle"
          className={`transition-colors cursor-pointer ${
            shuffle ? 'text-[#b8ff01]' : 'text-zinc-400 hover:text-white'
          }`}
          title="Shuffle"
        >
          <Shuffle className="w-[17px] h-[17px]" />
        </button>

        <button
          onClick={prevTrack}
          aria-label="Previous track"
          className="text-zinc-200 hover:text-white transition-colors cursor-pointer"
          title="Previous"
        >
          <SkipBack className="w-5 h-5 fill-current" />
        </button>

        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={togglePlay}
          disabled={!currentTrack && queue.length === 0}
          aria-label="Play or pause"
          className="w-12 h-12 rounded-full bg-white text-[#0b0c0e] shadow-[0_4px_20px_rgba(255,255,255,0.25)] flex items-center justify-center cursor-pointer disabled:opacity-40"
          title="Play / Pause (Space)"
        >
          {isLoadingStream ? (
            <Loader2 className="w-5 h-5 animate-spin stroke-[2.5]" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </motion.button>

        <button
          onClick={nextTrack}
          aria-label="Next track"
          className="text-zinc-200 hover:text-white transition-colors cursor-pointer"
          title="Next"
        >
          <SkipForward className="w-5 h-5 fill-current" />
        </button>

        <button
          onClick={toggleRepeat}
          aria-label="Toggle repeat"
          className={`transition-colors cursor-pointer ${
            repeatMode !== 'off'
              ? 'text-[#b8ff01]'
              : 'text-zinc-400 hover:text-white'
          }`}
          title={`Repeat: ${repeatMode}`}
        >
          {repeatMode === 'one' ? (
            <Repeat1 className="w-[17px] h-[17px]" />
          ) : (
            <Repeat className="w-[17px] h-[17px]" />
          )}
        </button>
      </div>

      {/* Right: Sleek Volume Bar with Lime Fill & White Circular Thumb */}
      <div className="relative z-10 w-72 flex items-center justify-end gap-3">
        <button
          onClick={toggleMute}
          aria-label="Toggle mute"
          className="text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-[18px] h-[18px] text-zinc-500" />
          ) : (
            <Volume2 className="w-[18px] h-[18px]" />
          )}
        </button>

        <div className="relative w-28 h-5 flex items-center">
          <div className="w-full h-[3px] rounded-full bg-white/15 overflow-hidden">
            <div
              style={{ width: `${effectiveVolume * 100}%` }}
              className="h-full bg-[#b8ff01]"
            />
          </div>
          <div
            style={{ left: `calc(${effectiveVolume * 100}% - 7px)` }}
            className="w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)] pointer-events-none absolute"
          />
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
      </div>
    </footer>
  );
};
