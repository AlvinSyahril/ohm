import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Keyboard } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../store/usePlayerStore';
import { BrowseView } from './views/BrowseView';
import { SearchBox } from './SearchBox';
import { pageVariants } from '../utils/motion';

const SearchView = lazy(() =>
  import('./views/SearchView').then((m) => ({ default: m.SearchView }))
);

const SongsView = lazy(() =>
  import('./views/SongsView').then((m) => ({ default: m.SongsView }))
);
const AlbumsView = lazy(() =>
  import('./views/AlbumsView').then((m) => ({ default: m.AlbumsView }))
);
const ArtistsView = lazy(() =>
  import('./views/ArtistsView').then((m) => ({ default: m.ArtistsView }))
);
const ArtistView = lazy(() =>
  import('./views/ArtistView').then((m) => ({ default: m.ArtistView }))
);
const ExploreView = lazy(() =>
  import('./views/ExploreView').then((m) => ({ default: m.ExploreView }))
);

const SkeletonRows: React.FC = () => (
  <div aria-hidden>
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-4 h-14 px-4 animate-pulse"
        style={{ animationDelay: `${i * 90}ms` }}
      >
        <div className="w-8 h-3 rounded-sm bg-raised" />
        <div className="w-10 h-10 rounded-sm bg-raised shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded-sm bg-raised" style={{ width: `${40 + ((i * 17) % 30)}%` }} />
          <div className="h-3 rounded-sm bg-raised" style={{ width: `${22 + ((i * 11) % 20)}%` }} />
        </div>
      </div>
    ))}
  </div>
);

export const MainCanvas: React.FC = () => {
  const {
    activeTab,
    activePlaylistId,
    collection,
    artistView,
    artistViewId,
    exploreCategory,
    searchQuery,
    navPast,
    navFuture,
    goBack,
    goForward,
    setShortcutsOpen,
  } = usePlayerStore(
    useShallow((s) => ({
      activeTab: s.activeTab,
      activePlaylistId: s.activePlaylistId,
      collection: s.collection,
      artistView: s.artistView,
      artistViewId: s.artistViewId,
      exploreCategory: s.exploreCategory,
      searchQuery: s.searchQuery,
      navPast: s.navPast,
      navFuture: s.navFuture,
      goBack: s.goBack,
      goForward: s.goForward,
      setShortcutsOpen: s.setShortcutsOpen,
    }))
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  const isSongsTab =
    activeTab === 'songs' || activeTab === 'recent' || activeTab === 'favorites' || activeTab === 'local';

  const viewKey = searchQuery
    ? `search:${searchQuery}`
    : collection
    ? `collection:${collection.kind}:${collection.albumId || collection.playlistId || collection.title}`
    : artistView
    ? `artist:${artistViewId || artistView}`
    : activePlaylistId
    ? `playlist:${activePlaylistId}`
    : exploreCategory && activeTab === 'explore'
    ? `explore:${exploreCategory.browseId}:${exploreCategory.params || ''}`
    : activeTab;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [viewKey]);

  const renderView = () => {
    if (searchQuery) return <SearchView />;
    if (collection || isSongsTab || activePlaylistId !== null) return <SongsView />;
    if (artistView) return <ArtistView artistName={artistView} artistId={artistViewId ?? undefined} />;
    if (activeTab === 'browse') return <BrowseView />;
    if (activeTab === 'albums') return <AlbumsView />;
    if (activeTab === 'artists') return <ArtistsView />;
    if (activeTab === 'explore' || activeTab === 'radio') return <ExploreView />;
    return <BrowseView />;
  };

  return (
    <main className="flex-1 min-w-0 h-full bg-canvas flex flex-col overflow-hidden">
      <header className="relative z-30 h-16 px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 border-b border-line">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={goBack}
              disabled={navPast.length === 0}
              aria-label="Go back (Alt+Left)"
              title="Back (Alt+Left)"
              className="w-8 h-8 rounded-md bg-surface border border-line hover:bg-hover disabled:opacity-30 disabled:hover:bg-surface flex items-center justify-center text-ink transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goForward}
              disabled={navFuture.length === 0}
              aria-label="Go forward (Alt+Right)"
              title="Forward (Alt+Right)"
              className="w-8 h-8 rounded-md bg-surface border border-line hover:bg-hover disabled:opacity-30 disabled:hover:bg-surface flex items-center justify-center text-ink transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <SearchBox />
        </div>

        <button
          onClick={() => setShortcutsOpen(true)}
          aria-label="Keyboard shortcuts (?)"
          title="Keyboard shortcuts (?)"
          className="hidden sm:inline-flex w-8 h-8 rounded-md bg-surface border border-line hover:bg-hover items-center justify-center text-ink-2 hover:text-ink transition-colors shrink-0"
        >
          <Keyboard className="w-4 h-4" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <motion.div key={viewKey} variants={pageVariants} initial="initial" animate="enter">
          <Suspense fallback={<SkeletonRows />}>{renderView()}</Suspense>
        </motion.div>
      </div>
    </main>
  );
};
