import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Play,
  Pause,
  Plus,
  Sparkles,
  Loader2,
  Trash2,
  Heart,
  Clock,
  ListMusic,
  Zap,
} from 'lucide-react';
import { usePlayerStore, Track } from '../store/usePlayerStore';
import { TrackCard, TrackArtwork, formatDuration } from './TrackCard';

export const MainCanvas: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    performSearch,
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    favorites,
    history,
    queue,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();

  const [localInput, setLocalInput] = useState(searchQuery);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initial load on startup so the app opens with rich live music
  useEffect(() => {
    if (searchResults.length === 0 && !isSearching) {
      performSearch('Daft Punk Justice Synthwave');
    }
  }, []);

  // Sync local input when preset clicked in sidebar
  useEffect(() => {
    setLocalInput(searchQuery);
  }, [searchQuery]);

  // Press '/' anywhere to focus the search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localInput.trim()) {
      if (activeTab !== 'search' && activeTab !== 'discover') {
        setActiveTab('search');
      }
      performSearch(localInput.trim());
    }
  };

  const heroTrack: Track | undefined = searchResults[0];
  const gridTracks: Track[] = searchResults.slice(1);
  const isHeroPlaying = heroTrack && currentTrack?.id === heroTrack.id && isPlaying;

  return (
    <main className="flex-1 h-full flex flex-col bg-[#0a0b0e] overflow-hidden">
      {/* Sticky Top Omnibar Header */}
      <header className="h-18 px-6 border-b border-[#232736] bg-[#0a0b0e]/90 backdrop-blur-md flex items-center justify-between gap-4 shrink-0 z-20">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            placeholder="Search tracks, artists, frequencies... (Press '/' to focus)"
            className="w-full pl-10 pr-24 py-2.5 bg-[#12141c] border border-[#232736] focus:border-[#a3e635] focus:outline-none text-sm text-white placeholder-zinc-500 font-medium transition-colors"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-[#a3e635] animate-spin mr-2" />
            ) : (
              <button
                type="submit"
                className="px-2.5 py-1 bg-[#171a24] hover:bg-[#a3e635] text-zinc-300 hover:text-[#0a0b0e] border border-[#232736] font-mono text-[10px] font-semibold tracking-wider transition-colors cursor-pointer"
              >
                SCAN
              </button>
            )}
          </div>
        </form>

        {/* Status Telemetry Pill */}
        <div className="hidden md:flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 bg-[#12141c] border border-[#232736] flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#a3e635]" />
            <span className="text-zinc-400">AUTO-CIPHER:</span>
            <span className="text-[#a3e635] font-semibold">VERIFIED</span>
          </div>
        </div>
      </header>

      {/* Scrollable Content Viewport */}
      <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-8">
        <AnimatePresence mode="wait">
          {/* DISCOVER & SEARCH VIEW */}
          {(activeTab === 'discover' || activeTab === 'search') && (
            <motion.div
              key="discover-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Featured Spotlight Hero Card */}
              {heroTrack && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#a3e635]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Primary Signal Match</span>
                    </div>
                    <span className="font-mono text-[11px] text-zinc-500">
                      {searchResults.length} STREAMS INDEXED
                    </span>
                  </div>

                  <div className="relative bg-[#12141c] border border-[#232736] hover:border-[#a3e635] p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[4px_4px_0px_#171a24] transition-colors">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                      <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-[#0a0b0e] border border-[#232736] shrink-0 overflow-hidden">
                        <TrackArtwork
                          track={heroTrack}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/85 border border-[#232736] font-mono text-[10px] text-[#a3e635]">
                          {formatDuration(heroTrack.duration)}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-[#a3e635]/15 border border-[#a3e635] font-mono text-[10px] text-[#a3e635] font-semibold">
                          FEATURED FREQUENCY
                        </div>
                        <h1 className="font-display font-bold text-2xl md:text-3xl text-white tracking-tight">
                          {heroTrack.title}
                        </h1>
                        <p className="text-sm text-zinc-300 font-medium">
                          {heroTrack.artist}{' '}
                          {heroTrack.album && (
                            <span className="text-zinc-500 font-mono text-xs">
                              // {heroTrack.album}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (currentTrack?.id === heroTrack.id) {
                            togglePlay();
                          } else {
                            playTrack(heroTrack, gridTracks);
                          }
                        }}
                        className="neo-btn px-5 py-3 bg-[#a3e635] text-[#0a0b0e] font-display font-bold text-sm tracking-wide flex items-center gap-2.5 cursor-pointer"
                      >
                        {isHeroPlaying ? (
                          <>
                            <Pause className="w-4 h-4 fill-current" />
                            <span>PAUSE STREAM</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current" />
                            <span>ENGAGE STREAM</span>
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => playTrack(heroTrack, gridTracks)}
                        className="px-4 py-3 bg-[#171a24] hover:bg-[#1f2433] text-zinc-200 border border-[#232736] font-mono text-xs flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Plus className="w-4 h-4 text-[#a3e635]" />
                        <span>QUEUE ALL</span>
                      </motion.button>
                    </div>
                  </div>
                </section>
              )}

              {/* Discovery Track Grid */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-lg text-white tracking-wide uppercase">
                    Resolved Audio Matrix
                  </h2>
                  <span className="font-mono text-xs text-zinc-500">
                    CLICK ANY CARD TO STREAM INSTANTLY
                  </span>
                </div>

                {isSearching ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-[#12141c] border border-[#232736] animate-pulse space-y-3"
                      >
                        <div className="aspect-square w-full bg-[#1a1d29]" />
                        <div className="h-4 bg-[#1a1d29] w-3/4" />
                        <div className="h-3 bg-[#1a1d29] w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {gridTracks.map((track, idx) => (
                      <TrackCard
                        key={`${track.id}-${idx}`}
                        track={track}
                        index={idx}
                        contextQueue={gridTracks}
                      />
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {/* SAVED VAULT / LIBRARY VIEW */}
          {activeTab === 'library' && (
            <motion.div
              key="library-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-10"
            >
              <section>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#232736]">
                  <div className="flex items-center gap-2.5">
                    <Heart className="w-5 h-5 text-[#a3e635] fill-[#a3e635]" />
                    <h2 className="font-display font-bold text-xl text-white">
                      Saved Vault ({favorites.length})
                    </h2>
                  </div>
                  {favorites.length > 0 && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => playTrack(favorites[0], favorites.slice(1))}
                      className="neo-btn px-4 py-2 bg-[#a3e635] text-[#0a0b0e] font-mono text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      PLAY VAULT
                    </motion.button>
                  )}
                </div>

                {favorites.length === 0 ? (
                  <div className="p-12 border border-dashed border-[#232736] text-center space-y-2">
                    <p className="font-display text-zinc-400">Your Saved Vault is empty.</p>
                    <p className="font-mono text-xs text-zinc-500">
                      Click the heart icon on any track card to lock it into your local vault.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {favorites.map((track, idx) => (
                      <TrackCard
                        key={`fav-${track.id}`}
                        track={track}
                        index={idx}
                        contextQueue={favorites}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Recent Playback History */}
              <section>
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#232736]">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <h2 className="font-display font-bold text-xl text-white">
                    Recent Signal Log ({history.length})
                  </h2>
                </div>
                {history.length === 0 ? (
                  <p className="font-mono text-xs text-zinc-500">No tracks played in this session yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {history.map((track, idx) => (
                      <TrackCard
                        key={`hist-${track.id}-${idx}`}
                        track={track}
                        index={idx}
                        contextQueue={history}
                      />
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {/* ACTIVE QUEUE VIEW */}
          {activeTab === 'queue' && (
            <motion.div
              key="queue-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#232736]">
                <div className="flex items-center gap-2.5">
                  <ListMusic className="w-5 h-5 text-[#a3e635]" />
                  <h2 className="font-display font-bold text-xl text-white">
                    Active Playback Queue ({queue.length})
                  </h2>
                </div>
                {queue.length > 0 && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={clearQueue}
                    className="px-3 py-1.5 bg-[#171a24] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-[#232736] hover:border-red-500/40 font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    CLEAR QUEUE
                  </motion.button>
                )}
              </div>

              {queue.length === 0 ? (
                <div className="p-12 border border-dashed border-[#232736] text-center space-y-2">
                  <p className="font-display text-zinc-400">No upcoming tracks in the queue.</p>
                  <p className="font-mono text-xs text-zinc-500">
                    Play any track from Discover or click the + button to build your pipeline.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {queue.map((track, idx) => (
                    <motion.div
                      key={`${track.id}-${idx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.25) }}
                      onClick={() => playTrack(track, queue.slice(idx + 1))}
                      className="p-3 bg-[#12141c] hover:bg-[#171b26] border border-[#232736] hover:border-[#a3e635] flex items-center justify-between gap-4 cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="font-mono text-xs text-zinc-500 w-6 text-right">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <TrackArtwork
                          track={track}
                          className="w-11 h-11 object-cover border border-[#232736]"
                        />
                        <div className="min-w-0">
                          <div className="font-display font-semibold text-sm text-white group-hover:text-[#a3e635] truncate">
                            {track.title}
                          </div>
                          <div className="text-xs text-zinc-400 truncate">{track.artist}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className="font-mono text-xs text-zinc-400">
                          {formatDuration(track.duration)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromQueue(track.id);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};
