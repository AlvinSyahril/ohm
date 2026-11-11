import React, { useState, useEffect } from 'react';
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

const SONIC_CHANNELS = [
  { id: 'french-touch', name: 'French Touch', query: 'Daft Punk Justice Cassius Kavinsky' },
  { id: 'idm-warp', name: 'IDM & Warp', query: 'Aphex Twin Boards of Canada Autechre' },
  { id: 'modular-ambient', name: 'Modular Ambient', query: 'Brian Eno Jon Hopkins Nils Frahm' },
  { id: 'lofi-tape', name: 'Analog Lo-Fi', query: 'Nujabes J Dilla Khruangbin Instrumental' },
  { id: 'warehouse-club', name: 'Warehouse Club', query: 'Gesaffelstein Bicep Overmono Moderat' },
  { id: 'post-punk', name: 'Post-Punk Revival', query: 'Joy Division Interpol New Order Molchat Doma' },
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

  // Number keys 1-3 switch views when not focused in an input
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
        {/* Minimal Swiss Brand Header */}
        <div className="h-14 px-5 border-b border-white/[0.07] flex items-center justify-between shrink-0">
          <div
            onClick={() => setActiveTab('discover')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#c8ff00] shadow-[0_0_8px_#c8ff00]" />
            <span className="font-display font-bold text-[17px] tracking-[0.16em] text-white uppercase">
              OHM
            </span>
          </div>
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400 tracking-wider">
            CORE v2
          </span>
        </div>

        {/* Primary Navigation */}
        <div className="p-3 space-y-0.5 shrink-0">
          {navItems.map((item) => {
            const isActive = activeTab === item.id && activePlaylistId === null;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePlaylistId(null);
                  setActiveTab(item.id);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#c8ff00] text-[#090a0c] font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
                }`}
              >
                <span className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
                <span
                  className={`font-mono text-[10px] ${
                    isActive ? 'text-[#090a0c]/60' : 'text-zinc-600'
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
          {isCreatingPlaylist ? (
            <form
              onSubmit={handleCreateSubmit}
              className="p-2 rounded-lg bg-[#12151c] border border-[#c8ff00]/40 flex items-center gap-1.5"
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
                className="p-1 rounded bg-[#c8ff00] text-[#090a0c] hover:bg-[#d8ff33] cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingPlaylist(false)}
                className="p-1 rounded text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsCreatingPlaylist(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-zinc-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#c8ff00]" />
              <span>New Playlist</span>
            </button>
          )}
        </div>

        {/* Playlists & Vault Section (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
          {/* Liked Songs Shortcut */}
          <div>
            <button
              onClick={() => {
                setActivePlaylistId(null);
                setActiveTab('library');
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer group"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <div className="w-5 h-5 rounded flex items-center justify-center bg-gradient-to-br from-[#c8ff00]/20 to-[#c8ff00]/5 text-[#c8ff00] shrink-0">
                  <Heart className="w-3 h-3 fill-current" />
                </div>
                <span className="truncate">Liked Music</span>
              </span>
              <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                {favorites.length}
              </span>
            </button>

            {/* Custom User Playlists */}
            <div className="mt-1 space-y-0.5">
              {playlists.map((pl) => {
                const isPlActive =
                  activeTab === 'library' && activePlaylistId === pl.id;
                return (
                  <div
                    key={pl.id}
                    onClick={() => {
                      setActivePlaylistId(pl.id);
                      setActiveTab('library');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[12px] transition-colors cursor-pointer group ${
                      isPlActive
                        ? 'bg-white/[0.08] text-white font-medium'
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
                        className="hidden group-hover:flex p-1 text-zinc-500 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Curated Sonic Channels */}
          <div className="pt-3 border-t border-white/[0.06]">
            <div className="px-3 pb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              <span>Channels</span>
              <Radio className="w-3 h-3 text-zinc-500" />
            </div>
            <div className="space-y-0.5">
              {SONIC_CHANNELS.map((ch) => {
                const isCurrentChannel = searchQuery === ch.query;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActivePlaylistId(null);
                      setActiveTab('discover');
                      performSearch(ch.query);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-[12px] flex items-center justify-between transition-colors cursor-pointer ${
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
        <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
          UI Click Synth
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
