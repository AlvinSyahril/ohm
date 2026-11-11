import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  X,
  Loader2,
  Play,
  Pause,
  Plus,
  Check,
  Heart,
  Clock,
  ListMusic,
  ChevronLeft,
  ChevronRight,
  Compass,
  Library,
  Music,
  Trash2,
  Shuffle,
  PanelRight,
  Sparkles,
  Flame,
  History,
  Disc,
  ArrowLeft,
} from 'lucide-react';
import { usePlayerStore, Track, Playlist } from '../store/usePlayerStore';
import {
  TrackCard,
  CompactTrackRow,
  CarouselTrackCard,
  TrackArtwork,
  formatDuration,
} from './TrackCard';

// Signature YouTube Music Mood & Activity Filter Chips
const MOOD_CHIPS = [
  { label: 'All', query: 'Daft Punk Justice Synthwave' },
  { label: 'Energize', query: 'French Electro Synthwave Upbeat' },
  { label: 'Relax', query: 'Lo-Fi Chillout Instrumental Relaxing' },
  { label: 'Focus', query: 'Ambient Drone IDM Nils Frahm' },
  { label: 'Late Night', query: 'Nightcall Synthwave Retrowave Chill' },
  { label: 'Synthwave', query: 'Kavinsky Carpenter Brut Synthwave' },
  { label: 'Workout', query: 'High Energy Electronic Bass' },
  { label: 'Warehouse Club', query: 'Gesaffelstein Bicep Techno' },
  { label: 'Japanese City Pop', query: 'Tatsuro Yamashita Mariya Takeuchi City Pop' },
  { label: 'Post-Punk', query: 'Joy Division New Order Molchat Doma' },
];

// Curated Genre Categories for Explore Tab
const EXPLORE_CATEGORIES = [
  {
    id: 'synthwave',
    title: 'Cyberpunk & Synthwave',
    query: 'Kavinsky Carpenter Brut Synthwave',
    gradient: 'from-fuchsia-950/60 to-purple-900/30',
    border: 'border-fuchsia-500/30',
    tag: 'RETROFUTURISM',
  },
  {
    id: 'french-touch',
    title: 'French Touch & Electro',
    query: 'Justice Daft Punk Cassius Ed Banger',
    gradient: 'from-amber-950/60 to-orange-900/30',
    border: 'border-amber-500/30',
    tag: 'CLUB CLASSICS',
  },
  {
    id: 'ambient-idm',
    title: 'Modular Ambient & IDM',
    query: 'Brian Eno Jon Hopkins Aphex Twin',
    gradient: 'from-cyan-950/60 to-blue-900/30',
    border: 'border-cyan-500/30',
    tag: 'DEEP FOCUS',
  },
  {
    id: 'lofi',
    title: 'Analog Lo-Fi & Beats',
    query: 'Nujabes J Dilla Khruangbin Instrumental',
    gradient: 'from-emerald-950/60 to-teal-900/30',
    border: 'border-emerald-500/30',
    tag: 'CHILLOUT TAPE',
  },
  {
    id: 'techno',
    title: 'Warehouse Techno & Bass',
    query: 'Gesaffelstein Bicep Overmono Moderat',
    gradient: 'from-zinc-900 to-zinc-950',
    border: 'border-zinc-700/40',
    tag: 'HEAVY INDUSTRIAL',
  },
  {
    id: 'post-punk',
    title: 'Post-Punk & Darkwave',
    query: 'Joy Division Interpol New Order Molchat Doma',
    gradient: 'from-slate-950 to-neutral-900',
    border: 'border-slate-700/40',
    tag: 'COLDWAVE',
  },
  {
    id: 'city-pop',
    title: 'Japanese City Pop',
    query: 'Tatsuro Yamashita Mariya Takeuchi Anri',
    gradient: 'from-rose-950/60 to-pink-900/30',
    border: 'border-rose-500/30',
    tag: 'VINTAGE TOKYO',
  },
  {
    id: 'chillhop',
    title: 'Lofi Girl & Chillhop',
    query: 'Lofi Girl Beats Chillhop Kupla',
    gradient: 'from-indigo-950/60 to-violet-900/30',
    border: 'border-indigo-500/30',
    tag: 'COZY STUDY',
  },
];

