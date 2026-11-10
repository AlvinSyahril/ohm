import React from 'react';
import { X, Trash2, Play, Heart, Disc } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { TrackArtwork, formatDuration } from './TrackCard';

export const QueueDrawer: React.FC = () => {
  const {
    isQueueOpen,
    setQueueOpen,
    currentTrack,
    isPlaying,
    searchResults,
    queue,
    favorites,
    toggleFavorite,
    playTrack,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();

  if (!isQueueOpen) return null;

  const displayTrack = currentTrack || searchResults[0] || null;
  const isFav = displayTrack
    ? favorites.some((t) => t.id === displayTrack.id)
    : false;

  return (
    <aside className="hidden lg:flex w-76 h-full bg-[#090a0c] border-l border-white/[0.07] flex-col select-none shrink-0">
      {/* Inspector Header */}
      <div className="h-14 px-4 border-b border-white/[0.07] flex items-center justify-between shrink-0">
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
          {currentTrack ? 'Now Playing' : 'Signal Preview'}
        </span>
        <button
          onClick={() => setQueueOpen(false)}
          className="p-1 text-zinc-500 hover:text-white cursor-pointer"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Active Track Studio Card */}
      <div className="p-4 border-b border-white/[0.07] space-y-3.5 shrink-0">
        {displayTrack ? (
          <>
            <div className="aspect-square w-full rounded-md bg-[#0f1115] border border-white/[0.06] overflow-hidden relative">
              <TrackArtwork
                track={displayTrack}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-bold text-[15px] text-white truncate">
                  {displayTrack.title}
                </h3>
                <p className="text-[12px] text-zinc-400 truncate mt-0.5">
                  {displayTrack.artist}
                </p>
              </div>
              <button
                onClick={() => toggleFavorite(displayTrack)}
                className={`p-1.5 rounded border cursor-pointer transition-colors shrink-0 ${
                  isFav
                    ? 'bg-[#c8ff00] border-[#c8ff00] text-[#090a0c]'
                    : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Flat Hardware Audio Telemetry Strip */}
            <div className="p-2.5 rounded bg-[#0f1115] border border-white/[0.06] flex items-center justify-between font-mono text-[10px]">
              <span className="text-zinc-500">STREAM FORMAT</span>
              <span className="text-zinc-200">AAC 256 · 44.1kHz</span>
            </div>
          </>
        ) : (
          <div className="aspect-square w-full rounded-md bg-[#0f1115] border border-white/[0.06] flex flex-col items-center justify-center gap-2 text-zinc-600">
            <Disc className="w-8 h-8" />
            <span className="font-mono text-[11px]">NO SIGNAL</span>
          </div>
        )}
      </div>

      {/* Integrated Up Next Queue List */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center justify-between shrink-0">
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Up Next ({queue.length})
          </span>
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="font-mono text-[10px] text-zinc-500 hover:text-red-400 cursor-pointer uppercase"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {queue.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500">
              Play any track or click + to build your queue.
            </div>
          ) : (
            queue.map((track, idx) => (
              <div
                key={`${track.id}-${idx}`}
                onClick={() => playTrack(track, queue.slice(idx + 1))}
                className="p-2 rounded-md hover:bg-white/[0.04] flex items-center justify-between gap-2.5 cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-8 h-8 rounded shrink-0 bg-[#0f1115] overflow-hidden border border-white/[0.06]">
                    <TrackArtwork
                      track={track}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-3 h-3 text-[#c8ff00] fill-current" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-medium text-[12px] text-zinc-200 group-hover:text-white truncate">
                      {track.title}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">
                      {track.artist}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                    {formatDuration(track.duration)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(track.id);
                    }}
                    className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};
