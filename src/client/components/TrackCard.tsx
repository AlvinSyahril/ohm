import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Plus, Heart, Check } from 'lucide-react';
import { Track, usePlayerStore } from '../store/usePlayerStore';

interface TrackCardProps {
  track: Track;
  index: number;
  contextQueue?: Track[];
}

export const formatDuration = (seconds?: number): string => {
  if (!seconds || isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const upgradeThumbnail = (url?: string, videoId?: string): string => {
  if (!url) {
    return videoId
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80';
  }
  return url.replace(/=w\d+-h\d+/, '=w544-h544');
};

export const TrackArtwork: React.FC<{
  track: Track;
  className?: string;
}> = ({ track, className = 'w-full h-full object-cover' }) => {
  const primarySrc = upgradeThumbnail(track.thumbnail, track.id);
  const fallbackYtSrc = `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;
  const [imgSrc, setImgSrc] = useState<string>(primarySrc);

  useEffect(() => {
    setImgSrc(upgradeThumbnail(track.thumbnail, track.id));
  }, [track.id, track.thumbnail]);

  return (
    <img
      src={imgSrc}
      alt={track.title}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => {
        if (imgSrc !== fallbackYtSrc) {
          setImgSrc(fallbackYtSrc);
        }
      }}
      className={className}
    />
  );
};

export const TrackCard: React.FC<TrackCardProps> = ({ track, index, contextQueue }) => {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    addToQueue,
    queue,
    toggleFavorite,
    favorites,
  } = usePlayerStore();

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isCurrent && isPlaying;
  const inQueue = queue.some((t) => t.id === track.id);
  const isFav = favorites.some((t) => t.id === track.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      const upcoming = contextQueue
        ? contextQueue.filter((_, idx) => idx !== index)
        : undefined;
      playTrack(track, upcoming);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 28,
        delay: Math.min(index * 0.035, 0.35),
      }}
      onClick={handlePlayClick}
      className={`group relative p-3.5 cursor-pointer select-none flex flex-col justify-between ${
        isCurrent ? 'neo-card-active' : 'neo-card'
      }`}
    >
      {/* Album Artwork Container */}
      <div className="relative aspect-square w-full bg-[#0a0b0e] border border-[#232736] overflow-hidden mb-3">
        <TrackArtwork
          track={track}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
        />

        {/* Dark Overlay on Hover or Active */}
        <div
          className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-150 ${
            isCurrent ? 'opacity-100 bg-black/40' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePlayClick}
            className="w-12 h-12 bg-[#a3e635] text-[#0a0b0e] border-2 border-[#0a0b0e] shadow-[3px_3px_0px_#0a0b0e] flex items-center justify-center cursor-pointer"
          >
            {isCurrentlyPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </motion.button>
        </div>

        {/* Top-left Active Equalizer Badge */}
        {isCurrent && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-[#0a0b0e]/90 border border-[#a3e635] flex items-center gap-1.5">
            <div className="flex items-end gap-0.5 h-3 w-3.5">
              <span
                className={`w-0.5 bg-[#a3e635] ${
                  isCurrentlyPlaying ? 'animate-eq-1' : 'h-1'
                }`}
              />
              <span
                className={`w-0.5 bg-[#a3e635] ${
                  isCurrentlyPlaying ? 'animate-eq-2' : 'h-2'
                }`}
              />
              <span
                className={`w-0.5 bg-[#a3e635] ${
                  isCurrentlyPlaying ? 'animate-eq-3' : 'h-1.5'
                }`}
              />
              <span
                className={`w-0.5 bg-[#a3e635] ${
                  isCurrentlyPlaying ? 'animate-eq-4' : 'h-2.5'
                }`}
              />
            </div>
            <span className="font-mono text-[10px] font-bold text-[#a3e635] tracking-wider">
              {isCurrentlyPlaying ? 'ACTIVE' : 'PAUSED'}
            </span>
          </div>
        )}

        {/* Bottom-right Duration Pill */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-[#0a0b0e]/90 border border-[#232736] font-mono text-[10px] text-zinc-300">
          {formatDuration(track.duration)}
        </div>
      </div>

      {/* Metadata & Quick Tactile Triggers */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3
            className={`font-display font-semibold text-sm line-clamp-1 ${
              isCurrent ? 'text-[#a3e635]' : 'text-white group-hover:text-[#a3e635]'
            } transition-colors`}
            title={track.title}
          >
            {track.title}
          </h3>
        </div>
        <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5 font-medium">
          {track.artist}
        </p>

        <div className="mt-3 pt-2.5 border-t border-[#232736]/80 flex items-center justify-between">
          <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider truncate max-w-[110px]">
            {track.album || 'SINGLE STREAM'}
          </span>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => toggleFavorite(track)}
              title={isFav ? 'Remove from Vault' : 'Save to Vault'}
              className={`p-1.5 border transition-colors cursor-pointer ${
                isFav
                  ? 'bg-[#a3e635]/15 border-[#a3e635] text-[#a3e635]'
                  : 'bg-[#171a24] border-[#232736] text-zinc-400 hover:text-white hover:border-zinc-500'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => addToQueue(track)}
              title={inQueue ? 'In Queue' : 'Add to Queue'}
              className={`p-1.5 border transition-colors cursor-pointer ${
                inQueue
                  ? 'bg-cyan-500/15 border-cyan-400 text-cyan-400'
                  : 'bg-[#171a24] border-[#232736] text-zinc-400 hover:text-white hover:border-zinc-500'
              }`}
            >
              {inQueue ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
