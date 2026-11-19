import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Radio,
  ListStart,
  Plus,
  Check,
  ArrowUp,
  ArrowDown,
  Trash2,
  Disc3,
  Mic2,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Track, usePlayerStore } from '../store/usePlayerStore';
import { isDesktopApp } from '../lib/desktop';
import { toast } from '../store/useToastStore';
import { primaryArtist } from '../utils/catalog';
import { popoverVariants } from '../utils/motion';

export interface MenuCoords {
  x: number;
  y: number;
  alignRight?: boolean;
}

export interface SimpleMenuAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

const useClampedPortalMenu = (
  open: boolean,
  coords: MenuCoords | null,
  onClose: () => void
) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<{ left: number; top: number; origin: string }>({
    left: coords?.x ?? 0,
    top: coords?.y ?? 0,
    origin: coords?.alignRight ? 'top right' : 'top left',
  });

  useLayoutEffect(() => {
    if (!open || !coords) return;
    const el = menuRef.current;
    const width = el?.offsetWidth || 240;
    const height = el?.offsetHeight || 280;
    const pad = 8;
    const minTop = isDesktopApp() ? 44 : pad;
    const maxX = Math.max(pad, window.innerWidth - width - pad);
    const maxY = Math.max(minTop, window.innerHeight - height - pad);

    const rawX = coords.alignRight ? coords.x - width : coords.x;
    const left = Math.min(Math.max(pad, rawX), maxX);
    const fitsBelow = coords.y + height <= window.innerHeight - pad;
    const top = fitsBelow
      ? Math.max(minTop, coords.y)
      : Math.min(maxY, Math.max(minTop, coords.y - height));

    setPlaced({
      left,
      top,
      origin: `${fitsBelow ? 'top' : 'bottom'} ${coords.alignRight ? 'right' : 'left'}`,
    });
  }, [open, coords]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    const onScroll = () => onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, onClose]);

  return { menuRef, placed };
};

interface TrackContextMenuProps {
  track: Track;
  coords: MenuCoords | null;
  onClose: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemoveFromQueue?: () => void;
  moveScope?: 'playlist' | 'queue';
}

/**
 * Viewport-clamped context menu for track rows and queue items, shared between
 * "..." button clicks and right-click context events.
 */
