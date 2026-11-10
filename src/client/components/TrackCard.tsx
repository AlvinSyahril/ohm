import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Plus, Heart, Check } from 'lucide-react';
import { Track, usePlayerStore } from '../store/usePlayerStore';

interface TrackCardProps {
  track: Track;
  index: number;
  contextQueue?: Track[];
  genreLabel?: string;
}

export const formatDuration = (seconds?: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
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

export const TrackCard: React.FC<TrackCardProps> = ({
  track,
  index,
  contextQueue,
  genreLabel = 'Genre',
}) => {
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 30,
        delay: Math.min(index * 0.025, 0.25),
      }}
      onClick={handlePlayClick}
      className={`group relative rounded-[16px] p-3 cursor-pointer select-none flex flex-col justify-between transition-all duration-200 ${
        isCurrent
          ? 'bg-[#181c22] border border-[#b8ff01]/70 shadow-[0_0_24px_rgba(184,255,1,0.12)]'
          : 'bg-[#14171c] border border-white/[0.06] hover:bg-[#181c22] hover:border-white/[0.14] hover:-translate-y-0.5'
      }`}
    >
      {/* Square Rounded Album Artwork */}
      <div className="relative aspect-square w-full rounded-[11px] bg-[#0b0c0e] overflow-hidden mb-3">
        <TrackArtwork
          track={track}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
        />

        {/* Quick Top-Right Hover Actions (Vault & Queue) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10"
        >
          <button
            onClick={() => toggleFavorite(track)}
            title={isFav ? 'Remove from Library' : 'Save to Library'}
            className={`w-7 h-7 rounded-full backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer ${
              isFav
                ? 'bg-[#b8ff01] text-[#0b0c0e]'
                : 'bg-black/60 text-white hover:bg-black/80'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={() => addToQueue(track)}
            title={inQueue ? 'In Queue' : 'Add to Queue'}
            className={`w-7 h-7 rounded-full backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer ${
              inQueue
                ? 'bg-[#00e5ff] text-[#0b0c0e]'
                : 'bg-black/60 text-white hover:bg-black/80'
            }`}
          >
            {inQueue ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Center Play Overlay on Hover or Active */}
        <div
          className={`absolute inset-0 bg-black/35 flex items-center justify-center transition-opacity duration-150 ${
            isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handlePlayClick}
            className="w-11 h-11 rounded-full bg-[#b8ff01] text-[#0b0c0e] shadow-[0_4px_16px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-pointer"
          >
            {isCurrentlyPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Card Typography Matching Concept */}
      <div className="px-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-500 truncate">
          {track.artist}
        </div>
        <h3
          className={`font-display font-bold text-[13px] uppercase tracking-tight truncate mt-0.5 ${
            isCurrent ? 'text-[#b8ff01]' : 'text-white'
          }`}
          title={track.title}
        >
          {track.title}
        </h3>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-500 truncate">
            {track.duration
              ? `${formatDuration(track.duration)} mins`
              : `${(index % 12) + 18} minutes ago`}
          </span>

          <span className="px-2.5 py-0.5 rounded-full bg-[#b8ff01] text-[#0b0c0e] text-[10px] font-bold tracking-tight shrink-0">
            {genreLabel}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
