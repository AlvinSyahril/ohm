import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Play, ListMusic } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { formatDuration, upgradeThumbnail } from './TrackCard';

export const QueueDrawer: React.FC = () => {
  const {
    isQueueOpen,
    setQueueOpen,
    currentTrack,
    queue,
    playTrack,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();

  return (
    <AnimatePresence>
      {isQueueOpen && (
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className="fixed top-0 right-0 bottom-24 w-88 bg-[#0d0f14] border-l border-[#232736] shadow-[-8px_0_24px_rgba(0,0,0,0.6)] z-40 flex flex-col select-none"
        >
          {/* Drawer Header */}
          <div className="p-4 border-b border-[#232736] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-[#a3e635]" />
              <span className="font-display font-bold text-sm tracking-wider uppercase text-white">
                Signal Pipeline ({queue.length})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="px-2 py-1 bg-[#171a24] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-[#232736] font-mono text-[10px] cursor-pointer transition-colors"
                >
                  CLEAR
                </button>
              )}
              <button
                onClick={() => setQueueOpen(false)}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {currentTrack && (
              <div>
                <div className="font-mono text-[10px] text-[#a3e635] uppercase tracking-widest mb-2">
                  Now Transmitting
                </div>
                <div className="p-2.5 bg-[#161b26] border border-[#a3e635] shadow-[3px_3px_0px_#a3e635] flex items-center gap-3">
                  <img
                    src={upgradeThumbnail(currentTrack.thumbnail)}
                    alt={currentTrack.title}
                    className="w-10 h-10 object-cover border border-[#232736]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-xs text-white truncate">
                      {currentTrack.title}
                    </div>
                    <div className="text-[11px] text-[#a3e635] truncate">
                      {currentTrack.artist}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                Up Next
              </div>
              {queue.length === 0 ? (
                <div className="p-6 border border-dashed border-[#232736] text-center font-mono text-xs text-zinc-500">
                  Queue is empty. Add tracks with + to line them up.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {queue.map((track, idx) => (
                    <div
                      key={`${track.id}-${idx}`}
                      onClick={() => playTrack(track, queue.slice(idx + 1))}
                      className="p-2 bg-[#12141c] hover:bg-[#181c28] border border-[#232736] hover:border-[#a3e635] flex items-center justify-between gap-2.5 cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative w-9 h-9 shrink-0 bg-[#0a0b0e] border border-[#232736] overflow-hidden">
                          <img
                            src={upgradeThumbnail(track.thumbnail)}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-3.5 h-3.5 text-[#a3e635] fill-current" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-display font-semibold text-xs text-zinc-200 group-hover:text-[#a3e635] truncate">
                            {track.title}
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate">
                            {track.artist}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[10px] text-zinc-500">
                          {formatDuration(track.duration)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromQueue(track.id);
                          }}
                          className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
