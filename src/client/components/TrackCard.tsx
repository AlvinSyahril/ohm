import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Plus,
  Heart,
  Check,
  MoreVertical,
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
      ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
      : '';
  }
  return url.replace(/=w\d+-h\d+/, '=w544-h544');
};

/**
 * Bulletproof Track Artwork with multi-tier fallback:
 * 1. High-res original / upgraded URL
 * 2. mqdefault.jpg
 * 3. default.jpg
 * 4. Generative acoustic geometric vector avatar
 */
export const TrackArtwork: React.FC<{
  track: Track;
  className?: string;
}> = ({ track, className = 'w-full h-full object-cover' }) => {
  const [tier, setTier] = useState<number>(0);

  useEffect(() => {
    setTier(0);
  }, [track.id, track.thumbnail]);

  const candidateUrls = [
    upgradeThumbnail(track.thumbnail, track.id),
    track.id ? `https://i.ytimg.com/vi/${track.id}/mqdefault.jpg` : '',
    track.id ? `https://i.ytimg.com/vi/${track.id}/default.jpg` : '',
  ].filter(Boolean);

  const currentSrc = candidateUrls[tier];

  if (!currentSrc || tier >= candidateUrls.length) {
    const initials = (track.title || 'M')
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();

    const seed = track.id || track.title || 'ohm';
    const hue = (seed.charCodeAt(0) * 37 + (seed.charCodeAt(1) || 45) * 19) % 360;

    return (
      <div
        className={`${className} flex flex-col items-center justify-center relative overflow-hidden select-none`}
        style={{
          background: `linear-gradient(135deg, hsl(${hue}, 45%, 12%), hsl(${(hue + 40) % 360}, 60%, 7%))`,
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <div className="w-20 h-20 rounded-full border border-white" />
          <div className="w-12 h-12 rounded-full border border-white absolute" />
        </div>
        <Disc className="w-5 h-5 text-white/40 mb-1" />
        <span className="font-display font-bold text-xs text-white/80 tracking-wider">
          {initials}
        </span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={track.title}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => {
        setTier((prev) => prev + 1);
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
    startRadio,
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
    <motion.div
      onClick={handleRowClick}
      whileHover={{ scale: 1.008 }}
      whileTap={{ scale: 0.992 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`group relative flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer select-none ${
        isCurrent
          ? 'bg-[#181d26] border border-[#c8ff00]/50 shadow-[0_2px_12px_rgba(200,255,0,0.06)]'
          : 'bg-[#0e1116]/80 hover:bg-[#151922] border border-white/[0.05] hover:border-white/[0.12]'
      }`}
    >
      {/* Left: Thumbnail & Equalizer / Play icon */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative w-12 h-12 rounded-lg bg-[#090a0c] overflow-hidden shrink-0 border border-white/[0.06]">
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
        {/* Start Smart Radio Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            startRadio(track);
          }}
          title="Start Smart Radio"
          className="w-7 h-7 rounded flex items-center justify-center text-zinc-500 hover:text-[#c8ff00] opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        >
          <Radio className="w-3.5 h-3.5" />
        </button>

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

        {/* Popover Menu with AnimatePresence */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-8 w-48 bg-[#12151d] border border-white/[0.12] rounded-xl shadow-2xl p-1.5 z-30 select-none backdrop-blur-md"
            >
              <button
                onClick={() => {
                  startRadio(track);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2 text-zinc-200 hover:text-[#c8ff00] hover:bg-white/[0.06] cursor-pointer mb-1 border-b border-white/[0.06] pb-1.5 font-medium"
              >
                <Radio className="w-3.5 h-3.5 text-[#c8ff00]" />
                <span>Start Smart Radio</span>
              </button>

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
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
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
  const { currentTrack, isPlaying, toggleFavorite, favorites, startRadio } = usePlayerStore();

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isCurrent && isPlaying;
  const isFav = favorites.some((t) => t.id === track.id);

  return (
    <motion.div
      onClick={onPlay}
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="group w-44 shrink-0 p-3 rounded-2xl bg-[#0f1218]/70 hover:bg-[#141822] border border-white/[0.05] hover:border-white/[0.14] transition-colors cursor-pointer select-none flex flex-col shadow-lg"
    >
      {/* Square Art */}
      <div className="relative aspect-square w-full rounded-xl bg-[#090a0c] overflow-hidden mb-3 border border-white/[0.05]">
        <TrackArtwork
          track={track}
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
        />

        {/* Hover / Active Play Button with Spring */}
        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
            isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            className="w-11 h-11 rounded-full bg-[#c8ff00] text-[#090a0c] flex items-center justify-center shadow-xl"
          >
            {isCurrentlyPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </motion.div>
        </div>

        {/* Quick Top Actions: Radio & Heart */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              startRadio(track);
            }}
            title="Start Smart Radio"
            className="w-7 h-7 rounded-full flex items-center justify-center bg-black/60 text-white hover:text-[#c8ff00] backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(track);
            }}
            title={isFav ? 'Remove from Library' : 'Save to Library'}
            className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-opacity cursor-pointer ${
              isFav
                ? 'bg-[#c8ff00] text-[#090a0c] opacity-100'
                : 'bg-black/60 text-white hover:text-[#c8ff00] opacity-0 group-hover:opacity-100'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0">
        <h4
          className={`font-display font-semibold text-[13px] truncate ${
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
    </motion.div>
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
    startRadio,
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
      onClick={handlePlayClick}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`group relative rounded-2xl p-3 cursor-pointer select-none flex flex-col justify-between transition-colors duration-200 ${
        isCurrent
          ? 'bg-[#151922] border border-[#c8ff00] shadow-[0_4px_20px_rgba(200,255,0,0.08)]'
          : 'bg-[#0f1218]/80 border border-white/[0.06] hover:bg-[#141822] hover:border-white/[0.14]'
      }`}
    >
      {/* Square Album Artwork */}
      <div className="relative aspect-square w-full rounded-xl bg-[#090a0c] overflow-hidden mb-3 border border-white/[0.05]">
        <TrackArtwork
          track={track}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
        />

        {/* Active Playing Indicator Badge */}
        {isCurrent && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-[#090a0c]/90 border border-white/[0.12] flex items-center gap-1.5 shadow-md">
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
            onClick={() => startRadio(track)}
            title="Start Smart Radio"
            className="w-7 h-7 rounded-full flex items-center justify-center border bg-[#090a0c]/85 border-white/[0.15] text-white hover:text-[#c8ff00] hover:border-[#c8ff00]/40 transition-colors cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => toggleFavorite(track)}
            title={isFav ? 'Remove from Library' : 'Save to Library'}
            className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
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
            className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
              inQueue
                ? 'bg-white border-white text-[#090a0c]'
                : 'bg-[#090a0c]/85 border-white/[0.15] text-white hover:border-white/40'
            }`}
          >
            {inQueue ? <Check className="w-3.5 h-3.5 text-[#090a0c]" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Bottom-Right Play Button on Hover */}
        <motion.button
          onClick={handlePlayClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          aria-label={isCurrentlyPlaying ? 'Pause' : 'Play'}
          className={`absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#c8ff00] text-[#090a0c] flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer ${
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
        </motion.button>
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
    </motion.div>
  );
};
