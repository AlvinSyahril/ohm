import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, MoreHorizontal } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Track, usePlayerStore } from '../store/usePlayerStore';
import { useArtistAvatar } from '../hooks/useArtistAvatar';
import { primaryArtist } from '../utils/catalog';
import { ArtistLinks } from './ArtistLinks';
import { HeartButton } from './HeartButton';
import { MenuCoords, TrackContextMenu } from './TrackContextMenu';
import { rowDelay, EASE_OUT } from '../utils/motion';

export const formatDuration = (seconds?: number): string => {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const formatTrackDuration = (seconds?: number): string =>
  seconds && isFinite(seconds) && seconds > 0 ? formatDuration(seconds) : '—';

const YT_IMG_RE =
  /^https?:\/\/(?:i|img)\.yt(?:img)?\.com\/(?:vi|vi_webp)\/([A-Za-z0-9_-]{6,})\/(?:maxresdefault|sddefault|hqdefault|mqdefault|default)\.(?:jpg|webp)/i;

export type ArtworkSize = 'xs' | 'sm' | 'md' | 'lg';

const ARTWORK_PX: Record<ArtworkSize, number> = {
  xs: 120,
  sm: 240,
  md: 544,
  lg: 1200,
};

const resolveArtworkPx = (size: number | ArtworkSize): number =>
  typeof size === 'number' ? size : ARTWORK_PX[size];

const ytQualityForPx = (px: number): string =>
  px >= 400 ? 'maxresdefault.jpg' : 'mqdefault.jpg';

const UNCROPPED_YT_RE = /\/(?:maxresdefault|sddefault|hqdefault|mqdefault)\.jpg(?:\?|$)/i;

/**
 * True when a YouTube video thumbnail is an uncropped 16:9/4:3 frame without `?sqp=`
 * cropping, which commonly carries baked-in top/bottom letterbox bars.
 */
export const needsYoutubeLetterboxCrop = (src?: string): boolean =>
  !!src &&
  /(?:i|img)\.yt(?:img)?\.com/i.test(src) &&
  UNCROPPED_YT_RE.test(src) &&
  !src.includes('sqp=');

export const upgradeThumbnail = (
  url?: string,
  videoId?: string,
  size: number | ArtworkSize = 1200
): string => {
  const px = resolveArtworkPx(size);
  if (!url) {
    return videoId ? `https://i.ytimg.com/vi/${videoId}/${ytQualityForPx(px)}` : '';
  }
  if (url.includes('sqp=')) {
    return url;
  }
  if (/=w\d+-h\d+/.test(url)) {
    return url.replace(/=w\d+-h\d+/, `=w${px}-h${px}`);
  }
  if (/=s\d+/.test(url)) {
    return url.replace(/=s\d+/, `=s${px}`);
  }
  const ytMatch = url.match(YT_IMG_RE);
  if (ytMatch?.[1]) {
    return `https://i.ytimg.com/vi/${ytMatch[1]}/${ytQualityForPx(px)}`;
  }
  return url;
};

/**
 * Artwork with slot-sized resolution (sm 240px for rows, md 544px for grid cards, lg 1200px for stage/heroes),
 * layered YouTube fallbacks, and async decoding so large grids stay fast and low-RAM.
 */
export const TrackArtwork: React.FC<{
  track: Track;
  size?: ArtworkSize;
  className?: string;
}> = ({ track, size = 'sm', className = 'w-full h-full object-cover' }) => {
  const [tier, setTier] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setTier(0);
    setLoaded(false);
  }, [track.id, track.thumbnail, size]);

  const targetPx = ARTWORK_PX[size];
  const ytChain =
    targetPx >= 900
      ? ['mqdefault.jpg', 'sddefault.jpg', 'hqdefault.jpg']
      : ['mqdefault.jpg', 'hqdefault.jpg'];

  // Preserve original ?sqp= cropped thumbnails before falling back to generic uncropped URLs
  const hasCroppedSqp = Boolean(track.thumbnail && track.thumbnail.includes('sqp='));
  const rawList = [
    upgradeThumbnail(track.thumbnail, track.id, size),
    ...(hasCroppedSqp ? [track.thumbnail || ''] : []),
    ...(track.id ? ytChain.map((q) => `https://i.ytimg.com/vi/${track.id}/${q}`) : []),
    ...(!hasCroppedSqp ? [track.thumbnail || ''] : []),
  ].filter(Boolean);
  const candidates = rawList.filter((u, idx) => rawList.indexOf(u) === idx);

  const src = candidates[tier];
  const needsLetterboxCrop = needsYoutubeLetterboxCrop(src);

  const handleReady = (el: HTMLImageElement) => {
    // YouTube returns a 120x90 grey stub when maxresdefault/sddefault is missing for older uploads
    if (
      src &&
      src.includes('i.ytimg.com') &&
      el.naturalWidth === 120 &&
      el.naturalHeight === 90 &&
      tier < candidates.length - 1
    ) {
      setLoaded(false);
      setTier((t) => t + 1);
      return;
    }
    setLoaded(true);
  };

  useEffect(() => {
    setLoaded(false);
    const el = imgRef.current;
    if (!el || !el.complete) return;
    if (el.naturalWidth === 0) {
      setTier((t) => t + 1);
      return;
    }
    handleReady(el);
  }, [src]);

  if (!src) {
    const initials = (track.title || 'O')
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    return (
      <div
        className={`${className} flex items-center justify-center bg-hover text-ink-2 text-sm font-bold select-none`}
        aria-hidden
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      key={src}
      ref={imgRef}
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onLoad={(e) => handleReady(e.currentTarget)}
      onError={() => {
        setLoaded(false);
        setTier((t) => t + 1);
      }}
      className={`${className} transition-opacity duration-500 ${
        needsLetterboxCrop ? 'scale-[1.35]' : ''
      } ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
};

/**
 * Shared square/round poster artwork for Explore, Search, and Collection cards.
 */
export const PosterArt: React.FC<{ src?: string; title: string; round?: boolean }> = ({
  src,
  title,
  round = false,
}) => {
  const [tier, setTier] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setTier(0);
    setLoaded(false);
  }, [src]);

  const upgraded = src ? upgradeThumbnail(src, undefined, 'md') : '';
  const candidates =
    upgraded && upgraded !== src ? [upgraded, src!] : src ? [src] : [];
  const activeSrc = candidates[tier];
  const needsLetterboxCrop = needsYoutubeLetterboxCrop(activeSrc);

  useEffect(() => {
    setLoaded(false);
    const el = imgRef.current;
    if (!el || !el.complete) return;
    if (el.naturalWidth === 0) {
      setTier((t) => t + 1);
      return;
    }
    if (
      activeSrc &&
      activeSrc.includes('i.ytimg.com') &&
      el.naturalWidth === 120 &&
      el.naturalHeight === 90 &&
      tier < candidates.length - 1
    ) {
      setTier((t) => t + 1);
      return;
    }
    setLoaded(true);
  }, [activeSrc]);

  if (!activeSrc) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center bg-hover text-ink-2 text-lg font-bold select-none ${
          round ? 'rounded-full' : ''
        }`}
      >
        {title.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      key={activeSrc}
      ref={imgRef}
      src={activeSrc}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={(e) => {
        const el = e.currentTarget;
        if (
          activeSrc.includes('i.ytimg.com') &&
          el.naturalWidth === 120 &&
          el.naturalHeight === 90 &&
          tier < candidates.length - 1
        ) {
          setLoaded(false);
          setTier((t) => t + 1);
          return;
        }
        setLoaded(true);
      }}
      onError={() => {
        setLoaded(false);
        setTier((t) => t + 1);
      }}
      className={`w-full h-full object-cover transition-opacity duration-500 ${
        needsLetterboxCrop ? 'scale-[1.35]' : ''
      } ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
};

/** Three-bar playing indicator. Settles into a static glyph when paused. */
export const PlayingBars: React.FC<{ active: boolean; className?: string }> = ({
  active,
  className = 'h-3.5 w-3.5',
}) => (
  <div className={`flex items-end gap-[2px] ${className}`} aria-hidden>
    <span className={`w-[3px] bg-accent ${active ? 'eq-bar-1' : 'h-[40%]'}`} />
    <span className={`w-[3px] bg-accent ${active ? 'eq-bar-2' : 'h-[80%]'}`} />
    <span className={`w-[3px] bg-accent ${active ? 'eq-bar-3' : 'h-[55%]'}`} />
  </div>
);

/**
 * Shared circular/square artist portrait with automatic fallback to track artwork.
 */
export const ArtistAvatar: React.FC<{ name: string; fallbackTrack: Track }> = ({
  name,
  fallbackTrack,
}) => {
  const avatar = useArtistAvatar(name, fallbackTrack.artistId);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [avatar]);

  if (!avatar || failed) {
    return <TrackArtwork track={fallbackTrack} size="md" />;
  }

  return (
    <img
      src={avatar}
      alt=""
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
};

interface TrackRowProps {
  track: Track;
  index: number;
  contextQueue?: Track[];
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  contextQueue,
  onMoveUp,
  onMoveDown,
}) => {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    openCollection,
  } = usePlayerStore(
    useShallow((s) => ({
      currentTrack: s.currentTrack,
      isPlaying: s.isPlaying,
      playTrack: s.playTrack,
      togglePlay: s.togglePlay,
      openCollection: s.openCollection,
    }))
  );

  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);

  const isCurrent = currentTrack?.id === track.id;
  const menuOpen = menuCoords !== null;

  const activate = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, contextQueue ? contextQueue.slice(index + 1) : undefined);
    }
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (menuOpen) {
      setMenuCoords(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuCoords({ x: rect.right, y: rect.bottom + 4, alignRight: true });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuCoords({ x: e.clientX, y: e.clientY });
  };

  const reveal = menuOpen
    ? 'opacity-100'
    : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT, delay: rowDelay(index) }}
      onClick={activate}
      onContextMenu={handleContextMenu}
      className={`group grid grid-cols-[2rem_minmax(0,1fr)_auto] md:grid-cols-[2rem_minmax(0,3fr)_minmax(0,2fr)_auto] items-center gap-4 h-14 px-4 rounded-md hover:bg-white/[0.07] focus-within:bg-white/[0.07] transition-colors select-none cursor-pointer ${
        menuOpen ? 'bg-white/[0.07]' : ''
      }`}
    >
      {/* Index / state */}
      <div className="flex items-center justify-center text-sm text-ink-2 tabular-nums">
        {isCurrent ? (
          <>
            <span className="group-hover:hidden">
              <PlayingBars active={isPlaying} />
            </span>
            {isPlaying ? (
              <Pause className="w-4 h-4 text-ink fill-current hidden group-hover:block" />
            ) : (
              <Play className="w-4 h-4 text-ink fill-current hidden group-hover:block" />
            )}
          </>
        ) : (
          <>
            <span className="group-hover:hidden">{index + 1}</span>
            <Play className="w-4 h-4 text-ink fill-current hidden group-hover:block" />
          </>
        )}
      </div>

      {/* Title block */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-md overflow-hidden bg-hover shrink-0">
          <TrackArtwork track={track} />
        </div>
        <div className="min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              activate();
            }}
            className={`block max-w-full text-left text-[15px] font-medium truncate transition-colors focus-visible:underline ${
              isCurrent ? 'text-accent' : 'text-ink'
            }`}
          >
            {track.title}
          </button>
          <div className="text-sm text-ink-2 truncate group-hover:text-ink transition-colors">
            <ArtistLinks
              artist={track.artist}
              artistId={track.artistId}
              className="block max-w-full truncate"
              linkClassName="hover:underline"
            />
          </div>
        </div>
      </div>

      {/* Album */}
      <div className="hidden md:block min-w-0 text-sm text-ink-2 group-hover:text-ink transition-colors">
        {track.album ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openCollection({
                title: track.album!,
                kind: 'Album',
                albumId: track.albumId,
                artist: primaryArtist(track.artist),
                thumbnail: track.thumbnail,
                tracks: [],
              });
            }}
            className="block max-w-full truncate text-left hover:underline"
          >
            {track.album}
          </button>
        ) : (
          ''
        )}
      </div>

      {/* Actions + duration */}
      <div className="relative flex items-center justify-end gap-1">
        <HeartButton track={track} revealClass={reveal} />

        <span className="w-12 text-right text-sm text-ink-2 tabular-nums">
          {formatTrackDuration(track.duration)}
        </span>

        <button
          onClick={toggleMenu}
          aria-label="More options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={`w-8 h-8 flex items-center justify-center rounded-full text-ink-2 hover:text-ink transition-colors ${reveal}`}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        <TrackContextMenu
          track={track}
          coords={menuCoords}
          onClose={() => setMenuCoords(null)}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      </div>
    </motion.div>
  );
};
