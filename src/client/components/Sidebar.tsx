import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  House,
  Compass,
  Music,
  Disc3,
  Mic2,
  Clock,
  Heart,
  Plus,
  ListMusic,
  Info,
} from 'lucide-react';
import { APP_VERSION } from '../lib/desktop';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore, ActiveTab } from '../store/usePlayerStore';
import { toast } from '../store/useToastStore';
import { OhmLogo } from './OhmLogo';
import { EASE_OUT, SPRING, SPRING_LAYOUT } from '../utils/motion';

const ReceiptIcon: React.FC<{ className?: string }> = ({ className = 'w-[18px] h-[18px]' }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <path
      d="M5 3.5h14v17l-2.3-1.4-2.3 1.4-2.4-1.4-2.4 1.4-2.3-1.4L5 20.5v-17Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const ActivePill: React.FC = () => (
  <>
    <motion.span
      layoutId="nav-pill"
      transition={SPRING_LAYOUT}
      className="absolute inset-0 rounded-md bg-white/[0.06]"
      aria-hidden
    />
    <span
      className="hidden lg:block absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-full bg-accent"
      aria-hidden
    />
  </>
);

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    favorites,
    playlists,
    history,
    createPlaylist,
    setActivePlaylistId,
    activePlaylistId,
    setAboutOpen,
    setReceiptOpen,
    desktopVersion,
    updateStatus,
  } = usePlayerStore(
    useShallow((s) => ({
      activeTab: s.activeTab,
      setActiveTab: s.setActiveTab,
      favorites: s.favorites,
      playlists: s.playlists,
      history: s.history,
      createPlaylist: s.createPlaylist,
      setActivePlaylistId: s.setActivePlaylistId,
      activePlaylistId: s.activePlaylistId,
      setAboutOpen: s.setAboutOpen,
      setReceiptOpen: s.setReceiptOpen,
      desktopVersion: s.desktopVersion,
      updateStatus: s.updateStatus,
    }))
  );

  const hasUpdateBadge =
    updateStatus?.phase === 'available' || updateStatus?.phase === 'ready';
  const versionLabel = `v${desktopVersion || APP_VERSION}`;

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');

  // Number keys jump between the main sections
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const map: Record<string, ActiveTab> = {
        '1': 'browse',
        '2': 'explore',
        '3': 'songs',
        '4': 'albums',
        '5': 'artists',
      };
      const tab = map[e.key];
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setActiveTab]);

  const go = (id: ActiveTab) => {
    setActiveTab(id);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createPlaylist(trimmed);
    setName('');
    setIsCreating(false);
    toast(`Created "${trimmed}"`);
  };

  const primary: NavItem[] = [
    { id: 'browse', label: 'Home', icon: <House className="w-6 h-6" /> },
    { id: 'explore', label: 'Explore', icon: <Compass className="w-6 h-6" /> },
  ];

  const library: NavItem[] = [
    { id: 'songs', label: 'Songs', icon: <Music className="w-5 h-5" /> },
    { id: 'albums', label: 'Albums', icon: <Disc3 className="w-5 h-5" /> },
    { id: 'artists', label: 'Artists', icon: <Mic2 className="w-5 h-5" /> },
    { id: 'favorites', label: 'Liked songs', icon: <Heart className="w-5 h-5" />, count: favorites.length },
    { id: 'recent', label: 'Recently played', icon: <Clock className="w-5 h-5" />, count: history.length },
  ];

  const row = (item: NavItem, big = false) => {
    const active = activeTab === item.id && activePlaylistId === null;
    return (
      <button
        key={item.id}
        onClick={() => go(item.id)}
        aria-current={active ? 'page' : undefined}
        aria-label={item.label}
        title={item.label}
        className={`relative w-full flex items-center justify-center lg:justify-start gap-4 lg:px-3 rounded-md transition-colors text-left ${
          big ? 'h-11 text-base font-bold' : 'h-10 text-[15px] font-medium'
        } ${active ? 'text-ink' : 'text-ink-2 hover:text-ink'}`}
      >
        {active && <ActivePill />}
        <span className="relative shrink-0">{item.icon}</span>
        <span className="relative truncate flex-1 hidden lg:block">{item.label}</span>
        {item.count !== undefined && item.count > 0 && (
          <span className="relative text-xs text-ink-3 tabular-nums hidden lg:inline">{item.count}</span>
        )}
      </button>
    );
  };

  // Desktop / tablet rail
  return (
    <aside className="hidden md:flex w-[68px] lg:w-[244px] shrink-0 h-full bg-base border-r border-line flex-col overflow-hidden select-none">
      <div className="px-3 lg:px-5 h-16 flex items-center justify-center lg:justify-start gap-2.5 border-b border-line shrink-0">
        <OhmLogo className="w-7 h-7 shrink-0" />
        <span className="hidden lg:inline text-[22px] leading-none font-bold tracking-[-0.04em] text-ink">
          ohm
        </span>
      </div>

      <nav className="px-2 pt-3 space-y-0.5" aria-label="Primary">
        {primary.map((i) => row(i, true))}
      </nav>

      <div className="mt-4 mx-2 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-center lg:justify-between lg:px-3 h-10 shrink-0">
          <span className="text-sm font-bold text-ink-2 hidden lg:inline">Your library</span>
          <button
            onClick={() => setIsCreating((v) => !v)}
            aria-label="Create playlist"
            aria-expanded={isCreating}
            className="w-8 h-8 rounded-md flex items-center justify-center text-ink-2 hover:text-ink hover:bg-white/10 transition-colors"
          >
            <motion.span
              animate={{ rotate: isCreating ? 45 : 0 }}
              transition={SPRING}
              className="flex"
            >
              <Plus className="w-5 h-5" />
            </motion.span>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isCreating && (
            <motion.form
              onSubmit={submit}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="px-2 overflow-hidden shrink-0"
            >
              <div className="pb-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => {
                    if (!name.trim()) setIsCreating(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setName('');
                      setIsCreating(false);
                    }
                  }}
                  placeholder="Playlist name"
                  aria-label="Playlist name"
                  className="w-full h-9 px-3 text-sm bg-hover rounded-md text-ink placeholder:text-ink-3 focus:ring-1 focus:ring-ink-2"
                />
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <nav className="flex-1 min-h-0 overflow-y-auto space-y-0.5 pb-2" aria-label="Library">
          {library.map((i) => row(i))}

          {playlists.length > 0 && <div className="h-px bg-line mx-3 my-2" />}

          {playlists.map((pl) => {
            const active = activePlaylistId === pl.id;
            return (
              <button
                key={pl.id}
                onClick={() => setActivePlaylistId(pl.id)}
                aria-current={active ? 'page' : undefined}
                aria-label={pl.name}
                title={pl.name}
                className={`relative w-full h-10 lg:px-3 rounded-md flex items-center justify-center lg:justify-start gap-4 text-[15px] font-medium text-left transition-colors ${
                  active ? 'text-ink' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {active && <ActivePill />}
                <ListMusic className="relative w-5 h-5 shrink-0" />
                <span className="relative truncate flex-1 hidden lg:block">{pl.name}</span>
                <span className="relative text-xs text-ink-3 tabular-nums hidden lg:inline">{pl.tracks.length}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-2 py-2.5 border-t border-line shrink-0 space-y-0.5">
        <button
          type="button"
          onClick={() => setReceiptOpen(true)}
          aria-label="Open Sound Receipt"
          title="Sound receipt"
          className="relative w-full h-10 lg:px-3 rounded-md flex items-center justify-center lg:justify-start gap-4 text-[14px] font-medium text-ink-2 hover:text-ink hover:bg-white/[0.04] transition-colors"
        >
          <ReceiptIcon className="w-[18px] h-[18px] shrink-0 text-accent" />
          <span className="relative truncate flex-1 text-left hidden lg:block">Sound receipt</span>
        </button>
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          aria-label="About Ohm and updates"
          title={`About Ohm (${versionLabel})`}
          className="relative w-full h-10 lg:px-3 rounded-md flex items-center justify-center lg:justify-start gap-4 text-[14px] font-medium text-ink-2 hover:text-ink hover:bg-white/[0.04] transition-colors"
        >
          <span className="relative shrink-0">
            <Info className="w-[18px] h-[18px]" />
            {hasUpdateBadge && (
              <span
                className="lg:hidden absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent ring-2 ring-base"
                aria-hidden
              />
            )}
          </span>
          <span className="relative truncate flex-1 text-left hidden lg:block">About</span>
          <span className="relative hidden lg:inline-flex items-center gap-1.5 text-[11px] text-ink-3 tabular-nums">
            {hasUpdateBadge && <span className="w-2 h-2 rounded-full bg-accent" aria-hidden />}
            {versionLabel}
          </span>
        </button>
      </div>
    </aside>
  );
};

/**
 * Compact mobile bottom navigation + Library sheet shown below md (< 768px)
 * so narrow viewports keep 100% horizontal space for the main canvas.
 */
export const MobileNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    favorites,
    playlists,
    history,
    createPlaylist,
    setActivePlaylistId,
    activePlaylistId,
    setAboutOpen,
    setReceiptOpen,
    desktopVersion,
    updateStatus,
  } = usePlayerStore(
    useShallow((s) => ({
      activeTab: s.activeTab,
      setActiveTab: s.setActiveTab,
      favorites: s.favorites,
      playlists: s.playlists,
      history: s.history,
      createPlaylist: s.createPlaylist,
      setActivePlaylistId: s.setActivePlaylistId,
      activePlaylistId: s.activePlaylistId,
      setAboutOpen: s.setAboutOpen,
      setReceiptOpen: s.setReceiptOpen,
      desktopVersion: s.desktopVersion,
      updateStatus: s.updateStatus,
    }))
  );

  const hasUpdateBadge =
    updateStatus?.phase === 'available' || updateStatus?.phase === 'ready';
  const versionLabel = `v${desktopVersion || APP_VERSION}`;

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!libraryOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLibraryOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [libraryOpen]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createPlaylist(trimmed);
    setName('');
    setIsCreating(false);
    setLibraryOpen(false);
    toast(`Created "${trimmed}"`);
  };

  const primaryTabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'browse', label: 'Home', icon: <House className="w-4 h-4" /> },
    { id: 'explore', label: 'Explore', icon: <Compass className="w-4 h-4" /> },
    { id: 'songs', label: 'Songs', icon: <Music className="w-4 h-4" /> },
    { id: 'albums', label: 'Albums', icon: <Disc3 className="w-4 h-4" /> },
  ];

  const isLibraryActive =
    activePlaylistId !== null ||
    activeTab === 'artists' ||
    activeTab === 'favorites' ||
    activeTab === 'recent';

  return (
    <>
      <AnimatePresence>
        {libraryOpen && (
          <>
            <motion.div
              key="mob-lib-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setLibraryOpen(false)}
              className="md:hidden fixed inset-0 z-30 bg-black/60"
            />
            <motion.div
              key="mob-lib-sheet"
              role="dialog"
              aria-label="Your library"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="md:hidden fixed inset-x-2 bottom-[132px] z-30 max-h-[60vh] rounded-lg bg-surface border border-line flex flex-col overflow-hidden"
            >
              <div className="px-4 h-12 border-b border-line flex items-center justify-between shrink-0">
                <span className="text-sm font-semibold text-ink">Your library</span>
                <button
                  onClick={() => setIsCreating((v) => !v)}
                  aria-label="Create playlist"
                  className="h-7 px-2.5 rounded-md bg-raised hover:bg-hover text-xs font-medium text-ink inline-flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New playlist
                </button>
              </div>

              {isCreating && (
                <form onSubmit={submit} className="px-3 py-2 border-b border-line shrink-0">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Playlist name"
                    className="w-full h-9 px-3 text-sm bg-hover rounded-md text-ink placeholder:text-ink-3"
                  />
                </form>
              )}

              <div className="overflow-y-auto p-2 space-y-0.5">
                {[
                  { id: 'artists' as ActiveTab, label: 'Artists', icon: <Mic2 className="w-4 h-4" /> },
                  {
                    id: 'favorites' as ActiveTab,
                    label: 'Liked songs',
                    icon: <Heart className="w-4 h-4" />,
                    count: favorites.length,
                  },
                  {
                    id: 'recent' as ActiveTab,
                    label: 'Recently played',
                    icon: <Clock className="w-4 h-4" />,
                    count: history.length,
                  },
                ].map((item) => {
                  const active = activeTab === item.id && activePlaylistId === null;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setLibraryOpen(false);
                      }}
                      className={`w-full h-10 px-3 rounded-md flex items-center gap-3 text-sm font-medium transition-colors ${
                        active ? 'bg-raised text-ink' : 'text-ink-2 hover:text-ink hover:bg-white/[0.04]'
                      }`}
                    >
                      {item.icon}
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.count !== undefined && item.count > 0 && (
                        <span className="text-xs text-ink-3 tabular-nums">{item.count}</span>
                      )}
                    </button>
                  );
                })}

                {playlists.length > 0 && <div className="h-px bg-line my-1.5" />}

                {playlists.map((pl) => {
                  const active = activePlaylistId === pl.id;
                  return (
                    <button
                      key={pl.id}
                      onClick={() => {
                        setActivePlaylistId(pl.id);
                        setLibraryOpen(false);
                      }}
                      className={`w-full h-10 px-3 rounded-md flex items-center gap-3 text-sm font-medium transition-colors ${
                        active ? 'bg-raised text-ink' : 'text-ink-2 hover:text-ink hover:bg-white/[0.04]'
                      }`}
                    >
                      <ListMusic className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left truncate">{pl.name}</span>
                      <span className="text-xs text-ink-3 tabular-nums">{pl.tracks.length}</span>
                    </button>
                  );
                })}

                <div className="h-px bg-line my-1.5" />
                <button
                  type="button"
                  onClick={() => {
                    setLibraryOpen(false);
                    setReceiptOpen(true);
                  }}
                  className="w-full h-10 px-3 rounded-md flex items-center gap-3 text-sm font-medium text-ink-2 hover:text-ink hover:bg-white/[0.04] transition-colors"
                >
                  <ReceiptIcon className="w-4 h-4 shrink-0 text-accent" />
                  <span className="flex-1 text-left truncate">Sound receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLibraryOpen(false);
                    setAboutOpen(true);
                  }}
                  className="w-full h-10 px-3 rounded-md flex items-center gap-3 text-sm font-medium text-ink-2 hover:text-ink hover:bg-white/[0.04] transition-colors"
                >
                  <Info className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left truncate">About & Updates</span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-ink-3 tabular-nums">
                    {hasUpdateBadge && <span className="w-2 h-2 rounded-full bg-accent" aria-hidden />}
                    {versionLabel}
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        aria-label="Mobile navigation"
        className="md:hidden h-12 shrink-0 bg-base border-t border-line px-2 grid grid-cols-5 items-center select-none"
      >
        {primaryTabs.map((item) => {
          const active = activeTab === item.id && activePlaylistId === null && !libraryOpen;
          return (
            <button
              key={item.id}
              onClick={() => {
                setLibraryOpen(false);
                setActiveTab(item.id);
              }}
              aria-current={active ? 'page' : undefined}
              className={`h-10 flex flex-col items-center justify-center gap-0.5 rounded-md text-[10px] font-medium transition-colors ${
                active ? 'text-accent' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setLibraryOpen((v) => !v)}
          aria-expanded={libraryOpen}
          className={`h-10 flex flex-col items-center justify-center gap-0.5 rounded-md text-[10px] font-medium transition-colors ${
            libraryOpen || isLibraryActive ? 'text-accent' : 'text-ink-2 hover:text-ink'
          }`}
        >
          <ListMusic className="w-4 h-4" />
          <span>Library</span>
        </button>
      </nav>
    </>
  );
};
