import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Loader2,
  Play,
  Heart,
  ChevronLeft,
  ChevronRight,
  Music,
  Trash2,
  PanelRight,
  Sparkles,
  Flame,
  History,
  ArrowLeft,
  TrendingUp,
  Radio,
} from 'lucide-react';
import { usePlayerStore, Track } from '../store/usePlayerStore';
import {
  TrackCard,
  CompactTrackRow,
  CarouselTrackCard,
  TrackArtwork,
  formatDuration,
} from './TrackCard';
import {
  GLOBAL_TRENDING_TRACKS,
  analyzeTasteProfile,
} from '../utils/recommendationEngine';

// Modern Trending Mood & Activity Filter Chips
const MOOD_CHIPS = [
  { label: 'All', query: "Today's Top Hits official audio" },
  { label: 'Trending Hits', query: 'viral streaming hits 2025 2026 official' },
  { label: 'Energize', query: 'Dua Lipa Charli xcx dance pop upbeat official' },
  { label: 'Chill & R&B', query: 'SZA Billie Eilish chill r&b official' },
  { label: 'Late Night', query: 'The Weeknd Tommy Richman dark synthwave official' },
  { label: 'Hip-Hop Heat', query: 'Kendrick Lamar Drake Travis Scott hip hop official' },
  { label: 'Workout Bass', query: 'Fred again Peggy Gou club workout electronic' },
  { label: 'Focus & Study', query: 'Lofi Girl instrumental cozy beats official' },
  { label: 'Indie & Alt', query: 'Chappell Roan Sabrina Carpenter Clairo official' },
];

