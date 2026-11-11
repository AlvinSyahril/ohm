import React, { useState } from 'react';
import {
  X,
  Trash2,
  Play,
  Heart,
  Disc,
  ListMusic,
  Info,
  ChevronUp,
  ChevronDown,
  Plus,
  Check,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { usePlayerStore, Track } from '../store/usePlayerStore';
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
    reorderQueue,
    inspectorTab,
    setInspectorTab,
    playlists,
    addTrackToPlaylist,
  } = usePlayerStore();

  const [playlistNotice, setPlaylistNotice] = useState<string | null>(null);

  if (!isQueueOpen) return null;

  const displayTrack = currentTrack || searchResults[0] || null;
  const isFav = displayTrack
    ? favorites.some((t) => t.id === displayTrack.id)
    : false;

  const handleAddToPlaylist = (playlistId: string, track: Track) => {
    addTrackToPlaylist(playlistId, track);
    setPlaylistNotice(`Added to ${playlists.find((p) => p.id === playlistId)?.name}`);
    setTimeout(() => setPlaylistNotice(null), 2500);
  };

  return (
    <aside className="hidden lg:flex w-80 h-full bg-[#08090c] border-l border-white/[0.07] flex-col select-none shrink-0 z-20">
      {/* Top Header: Dual Tab Switcher & Close */}
      <div className="h-14 px-4 border-b border-white/[0.07] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 bg-[#12141a] p-1 rounded-lg border border-white/[0.06]">
          <button
            onClick={() => setInspectorTab('queue')}
            className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              inspectorTab === 'queue'
                ? 'bg-[#c8ff00] text-[#090a0c] font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Up Next</span>
            {queue.length > 0 && (
              <span
                className={`font-mono text-[10px] px-1 rounded ${
                  inspectorTab === 'queue'
                    ? 'bg-[#090a0c]/20 text-[#090a0c]'
                    : 'bg-white/[0.08] text-zinc-300'
                }`}
              >
                {queue.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setInspectorTab('intel')}
            className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              inspectorTab === 'intel'
                ? 'bg-[#c8ff00] text-[#090a0c] font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Track Intel</span>
          </button>
        </div>

        <button
          onClick={() => setQueueOpen(false)}
          className="p-1.5 text-zinc-500 hover:text-white rounded hover:bg-white/[0.05] cursor-pointer transition-colors"
          title="Close Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab 1: Live Play Queue */}
      {inspectorTab === 'queue' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Now Playing Header Strip */}
          {currentTrack && (
            <div className="p-3 border-b border-white/[0.06] bg-[#0c0e14]">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#c8ff00] mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] animate-pulse" />
                <span>Now Playing</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded bg-[#090a0c] overflow-hidden shrink-0 border border-white/[0.06]">
                  <TrackArtwork track={currentTrack} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-medium text-xs text-white truncate">
                    {currentTrack.title}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {currentTrack.artist}
                  </div>
                </div>
                <div className="flex items-end gap-[2px] h-3 w-3 shrink-0">
                  <span className={`w-[2px] bg-[#c8ff00] ${isPlaying ? 'eq-bar-1' : 'h-1'}`} />
                  <span className={`w-[2px] bg-[#c8ff00] ${isPlaying ? 'eq-bar-2' : 'h-2'}`} />
                  <span className={`w-[2px] bg-[#c8ff00] ${isPlaying ? 'eq-bar-3' : 'h-1.5'}`} />
                </div>
              </div>
            </div>
          )}

          {/* Queue Section Bar */}
          <div className="px-4 py-2 border-b border-white/[0.05] flex items-center justify-between shrink-0 bg-[#090a0c]">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Queue ({queue.length})
            </span>
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="font-mono text-[10px] text-zinc-500 hover:text-red-400 cursor-pointer uppercase transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Up Next List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {queue.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 space-y-2">
                <ListMusic className="w-8 h-8 mx-auto text-zinc-700" />
                <p>Queue is empty.</p>
                <p className="text-[11px] text-zinc-600">
                  Click + on any song to queue it up.
                </p>
              </div>
            ) : (
              queue.map((track, idx) => (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => playTrack(track, queue.slice(idx + 1))}
                  className="p-2 rounded-lg hover:bg-white/[0.05] flex items-center justify-between gap-2 cursor-pointer group transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="relative w-8 h-8 rounded shrink-0 bg-[#0f1115] overflow-hidden border border-white/[0.06]">
                      <TrackArtwork
                        track={track}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-3 h-3 text-[#c8ff00] fill-current ml-0.5" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-medium text-[12px] text-zinc-200 group-hover:text-white truncate">
                        {track.title}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate">
                        {track.artist}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Reorder */}
                  <div className="flex items-center gap-1 shrink-0">
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <button
                        onClick={() => reorderQueue(idx, idx - 1)}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 text-zinc-500 hover:text-white disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => reorderQueue(idx, idx + 1)}
                        disabled={idx === queue.length - 1}
                        title="Move Down"
                        className="p-1 text-zinc-500 hover:text-white disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeFromQueue(track.id)}
                        title="Remove"
                        className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer ml-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="font-mono text-[10px] text-zinc-500 tabular-nums w-8 text-right">
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Track Intel & Telemetry */}
      {inspectorTab === 'intel' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {displayTrack ? (
            <>
              {/* High-Res Artwork */}
              <div className="aspect-square w-full rounded-xl bg-[#0f1115] border border-white/[0.07] overflow-hidden relative shadow-lg">
                <TrackArtwork
                  track={displayTrack}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Title & Artist & Favorite */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold text-base text-white truncate">
                    {displayTrack.title}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {displayTrack.artist}
                  </p>
                  {displayTrack.album && (
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-mono">
                      {displayTrack.album}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggleFavorite(displayTrack)}
                  className={`p-2 rounded-lg border cursor-pointer transition-colors shrink-0 ${
                    isFav
                      ? 'bg-[#c8ff00] border-[#c8ff00] text-[#090a0c]'
                      : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Telemetry Hardware Badges */}
              <div className="p-3 rounded-lg bg-[#0e1016] border border-white/[0.07] space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 border-b border-white/[0.05] pb-1.5 flex items-center justify-between">
                  <span>Stream Telemetry</span>
                  <span className="text-[#c8ff00]">LIVE</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-mono text-[11px]">Audio Codec</span>
                  <span className="text-zinc-200 font-mono text-[11px]">AAC 256 kbps · 44.1 kHz</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-mono text-[11px]">Transport</span>
                  <span className="text-zinc-200 font-mono text-[11px]">HTTP 206 (Range Seek)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-mono text-[11px]">Client Resolver</span>
                  <span className="text-zinc-200 font-mono text-[11px]">VisionOS Engine</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-mono text-[11px]">Cipher Decryption</span>
                  <span className="text-[#c8ff00] font-mono text-[11px]">Evaluated & Cached</span>
                </div>
              </div>

              {/* Add to Playlist section */}
              <div className="p-3 rounded-lg bg-[#0e1016] border border-white/[0.07] space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 border-b border-white/[0.05] pb-1.5 flex items-center justify-between">
                  <span>Add to Playlist</span>
                  {playlistNotice && (
                    <span className="text-[#c8ff00] font-sans text-[11px]">
                      {playlistNotice}
                    </span>
                  )}
                </div>

                {playlists.length === 0 ? (
                  <div className="text-xs text-zinc-500 py-1">
                    Create a playlist from the sidebar first.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {playlists.map((pl) => {
                      const alreadyIn = pl.tracks.some((t) => t.id === displayTrack.id);
                      return (
                        <button
                          key={pl.id}
                          onClick={() => handleAddToPlaylist(pl.id, displayTrack)}
                          disabled={alreadyIn}
                          className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                            alreadyIn
                              ? 'text-zinc-600 bg-white/[0.02] cursor-default'
                              : 'text-zinc-300 hover:text-white hover:bg-white/[0.05] cursor-pointer'
                          }`}
                        >
                          <span className="truncate">{pl.name}</span>
                          {alreadyIn ? (
                            <Check className="w-3.5 h-3.5 text-[#c8ff00]" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-zinc-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-600 gap-2 font-mono text-xs">
              <Disc className="w-8 h-8" />
              <span>No track selected</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