// Fallback seed tracks for "Listen Again" carousel
const SEED_TRACKS: Track[] = [
  {
    id: 'er416XiUp4g',
    title: 'Veridis Quo (1982 Edit)',
    artist: 'Daft Punk',
    album: 'Discovery',
    duration: 345,
    thumbnail: 'https://i.ytimg.com/vi/er416XiUp4g/hqdefault.jpg',
    source: 'youtube',
  },
  {
    id: 'TIW1m3t8xyo',
    title: 'Phantom Pt. II',
    artist: 'Justice',
    album: 'Cross',
    duration: 200,
    thumbnail: 'https://i.ytimg.com/vi/TIW1m3t8xyo/hqdefault.jpg',
    source: 'youtube',
  },
  {
    id: 'MV_3Dpw-BRY',
    title: 'Nightcall',
    artist: 'Kavinsky',
    album: 'OutRun',
    duration: 259,
    thumbnail: 'https://i.ytimg.com/vi/MV_3Dpw-BRY/hqdefault.jpg',
    source: 'youtube',
  },
  {
    id: 'KvMY1uzSC1E',
    title: 'I Really Want to Stay at Your House',
    artist: 'Rosa Walton & Hallie Coggins',
    album: 'Cyberpunk 2077',
    duration: 246,
    thumbnail: 'https://i.ytimg.com/vi/KvMY1uzSC1E/hqdefault.jpg',
    source: 'youtube',
  },
  {
    id: '9Gj47G2e1Jc',
    title: 'Boys Don\'t Cry',
    artist: 'The Cure',
    album: 'Boys Don\'t Cry',
    duration: 162,
    thumbnail: 'https://i.ytimg.com/vi/9Gj47G2e1Jc/hqdefault.jpg',
    source: 'youtube',
  },
  {
    id: 'm4_9TFeMfJE',
    title: 'Genesis',
    artist: 'Justice',
    album: 'Cross',
    duration: 234,
    thumbnail: 'https://i.ytimg.com/vi/m4_9TFeMfJE/hqdefault.jpg',
    source: 'youtube',
  },
  {
    id: '5NV6Rdv1a3I',
    title: 'Get Lucky',
    artist: 'Daft Punk ft. Pharrell Williams',
    album: 'Random Access Memories',
    duration: 248,
    thumbnail: 'https://i.ytimg.com/vi/5NV6Rdv1a3I/hqdefault.jpg',
    source: 'youtube',
  },
];

type LibrarySubTab = 'playlists' | 'liked' | 'history';

