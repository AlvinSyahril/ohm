import React from 'react';
import { motion } from 'framer-motion';
import { Home, Search, Library, ListMusic } from 'lucide-react';
import { usePlayerStore, ActiveTab } from '../store/usePlayerStore';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, queue, favorites } = usePlayerStore();

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'discover',
      label: 'Home',
      icon: <Home className="w-[18px] h-[18px]" />,
    },
    {
      id: 'search',
      label: 'Search',
      icon: <Search className="w-[18px] h-[18px]" />,
    },
    {
      id: 'library',
      label: 'Library',
      icon: <Library className="w-[18px] h-[18px]" />,
      badge: favorites.length > 0 ? favorites.length : 1,
    },
    {
      id: 'queue',
      label: 'Queue',
      icon: <ListMusic className="w-[18px] h-[18px]" />,
      badge: queue.length > 0 ? queue.length : undefined,
    },
  ];

  return (
    <aside className="w-56 h-full bg-[#0b0d10] border-r border-white/[0.06] flex flex-col justify-between select-none shrink-0">
      <div>
        {/* Brand Wordmark */}
        <div className="px-7 pt-7 pb-8">
          <span className="font-display font-extrabold text-[22px] tracking-[0.2em] text-white uppercase">
            OHM
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="px-4 space-y-1.5" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(item.id)}
                className={`w-full relative flex items-center justify-between px-4 py-3 rounded-xl text-[14px] transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#0b0c0e] font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavPill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-[#b8ff01] shadow-[0_4px_20px_rgba(184,255,1,0.22)]"
                  />
                )}
                <span className="relative z-10 flex items-center gap-3.5">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`relative z-10 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                      isActive
                        ? 'bg-[#0b0c0e] text-[#b8ff01]'
                        : 'bg-[#b8ff01] text-[#0b0c0e]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
