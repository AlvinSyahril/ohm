import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  X,
  Loader2,
  Trash2,
  Play,
  Pause,
  Plus,
  Check,
  Heart,
  Clock,
  ListMusic,
  LayoutGrid,
  List,
  Columns,
  PanelRight,
} from 'lucide-react';
import { usePlayerStore, Track } from '../store/usePlayerStore';
import { TrackCard, TrackArtwork, formatDuration } from './TrackCard';

const SCENE_FILTERS = [
  { id: 'all', label: 'All Releases', query: 'Daft Punk Justice Synthwave' },
  { id: 'synth', label: 'Synthwave', query: 'Kavinsky Carpenter Brut Synthwave' },
  { id: 'electro', label: 'French Electro', query: 'Justice SebastiAn Ed Banger' },
  { id: 'idm', label: 'Ambient / IDM', query: 'Aphex Twin Jon Hopkins Bicep' },
  { id: 'lofi', label: 'Instrumental Beats', query: 'Nujabes Khruangbin Bonobo' },
];

type ViewMode = 'split' | 'grid' | 'table';

export const MainCanvas: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    searchResults,
    isSearching,
    performSearch,
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    addToQueue,
    favorites,
    toggleFavorite,
    history,
    queue,
    removeFromQueue,
    clearQueue,
    isQueueOpen,
    setQueueOpen,
  } = usePlayerStore();

  const [localInput, setLocalInput] = useState('');
  const [selectedScene, setSelectedScene] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchResults.length === 0 && !isSearching) {
      performSearch('Daft Punk Justice Synthwave');
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' && document.activeElement !== searchInputRef.current) ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')
      ) {
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
      setSelectedScene('');
      if (activeTab !== 'search' && activeTab !== 'discover') {
        setActiveTab('discover');
      }
      performSearch(localInput.trim());
    }
  };

  const handleSceneSelect = (scene: (typeof SCENE_FILTERS)[number]) => {
    setSelectedScene(scene.id);
    setLocalInput('');
    performSearch(scene.query);
  };

  const topTrack: Track | undefined = searchResults[0];
  const topListTracks: Track[] = searchResults.slice(1, 6);
  const remainingGridTracks: Track[] =
    viewMode === 'split' ? searchResults.slice(6) : searchResults;

  const isTopPlaying =
    topTrack && currentTrack?.id === topTrack.id && isPlaying;
  const isTopFav = topTrack
    ? favorites.some((t) => t.id === topTrack.id)
    : false;

  const renderTrackRow = (track: Track, idx: number, contextList: Track[]) => {
    const isCurrent = currentTrack?.id === track.id;
    const isCurrPlaying = isCurrent && isPlaying;
    const isFav = favorites.some((t) => t.id === track.id);
    const inQueue = queue.some((t) => t.id === track.id);

    return (
      <div
        key={`${track.id}-${idx}`}
        onClick={() => {
          if (isCurrent) {
            togglePlay();
          } else {
            playTrack(
              track,
              contextList.filter((_, i) => i !== idx)
            );
          }
        }}
        className={`group px-3 py-2 rounded-md flex items-center justify-between gap-4 cursor-pointer select-none transition-colors ${
          isCurrent
            ? 'bg-white/[0.08] text-white'
            : 'hover:bg-white/[0.04] text-zinc-300'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-6 text-right font-mono text-[11px] text-zinc-500 shrink-0">
            {isCurrent ? (
              <span className="inline-block w-2 h-2 bg-[#c8ff00]" />
            ) : (
              String(idx + 1).padStart(2, '0')
            )}
          </div>
          <div className="relative w-9 h-9 rounded bg-[#090a0c] overflow-hidden shrink-0 border border-white/[0.06]">
            <TrackArtwork track={track} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={`font-display font-medium text-[13px] truncate ${
                isCurrent ? 'text-[#c8ff00]' : 'text-zinc-100'
              }`}
            >
              {track.title}
            </div>
            <div className="text-[11px] text-zinc-500 truncate">
              {track.artist}
            </div>
          </div>
        </div>

        <div className="hidden md:block w-40 truncate text-[12px] text-zinc-500">
          {track.album || 'Single'}
        </div>

        <div
          className="flex items-center gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => toggleFavorite(track)}
            className={`p-1.5 rounded transition-opacity cursor-pointer ${
              isFav
                ? 'text-[#c8ff00] opacity-100'
                : 'text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100'
            }`}
            title="Save to Library"
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={() => addToQueue(track)}
            className={`p-1.5 rounded transition-opacity cursor-pointer ${
              inQueue
                ? 'text-white opacity-100'
                : 'text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100'
            }`}
            title="Add to Queue"
          >
            {inQueue ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </button>

          <span className="font-mono text-[11px] text-zinc-500 tabular-nums w-11 text-right">
            {formatDuration(track.duration)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <main className="flex-1 h-full flex flex-col bg-[#090a0c] overflow-hidden min-w-0">
      {/* Precision Top Command Bar */}
      <header className="h-14 px-6 border-b border-white/[0.07] flex items-center justify-between gap-4 shrink-0">
        <form
          onSubmit={handleSearchSubmit}
          className="w-full max-w-md relative flex items-center"
        >
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            placeholder="Search tracks, artists, albums..."
            aria-label="Search tracks"
            className="w-full pl-9 pr-16 py-1.5 rounded-md bg-[#111318] border border-white/[0.08] focus:border-white/[0.25] focus:outline-none text-[13px] text-white placeholder-zinc-500 transition-colors"
          />
          <div className="absolute right-2 flex items-center gap-1">
            {localInput && (
              <button
                type="button"
                onClick={() => setLocalInput('')}
                className="p-0.5 text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 text-[#c8ff00] animate-spin mr-1" />
            ) : (
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-white/[0.04] border border-white/[0.08] rounded">
                /
              </kbd>
            )}
          </div>
        </form>

        {/* View Switcher & Studio Inspector Toggle */}
        <div className="flex items-center gap-2">
          {(activeTab === 'discover' || activeTab === 'search') && (
            <div className="flex items-center p-0.5 rounded-md bg-[#111318] border border-white/[0.07]">
              <button
                onClick={() => setViewMode('split')}
                title="Editorial Split View"
                className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                  viewMode === 'split'
                    ? 'bg-white/[0.1] text-white font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Editorial</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                title="Grid View"
                className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white/[0.1] text-white font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Grid</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Tracklist Table View"
                className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white/[0.1] text-white font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Table</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setQueueOpen(!isQueueOpen)}
            title="Toggle Studio Inspector Panel"
            className={`px-2.5 py-1.5 rounded-md border text-[12px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
              isQueueOpen
                ? 'bg-[#c8ff00] border-[#c8ff00] text-[#090a0c] font-semibold'
                : 'bg-[#111318] border-white/[0.08] text-zinc-300 hover:text-white'
            }`}
          >
            <PanelRight className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Inspector</span>
          </button>
        </div>
      </header>

      {/* Scene Filter Bar */}
      {(activeTab === 'discover' || activeTab === 'search') && (
        <div className="px-6 py-3 border-b border-white/[0.05] flex items-center justify-between gap-4 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5">
            {SCENE_FILTERS.map((scene) => {
              const active = selectedScene === scene.id;
              return (
                <button
                  key={scene.id}
                  onClick={() => handleSceneSelect(scene)}
                  className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors cursor-pointer shrink-0 border ${
                    active
                      ? 'bg-[#c8ff00] border-[#c8ff00] text-[#090a0c] font-semibold'
                      : 'bg-[#111318] border-white/[0.07] text-zinc-400 hover:text-white hover:border-white/[0.15]'
                  }`}
                >
                  {scene.label}
                </button>
              );
            })}
          </div>

          {searchResults.length > 0 && (
            <span className="font-mono text-[11px] text-zinc-500 shrink-0 hidden sm:inline">
              {searchResults.length} TRACKS READY
            </span>
          )}
        </div>
      )}

      {/* Main Scrollable Viewport */}
      <div className="flex-1 overflow-y-auto p-6 pb-36 space-y-8">
        {(activeTab === 'discover' || activeTab === 'search') && (
          <>
            {isSearching ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg p-3 bg-[#0f1115] border border-white/[0.05] animate-pulse space-y-3"
                  >
                    <div className="aspect-square w-full rounded bg-[#161920]" />
                    <div className="h-3.5 bg-[#161920] rounded w-3/4" />
                    <div className="h-3 bg-[#161920] rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* SPLIT EDITORIAL VIEW: Top Match + Top Tracks Table */}
                {viewMode === 'split' && topTrack && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Top Result Spotlight (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-2.5">
                        Primary Match
                      </div>
                      <div
                        onClick={() => {
                          if (currentTrack?.id === topTrack.id) {
                            togglePlay();
                          } else {
                            playTrack(topTrack, searchResults.slice(1));
                          }
                        }}
                        className="flex-1 rounded-lg p-5 bg-[#0f1115] hover:bg-[#13161c] border border-white/[0.07] hover:border-white/[0.15] flex flex-col justify-between gap-5 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-md bg-[#090a0c] overflow-hidden shrink-0 border border-white/[0.06]">
                            <TrackArtwork
                              track={topTrack}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <span className="inline-block font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-white/[0.06] text-zinc-300 rounded">
                              Featured Track
                            </span>
                            <h2 className="font-display font-bold text-xl text-white leading-snug line-clamp-2">
                              {topTrack.title}
                            </h2>
                            <p className="text-[13px] text-zinc-400 truncate">
                              {topTrack.artist}
                            </p>
                            <p className="font-mono text-[11px] text-zinc-500">
                              {topTrack.album || 'Single Release'} ·{' '}
                              {formatDuration(topTrack.duration)}
                            </p>
                          </div>
                        </div>

                        <div
                          className="flex items-center justify-between pt-3 border-t border-white/[0.06]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (currentTrack?.id === topTrack.id) {
                                  togglePlay();
                                } else {
                                  playTrack(topTrack, searchResults.slice(1));
                                }
                              }}
                              className="px-4 py-2 rounded-md bg-[#c8ff00] hover:bg-[#d4ff33] text-[#090a0c] font-display font-semibold text-xs flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              {isTopPlaying ? (
                                <>
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                  <span>Pause</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>Play Now</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => addToQueue(topTrack)}
                              className="px-3 py-2 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Queue</span>
                            </button>
                          </div>

                          <button
                            onClick={() => toggleFavorite(topTrack)}
                            className={`p-2 rounded-md border transition-colors cursor-pointer ${
                              isTopFav
                                ? 'bg-[#c8ff00] border-[#c8ff00] text-[#090a0c]'
                                : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white'
                            }`}
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                isTopFav ? 'fill-current' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Top Songs List (7 cols) */}
                    <div className="lg:col-span-7 flex flex-col">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                          Top Tracks
                        </span>
                        <button
                          onClick={() =>
                            playTrack(searchResults[0], searchResults.slice(1))
                          }
                          className="font-mono text-[10px] text-zinc-400 hover:text-[#c8ff00] uppercase tracking-wider cursor-pointer"
                        >
                          Play All -&gt;
                        </button>
                      </div>

                      <div className="flex-1 rounded-lg p-2 bg-[#0f1115] border border-white/[0.07] divide-y divide-white/[0.04] flex flex-col justify-center">
                        {topListTracks.map((track, idx) =>
                          renderTrackRow(track, idx, topListTracks)
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TABLE VIEW */}
                {viewMode === 'table' ? (
                  <section>
                    <div className="rounded-lg bg-[#0f1115] border border-white/[0.07] overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-white/[0.07] flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="w-6 text-right">#</span>
                          <span>Track / Artist</span>
                        </div>
                        <div className="hidden md:block w-40">Release</div>
                        <div className="w-24 text-right">Duration</div>
                      </div>
                      <div className="divide-y divide-white/[0.04] p-1.5">
                        {searchResults.map((track, idx) =>
                          renderTrackRow(track, idx, searchResults)
                        )}
                      </div>
                    </div>
                  </section>
                ) : (
                  /* CATALOG GRID SECTION */
                  <section>
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                        {viewMode === 'split'
                          ? 'Catalog Releases'
                          : 'All Releases'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {remainingGridTracks.map((track, idx) => (
                        <TrackCard
                          key={`${track.id}-${idx}`}
                          track={track}
                          index={idx}
                          contextQueue={remainingGridTracks}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}

        {/* SAVED LIBRARY VIEW */}
        {activeTab === 'library' && (
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[#c8ff00] fill-[#c8ff00]" />
                  <h2 className="font-display font-bold text-base text-white">
                    Saved Library ({favorites.length})
                  </h2>
                </div>
                {favorites.length > 0 && (
                  <button
                    onClick={() => playTrack(favorites[0], favorites.slice(1))}
                    className="px-3.5 py-1.5 rounded-md bg-[#c8ff00] text-[#090a0c] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Play Saved
                  </button>
                )}
              </div>

              {favorites.length === 0 ? (
                <div className="p-12 rounded-lg bg-[#0f1115] border border-white/[0.06] text-center space-y-1">
                  <p className="font-display text-sm text-zinc-300 font-medium">
                    No saved tracks yet
                  </p>
                  <p className="text-xs text-zinc-500">
                    Click the heart icon on any track to save it to your local library.
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

            {history.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.07]">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <h2 className="font-display font-bold text-base text-white">
                    Recently Played
                  </h2>
                </div>
                <div className="rounded-lg bg-[#0f1115] border border-white/[0.07] divide-y divide-white/[0.04] p-1.5">
                  {history.map((track, idx) =>
                    renderTrackRow(track, idx, history)
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {/* PLAY QUEUE VIEW */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-[#c8ff00]" />
                <h2 className="font-display font-bold text-base text-white">
                  Play Queue ({queue.length})
                </h2>
              </div>
              {queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="px-3 py-1 rounded-md bg-white/[0.05] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/[0.07] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Queue
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="p-12 rounded-lg bg-[#0f1115] border border-white/[0.06] text-center space-y-1">
                <p className="font-display text-sm text-zinc-300 font-medium">
                  Queue is empty
                </p>
                <p className="text-xs text-zinc-500">
                  Select any track from Home or Catalog to start playback.
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-[#0f1115] border border-white/[0.07] divide-y divide-white/[0.04] p-1.5">
                {queue.map((track, idx) => (
                  <div
                    key={`${track.id}-${idx}`}
                    onClick={() => playTrack(track, queue.slice(idx + 1))}
                    className="px-3 py-2 rounded-md hover:bg-white/[0.04] flex items-center justify-between gap-4 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] text-zinc-500 w-6 text-right tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <TrackArtwork
                        track={track}
                        className="w-9 h-9 rounded object-cover border border-white/[0.06]"
                      />
                      <div className="min-w-0">
                        <div className="font-display font-medium text-[13px] text-zinc-100 group-hover:text-[#c8ff00] truncate">
                          {track.title}
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate">
                          {track.artist}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                        {formatDuration(track.duration)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(track.id);
                        }}
                        className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};
