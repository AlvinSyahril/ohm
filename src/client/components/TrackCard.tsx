import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Plus,
  Heart,
  Check,
  MoreVertical,
  ListPlus,
  Radio,
  Disc,
} from 'lucide-react';
import { Track, Playlist, usePlayerStore } from '../store/usePlayerStore';

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

// Compact Track Row for YouTube Music style 4-column "Quick Picks" (Pilihan Cepat)
interface CompactTrackRowProps {
  track: Track;
  index: number;
  contextQueue?: Track[];
}

export const CompactTrackRow: React.FC<CompactTrackRowProps> = ({
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
    playlists,
    addTrackToPlaylist,
  } = usePlayerStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isCurrent && isPlaying;
  const inQueue = queue.some((t) => t.id === track.id);
  const isFav = favorites.some((t) => t.id === track.id);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  const handleRowClick = () => {
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
      onClick={handleRowClick}
      className={`group relative flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer select-none ${
        isCurrent
          ? 'bg-[#181c24] border border-[#c8ff00]/40'
          : 'bg-[#0f1115]/60 hover:bg-[#151820] border border-white/[0.04] hover:border-white/[0.1]'
      }`}
    >
      {/* Left: Thumbnail & Equalizer / Play icon */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative w-12 h-12 rounded-md bg-[#090a0c] overflow-hidden shrink-0 border border-white/[0.05]">
          <TrackArtwork track={track} className="w-full h-full object-cover" />

          {/* Hover Play Button Overlay */}
          <div
            className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity ${
              isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {isCurrentlyPlaying ? (
              <div className="flex items-end gap-[2px] h-3 w-3.5">
                <span className="w-[2px] bg-[#c8ff00] eq-bar-1" />
                <span className="w-[2px] bg-[#c8ff00] eq-bar-2" />
                <span className="w-[2px] bg-[#c8ff00] eq-bar-3" />
              </div>
            ) : (
              <Play className="w-4 h-4 text-[#c8ff00] fill-current ml-0.5" />
            )}
          </div>
        </div>

        {/* Track Title and Artist */}
        <div className="min-w-0 pr-2">
          <div
            className={`font-display font-medium text-[13px] truncate ${
              isCurrent ? 'text-[#c8ff00]' : 'text-zinc-100 group-hover:text-white'
            }`}
          >
            {track.title}
          </div>
          <div className="text-[11px] text-zinc-400 truncate mt-0.5">
            {track.artist}
            {track.album && (
              <span className="text-zinc-500"> · {track.album}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Quick actions & Duration */}
      <div className="flex items-center gap-1 shrink-0 relative" ref={menuRef}>
        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(track);
          }}
          title={isFav ? 'Remove from Library' : 'Save to Library'}
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
            isFav
              ? 'text-[#c8ff00]'
              : 'text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
        </button>

        {/* Add to Queue button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            addToQueue(track);
          }}
          title={inQueue ? 'In Queue' : 'Add to Queue'}
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
            inQueue
              ? 'text-white'
              : 'text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100'
          }`}
        >
          {inQueue ? <Check className="w-3.5 h-3.5 text-[#c8ff00]" /> : <Plus className="w-3.5 h-3.5" />}
        </button>

        {/* More Actions / Add to Playlist Dropdown */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          title="More Actions"
          className="w-7 h-7 rounded flex items-center justify-center text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {/* Duration text */}
        <span className="font-mono text-[10px] text-zinc-500 tabular-nums px-1.5 w-10 text-right">
          {formatDuration(track.duration)}
        </span>

        {/* Popover Menu */}
        {menuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-8 w-48 bg-[#11141a] border border-white/[0.12] rounded-lg shadow-2xl p-1.5 z-30 select-none animate-in fade-in duration-100"
          >
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-white/[0.06] mb-1">
              Add to Playlist
            </div>
            {playlists.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-zinc-400">
                No playlists yet
              </div>
            ) : (
              playlists.map((pl) => {
                const alreadyIn = pl.tracks.some((t) => t.id === track.id);
                return (
                  <button
                    key={pl.id}
                    onClick={() => {
                      addTrackToPlaylist(pl.id, track);
                      setMenuOpen(false);
                    }}
                    disabled={alreadyIn}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                      alreadyIn
                        ? 'text-zinc-600 cursor-default'
                        : 'text-zinc-300 hover:text-white hover:bg-white/[0.06] cursor-pointer'
                    }`}
                  >
                    <span className="truncate">{pl.name}</span>
                    {alreadyIn && <Check className="w-3 h-3 text-[#c8ff00]" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Carousel Track Card for "Listen Again" & "Recommended Albums"
interface CarouselTrackCardProps {
  track: Track;
  subtitle?: string;
  onPlay: () => void;
}

export const CarouselTrackCard: React.FC<CarouselTrackCardProps> = ({
  track,
  subtitle,
  onPlay,
}) => {
  const { currentTrack, isPlaying, toggleFavorite, favorites, addToQueue } =
    usePlayerStore();

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isCurrent && isPlaying;
  const isFav = favorites.some((t) => t.id === track.id);

  return (
    <div
      onClick={onPlay}
      className="group w-44 shrink-0 p-2.5 rounded-xl bg-[#0f1115]/50 hover:bg-[#14171e] border border-white/[0.05] hover:border-white/[0.12] transition-colors cursor-pointer select-none flex flex-col"
    >
      {/* Square Art */}
      <div className="relative aspect-square w-full rounded-lg bg-[#090a0c] overflow-hidden mb-2.5 border border-white/[0.04]">
        <TrackArtwork
          track={track}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
        />

        {/* Hover / Active Play Button */}
        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
            isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-[#c8ff00] text-[#090a0c] flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
            {isCurrentlyPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </div>
        </div>

        {/* Quick Save Pill */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(track);
          }}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-opacity cursor-pointer ${
            isFav
              ? 'bg-[#c8ff00] text-[#090a0c] opacity-100'
              : 'bg-black/60 text-white hover:text-[#c8ff00] opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Info */}
      <div className="min-w-0">
        <h4
          className={`font-display font-medium text-[13px] truncate ${
            isCurrent ? 'text-[#c8ff00]' : 'text-zinc-100 group-hover:text-white'
          }`}
          title={track.title}
        >
          {track.title}
        </h4>
        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
          {subtitle || track.artist}
        </p>
      </div>
    </div>
  );
};

// Standard Grid Track Card
interface TrackCardProps {
  track: Track;
  index: number;
  contextQueue?: Track[];
}

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
      className={`group relative rounded-xl p-3 cursor-pointer select-none flex flex-col justify-between transition-colors duration-150 ${
        isCurrent
          ? 'bg-[#15181f] border border-[#c8ff00]'
          : 'bg-[#0f1115] border border-white/[0.06] hover:bg-[#14171d] hover:border-white/[0.14]'
      }`}
    >
      {/* Square Album Artwork */}
      <div className="relative aspect-square w-full rounded-lg bg-[#090a0c] overflow-hidden mb-3 border border-white/[0.04]">
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
          className={`absolute bottom-2 right-2 w-9 h-9 rounded-full bg-[#c8ff00] text-[#090a0c] flex items-center justify-center shadow-lg transition-all duration-150 cursor-pointer ${
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

      {/* Clean Typography */}
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