// Contemporary Explore Categories
const EXPLORE_CATEGORIES = [
  {
    id: 'top-hits',
    title: 'Global Top 50 & Billboard',
    query: "Today's Top Hits official audio",
    gradient: 'from-amber-950/60 to-yellow-900/30',
    border: 'border-yellow-500/30',
    tag: 'CHART TOPPERS',
  },
  {
    id: 'pop-dance',
    title: 'Viral Pop & Dance Club',
    query: 'Charli xcx Dua Lipa Sabrina Carpenter pop dance',
    gradient: 'from-fuchsia-950/60 to-pink-900/30',
    border: 'border-fuchsia-500/30',
    tag: 'GLOBAL VIRAL',
  },
  {
    id: 'hiphop',
    title: 'Modern Hip-Hop & Rap',
    query: 'Kendrick Lamar Drake Travis Scott Tommy Richman',
    gradient: 'from-zinc-900 to-zinc-950',
    border: 'border-zinc-700/40',
    tag: 'RAP CAVIAR',
  },
  {
    id: 'rnb-soul',
    title: 'Contemporary R&B & Soul',
    query: 'SZA Billie Eilish Frank Ocean Daniel Caesar',
    gradient: 'from-purple-950/60 to-indigo-900/30',
    border: 'border-purple-500/30',
    tag: 'SMOOTH CHILL',
  },
  {
    id: 'electronic',
    title: 'Modern Electronic & House',
    query: 'Fred again Peggy Gou Bicep Overmono',
    gradient: 'from-cyan-950/60 to-blue-900/30',
    border: 'border-cyan-500/30',
    tag: 'CLUB RESIDENCY',
  },
  {
    id: 'indie-alt',
    title: 'Indie & Bedroom Pop',
    query: 'Chappell Roan Clairo Boygenius Dominic Fike',
    gradient: 'from-emerald-950/60 to-teal-900/30',
    border: 'border-emerald-500/30',
    tag: 'INDIE RADAR',
  },
  {
    id: 'kpop-asia',
    title: 'K-Pop & Asian Pop Waves',
    query: 'NewJeans LE SSERAFIM Sal Priadi NIKI',
    gradient: 'from-rose-950/60 to-pink-900/30',
    border: 'border-rose-500/30',
    tag: 'ASIA CURATION',
  },
  {
    id: 'study-lofi',
    title: 'Cozy Lofi & Deep Focus',
    query: 'Lofi Girl Beats Study Chillhop Kupla',
    gradient: 'from-indigo-950/60 to-slate-900/30',
    border: 'border-indigo-500/30',
    tag: 'STUDY SESSION',
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
    playTrack,
    startRadio,
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
    tasteTracks,
    isLoadingTaste,
  } = usePlayerStore();

  const [localSearchInput, setLocalSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);

  const [librarySubTab, setLibrarySubTab] = useState<LibrarySubTab>('playlists');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsBoxRef = useRef<HTMLDivElement>(null);
  const listenAgainScrollRef = useRef<HTMLDivElement>(null);
  const quickPicksScrollRef = useRef<HTMLDivElement>(null);
  const forYouScrollRef = useRef<HTMLDivElement>(null);

  // Analyze taste profile to drive personalized ecosystem
  const tasteProfile = useMemo(
    () => analyzeTasteProfile(history, favorites, playlists),
    [history, favorites, playlists]
  );

  // Initial load
  useEffect(() => {
    if (searchResults.length === 0 && !isSearching) {
      performSearch("Today's Top Hits official audio");
    }
  }, []);

  // Live Typeahead Search Suggestions Debounce
  useEffect(() => {
    if (!localSearchInput.trim() || localSearchInput.trim().length < 2) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(localSearchInput.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setIsSuggestionsOpen((data.suggestions || []).length > 0);
          setActiveSuggestionIdx(-1);
        }
      } catch {
        // Ignore suggestion failure
      }
    }, 160);

    return () => clearTimeout(timer);
  }, [localSearchInput]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        suggestionsBoxRef.current &&
        !suggestionsBoxRef.current.contains(e.target as Node) &&
        !searchInputRef.current?.contains(e.target as Node)
      ) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Keyboard navigation for search suggestions
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestionsOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIdx((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIdx((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (activeSuggestionIdx >= 0 && activeSuggestionIdx < suggestions.length) {
        e.preventDefault();
        const selected = suggestions[activeSuggestionIdx];
        setLocalSearchInput(selected);
        setIsSuggestionsOpen(false);
        setActivePlaylistId(null);
        if (activeTab !== 'discover') setActiveTab('discover');
        performSearch(selected);
      }
    } else if (e.key === 'Escape') {
      setIsSuggestionsOpen(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearchInput.trim()) {
      setIsSuggestionsOpen(false);
      setActivePlaylistId(null);
      if (activeTab !== 'discover') {
        setActiveTab('discover');
      }
      performSearch(localSearchInput.trim());
    }
  };

  const handleSelectSuggestion = (s: string) => {
    setLocalSearchInput(s);
    setIsSuggestionsOpen(false);
    setActivePlaylistId(null);
    if (activeTab !== 'discover') setActiveTab('discover');
    performSearch(s);
  };

  const handleMoodSelect = (chip: (typeof MOOD_CHIPS)[number]) => {
    setActiveMood(chip.label);
    setLocalSearchInput('');
    setIsSuggestionsOpen(false);
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

  // Listen Again tracks: real user history with verified modern global hits fallback
  const listenAgainTracks: Track[] = useMemo(() => {
    const combined = [
      ...history,
      ...GLOBAL_TRENDING_TRACKS.filter((t) => !history.some((h) => h.id === t.id)),
    ];
    return combined.slice(0, 14);
  }, [history]);

  // Quick Picks dynamically adapts to tasteTracks if available, otherwise searchResults
  const quickPickTracks = useMemo(() => {
    if (tasteTracks.length >= 8) {
      return tasteTracks.slice(0, 16);
    }
    return searchResults.length > 0 ? searchResults.slice(0, 16) : GLOBAL_TRENDING_TRACKS;
  }, [tasteTracks, searchResults]);

  const quickPickColumns: Track[][] = useMemo(() => {
    const cols: Track[][] = [];
    for (let i = 0; i < quickPickTracks.length; i += 4) {
      cols.push(quickPickTracks.slice(i, i + 4));
    }
    return cols;
  }, [quickPickTracks]);

  // Active playlist in Library
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);

  return (
    <main className="flex-1 flex flex-col min-w-0 h-full bg-[#08090c] select-none overflow-hidden relative">
      {/* 1. Global Top Navigation & Smart Search Bar */}
      <header className="h-14 px-6 border-b border-white/[0.07] flex items-center justify-between gap-4 shrink-0 bg-[#08090c]/85 backdrop-blur-md z-30 relative">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={localSearchInput}
            onChange={(e) => setLocalSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setIsSuggestionsOpen(true);
            }}
            placeholder="Smart Search: songs, artists, moods, or natural vibes..."
            className="w-full bg-[#12151d] hover:bg-[#161a24] focus:bg-[#161a24] text-sm text-zinc-100 placeholder:text-zinc-500 pl-10 pr-20 py-2 rounded-full border border-white/[0.08] focus:border-[#c8ff00]/60 focus:outline-none transition-all shadow-inner"
          />
          {localSearchInput ? (
            <button
              type="button"
              onClick={() => {
                setLocalSearchInput('');
                setSuggestions([]);
                setIsSuggestionsOpen(false);
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

          {/* Floating Smart Search Suggestions Dropdown */}
          <AnimatePresence>
            {isSuggestionsOpen && suggestions.length > 0 && (
              <motion.div
                ref={suggestionsBoxRef}
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-11 bg-[#12151e] border border-white/[0.12] rounded-2xl shadow-2xl p-1.5 z-50 backdrop-blur-xl overflow-hidden"
              >
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-white/[0.05] mb-1 flex items-center justify-between">
                  <span>Smart Predictions</span>
                  <span className="text-[#c8ff00]">LIVE YTM ENGINE</span>
                </div>
                {suggestions.map((s, idx) => (
                  <button
                    key={`${s}-${idx}`}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                      activeSuggestionIdx === idx
                        ? 'bg-[#c8ff00] text-[#090a0c] font-semibold'
                        : 'text-zinc-200 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <Search className={`w-3.5 h-3.5 ${activeSuggestionIdx === idx ? 'text-[#090a0c]' : 'text-zinc-500'}`} />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <div className="flex items-center gap-3 shrink-0">
          {(isSearching || isLoadingTaste) && (
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c8ff00]" />
              <span className="hidden sm:inline">SMART ENGINE TUNING</span>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setQueueOpen(!isQueueOpen)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors ${
              isQueueOpen
                ? 'bg-[#c8ff00] border-[#c8ff00] text-[#090a0c] shadow-[0_2px_12px_rgba(200,255,0,0.2)]'
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
          </motion.button>
        </div>
      </header>

      {/* 2. Horizontal Mood & Activity Chips Bar with 60fps sliding pill */}
      <div className="px-6 py-2.5 border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 bg-[#08090c]/50 relative z-10">
        {MOOD_CHIPS.map((chip) => {
          const isActive = activeMood === chip.label;
          return (
            <button
              key={chip.label}
              onClick={() => handleMoodSelect(chip)}
              className={`relative px-4 py-1.5 rounded-full text-xs whitespace-nowrap font-medium transition-colors cursor-pointer select-none z-10 ${
                isActive
                  ? 'text-[#090a0c] font-semibold'
                  : 'text-zinc-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeMoodChip"
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  className="absolute inset-0 bg-[#c8ff00] rounded-full -z-10 shadow-[0_2px_10px_rgba(200,255,0,0.25)]"
                />
              )}
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Body Scrollable Stage with 60fps view transitions */}
      <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
        <AnimatePresence mode="wait">
          {/* VIEW A: HOME (Beranda) */}
          {activeTab === 'discover' && (
            <motion.div
              key="view-home"
              initial={{ opacity: 0, y: 12, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(3px)' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-9 pb-10"
            >
              {/* Section 1: Listen Again (Dengarkan lagi) Carousel */}
              <section className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#151922] border border-white/[0.08] flex items-center justify-center text-[#c8ff00]">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">
                        {tasteProfile.historyCount > 0 ? 'RESUME STREAMING' : 'TRENDING TODAY'}
                      </span>
                      <h2 className="font-display font-bold text-lg text-white">
                        Listen Again
                      </h2>
                    </div>
                  </div>

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

              {/* Section 2: Quick Picks (Pilihan Cepat) - Adapts to Taste */}
              <section className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#c8ff00] block font-semibold">
                      {tasteTracks.length > 0 ? 'ADAPTED TO YOUR LISTENING HABITS' : 'START RADIO FROM A TRACK'}
                    </span>
                    <h2 className="font-display font-bold text-lg text-white">
                      Quick Picks {tasteTracks.length > 0 && <span className="text-xs font-mono font-normal text-zinc-400">· Dynamic Radar</span>}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (quickPickTracks.length > 0) {
                          playTrack(quickPickTracks[0], quickPickTracks.slice(1));
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-zinc-200 hover:text-white border border-white/[0.08] flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                    >
                      <Play className="w-3 h-3 fill-current text-[#c8ff00]" />
                      <span>Play All</span>
                    </motion.button>

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

              {/* Section 3: Dynamic Adaptive Recommendation Section */}
              <section className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#c8ff00]" />
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">
                        {tasteProfile.recommendedQueries[0]?.sectionSubtitle}
                      </span>
                      <h2 className="font-display font-bold text-lg text-white">
                        {tasteProfile.recommendedQueries[0]?.sectionTitle}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => scrollContainer(forYouScrollRef, 'left')}
                      className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.06] cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => scrollContainer(forYouScrollRef, 'right')}
                      className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.06] cursor-pointer transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div
                  ref={forYouScrollRef}
                  className="flex items-center gap-3.5 overflow-x-auto no-scrollbar pb-2 pt-1 scroll-smooth"
                >
                  {(tasteTracks.length > 0 ? tasteTracks : searchResults).slice(0, 14).map((track, idx) => (
                    <CarouselTrackCard
                      key={`for-you-${track.id}-${idx}`}
                      track={track}
                      subtitle={track.artist}
                      onPlay={() => playTrack(track, (tasteTracks.length > 0 ? tasteTracks : searchResults).slice(idx + 1))}
                    />
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {/* VIEW B: EXPLORE (Eksplorasi) */}
          {activeTab === 'explore' && (
            <motion.div
              key="view-explore"
              initial={{ opacity: 0, y: 12, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(3px)' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-9 pb-10"
            >
              <section className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">
                    TRENDING CHARTS & RADAR
                  </span>
                  <h2 className="font-display font-bold text-xl text-white">
                    Explore Modern Genres
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {EXPLORE_CATEGORIES.map((cat) => (
                    <motion.div
                      key={cat.id}
                      whileHover={{ y: -4, scale: 1.015 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      onClick={() => {
                        setActiveTab('discover');
                        setActiveMood(cat.title);
                        performSearch(cat.query);
                      }}
                      className={`p-4 rounded-2xl bg-gradient-to-br ${cat.gradient} border ${cat.border} hover:border-[#c8ff00] cursor-pointer transition-all duration-200 group flex flex-col justify-between h-34 select-none shadow-lg`}
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
                    </motion.div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#c8ff00]" />
                  <h2 className="font-display font-bold text-lg text-white">
                    Top Global Signals
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
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
            </motion.div>
          )}

          {/* VIEW C: SAVED LIBRARY (Koleksi) */}
          {activeTab === 'library' && (
            <motion.div
              key="view-library"
              initial={{ opacity: 0, y: 12, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(3px)' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6 pb-10"
            >
              {activePlaylist ? (
                <div className="space-y-6">
                  <button
                    onClick={() => setActivePlaylistId(null)}
                    className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Library</span>
                  </button>

                  <div className="p-6 rounded-2xl bg-gradient-to-r from-[#121620] to-[#0c0e14] border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
                    <div className="flex items-center gap-5">
                      <div className="w-24 h-24 rounded-2xl bg-[#181d28] border border-white/[0.1] flex items-center justify-center text-[#c8ff00] shrink-0 shadow-lg">
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
                          runtime
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {activePlaylist.tracks.length > 0 && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() =>
                            playTrack(activePlaylist.tracks[0], activePlaylist.tracks.slice(1))
                          }
                          className="px-4 py-2 rounded-xl bg-[#c8ff00] text-[#090a0c] font-semibold text-xs flex items-center gap-2 hover:bg-[#d8ff33] cursor-pointer transition-colors shadow-md"
                        >
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                          <span>Play All</span>
                        </motion.button>
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
                          className="p-2.5 rounded-xl hover:bg-white/[0.04] flex items-center justify-between gap-4 cursor-pointer group transition-colors border border-transparent hover:border-white/[0.05]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <span className="font-mono text-xs text-zinc-500 w-5 text-right tabular-nums">
                              {idx + 1}
                            </span>
                            <div className="w-10 h-10 rounded-lg bg-[#090a0c] overflow-hidden shrink-0 border border-white/[0.06]">
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
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/[0.07] pb-3 relative">
                    <div className="flex items-center gap-2">
                      {(['playlists', 'liked', 'history'] as const).map((tab) => {
                        const isActive = librarySubTab === tab;
                        const label =
                          tab === 'playlists'
                            ? `Playlists (${playlists.length})`
                            : tab === 'liked'
                            ? `Liked Music (${favorites.length})`
                            : `History (${history.length})`;
                        return (
                          <button
                            key={tab}
                            onClick={() => setLibrarySubTab(tab)}
                            className={`relative px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors z-10 ${
                              isActive
                                ? 'text-[#090a0c] font-semibold'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="libraryActivePill"
                                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                                className="absolute inset-0 bg-[#c8ff00] rounded-xl -z-10 shadow-[0_2px_10px_rgba(200,255,0,0.2)]"
                              />
                            )}
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {librarySubTab === 'playlists' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      <motion.div
                        whileHover={{ y: -4, scale: 1.015 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setLibrarySubTab('liked')}
                        className="p-4 rounded-2xl bg-gradient-to-br from-[#1b2210] to-[#0d1208] border border-[#c8ff00]/30 hover:border-[#c8ff00] cursor-pointer transition-all flex flex-col justify-between h-42 select-none shadow-lg group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#c8ff00] text-[#090a0c] flex items-center justify-center">
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
                      </motion.div>

                      {playlists.map((pl) => (
                        <motion.div
                          key={pl.id}
                          whileHover={{ y: -4, scale: 1.015 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setActivePlaylistId(pl.id)}
                          className="p-4 rounded-2xl bg-[#0f1218] hover:bg-[#151922] border border-white/[0.06] hover:border-white/[0.14] cursor-pointer transition-all flex flex-col justify-between h-42 select-none shadow-lg group relative"
                        >
                          <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-300 group-hover:text-[#c8ff00] transition-colors">
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
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {librarySubTab === 'liked' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-mono text-zinc-400">
                          {favorites.length} FAVORITED TRACKS
                        </p>
                        {favorites.length > 0 && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => playTrack(favorites[0], favorites.slice(1))}
                            className="px-3.5 py-1.5 rounded-xl bg-[#c8ff00] text-[#090a0c] font-semibold text-xs flex items-center gap-1.5 hover:bg-[#d8ff33] cursor-pointer transition-colors shadow-sm"
                          >
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            <span>Play Liked Music</span>
                          </motion.button>
                        )}
                      </div>

                      {favorites.length === 0 ? (
                        <div className="p-12 text-center text-xs text-zinc-500 border border-dashed border-white/[0.08] rounded-2xl space-y-2">
                          <Heart className="w-8 h-8 mx-auto text-zinc-600" />
                          <p>No liked tracks yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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

                  {librarySubTab === 'history' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-mono text-zinc-400">
                          RECENTLY STREAMED ({history.length})
                        </p>
                      </div>

                      {history.length === 0 ? (
                        <div className="p-12 text-center text-xs text-zinc-500 border border-dashed border-white/[0.08] rounded-2xl space-y-2">
                          <History className="w-8 h-8 mx-auto text-zinc-600" />
                          <p>No history recorded yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};
