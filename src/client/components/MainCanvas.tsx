import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  X,
  Loader2,
  Trash2,
  Play,
  Heart,
  Clock,
  ListMusic,
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { TrackCard, TrackArtwork, formatDuration } from './TrackCard';

const FILTER_CHIPS = [
  { id: 'synth', label: 'Sound out', query: 'Dark Synthwave Daft Punk Kavinsky', dismissible: true },
  { id: 'electro', label: 'Bratos', query: 'Justice Electronic Gesaffelstein', dismissible: true },
  { id: 'ambient', label: 'Penotronic', query: 'Aphex Twin Bicep Bonobo Electronic', dismissible: false },
  { id: 'lofi', label: 'Lo-Fi Pulse', query: 'Nujabes Lofi Chill Instrumental', dismissible: false },
  { id: 'indie', label: 'Night Drive', query: 'Kavinsky Chromatics College Synth', dismissible: false },
];

export const MainCanvas: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    searchResults,
    isSearching,
    performSearch,
    playTrack,
    favorites,
    history,
    queue,
    removeFromQueue,
    clearQueue,
    sfxEnabled,
    toggleSfx,
  } = usePlayerStore();

  const [localInput, setLocalInput] = useState('');
  const [selectedChip, setSelectedChip] = useState<string>('synth');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchResults.length === 0 && !isSearching) {
      performSearch('Daft Punk Justice Synthwave');
    }
  }, []);

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
        setActiveTab('discover');
      }
      performSearch(localInput.trim());
    }
  };

  const handleChipClick = (chip: (typeof FILTER_CHIPS)[number]) => {
    setSelectedChip(chip.id);
    setLocalInput('');
    performSearch(chip.query);
  };

  return (
    <main className="flex-1 h-full flex flex-col bg-[#0b0c0e] overflow-hidden">
      {/* Top Header: Sleek Rounded Search Input + Notification Bell & Cyan Avatar */}
      <header className="px-7 pt-6 pb-3 flex items-center justify-between gap-4 shrink-0 z-20">
        <form onSubmit={handleSearchSubmit} className="w-full max-w-[480px] relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            placeholder="Search"
            aria-label="Search tracks"
            className="w-full pl-11 pr-10 py-2.5 rounded-xl bg-[#181b20] border border-white/[0.05] focus:border-white/[0.18] focus:outline-none text-[14px] text-white placeholder-zinc-500 transition-colors"
          />
          {isSearching && (
            <Loader2 className="w-4 h-4 text-[#b8ff01] animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
          )}
        </form>

        {/* Top-Right Bell & Avatar Matching Concept */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSfx}
            title={sfxEnabled ? 'Tactile Sound FX: ON' : 'Tactile Sound FX: OFF'}
            aria-label="Toggle notification sound effects"
            className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
              sfxEnabled
                ? 'bg-[#181b20] border-white/[0.07] text-zinc-300 hover:text-white'
                : 'bg-[#14161a] border-white/[0.04] text-zinc-600'
            }`}
          >
            <Bell className="w-[18px] h-[18px]" />
          </button>

          <div className="w-10 h-10 rounded-full p-[1.5px] bg-gradient-to-tr from-[#00e5ff] to-[#b8ff01] shadow-[0_0_14px_rgba(0,229,255,0.25)]">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
              alt="Profile"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>
      </header>

      {/* Filter Pills Bar Directly Below Search */}
      {(activeTab === 'discover' || activeTab === 'search') && (
        <div className="px-7 pb-4 pt-1 flex items-center gap-2.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => {
              setSelectedChip('all');
              performSearch('Daft Punk Justice Synthwave');
            }}
            className="px-4 py-1.5 rounded-full bg-[#b8ff01] text-[#0b0c0e] text-[12px] font-bold tracking-tight cursor-pointer shrink-0 shadow-[0_2px_12px_rgba(184,255,1,0.2)]"
          >
            Filters
          </button>

          {FILTER_CHIPS.map((chip) => {
            const isSelected = selectedChip === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => handleChipClick(chip)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium flex items-center gap-2 transition-colors cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-[#20242c] border-white/[0.18] text-white'
                    : 'bg-[#16191e] border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.12]'
                }`}
              >
                <span>{chip.label}</span>
                {chip.dismissible && (
                  <X className="w-3 h-3 text-zinc-500 hover:text-white" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-7 pt-1 pb-32">
        <AnimatePresence mode="wait">
          {(activeTab === 'discover' || activeTab === 'search') && (
            <motion.div
              key="discover-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {isSearching ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="rounded-[16px] p-3 bg-[#14171c] border border-white/[0.05] animate-pulse space-y-3"
                    >
                      <div className="aspect-square w-full rounded-[11px] bg-[#1c2027]" />
                      <div className="h-2.5 bg-[#1c2027] rounded w-1/2" />
                      <div className="h-3.5 bg-[#1c2027] rounded w-3/4" />
                      <div className="flex justify-between pt-1">
                        <div className="h-3 bg-[#1c2027] rounded w-1/3" />
                        <div className="h-4 bg-[#1c2027] rounded-full w-12" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {searchResults.map((track, idx) => (
                    <TrackCard
                      key={`${track.id}-${idx}`}
                      track={track}
                      index={idx}
                      contextQueue={searchResults}
                      genreLabel="Genre"
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* LIBRARY VIEW */}
          {activeTab === 'library' && (
            <motion.div
              key="library-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-8 pt-2"
            >
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <Heart className="w-5 h-5 text-[#b8ff01] fill-[#b8ff01]" />
                    <h2 className="font-display font-bold text-lg text-white">
                      Library ({favorites.length})
                    </h2>
                  </div>
                  {favorites.length > 0 && (
                    <button
                      onClick={() => playTrack(favorites[0], favorites.slice(1))}
                      className="px-4 py-1.5 rounded-full bg-[#b8ff01] text-[#0b0c0e] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Play All
                    </button>
                  )}
                </div>

                {favorites.length === 0 ? (
                  <div className="p-12 rounded-2xl bg-[#14171c] border border-white/[0.06] text-center space-y-1.5">
                    <p className="font-display text-zinc-300 font-medium">
                      Your Library is empty
                    </p>
                    <p className="text-xs text-zinc-500">
                      Hover over any album card and click the heart icon to save tracks here.
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
                        genreLabel="Saved"
                      />
                    ))}
                  </div>
                )}
              </section>

              {history.length > 0 && (
                <section>
                  <div className="flex items-center gap-2.5 mb-4">
                    <Clock className="w-4 h-4 text-[#00e5ff]" />
                    <h2 className="font-display font-bold text-base text-zinc-200">
                      Recently Played
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {history.map((track, idx) => (
                      <TrackCard
                        key={`hist-${track.id}-${idx}`}
                        track={track}
                        index={idx}
                        contextQueue={history}
                        genreLabel="Recent"
                      />
                    ))}
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {/* QUEUE VIEW */}
          {activeTab === 'queue' && (
            <motion.div
              key="queue-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 pt-2"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <ListMusic className="w-5 h-5 text-[#b8ff01]" />
                  <h2 className="font-display font-bold text-lg text-white">
                    Up Next ({queue.length})
                  </h2>
                </div>
                {queue.length > 0 && (
                  <button
                    onClick={clearQueue}
                    className="px-3.5 py-1.5 rounded-full bg-[#181b20] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/[0.06] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}
              </div>

              {queue.length === 0 ? (
                <div className="p-12 rounded-2xl bg-[#14171c] border border-white/[0.06] text-center space-y-1.5">
                  <p className="font-display text-zinc-300 font-medium">
                    No tracks in queue
                  </p>
                  <p className="text-xs text-zinc-500">
                    Click any track on the Home grid to start streaming and populate your queue.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {queue.map((track, idx) => (
                    <div
                      key={`${track.id}-${idx}`}
                      onClick={() => playTrack(track, queue.slice(idx + 1))}
                      className="p-3 rounded-xl bg-[#14171c] hover:bg-[#191d24] border border-white/[0.06] hover:border-white/[0.14] flex items-center justify-between gap-4 cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="text-xs text-zinc-500 w-5 text-right font-medium">
                          {idx + 1}
                        </span>
                        <TrackArtwork
                          track={track}
                          className="w-11 h-11 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <div className="font-display font-bold text-sm text-white group-hover:text-[#b8ff01] truncate">
                            {track.title}
                          </div>
                          <div className="text-xs text-zinc-400 truncate">
                            {track.artist}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-xs text-zinc-500">
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
                    </div>
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
