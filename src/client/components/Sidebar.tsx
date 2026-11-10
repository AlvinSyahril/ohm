import React from 'react';
import { motion } from 'framer-motion';
import {
  Compass,
  Search,
  Library,
  ListMusic,
  Volume2,
  VolumeX,
  Radio,
  Disc3,
} from 'lucide-react';
import { usePlayerStore, ActiveTab } from '../store/usePlayerStore';

const QUICK_VIBES = [
  { label: 'Dark Synthwave', query: 'Dark Synthwave Daft Punk Kavinsky' },
  { label: 'Lo-Fi Beats', query: 'Nujabes Lofi Chill Beats' },
  { label: 'Ambient Focus', query: 'Brian Eno Aphex Twin Ambient' },
  { label: 'Electronic Live', query: 'Rufus Du Sol Bicep Bonobo' },
  { label: 'Post-Punk / Indie', query: 'Tame Impala Joy Division Interpol' },
];

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    queue,
    favorites,
    sfxEnabled,
    toggleSfx,
    performSearch,
    isPlaying,
  } = usePlayerStore();

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'discover', label: 'Discover', icon: <Compass className="w-4 h-4" /> },
    { id: 'search', label: 'Search', icon: <Search className="w-4 h-4" /> },
    {
      id: 'library',
      label: 'Saved Vault',
      icon: <Library className="w-4 h-4" />,
      badge: favorites.length || undefined,
    },
    {
      id: 'queue',
      label: 'Active Queue',
      icon: <ListMusic className="w-4 h-4" />,
      badge: queue.length || undefined,
    },
  ];

  const handleVibeClick = (query: string) => {
    setActiveTab('discover');
    performSearch(query);
  };

  return (
    <aside className="w-64 h-full bg-[#0d0f14] border-r border-[#232736] flex flex-col justify-between select-none shrink-0">
      {/* Top Brand Header */}
      <div>
        <div className="p-5 border-b border-[#232736] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
              transition={isPlaying ? { repeat: Infinity, duration: 6, ease: 'linear' } : { duration: 0.4 }}
              className="w-9 h-9 bg-[#a3e635] text-[#0a0b0e] flex items-center justify-center font-display font-bold text-lg border border-[#a3e635] shadow-[2px_2px_0px_#22d3ee]"
            >
              <Disc3 className="w-5 h-5 stroke-[2.5]" />
            </motion.div>
            <div>
              <div className="font-display font-bold text-xl tracking-wider text-white leading-none">
                OHM
              </div>
              <div className="font-mono text-[10px] text-[#a3e635] tracking-widest mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635] animate-pulse" />
                CORE v0.1
              </div>
            </div>
          </div>
          <span className="font-mono text-[10px] px-1.5 py-0.5 bg-[#171a24] border border-[#232736] text-zinc-400">
            HI-FI
          </span>
        </div>

        {/* Navigation Links */}
        <div className="p-3 space-y-1">
          <div className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Navigation
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveTab(item.id)}
                className={`w-full relative flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#0a0b0e] font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-[#151822]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarPill"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 bg-[#a3e635] border border-[#a3e635] shadow-[3px_3px_0px_#232736]"
                  />
                )}
                <span className="relative z-10 flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`relative z-10 font-mono text-[11px] px-1.5 py-0.2 rounded-none border ${
                      isActive
                        ? 'bg-[#0a0b0e] text-[#a3e635] border-[#0a0b0e]'
                        : 'bg-[#171a24] text-[#a3e635] border-[#232736]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Sonic Frequencies / Quick Vibes */}
        <div className="p-3 mt-2 border-t border-[#232736]">
          <div className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500 flex items-center justify-between">
            <span>Sonic Presets</span>
            <Radio className="w-3 h-3 text-[#a3e635]" />
          </div>
          <div className="mt-1 space-y-1">
            {QUICK_VIBES.map((vibe) => (
              <motion.button
                key={vibe.label}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleVibeClick(vibe.query)}
                className="w-full text-left px-3 py-2 text-xs font-mono text-zinc-400 hover:text-[#a3e635] hover:bg-[#141720] flex items-center justify-between group transition-colors cursor-pointer"
              >
                <span>{vibe.label}</span>
                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[#a3e635] transition-opacity">
                  LOAD -&gt;
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Hardware Telemetry & Tactile Switch */}
      <div className="p-4 border-t border-[#232736] bg-[#0a0b0e] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-zinc-400">TACTILE AUDIO FX</span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleSfx}
            className={`px-2 py-1 font-mono text-[10px] border flex items-center gap-1.5 cursor-pointer transition-colors ${
              sfxEnabled
                ? 'bg-[#a3e635]/15 border-[#a3e635] text-[#a3e635]'
                : 'bg-[#141720] border-[#232736] text-zinc-500'
            }`}
          >
            {sfxEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            {sfxEnabled ? 'ON' : 'OFF'}
          </motion.button>
        </div>
        <div className="p-2.5 bg-[#12141c] border border-[#232736] font-mono text-[10px] text-zinc-400 space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-500">RESOLVER:</span>
            <span className="text-[#a3e635]">INNERTUBE iOS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">STREAM:</span>
            <span className="text-cyan-400">DIRECT HTTP/206</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