export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({
  track,
  coords,
  onClose,
  onMoveUp,
  onMoveDown,
  onRemoveFromQueue,
  moveScope = 'playlist',
}) => {
  const {
    startRadio,
    addToQueue,
    playNext,
    queue,
    playlists,
    activePlaylistId,
    createPlaylistWithTrack,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    openArtist,
    openCollection,
    setStageOpen,
  } = usePlayerStore(
    useShallow((s) => ({
      startRadio: s.startRadio,
      addToQueue: s.addToQueue,
      playNext: s.playNext,
      queue: s.queue,
      playlists: s.playlists,
      activePlaylistId: s.activePlaylistId,
      createPlaylistWithTrack: s.createPlaylistWithTrack,
      addTrackToPlaylist: s.addTrackToPlaylist,
      removeTrackFromPlaylist: s.removeTrackFromPlaylist,
      openArtist: s.openArtist,
      openCollection: s.openCollection,
      setStageOpen: s.setStageOpen,
    }))
  );

  const open = coords !== null;
  const { menuRef, placed } = useClampedPortalMenu(open, coords, onClose);
  const inQueue = queue.some((t) => t.id === track.id);
  const activePlaylist = activePlaylistId
    ? playlists.find((p) => p.id === activePlaylistId)
    : undefined;
  const inActivePlaylist =
    !onRemoveFromQueue &&
    !!activePlaylist &&
    activePlaylist.tracks.some((t) => t.id === track.id);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          role="menu"
          variants={popoverVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          style={{
            position: 'fixed',
            left: placed.left,
            top: placed.top,
            transformOrigin: placed.origin,
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          className="w-60 bg-hover rounded-md p-1 z-[70] border border-line max-h-[80vh] overflow-y-auto"
        >
          <button
            role="menuitem"
            onClick={() => {
              startRadio(track);
              onClose();
            }}
            className="w-full text-left h-9 px-3 rounded-sm text-sm flex items-center gap-3 text-ink hover:bg-white/10 transition-colors"
          >
            <Radio className="w-4 h-4 text-ink-2 shrink-0" />
            Go to song radio
          </button>
          <button
            role="menuitem"
            onClick={() => {
              playNext(track);
              toast('Playing next');
              onClose();
            }}
            className="w-full text-left h-9 px-3 rounded-sm text-sm flex items-center gap-3 text-ink hover:bg-white/10 transition-colors"
          >
            <ListStart className="w-4 h-4 text-ink-2 shrink-0" />
            Play next
          </button>
          {onRemoveFromQueue ? (
            <button
              role="menuitem"
              onClick={() => {
                onRemoveFromQueue();
                onClose();
              }}
              className="w-full text-left h-9 px-3 rounded-sm text-sm flex items-center gap-3 text-danger hover:bg-white/10 transition-colors"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              Remove from queue
            </button>
          ) : (
            <button
              role="menuitem"
              onClick={() => {
                if (!inQueue) {
                  addToQueue(track);
                  toast('Added to queue');
                }
                onClose();
              }}
              className="w-full text-left h-9 px-3 rounded-sm text-sm flex items-center gap-3 text-ink hover:bg-white/10 transition-colors"
            >
              {inQueue ? (
                <Check className="w-4 h-4 text-accent shrink-0" />
              ) : (
                <Plus className="w-4 h-4 text-ink-2 shrink-0" />
              )}
              {inQueue ? 'In queue' : 'Add to queue'}
            </button>
          )}

          <button
            role="menuitem"
            onClick={() => {
              setStageOpen(false);
              openArtist(primaryArtist(track.artist), track.artistId);
              onClose();
            }}
            className="w-full text-left h-9 px-3 rounded-sm text-sm flex items-center gap-3 text-ink hover:bg-white/10 transition-colors"
          >
            <Mic2 className="w-4 h-4 text-ink-2 shrink-0" />
            Go to artist
          </button>

          {(track.albumId || track.album) && (
            <button
              role="menuitem"
              onClick={() => {
                setStageOpen(false);
                openCollection({
                  title: track.album || track.title,
                  kind: 'Album',
                  albumId: track.albumId,
                  artist: primaryArtist(track.artist),
                  thumbnail: track.thumbnail,
                  tracks: [],
                });
                onClose();
              }}
              className="w-full text-left h-9 px-3 rounded-sm text-sm flex items-center gap-3 text-ink hover:bg-white/10 transition-colors"
            >
              <Disc3 className="w-4 h-4 text-ink-2 shrink-0" />
              Go to album
            </button>
          )}

          {(onMoveUp || onMoveDown) && (
            <>
              <div className="h-px bg-line my-1" />
              {onMoveUp && (
                <button
                  role="menuitem"
                  onClick={() => {
                    onMoveUp();
                    onClose();
                  }}
                  className="w-full text-left h-9 px-3 rounded-sm text-sm flex items-center gap-3 text-ink hover:bg-white/10 transition-colors"
                >
                  <ArrowUp className="w-4 h-4 text-ink-2 shrink-0" />
                  {moveScope === 'queue' ? 'Move up' : 'Move up in playlist'}
                </button>
              )}
              {onMoveDown && (
                <button
                  role="menuitem"
                  onClick={() => {
                    onMoveDown();
                    onClose();
                  }}
                  className="w-full text-left h-9 px-3 rounded-sm text-sm flex items-center gap-3 text-ink hover:bg-white/10 transition-colors"
                >
                  <ArrowDown className="w-4 h-4 text-ink-2 shrink-0" />
                  {moveScope === 'queue' ? 'Move down' : 'Move down in playlist'}
                </button>
              )}
            </>
          )}

          {inActivePlaylist && activePlaylistId && (
            <button
              role="menuitem"
              onClick={() => {
                removeTrackFromPlaylist(activePlaylistId, track.id);
                toast('Removed from playlist');
                onClose();
              }}
              className="w-full text-left h-9 px-3 rounded-sm text-sm flex items-center gap-3 text-danger hover:bg-white/10 transition-colors"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              Remove from this playlist
            </button>
          )}

          <div className="h-px bg-line my-1" />
          <div className="px-3 pt-1 pb-1 text-xs font-medium text-ink-3">Add to playlist</div>
          {playlists.map((pl) => {
            const already = pl.tracks.some((t) => t.id === track.id);
            return (
              <button
                key={pl.id}
                role="menuitem"
                disabled={already}
                onClick={() => {
                  addTrackToPlaylist(pl.id, track);
                  toast(`Added to ${pl.name}`);
                  onClose();
                }}
                className={`w-full text-left h-9 px-3 rounded-sm text-sm flex items-center justify-between transition-colors ${
                  already ? 'text-ink-3' : 'text-ink hover:bg-white/10'
                }`}
              >
                <span className="truncate">{pl.name}</span>
                {already && <Check className="w-4 h-4 text-accent shrink-0" />}
              </button>
            );
          })}
          <button
            role="menuitem"
            onClick={() => {
              const created = createPlaylistWithTrack(track);
              toast(`Added to "${created.name}"`);
              onClose();
            }}
            className="w-full text-left h-9 px-3 rounded-sm text-sm flex items-center gap-3 text-ink hover:bg-white/10 transition-colors"
          >
            <Plus className="w-4 h-4 text-ink-2 shrink-0" />
            Create new playlist
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

interface SimpleContextMenuProps {
  coords: MenuCoords | null;
  actions: SimpleMenuAction[];
  onClose: () => void;
}

/** Lightweight portal context menu used by MediaCard right-click actions. */
export const SimpleContextMenu: React.FC<SimpleContextMenuProps> = ({
  coords,
  actions,
  onClose,
}) => {
  const open = coords !== null && actions.length > 0;
  const { menuRef, placed } = useClampedPortalMenu(open, coords, onClose);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          role="menu"
          variants={popoverVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          style={{
            position: 'fixed',
            left: placed.left,
            top: placed.top,
            transformOrigin: placed.origin,
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          className="w-52 bg-hover rounded-md p-1 z-[70] border border-line"
        >
          {actions.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              onClick={() => {
                item.onSelect();
                onClose();
              }}
              className={`w-full text-left h-9 px-3 rounded-sm text-sm flex items-center gap-3 hover:bg-white/10 transition-colors ${
                item.danger ? 'text-danger' : 'text-ink'
              }`}
            >
              {item.icon && <span className="text-ink-2 shrink-0">{item.icon}</span>}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
