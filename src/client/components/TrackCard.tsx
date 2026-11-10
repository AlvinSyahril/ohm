import React, { useState, useEffect } from 'react';
import { Play, Pause, Plus, Heart, Check } from 'lucide-react';
import { Track, usePlayerStore } from '../store/usePlayerStore';

interface TrackCardProps {
  track: Track;
  index: number;
  contextQueue?: Track[];
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
    <div
      onClick={handlePlayClick}
      className={`group relative rounded-lg p-3 cursor-pointer select-none flex flex-col justify-between transition-colors duration-150 ${
        isCurrent
          ? 'bg-[#15181f] border border-[#c8ff00]'
          : 'bg-[#0f1115] border border-white/[0.06] hover:bg-[#14171d] hover:border-white/[0.14]'
      }`}
    >
      {/* Square Album Artwork */}
      <div className="relative aspect-square w-full rounded-md bg-[#090a0c] overflow-hidden mb-3 border border-white/[0.04]">
        <TrackArtwork
          track={track}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200 ease-out"
        />

        {/* Active Playing Indicator Badge */}
        {isCurrent && (
          <div className="absolute top-2 left-2 px-1.5 py-1 rounded bg-[#090a0c]/90 border border-white/[0.12] flex items-center gap-1.5">
            <div className="flex items-end gap-[2px] h-2.5 w-3">
              <span
                className={`w-[2px] bg-[#c8ff00] ${
                  isCurrentlyPlaying ? 'eq-bar-1' : 'h-1'
                }`}
              />
              <span
                className={`w-[2px] bg-[#c8ff00] ${
                  isCurrentlyPlaying ? 'eq-bar-2' : 'h-2'
                }`}
              />
              <span
                className={`w-[2px] bg-[#c8ff00] ${
                  isCurrentlyPlaying ? 'eq-bar-3' : 'h-1.5'
                }`}
              />
            </div>
          </div>
        )}

        {/* Quick Top-Right Hover Actions */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10"
        >
          <button
            onClick={() => toggleFavorite(track)}
            title={isFav ? 'Remove from Library' : 'Save to Library'}
            className={`w-7 h-7 rounded flex items-center justify-center border transition-colors cursor-pointer ${
              isFav
                ? 'bg-[#c8ff00] border-[#c8ff00] text-[#090a0c]'
                : 'bg-[#090a0c]/85 border-white/[0.15] text-white hover:border-white/40'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={() => addToQueue(track)}
            title={inQueue ? 'In Queue' : 'Add to Queue'}
            className={`w-7 h-7 rounded flex items-center justify-center border transition-colors cursor-pointer ${
              inQueue
                ? 'bg-white border-white text-[#090a0c]'
                : 'bg-[#090a0c]/85 border-white/[0.15] text-white hover:border-white/40'
            }`}
          >
            {inQueue ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Bottom-Right Play Button on Hover */}
        <button
          onClick={handlePlayClick}
          aria-label={isCurrentlyPlaying ? 'Pause' : 'Play'}
          className={`absolute bottom-2 right-2 w-9 h-9 rounded-md bg-[#c8ff00] text-[#090a0c] flex items-center justify-center transition-all duration-150 cursor-pointer ${
            isCurrent
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
        >
          {isCurrentlyPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>
      </div>

      {/* Clean Editorial Typography */}
      <div>
        <h3
          className={`font-display font-semibold text-[13px] tracking-tight truncate ${
            isCurrent ? 'text-[#c8ff00]' : 'text-zinc-100 group-hover:text-white'
          }`}
          title={track.title}
        >
          {track.title}
        </h3>
        <div className="text-[12px] text-zinc-400 truncate mt-0.5">
          {track.artist}
        </div>

        <div className="mt-2.5 pt-2 border-t border-white/[0.05] flex items-center justify-between gap-2 font-mono text-[10px] text-zinc-500">
          <span className="truncate uppercase">
            {track.album || 'Single'}
          </span>
          <span className="tabular-nums shrink-0 text-zinc-400">
            {formatDuration(track.duration)}
          </span>
        </div>
      </div>
    </div>
  );
};
