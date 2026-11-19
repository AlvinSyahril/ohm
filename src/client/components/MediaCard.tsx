import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, ExternalLink, MoreHorizontal } from 'lucide-react';
import { Track } from '../store/usePlayerStore';
import { itemVariants } from '../utils/motion';
import { HeartButton } from './HeartButton';
import {
  MenuCoords,
  SimpleContextMenu,
  SimpleMenuAction,
  TrackContextMenu,
} from './TrackContextMenu';

interface MediaCardProps {
  artwork: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  round?: boolean;
  aspect?: 'square' | 'video';
  isPlaying?: boolean;
  onOpen?: () => void;
  onPlay: () => void;
  onSubtitleClick?: () => void;
  /** When representing an individual track, enables Heart + full TrackContextMenu. */
  track?: Track;
  contextActions?: SimpleMenuAction[];
  className?: string;
}

/**
 * Editorial media card. Borderless obsidian surface with subtle cover dim,
 * centered minimal play trigger, and non-nested accessible actions.
 */
export const MediaCard: React.FC<MediaCardProps> = ({
  artwork,
  title,
  subtitle,
  round = false,
  aspect = 'square',
  isPlaying = false,
  onOpen,
  onPlay,
  onSubtitleClick,
  track,
  contextActions,
  className = '',
}) => {
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);

  const primaryAction = onOpen ?? onPlay;

  const resolvedActions: SimpleMenuAction[] = contextActions ?? [
    {
      id: 'play',
      label: isPlaying ? 'Pause' : 'Play',
      icon: isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />,
      onSelect: onPlay,
    },
    ...(onOpen
      ? [
          {
            id: 'open',
            label: 'Open',
            icon: <ExternalLink className="w-4 h-4" />,
            onSelect: onOpen,
          },
        ]
      : []),
  ];

  const openContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuCoords({ x: e.clientX, y: e.clientY });
  };

  const openButtonMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuCoords({ x: rect.right, y: rect.bottom + 4, alignRight: true });
  };

  return (
    <motion.div
      variants={itemVariants}
      onContextMenu={openContextMenu}
      className={`group relative flex flex-col p-2.5 rounded-md hover:bg-surface focus-within:bg-surface transition-colors ${className}`}
    >
      <div className="relative mb-3">
        <button
          type="button"
          onClick={primaryAction}
          aria-label={onOpen ? `Open ${title}` : isPlaying ? `Pause ${title}` : `Play ${title}`}
          className={`relative block w-full overflow-hidden bg-surface ring-1 ring-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            aspect === 'video' && !round ? 'aspect-video rounded-md' : `aspect-square ${round ? 'rounded-full' : 'rounded-md'}`
          }`}
        >
          <div className="w-full h-full transition-transform duration-700 group-hover:scale-[1.03]">
            {artwork}
          </div>
          <span
            className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
              round ? 'rounded-full' : 'rounded-md'
            } bg-black/45 ${
              isPlaying
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            }`}
            aria-hidden
          />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            isPlaying
              ? 'opacity-100 scale-100 bg-accent text-black border border-accent'
              : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100 bg-base/85 text-ink border border-white/20 hover:border-accent hover:bg-accent hover:text-black'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current translate-x-[1px]" />
          )}
        </button>
      </div>

      <div className="flex items-start gap-1 min-w-0">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={primaryAction}
            className="block w-full text-left min-w-0 focus-visible:outline-none focus-visible:underline"
          >
            <div
              className={`text-[15px] font-semibold truncate transition-colors ${
                isPlaying ? 'text-accent' : 'text-ink'
              }`}
            >
              {title}
            </div>
          </button>

          {subtitle &&
            (onSubtitleClick && typeof subtitle === 'string' ? (
              <button
                type="button"
                onClick={onSubtitleClick}
                className="block max-w-full text-left text-xs text-ink-2 hover:text-ink hover:underline mt-0.5 truncate transition-colors"
              >
                {subtitle}
              </button>
            ) : (
              <div className="text-xs text-ink-2 mt-0.5 truncate">{subtitle}</div>
            ))}
        </div>

        {track && (
          <div className="flex items-center shrink-0 -mr-1.5 -mt-0.5">
            <HeartButton
              track={track}
              revealClass="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
              className="!w-7 !h-7"
              iconClassName="w-3.5 h-3.5"
            />
            <button
              type="button"
              onClick={openButtonMenu}
              aria-label={`More actions for ${title}`}
              className="w-7 h-7 rounded-full flex items-center justify-center text-ink-2 hover:text-ink opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {track ? (
        <TrackContextMenu
          track={track}
          coords={menuCoords}
          onClose={() => setMenuCoords(null)}
        />
      ) : (
        <SimpleContextMenu
          coords={menuCoords}
          actions={resolvedActions}
          onClose={() => setMenuCoords(null)}
        />
      )}
    </motion.div>
  );
};