export const MainCanvas: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    searchResults,
    isSearching,
    performSearch,
    searchQuery,
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    history,
    favorites,
    playlists,
    activePlaylistId,
    setActivePlaylistId,
    deletePlaylist,
    removeTrackFromPlaylist,
    activeMood,
    setActiveMood,
    isQueueOpen,
    setQueueOpen,
    queue,
  } = usePlayerStore();

  const [localSearchInput, setLocalSearchInput] = useState('');
  const [librarySubTab, setLibrarySubTab] = useState<LibrarySubTab>('playlists');
  const [librarySearch, setLibrarySearch] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listenAgainScrollRef = useRef<HTMLDivElement>(null);
  const quickPicksScrollRef = useRef<HTMLDivElement>(null);
  const soundscapesScrollRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    if (searchResults.length === 0 && !isSearching) {
      performSearch('Daft Punk Justice Synthwave');
    }
  }, []);

  // Keyboard shortcut '/' or 'Ctrl+K' for search
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
    if (localSearchInput.trim()) {
      setActivePlaylistId(null);
      if (activeTab !== 'discover') {
        setActiveTab('discover');
      }
      performSearch(localSearchInput.trim());
    }
  };

  const handleMoodSelect = (chip: (typeof MOOD_CHIPS)[number]) => {
    setActiveMood(chip.label);
    setLocalSearchInput('');
    setActivePlaylistId(null);
    if (activeTab !== 'discover') {
      setActiveTab('discover');
    }
    performSearch(chip.query);
  };

  const scrollContainer = (
    ref: React.RefObject<HTMLDivElement | null>,
    direction: 'left' | 'right'
  ) => {
    if (ref.current) {
      const offset = direction === 'left' ? -480 : 480;
      ref.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Tracks for "Listen Again": History + Seeds fallback
  const listenAgainTracks: Track[] = [
    ...history,
    ...SEED_TRACKS.filter((s) => !history.some((h) => h.id === s.id)),
  ].slice(0, 14);

  // Quick Picks tracks (16 tracks split into 4 columns of 4)
  const quickPickTracks = searchResults.length > 0 ? searchResults.slice(0, 16) : SEED_TRACKS;
  const quickPickColumns: Track[][] = [];
  for (let i = 0; i < quickPickTracks.length; i += 4) {
    quickPickColumns.push(quickPickTracks.slice(i, i + 4));
  }

  // Active playlist in Library
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);

  return (
    <main className="flex-1 flex flex-col min-w-0 h-full bg-[#090a0c] select-none overflow-hidden relative">
      {/* 1. Global Top Navigation & Search Bar (YouTube Music Style) */}
      <header className="h-14 px-6 border-b border-white/[0.07] flex items-center justify-between gap-4 shrink-0 bg-[#090a0c]/80 backdrop-blur-md z-10">
        {/* Search input with shortcut badge */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={localSearchInput}
            onChange={(e) => setLocalSearchInput(e.target.value)}
            placeholder="Search tracks, artists, albums, or vibes..."
            className="w-full bg-[#12141a] hover:bg-[#151820] focus:bg-[#151820] text-sm text-zinc-100 placeholder:text-zinc-500 pl-10 pr-20 py-2 rounded-full border border-white/[0.08] focus:border-[#c8ff00]/60 focus:outline-none transition-all shadow-inner"
          />
          {localSearchInput ? (
            <button
              type="button"
              onClick={() => {
                setLocalSearchInput('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 font-mono text-[10px] text-zinc-500 border border-white/[0.08] px-1.5 py-0.5 rounded pointer-events-none">
              <span>/</span>
            </div>
          )}
        </form>

        {/* Right Header Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {isSearching && (
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c8ff00]" />
              <span className="hidden sm:inline">QUERYING SIGNAL</span>
            </div>
          )}

          <button
            onClick={() => setQueueOpen(!isQueueOpen)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors ${
              isQueueOpen
                ? 'bg-[#c8ff00] border-[#c8ff00] text-[#090a0c]'
                : 'bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <PanelRight className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Inspector</span>
            {queue.length > 0 && (
              <span
                className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                  isQueueOpen ? 'bg-[#090a0c] text-[#c8ff00]' : 'bg-white/[0.1] text-white'
                }`}
              >
                {queue.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 2. Horizontal Mood & Activity Chips Bar */}
      <div className="px-6 py-2.5 border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 bg-[#090a0c]/40">
        {MOOD_CHIPS.map((chip) => {
          const isActive = activeMood === chip.label;
          return (
            <button
              key={chip.label}
              onClick={() => handleMoodSelect(chip)}
              className={`px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition-colors cursor-pointer select-none ${
                isActive
                  ? 'bg-[#c8ff00] text-[#090a0c] font-semibold'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.06]'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* 3. Main Body Scrollable Stage */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 min-h-0">
        {/* VIEW A: HOME (Beranda) */}
        {activeTab === 'discover' && (
          <>
            {/* Section 1: Listen Again (Dengarkan lagi) Horizontal Carousel */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#151922] border border-white/[0.08] flex items-center justify-center text-[#c8ff00]">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">
                      OHM SIGNAL HISTORY
                    </span>
                    <h2 className="font-display font-bold text-lg text-white">
                      Listen Again
                    </h2>
                  </div>
                </div>

                {/* Left/Right Carousel Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => scrollContainer(listenAgainScrollRef, 'left')}
                    className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.06] cursor-pointer transition-colors"
                    title="Previous"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollContainer(listenAgainScrollRef, 'right')}
                    className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.06] cursor-pointer transition-colors"
                    title="Next"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Track Cards Row */}
              <div
                ref={listenAgainScrollRef}
                className="flex items-center gap-3.5 overflow-x-auto no-scrollbar pb-2 pt-1 scroll-smooth"
              >
                {listenAgainTracks.map((track, idx) => (
                  <CarouselTrackCard
                    key={`listen-again-${track.id}-${idx}`}
                    track={track}
                    onPlay={() => playTrack(track, listenAgainTracks.slice(idx + 1))}
                  />
                ))}
              </div>
            </section>

            {/* Section 2: Quick Picks (Pilihan Cepat) - YouTube Music 4-Column Matrix */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">
                    START RADIO FROM A TRACK
                  </span>
                  <h2 className="font-display font-bold text-lg text-white">
                    Quick Picks
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (quickPickTracks.length > 0) {
                        playTrack(quickPickTracks[0], quickPickTracks.slice(1));
                      }
                    }}
                    className="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-zinc-200 hover:text-white border border-white/[0.08] flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current text-[#c8ff00]" />
                    <span>Play All</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => scrollContainer(quickPicksScrollRef, 'left')}
                      className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.06] cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => scrollContainer(quickPicksScrollRef, 'right')}
                      className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.06] cursor-pointer transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 4-Column Stacked Grid (Scrollable horizontally on smaller screens, 4 columns on large) */}
              <div
                ref={quickPicksScrollRef}
                className="grid grid-flow-col auto-cols-[300px] md:auto-cols-[340px] xl:grid-cols-4 gap-3.5 overflow-x-auto no-scrollbar pb-2 scroll-smooth"
              >
                {quickPickColumns.map((colTracks, colIdx) => (
                  <div key={`col-${colIdx}`} className="space-y-2">
                    {colTracks.map((track, trackIdx) => (
                      <CompactTrackRow
                        key={`quick-${track.id}-${colIdx}-${trackIdx}`}
                        track={track}
                        index={colIdx * 4 + trackIdx}
                        contextQueue={quickPickTracks}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </section>

            {/* Section 3: Curated Soundscapes & Sonic Channels Carousel */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">
                    RECOMMENDED ALBUMS & COMPILATIONS
                  </span>
                  <h2 className="font-display font-bold text-lg text-white">
                    Sonic Vault & Curations
                  </h2>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => scrollContainer(soundscapesScrollRef, 'left')}
                    className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.06] cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollContainer(soundscapesScrollRef, 'right')}
                    className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.06] cursor-pointer transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div
                ref={soundscapesScrollRef}
                className="flex items-center gap-3.5 overflow-x-auto no-scrollbar pb-2 pt-1 scroll-smooth"
              >
                {searchResults.slice(6, 20).map((track, idx) => (
                  <CarouselTrackCard
                    key={`soundscapes-${track.id}-${idx}`}
                    track={track}
                    subtitle={track.album || track.artist}
                    onPlay={() => playTrack(track, searchResults.slice(idx + 1))}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {/* VIEW B: EXPLORE (Eksplorasi) */}
        {activeTab === 'explore' && (
          <div className="space-y-8">
            {/* Genre & Mood Categories Grid */}
            <section className="space-y-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">
                  EXPLORE ARCHIVE
                </span>
                <h2 className="font-display font-bold text-xl text-white">
                  Genres & Moods
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {EXPLORE_CATEGORIES.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setActiveTab('discover');
                      setActiveMood(cat.title);
                      performSearch(cat.query);
                    }}
                    className={`p-4 rounded-xl bg-gradient-to-br ${cat.gradient} border ${cat.border} hover:border-[#c8ff00] cursor-pointer transition-all duration-200 group flex flex-col justify-between h-32 select-none shadow-md`}
                  >
                    <span className="font-mono text-[9px] tracking-widest text-white/60 group-hover:text-[#c8ff00] transition-colors">
                      {cat.tag}
                    </span>
                    <div className="flex items-end justify-between">
                      <h3 className="font-display font-bold text-base text-white group-hover:text-[#c8ff00] transition-colors leading-tight">
                        {cat.title}
                      </h3>
                      <div className="w-8 h-8 rounded-full bg-black/40 group-hover:bg-[#c8ff00] text-white group-hover:text-[#090a0c] flex items-center justify-center transition-all shrink-0">
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Trending Releases */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#c8ff00]" />
                <h2 className="font-display font-bold text-lg text-white">
                  Trending Signals
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
                {searchResults.slice(0, 15).map((track, idx) => (
                  <TrackCard
                    key={`explore-track-${track.id}-${idx}`}
                    track={track}
                    index={idx}
                    contextQueue={searchResults}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* VIEW C: SAVED LIBRARY (Koleksi) */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            {/* Case C1: Active Playlist Detail View */}
            {activePlaylist ? (
              <div className="space-y-6">
                {/* Back button */}
                <button
                  onClick={() => setActivePlaylistId(null)}
                  className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Library</span>
                </button>

                {/* Playlist Hero Banner */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-[#12151d] to-[#0c0e14] border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-24 h-24 rounded-xl bg-[#181c26] border border-white/[0.1] flex items-center justify-center text-[#c8ff00] shrink-0 shadow-lg">
                      <Music className="w-10 h-10" />
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#c8ff00] font-semibold">
                        PLAYLIST
                      </span>
                      <h1 className="font-display font-bold text-2xl text-white mt-1">
                        {activePlaylist.name}
                      </h1>
                      <p className="text-xs text-zinc-400 mt-1 font-mono">
                        {activePlaylist.tracks.length} tracks ·{' '}
                        {formatDuration(
                          activePlaylist.tracks.reduce((acc, t) => acc + (t.duration || 0), 0)
                        )}{' '}
                        total duration
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {activePlaylist.tracks.length > 0 && (
                      <button
                        onClick={() =>
                          playTrack(activePlaylist.tracks[0], activePlaylist.tracks.slice(1))
                        }
                        className="px-4 py-2 rounded-xl bg-[#c8ff00] text-[#090a0c] font-semibold text-xs flex items-center gap-2 hover:bg-[#d8ff33] cursor-pointer transition-colors shadow-md"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                        <span>Play All</span>
                      </button>
                    )}

                    <button
                      onClick={() => deletePlaylist(activePlaylist.id)}
                      className="p-2 rounded-xl border border-white/[0.08] text-zinc-400 hover:text-red-400 hover:bg-white/[0.04] cursor-pointer transition-colors"
                      title="Delete Playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Track List */}
                {activePlaylist.tracks.length === 0 ? (
                  <div className="p-12 text-center text-xs text-zinc-500 border border-dashed border-white/[0.08] rounded-2xl space-y-2">
                    <Music className="w-8 h-8 mx-auto text-zinc-600" />
                    <p className="text-sm text-zinc-300">This playlist is empty</p>
                    <p className="text-zinc-500">
                      Explore music and click the menu button on any song to add it here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {activePlaylist.tracks.map((track, idx) => (
                      <div
                        key={`pl-track-${track.id}-${idx}`}
                        onClick={() =>
                          playTrack(track, activePlaylist.tracks.slice(idx + 1))
                        }
                        className="p-2.5 rounded-lg hover:bg-white/[0.04] flex items-center justify-between gap-4 cursor-pointer group transition-colors border border-transparent hover:border-white/[0.05]"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <span className="font-mono text-xs text-zinc-500 w-5 text-right tabular-nums">
                            {idx + 1}
                          </span>
                          <div className="w-10 h-10 rounded bg-[#090a0c] overflow-hidden shrink-0 border border-white/[0.06]">
                            <TrackArtwork track={track} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-display font-medium text-xs text-white truncate group-hover:text-[#c8ff00] transition-colors">
                              {track.title}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate">
                              {track.artist}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-xs text-zinc-500 tabular-nums">
                            {formatDuration(track.duration)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTrackFromPlaylist(activePlaylist.id, track.id);
                            }}
                            title="Remove from Playlist"
                            className="p-1.5 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Case C2: Library Root Tabs (Playlists / Liked Tracks / History) */
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLibrarySubTab('playlists')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        librarySubTab === 'playlists'
                          ? 'bg-[#c8ff00] text-[#090a0c] font-semibold'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      Playlists ({playlists.length})
                    </button>
                    <button
                      onClick={() => setLibrarySubTab('liked')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        librarySubTab === 'liked'
                          ? 'bg-[#c8ff00] text-[#090a0c] font-semibold'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      Liked Music ({favorites.length})
                    </button>
                    <button
                      onClick={() => setLibrarySubTab('history')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        librarySubTab === 'history'
                          ? 'bg-[#c8ff00] text-[#090a0c] font-semibold'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      History ({history.length})
                    </button>
                  </div>
                </div>

                {/* SubTab 1: Playlists Grid */}
                {librarySubTab === 'playlists' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Liked Songs Special Card */}
                    <div
                      onClick={() => setLibrarySubTab('liked')}
                      className="p-4 rounded-xl bg-gradient-to-br from-[#1b2210] to-[#0d1208] border border-[#c8ff00]/30 hover:border-[#c8ff00] cursor-pointer transition-all flex flex-col justify-between h-40 select-none shadow-md group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#c8ff00] text-[#090a0c] flex items-center justify-center">
                        <Heart className="w-5 h-5 fill-current" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-base text-white group-hover:text-[#c8ff00] transition-colors">
                          Liked Music
                        </h3>
                        <p className="text-xs text-zinc-400 font-mono mt-0.5">
                          {favorites.length} tracks
                        </p>
                      </div>
                    </div>

                    {/* User Playlists Cards */}
                    {playlists.map((pl) => (
                      <div
                        key={pl.id}
                        onClick={() => setActivePlaylistId(pl.id)}
                        className="p-4 rounded-xl bg-[#0f1115] hover:bg-[#14171e] border border-white/[0.06] hover:border-white/[0.14] cursor-pointer transition-all flex flex-col justify-between h-40 select-none shadow-md group relative"
                      >
                        <div className="flex justify-between items-start">
                          <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-300 group-hover:text-[#c8ff00] transition-colors">
                            <Music className="w-5 h-5" />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePlaylist(pl.id);
                            }}
                            className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-base text-white group-hover:text-[#c8ff00] transition-colors truncate">
                            {pl.name}
                          </h3>
                          <p className="text-xs text-zinc-400 font-mono mt-0.5">
                            {pl.tracks.length} tracks
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* SubTab 2: Liked Music List */}
                {librarySubTab === 'liked' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-zinc-400">
                        {favorites.length} FAVORITED TRACKS
                      </p>
                      {favorites.length > 0 && (
                        <button
                          onClick={() => playTrack(favorites[0], favorites.slice(1))}
                          className="px-3 py-1.5 rounded-lg bg-[#c8ff00] text-[#090a0c] font-semibold text-xs flex items-center gap-1.5 hover:bg-[#d8ff33] cursor-pointer transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          <span>Play Liked Music</span>
                        </button>
                      )}
                    </div>

                    {favorites.length === 0 ? (
                      <div className="p-12 text-center text-xs text-zinc-500 border border-dashed border-white/[0.08] rounded-xl space-y-2">
                        <Heart className="w-8 h-8 mx-auto text-zinc-600" />
                        <p>No liked tracks yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {favorites.map((track, idx) => (
                          <CompactTrackRow
                            key={`fav-${track.id}-${idx}`}
                            track={track}
                            index={idx}
                            contextQueue={favorites}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SubTab 3: Listening History */}
                {librarySubTab === 'history' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-zinc-400">
                        RECENTLY STREAMED ({history.length})
                      </p>
                    </div>

                    {history.length === 0 ? (
                      <div className="p-12 text-center text-xs text-zinc-500 border border-dashed border-white/[0.08] rounded-xl space-y-2">
                        <History className="w-8 h-8 mx-auto text-zinc-600" />
                        <p>No history recorded yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {history.map((track, idx) => (
                          <CompactTrackRow
                            key={`hist-${track.id}-${idx}`}
                            track={track}
                            index={idx}
                            contextQueue={history}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};
