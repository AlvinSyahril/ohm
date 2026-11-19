import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, GripVertical, ListPlus, MoreHorizontal } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Track, usePlayerStore } from '../store/usePlayerStore';
import { toast } from '../store/useToastStore';
import { TrackArtwork, PlayingBars, formatTrackDuration } from './TrackCard';
import { MenuCoords, TrackContextMenu } from './TrackContextMenu';
import { EASE_OUT, SPRING, SPRING_LAYOUT } from '../utils/motion';

export const QueueDrawer: React.FC = () => {
  const {
    isQueueOpen,
    setQueueOpen,
    currentTrack,
    isPlaying,
    queue,
    playTrack,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    saveQueueAsPlaylist,
    autoplay,
    toggleAutoplay,
  } = usePlayerStore(
    useShallow((s) => ({
      isQueueOpen: s.isQueueOpen,
      setQueueOpen: s.setQueueOpen,
      currentTrack: s.currentTrack,
      isPlaying: s.isPlaying,
      queue: s.queue,
      playTrack: s.playTrack,
      removeFromQueue: s.removeFromQueue,
      clearQueue: s.clearQueue,
      reorderQueue: s.reorderQueue,
      saveQueueAsPlaylist: s.saveQueueAsPlaylist,
      autoplay: s.autoplay,
      toggleAutoplay: s.toggleAutoplay,
    }))
  );

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [menuState, setMenuState] = useState<{
    track: Track;
    index: number | null;
    coords: MenuCoords | null;
  } | null>(null);

  useEffect(() => {
    if (!isQueueOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && window.innerWidth < 1024) {
        setQueueOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isQueueOpen, setQueueOpen]);

  return (
    <AnimatePresence initial={false}>
      {isQueueOpen && (
        <>
          <motion.div
            key="queue-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setQueueOpen(false)}
            className="lg:hidden fixed inset-0 electron-top-bar z-40 bg-black/60"
            aria-hidden
          />
          <motion.aside
            key="queue-drawer"
            aria-label="Queue"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="fixed top-2 electron-top-gap bottom-[84px] right-2 z-50 lg:static lg:inset-auto lg:z-auto max-w-[calc(100vw-16px)] shrink-0 lg:h-full bg-canvas rounded-lg lg:rounded-none overflow-hidden select-none border border-line lg:border-0 lg:border-l lg:border-line"
          >
            <div className="w-[min(320px,calc(100vw-16px))] h-full flex flex-col">
              <div className="h-16 px-4 flex items-center justify-between border-b border-line shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">Queue</span>
                  {queue.length > 0 && (
                    <span className="text-xs text-ink-3 tabular-nums">
                      {queue.length}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setQueueOpen(false)}
                  aria-label="Close panel"
                  className="w-8 h-8 rounded-md flex items-center justify-center text-ink-2 hover:text-ink hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-2 py-4">
                    {currentTrack && (
                      <section className="mb-4">
                        <h3 className="px-3 mb-2 text-xs font-medium text-ink-3">Now playing</h3>
                        <div
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMenuState({
                              track: currentTrack,
                              index: null,
                              coords: { x: e.clientX, y: e.clientY },
                            });
                          }}
                          className={`group flex items-center gap-3 px-3 h-14 rounded-md hover:bg-white/[0.04] transition-colors ${
                            menuState?.index === null && menuState.coords ? 'bg-white/[0.04]' : ''
                          }`}
                        >
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-hover shrink-0">
                            <TrackArtwork track={currentTrack} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-accent truncate">
                              {currentTrack.title}
                            </div>
                            <div className="text-xs text-ink-2 truncate">{currentTrack.artist}</div>
                          </div>
                          <div className="flex items-center justify-end w-8 shrink-0">
                            <span
                              className={
                                menuState?.index === null && menuState.coords
                                  ? 'hidden'
                                  : 'sm:group-hover:hidden sm:group-focus-within:hidden'
                              }
                            >
                              <PlayingBars active={isPlaying} />
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (menuState?.index === null && menuState.coords) {
                                  setMenuState((prev) =>
                                    prev ? { ...prev, coords: null } : null
                                  );
                                  return;
                                }
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMenuState({
                                  track: currentTrack,
                                  index: null,
                                  coords: {
                                    x: rect.right,
                                    y: rect.bottom + 4,
                                    alignRight: true,
                                  },
                                });
                              }}
                              aria-label={`Options for ${currentTrack.title}`}
                              aria-haspopup="menu"
                              aria-expanded={menuState?.index === null && !!menuState.coords}
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:text-ink transition-opacity ${
                                menuState?.index === null && menuState.coords
                                  ? 'flex text-ink'
                                  : 'hidden sm:group-hover:flex sm:group-focus-within:flex'
                              }`}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </section>
                    )}

                    <section>
                      <div className="flex items-center justify-between px-3 mb-2 gap-2">
                        <h3 className="text-sm font-bold text-ink-2">Next up</h3>
                        {(queue.length > 0 || currentTrack) && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                const savedName = saveQueueAsPlaylist();
                                if (savedName) {
                                  const total = queue.length + (currentTrack ? 1 : 0);
                                  toast(`Saved ${total} songs to "${savedName}"`);
                                }
                              }}
                              title="Save queue as playlist"
                              className="inline-flex items-center gap-1 text-xs font-medium text-ink-2 hover:text-ink transition-colors"
                            >
                              <ListPlus className="w-3.5 h-3.5" />
                              Save
                            </button>
                            {queue.length > 0 && (
                              <button
                                onClick={() => {
                                  clearQueue();
                                  toast('Queue cleared');
                                }}
                                className="text-xs font-bold text-ink-2 hover:text-ink hover:underline"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {queue.length === 0 ? (
                        <div className="px-3 py-8 text-center">
                          <p className="text-sm font-bold">Your queue is empty</p>
                          <p className="text-sm text-ink-2 mt-1">
                            Add songs from the options menu, or start a radio.
                          </p>
                        </div>
                      ) : (
                        <AnimatePresence initial={false}>
                          {(() => {
                            const firstAutoIdx = queue.findIndex((q) => q.queueOrigin === 'auto');
                            const hasManualPrefix = firstAutoIdx > 0;
                            return queue.map((track, idx) => {
                              const isDropBefore =
                                dragIdx !== null && overIdx === idx && dragIdx > idx;
                              const isDropAfter =
                                dragIdx !== null && overIdx === idx && dragIdx < idx;
                              const menuActive =
                                menuState?.index === idx &&
                                menuState.track.id === track.id &&
                                menuState.coords !== null;
                              return (
                                <React.Fragment key={`${track.id}-${idx}`}>
                                  {hasManualPrefix && idx === firstAutoIdx && (
                                    <div className="px-3 pt-3 pb-1.5 mt-1 border-t border-line flex items-center justify-between">
                                      <span className="text-xs font-medium text-ink-3">
                                        Similar songs
                                      </span>
                                    </div>
                                  )}
                                  <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: dragIdx === idx ? 0.45 : 1, y: 0 }}
                                    exit={{ opacity: 0, x: 16 }}
                                    transition={SPRING_LAYOUT}
                                  >
                                    <div
                                      draggable
                                      onDragStart={(e) => {
                                        setDragIdx(idx);
                                        setOverIdx(idx);
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('text/plain', String(idx));
                                      }}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        if (dragIdx !== null && overIdx !== idx) {
                                          setOverIdx(idx);
                                        }
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        if (dragIdx !== null && dragIdx !== idx) {
                                          reorderQueue(dragIdx, idx);
                                        }
                                        setDragIdx(null);
                                        setOverIdx(null);
                                      }}
                                      onDragEnd={() => {
                                        setDragIdx(null);
                                        setOverIdx(null);
                                      }}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setMenuState({
                                          track,
                                          index: idx,
                                          coords: { x: e.clientX, y: e.clientY },
                                        });
                                      }}
                                      className={`group relative flex items-center gap-2 pl-3 pr-1 h-14 rounded-md hover:bg-white/[0.07] focus-within:bg-white/[0.07] transition-colors ${
                                        menuActive ? 'bg-white/[0.07]' : ''
                                      } ${isDropBefore ? 'border-t-2 border-accent' : ''} ${
                                        isDropAfter ? 'border-b-2 border-accent' : ''
                                      }`}
                                    >
                                      <span
                                        aria-hidden
                                        title="Drag to reorder"
                                        className="hidden sm:flex absolute left-0.5 inset-y-0 w-2.5 items-center justify-center text-ink-3 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
                                      >
                                        <GripVertical className="w-3 h-3" />
                                      </span>
                                      <button
                                        onClick={() => playTrack(track, queue.slice(idx + 1))}
                                        className="flex items-center gap-3 min-w-0 flex-1 text-left h-full"
                                      >
                                        <div className="w-10 h-10 rounded-md overflow-hidden bg-hover shrink-0">
                                          <TrackArtwork track={track} />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-sm font-medium text-ink truncate">
                                            {track.title}
                                          </div>
                                          <div className="text-xs text-ink-2 truncate">
                                            {track.artist}
                                          </div>
                                        </div>
                                      </button>

                                      <div className="flex items-center shrink-0">
                                        <span
                                          className={`text-xs text-ink-2 tabular-nums pr-2 transition-opacity ${
                                            menuActive
                                              ? 'hidden'
                                              : 'hidden sm:inline sm:group-hover:hidden sm:group-focus-within:hidden'
                                          }`}
                                        >
                                          {formatTrackDuration(track.duration)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (menuActive) {
                                              setMenuState((prev) =>
                                                prev ? { ...prev, coords: null } : null
                                              );
                                              return;
                                            }
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setMenuState({
                                              track,
                                              index: idx,
                                              coords: {
                                                x: rect.right,
                                                y: rect.bottom + 4,
                                                alignRight: true,
                                              },
                                            });
                                          }}
                                          aria-label={`Options for ${track.title}`}
                                          aria-haspopup="menu"
                                          aria-expanded={menuActive}
                                          className={`w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:text-ink transition-opacity ${
                                            menuActive
                                              ? 'opacity-100 text-ink'
                                              : 'sm:opacity-0 sm:pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto sm:group-focus-within:opacity-100 sm:group-focus-within:pointer-events-auto'
                                          }`}
                                        >
                                          <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </motion.div>
                                </React.Fragment>
                              );
                            });
                          })()}
                        </AnimatePresence>
                      )}
                    </section>
                  </div>

                  {menuState && (
                    <TrackContextMenu
                      track={menuState.track}
                      coords={menuState.coords}
                      onClose={() =>
                        setMenuState((prev) => (prev ? { ...prev, coords: null } : null))
                      }
                      moveScope="queue"
                      onMoveUp={
                        menuState.index !== null && menuState.index > 0
                          ? () => reorderQueue(menuState.index!, menuState.index! - 1)
                          : undefined
                      }
                      onMoveDown={
                        menuState.index !== null && menuState.index < queue.length - 1
                          ? () => reorderQueue(menuState.index!, menuState.index! + 1)
                          : undefined
                      }
                      onRemoveFromQueue={
                        menuState.index !== null
                          ? () => {
                              removeFromQueue(menuState.track.id);
                              toast('Removed from queue');
                            }
                          : undefined
                      }
                    />
                  )}

                  <div className="px-4 py-3 border-t border-line shrink-0">
                    <button
                      onClick={toggleAutoplay}
                      role="switch"
                      aria-checked={autoplay}
                      className="w-full flex items-center justify-between text-sm text-ink-2 hover:text-ink transition-colors"
                    >
                      <span>Autoplay similar songs</span>
                      <span
                        className={`w-9 h-5 p-0.5 rounded-full flex items-center transition-colors ${
                          autoplay ? 'bg-accent justify-end' : 'bg-hover justify-start'
                        }`}
                      >
                        <motion.span
                          layout
                          transition={SPRING}
                          className="w-4 h-4 rounded-full bg-white"
                        />
                      </span>
                    </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
