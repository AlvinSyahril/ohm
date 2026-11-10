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
  ListMusic,
  Heart,
  Loader2,
  Disc,
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { formatDuration, upgradeThumbnail } from './TrackCard';

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
    isQueueOpen,
    queue,
    favorites,
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
    setQueueOpen,
    toggleFavorite,
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformBars = useMemo(() => {
    const seed = currentTrack?.id || 'ohm-default';
    return Array.from({ length: 56 }, (_, i) => {
      const charCode = seed.charCodeAt(i % seed.length) || 65;
      const val = ((charCode * (i + 11) * 17) % 72) + 24;
      return val;
    });
  }, [currentTrack?.id]);

  // Load new track stream into HTML5 audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const streamUrl = `/api/stream/${encodeURIComponent(currentTrack.id)}`;
    if (audio.src !== window.location.origin + streamUrl) {
      audio.src = streamUrl;
      audio.load();
    }

    if (isPlaying) {
      audio.play().catch((err) => {
        console.warn('Playback prevented or interrupted:', err);
      });
    }
  }, [currentTrack?.id]);

  // Sync play/pause state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

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
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const isFav = currentTrack ? favorites.some((t) => t.id === currentTrack.id) : false;

  return (
    <footer className="h-24 bg-[#0d0f14] border-t border-[#232736] px-6 flex items-center justify-between gap-6 select-none z-30 shrink-0">
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          if (e.currentTarget.duration && isFinite(e.currentTarget.duration)) {
            setDuration(e.currentTarget.duration);
          }
          setIsLoadingStream(false);
        }}
        onCanPlay={() => setIsLoadingStream(false)}
        onWaiting={() => setIsLoadingStream(true)}
        onPlaying={() => {
          setIsLoadingStream(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => nextTrack()}
      />

      {/* Left: Currently Playing Track Telemetry */}
      <div className="w-72 flex items-center gap-3.5 min-w-0">
        {currentTrack ? (
          <>
            <div className="relative w-14 h-14 bg-[#0a0b0e] border border-[#a3e635] shadow-[2px_2px_0px_#a3e635] shrink-0 overflow-hidden">
              <img
                src={upgradeThumbnail(currentTrack.thumbnail)}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display font-bold text-sm text-white truncate">
                {currentTrack.title}
              </div>
              <div className="text-xs text-zinc-400 truncate mt-0.5">
                {currentTrack.artist}
              </div>
              <div className="font-mono text-[10px] text-[#a3e635] mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#a3e635] rounded-full animate-ping" />
                <span>STREAM LOCKED</span>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => toggleFavorite(currentTrack)}
              className={`p-2 border cursor-pointer transition-colors ${
                isFav
                  ? 'bg-[#a3e635]/15 border-[#a3e635] text-[#a3e635]'
                  : 'bg-[#151822] border-[#232736] text-zinc-400 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            </motion.button>
          </>
        ) : (
          <div className="flex items-center gap-3 text-zinc-500">
            <div className="w-14 h-14 bg-[#12141c] border border-[#232736] flex items-center justify-center">
              <Disc className="w-6 h-6 text-zinc-600" />
            </div>
            <div>
              <div className="font-display font-semibold text-sm text-zinc-400">
                STANDBY MODE
              </div>
              <div className="font-mono text-[11px] text-zinc-600">
                Select any track to engage
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Center: Tactile Transport Deck + Illuminated Waveform Scrubber */}
      <div className="flex-1 max-w-2xl flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={toggleShuffle}
            className={`p-2 border cursor-pointer transition-colors ${
              shuffle
                ? 'bg-[#a3e635]/15 border-[#a3e635] text-[#a3e635]'
                : 'bg-transparent border-transparent text-zinc-400 hover:text-white'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={prevTrack}
            className="p-2 bg-[#141720] hover:bg-[#1c202d] text-zinc-200 border border-[#232736] cursor-pointer transition-colors"
            title="Previous"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={togglePlay}
            disabled={!currentTrack && queue.length === 0}
            className="neo-btn w-11 h-11 bg-[#a3e635] text-[#0a0b0e] border border-[#a3e635] flex items-center justify-center cursor-pointer disabled:opacity-40"
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

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={nextTrack}
            className="p-2 bg-[#141720] hover:bg-[#1c202d] text-zinc-200 border border-[#232736] cursor-pointer transition-colors"
            title="Next"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={toggleRepeat}
            className={`p-2 border cursor-pointer transition-colors ${
              repeatMode !== 'off'
                ? 'bg-[#a3e635]/15 border-[#a3e635] text-[#a3e635]'
                : 'bg-transparent border-transparent text-zinc-400 hover:text-white'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </motion.button>
        </div>

        {/* Interactive Waveform Progress Scrubber */}
        <div className="w-full flex items-center gap-3">
          <span className="font-mono text-[11px] text-[#a3e635] w-10 text-right">
            {formatDuration(currentTime)}
          </span>

          <div
            onClick={handleSeek}
            className="flex-1 h-7 bg-[#12141c] border border-[#232736] px-2 flex items-center justify-between gap-[2px] cursor-pointer group relative overflow-hidden"
          >
            {waveformBars.map((height, idx) => {
              const barPercent = (idx / waveformBars.length) * 100;
              const isPlayed = barPercent <= progressPercent;
              return (
                <div
                  key={idx}
                  style={{ height: `${currentTrack ? height : 20}%` }}
                  className={`flex-1 transition-colors duration-100 ${
                    isPlayed
                      ? 'bg-[#a3e635] shadow-[0_0_6px_rgba(163,230,53,0.6)]'
                      : 'bg-[#252a3a] group-hover:bg-zinc-600'
                  }`}
                />
              );
            })}
          </div>

          <span className="font-mono text-[11px] text-zinc-400 w-10">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Right: Codec Badge, Volume Slider & Queue Drawer Toggle */}
      <div className="w-72 flex items-center justify-end gap-3">
        <div className="hidden xl:flex flex-col items-end font-mono text-[10px] leading-tight">
          <span className="text-[#a3e635] font-semibold">137 KBPS</span>
          <span className="text-zinc-500">AAC // MP4</span>
        </div>

        <div className="flex items-center gap-2 bg-[#12141c] border border-[#232736] px-2.5 py-1.5">
          <button
            onClick={toggleMute}
            className="text-zinc-400 hover:text-[#a3e635] cursor-pointer"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 accent-[#a3e635] cursor-pointer h-1 bg-[#232736]"
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setQueueOpen(!isQueueOpen)}
          className={`px-3 py-2 border font-mono text-xs flex items-center gap-2 cursor-pointer transition-colors ${
            isQueueOpen
              ? 'bg-[#a3e635] text-[#0a0b0e] border-[#a3e635] font-bold shadow-[2px_2px_0px_#22d3ee]'
              : 'bg-[#12141c] text-zinc-300 border-[#232736] hover:border-[#a3e635]'
          }`}
        >
          <ListMusic className="w-4 h-4" />
          <span>{queue.length}</span>
        </motion.button>
      </div>
    </footer>
  );
};
