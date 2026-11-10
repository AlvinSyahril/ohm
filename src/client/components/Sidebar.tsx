import React, { useEffect } from 'react';
import { Home, Search, Library, ListMusic, Radio, Volume2, VolumeX } from 'lucide-react';
import { usePlayerStore, ActiveTab } from '../store/usePlayerStore';

const CHANNELS = [
  { id: 'french-touch', name: 'French Touch', query: 'Daft Punk Justice Cassius Kavinsky' },
  { id: 'idm-warp', name: 'IDM / Warp', query: 'Aphex Twin Boards of Canada Autechre' },
  { id: 'modular-ambient', name: 'Modular & Ambient', query: 'Brian Eno Jon Hopkins Nils Frahm' },
  { id: 'lofi-tape', name: 'Analog Lo-Fi', query: 'Nujabes J Dilla Khruangbin Instrumental' },
  { id: 'dark-club', name: 'Warehouse Club', query: 'Gesaffelstein Bicep Overmono Moderat' },
  { id: 'post-punk', name: 'Post-Punk Revival', query: 'Joy Division Interpol New Order Molchat Doma' },
];

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    queue,
    favorites,
    performSearch,
    searchQuery,
    sfxEnabled,
    toggleSfx,
  } = usePlayerStore();

  // Number keys 1-4 switch views when not focused in an input
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey) return;
      if (e.key === '1') setActiveTab('discover');
      if (e.key === '2') setActiveTab('search');
      if (e.key === '3') setActiveTab('library');
      if (e.key === '4') setActiveTab('queue');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setActiveTab]);

  const navItems: {
    id: ActiveTab;
    label: string;
    shortcut: string;
    icon: React.ReactNode;
    count?: number;
  }[] = [
    {
      id: 'discover',
      label: 'Home',
      shortcut: '1',
      icon: <Home className="w-4 h-4" />,
    },
    {
      id: 'search',
      label: 'Catalog',
      shortcut: '2',
      icon: <Search className="w-4 h-4" />,
    },
    {
      id: 'library',
      label: 'Saved Library',
      shortcut: '3',
      icon: <Library className="w-4 h-4" />,
      count: favorites.length || undefined,
    },
    {
      id: 'queue',
      label: 'Play Queue',
      shortcut: '4',
      icon: <ListMusic className="w-4 h-4" />,
      count: queue.length || undefined,
    },
  ];

  return (
    <aside className="w-56 h-full bg-[#090a0c] border-r border-white/[0.07] flex flex-col justify-between select-none shrink-0">
      <div>
        {/* Minimal Swiss Brand Header */}
        <div className="h-14 px-5 border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 bg-[#c8ff00]" />
            <span className="font-display font-bold text-[17px] tracking-[0.16em] text-white uppercase">
              OHM
            </span>
          </div>
          <span className="font-mono text-[10px] text-zinc-500 tracking-wider">
            STUDIO
          </span>
        </div>

        {/* Primary Navigation */}
        <div className="p-3 space-y-0.5">
          <div className="px-2.5 pb-1.5 pt-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Workspace
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-[13px] transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#c8ff00] text-[#090a0c] font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  {item.count !== undefined ? (
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.2 rounded-sm font-semibold ${
                        isActive
                          ? 'bg-[#090a0c] text-[#c8ff00]'
                          : 'bg-white/[0.08] text-zinc-200'
                      }`}
                    >
                      {item.count}
                    </span>
                  ) : (
                    <span
                      className={`font-mono text-[10px] ${
                        isActive ? 'text-[#090a0c]/60' : 'text-zinc-600'
                      }`}
                    >
                      {item.shortcut}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Curated Channels */}
        <div className="p-3 pt-2 border-t border-white/[0.07]">
          <div className="px-2.5 pb-2 pt-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            <span>Channels</span>
            <Radio className="w-3 h-3 text-zinc-500" />
          </div>
          <div className="space-y-0.5">
            {CHANNELS.map((ch) => {
              const isCurrentChannel = searchQuery === ch.query;
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    if (activeTab !== 'discover' && activeTab !== 'search') {
                      setActiveTab('discover');
                    }
                    performSearch(ch.query);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-[12px] flex items-center justify-between transition-colors cursor-pointer ${
                    isCurrentChannel
                      ? 'bg-white/[0.07] text-white font-medium'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="truncate">{ch.name}</span>
                  {isCurrentChannel && (
                    <span className="w-1.5 h-1.5 bg-[#c8ff00] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Utility Toggle */}
      <div className="p-3 border-t border-white/[0.07] flex items-center justify-between">
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
