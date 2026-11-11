import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Compass,
  Library,
  Plus,
  Heart,
  Music,
  Trash2,
  Radio,
  Volume2,
  VolumeX,
  X,
  Check,
} from 'lucide-react';
import { usePlayerStore, ActiveTab } from '../store/usePlayerStore';

const CURATED_STATIONS = [
  { id: 'top-hits', name: "Today's Top Hits", query: "Today's Top Hits official audio" },
  { id: 'viral-radar', name: 'Viral Hits', query: 'viral streaming hits 2025 2026 official' },
  { id: 'pop-rb', name: 'Pop & R&B', query: 'Billie Eilish Sabrina Carpenter SZA The Weeknd' },
  { id: 'dance-club', name: 'Dance & Club', query: 'Charli xcx Dua Lipa Fred again Peggy Gou' },
  { id: 'hiphop-heat', name: 'Hip-Hop Hotlist', query: 'Kendrick Lamar Drake Travis Scott Tommy Richman' },
  { id: 'indie-vibes', name: 'Indie & Alt', query: 'Chappell Roan Clairo Boygenius Dominic Fike' },
];

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    favorites,
    playlists,
    activePlaylistId,
    setActivePlaylistId,
    createPlaylist,
    deletePlaylist,
    performSearch,
    searchQuery,
    sfxEnabled,
    toggleSfx,
  } = usePlayerStore();

  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');

  // Number keys 1-3 switch views
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey) return;
      if (e.key === '1') setActiveTab('discover');
      if (e.key === '2') setActiveTab('explore');
      if (e.key === '3') setActiveTab('library');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setActiveTab]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistTitle.trim()) {
      createPlaylist(newPlaylistTitle.trim());
      setNewPlaylistTitle('');
      setIsCreatingPlaylist(false);
    }
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    shortcut: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'discover',
      label: 'Home',
      shortcut: '1',
      icon: <Home className="w-4 h-4" />,
    },
    {
      id: 'explore',
      label: 'Explore',
      shortcut: '2',
      icon: <Compass className="w-4 h-4" />,
    },
    {
      id: 'library',
      label: 'Library',
      shortcut: '3',
      icon: <Library className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-60 h-full bg-[#08090c] border-r border-white/[0.07] flex flex-col justify-between select-none shrink-0 z-20">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Brand Header */}
        <div className="h-14 px-5 border-b border-white/[0.07] flex items-center justify-between shrink-0">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setActivePlaylistId(null);
              setActiveTab('discover');
            }}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#c8ff00] shadow-[0_0_10px_#c8ff00]" />
            <span className="font-display font-bold text-lg tracking-wider text-white uppercase">
              Ohm
            </span>
          </motion.div>
        </div>

        {/* Primary Navigation with 60fps sliding active pill */}
        <div className="p-3 space-y-1 shrink-0 relative">
          {navItems.map((item) => {
            const isActive = activeTab === item.id && activePlaylistId === null;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePlaylistId(null);
                  setActiveTab(item.id);
                }}
                className={`relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer z-10 ${
                  isActive
                    ? 'text-[#090a0c] font-semibold'
                    : 'text-zinc-400 hover:text-white font-medium'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 bg-[#c8ff00] rounded-xl -z-10 shadow-[0_2px_12px_rgba(200,255,0,0.25)]"
                  />
                )}

                <span className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
                <span
                  className={`font-mono text-xs ${
                    isActive ? 'text-[#090a0c]/70' : 'text-zinc-600'
                  }`}
                >
                  {item.shortcut}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action: + New Playlist Button */}
        <div className="px-3 py-1 shrink-0">
          <AnimatePresence mode="wait">
            {isCreatingPlaylist ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onSubmit={handleCreateSubmit}
                className="p-2 rounded-xl bg-[#12151c] border border-[#c8ff00]/50 flex items-center gap-1.5 shadow-md"
              >
                <input
                  type="text"
                  autoFocus
                  placeholder="Playlist name..."
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  className="bg-transparent text-white text-xs px-1 py-0.5 w-full focus:outline-none placeholder:text-zinc-500"
                />
                <button
                  type="submit"
                  className="p-1 rounded-lg bg-[#c8ff00] text-[#090a0c] hover:bg-[#d8ff33] cursor-pointer transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingPlaylist(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.form>
            ) : (
              <motion.button
                key="btn"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setIsCreatingPlaylist(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#c8ff00]" />
                <span>New Playlist</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Playlists & Vault Section (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
          {/* Liked Songs Shortcut */}
          <div>
            <motion.button
              whileHover={{ x: 2 }}
              onClick={() => {
                setActivePlaylistId(null);
                setActiveTab('library');
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer group"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <div className="w-5 h-5 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#c8ff00]/25 to-[#c8ff00]/5 text-[#c8ff00] shrink-0">
                  <Heart className="w-3 h-3 fill-current" />
                </div>
                <span className="truncate font-medium">Liked Music</span>
              </span>
              <span className="font-mono text-xs text-zinc-500 tabular-nums">
                {favorites.length}
              </span>
            </motion.button>

            {/* Custom User Playlists */}
            <div className="mt-1 space-y-0.5">
              {playlists.map((pl) => {
                const isPlActive =
                  activeTab === 'library' && activePlaylistId === pl.id;
                return (
                  <motion.div
                    key={pl.id}
                    whileHover={{ x: 2 }}
                    onClick={() => {
                      setActivePlaylistId(pl.id);
                      setActiveTab('library');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer group ${
                      isPlActive
                        ? 'bg-white/[0.08] text-white font-medium border-l-2 border-[#c8ff00]'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Music className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{pl.name}</span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-[10px] text-zinc-500 group-hover:hidden tabular-nums">
                        {pl.tracks.length}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlaylist(pl.id);
                        }}
                        title="Delete Playlist"
                        className="hidden group-hover:flex p-1 text-zinc-500 hover:text-red-400 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Curated Stations */}
          <div className="pt-3 border-t border-white/[0.06]">
            <div className="px-3 pb-1.5 flex items-center justify-between text-xs font-semibold text-zinc-500">
              <span>Stations</span>
              <Radio className="w-3 h-3 text-zinc-500" />
            </div>
            <div className="space-y-0.5">
              {CURATED_STATIONS.map((ch) => {
                const isCurrentChannel = searchQuery === ch.query;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActivePlaylistId(null);
                      setActiveTab('discover');
                      performSearch(ch.query);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isCurrentChannel
                        ? 'bg-white/[0.08] text-white font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="truncate">{ch.name}</span>
                    {isCurrentChannel && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Utility Toggle */}
      <div className="p-3 border-t border-white/[0.07] flex items-center justify-between shrink-0">
        <span className="text-xs text-zinc-400 font-medium">
          Audio Feedback
        </span>
        <button
          onClick={toggleSfx}
          className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 cursor-pointer transition-colors ${
            sfxEnabled
              ? 'border-white/[0.15] bg-white/[0.05] text-zinc-200'
              : 'border-white/[0.05] text-zinc-600'
          }`}
        >
          {sfxEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          <span>{sfxEnabled ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </aside>
  );
};
