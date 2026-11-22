import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Disc3, ListMusic, Loader2, Mic2, Pause, Play } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import {
  ExplorePlaylistCard,
  ExploreReleaseCard,
  RelatedArtistCard,
  SearchTab,
  SearchTopResult,
  Track,
  usePlayerStore,
} from '../../store/usePlayerStore';
import { toast } from '../../store/useToastStore';
import { gridVariants, SPRING, SPRING_LAYOUT } from '../../utils/motion';
import { MediaCard } from '../MediaCard';
import { PosterArt, TrackArtwork, TrackRow } from '../TrackCard';

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3';

const SEARCH_TABS: { id: SearchTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'songs', label: 'Songs' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'playlists', label: 'Playlists' },
];

const RowsSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div aria-busy="true" aria-label="Loading songs">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-4 h-14 px-4 animate-pulse"
        style={{ animationDelay: `${i * 75}ms` }}
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

const GridSkeleton: React.FC<{ round?: boolean; count?: number }> = ({
  round = false,
  count = 12,
}) => (
  <div className={GRID} aria-busy="true" aria-label="Loading results">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="space-y-2.5 p-2.5">
        <div
          className={`aspect-square bg-raised animate-pulse ${
            round ? 'rounded-full' : 'rounded-md'
          }`}
        />
        <div className="h-3.5 w-3/4 rounded-sm bg-raised animate-pulse" />
        <div className="h-3 w-1/2 rounded-sm bg-raised animate-pulse" />
      </div>
    ))}
  </div>
);

const AllOverviewSkeleton: React.FC = () => (
  <div className="space-y-8" aria-busy="true" aria-label="Loading search overview">
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] gap-6">
      <div className="h-56 rounded-lg bg-surface border border-line animate-pulse" />
      <RowsSkeleton count={5} />
    </div>
    <GridSkeleton count={6} />
  </div>
);

const ShelfHeader: React.FC<{ title: string; onSeeAll?: () => void }> = ({ title, onSeeAll }) => (
  <div className="flex items-baseline justify-between mb-4">
    <h2 className="text-xl font-semibold tracking-[-0.02em]">{title}</h2>
    {onSeeAll && (
      <button
        type="button"
        onClick={onSeeAll}
        className="text-xs font-medium text-ink-2 hover:text-ink transition-colors"
      >
        See all
      </button>
    )}
  </div>
);

export const SearchView: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    searchQuery,
    searchTab,
    searchTopResult,
    searchResults,
    searchAlbums,
    searchArtists,
    searchPlaylists,
    searchHasMore,
    isSearching,
    isLoadingMoreSearch,
    searchError,
    performSearch,
    setSearchTab,
    loadMoreSearch,
    clearSearch,
    playTrack,
    togglePlay,
    openCollection,
    openArtist,
  } = usePlayerStore(
    useShallow((s) => ({
      currentTrack: s.currentTrack,
      isPlaying: s.isPlaying,
      searchQuery: s.searchQuery,
      searchTab: s.searchTab,
      searchTopResult: s.searchTopResult,
      searchResults: s.searchResults,
      searchAlbums: s.searchAlbums,
      searchArtists: s.searchArtists,
      searchPlaylists: s.searchPlaylists,
      searchHasMore: s.searchHasMore,
      isSearching: s.isSearching,
      isLoadingMoreSearch: s.isLoadingMoreSearch,
      searchError: s.searchError,
      performSearch: s.performSearch,
      setSearchTab: s.setSearchTab,
      loadMoreSearch: s.loadMoreSearch,
      clearSearch: s.clearSearch,
      playTrack: s.playTrack,
      togglePlay: s.togglePlay,
      openCollection: s.openCollection,
      openArtist: s.openArtist,
    }))
  );

  const [busyPlayId, setBusyPlayId] = useState<string | null>(null);
  const playAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      playAbortRef.current?.abort();
    };
  }, []);

  const playRemoteTracks = async (
    id: string,
    endpoint: string,
    pickTracks: (data: any) => Track[],
    onFallbackOpen: () => void
  ) => {
    if (busyPlayId === id) return;
    playAbortRef.current?.abort();
    const ctrl = new AbortController();
    playAbortRef.current = ctrl;
    setBusyPlayId(id);
    try {
      const res = await fetch(endpoint, { signal: ctrl.signal });
      if (!res.ok) throw new Error('Collection request failed');
      const data = await res.json();
      if (ctrl.signal.aborted) return;
      const list = pickTracks(data);
      if (list.length > 0) {
        playTrack(list[0], list.slice(1));
      } else {
        onFallbackOpen();
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        toast("Couldn't start playback");
      }
    } finally {
      if (!ctrl.signal.aborted) setBusyPlayId(null);
    }
  };

  const openAlbum = (alb: ExploreReleaseCard) => {
    openCollection({
      title: alb.title,
      kind: alb.kind,
      albumId: alb.id,
      artist: alb.artist,
      year: alb.year,
      thumbnail: alb.thumbnail,
      tracks: [],
    });
  };

  const playAlbum = (alb: ExploreReleaseCard) => {
    if (currentTrack && currentTrack.albumId === alb.id) {
      togglePlay();
      return;
    }
    void playRemoteTracks(
      alb.id,
      `/api/album?id=${encodeURIComponent(alb.id)}`,
      (d) => d.tracks || [],
      () => openAlbum(alb)
    );
  };

  const openPlaylist = (pl: ExplorePlaylistCard) => {
    openCollection({
      title: pl.title,
      kind: 'Playlist',
      playlistId: pl.id,
      subtitle: pl.subtitle,
      thumbnail: pl.thumbnail,
      tracks: [],
    });
  };

  const playPlaylist = (pl: ExplorePlaylistCard) => {
    void playRemoteTracks(
      pl.id,
      `/api/playlist?id=${encodeURIComponent(pl.id)}`,
      (d) => d.tracks || [],
      () => openPlaylist(pl)
    );
  };

  const playArtistTop = (art: RelatedArtistCard) => {
    void playRemoteTracks(
      art.id,
      `/api/artist?id=${encodeURIComponent(art.id)}&name=${encodeURIComponent(art.name)}`,
      (d) => d.topSongs || [],
      () => openArtist(art.name, art.id)
    );
  };

  const activeCount =
    searchTab === 'songs'
      ? searchResults.length
      : searchTab === 'albums'
      ? searchAlbums.length
      : searchTab === 'artists'
      ? searchArtists.length
      : searchTab === 'playlists'
      ? searchPlaylists.length
      : searchResults.length + searchAlbums.length + searchArtists.length + searchPlaylists.length;

  const isEmptyAll =
    !searchTopResult &&
    searchResults.length === 0 &&
    searchAlbums.length === 0 &&
    searchArtists.length === 0 &&
    searchPlaylists.length === 0;

  const isTabEmpty =
    searchTab === 'all'
      ? isEmptyAll
      : searchTab === 'songs'
      ? searchResults.length === 0
      : searchTab === 'albums'
      ? searchAlbums.length === 0
      : searchTab === 'artists'
      ? searchArtists.length === 0
      : searchPlaylists.length === 0;

  const renderTopResultCard = (top: SearchTopResult) => {
    const isRound = top.kind === 'artist';
    const title =
      top.kind === 'song'
        ? top.track.title
        : top.kind === 'album'
        ? top.album.title
        : top.kind === 'artist'
        ? top.artist.name
        : top.playlist.title;
    const thumb =
      top.kind === 'song'
        ? top.track.thumbnail
        : top.kind === 'album'
        ? top.album.thumbnail
        : top.kind === 'artist'
        ? top.artist.thumbnail
        : top.playlist.thumbnail;
    const badge =
      top.kind === 'song'
        ? 'Song'
        : top.kind === 'album'
        ? top.album.kind
        : top.kind === 'artist'
        ? 'Artist'
        : 'Playlist';
    const itemId =
      top.kind === 'song'
        ? top.track.id
        : top.kind === 'album'
        ? top.album.id
        : top.kind === 'artist'
        ? top.artist.id
        : top.playlist.id;

    const playingTop =
      (top.kind === 'song' && currentTrack?.id === top.track.id && isPlaying) ||
      (top.kind === 'album' && currentTrack?.albumId === top.album.id && isPlaying) ||
      (top.kind === 'artist' && currentTrack?.artistId === top.artist.id && isPlaying);

    const onOpenTop = () => {
      if (top.kind === 'song') {
        if (currentTrack?.id === top.track.id) togglePlay();
        else playTrack(top.track, searchResults.filter((t) => t.id !== top.track.id));
      } else if (top.kind === 'album') {
        openAlbum(top.album);
      } else if (top.kind === 'artist') {
        openArtist(top.artist.name, top.artist.id);
      } else {
        openPlaylist(top.playlist);
      }
    };

    const onPlayTop = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (top.kind === 'song') {
        if (currentTrack?.id === top.track.id) togglePlay();
        else playTrack(top.track, searchResults.filter((t) => t.id !== top.track.id));
      } else if (top.kind === 'album') {
        playAlbum(top.album);
      } else if (top.kind === 'artist') {
        playArtistTop(top.artist);
      } else {
        playPlaylist(top.playlist);
      }
    };

    return (
      <div
        onClick={onOpenTop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenTop();
          }
        }}
        className="group relative p-5 rounded-lg bg-surface hover:bg-raised border border-line hover:border-ink-3/60 transition-colors cursor-pointer flex flex-col justify-between gap-5 min-h-[212px]"
      >
        <div className="flex items-start justify-between gap-4">
          <div
            className={`w-24 h-24 shrink-0 overflow-hidden bg-hover ring-1 ring-white/[0.08] ${
              isRound ? 'rounded-full' : 'rounded-md'
            }`}
          >
            {top.kind === 'song' ? (
              <TrackArtwork track={top.track} size="md" />
            ) : (
              <PosterArt src={thumb} title={title} round={isRound} />
            )}
          </div>
          <span className="px-2 py-0.5 rounded-sm bg-base border border-line text-[11px] font-medium text-ink-2">
            {badge}
          </span>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-bold tracking-[-0.02em] text-ink truncate">{title}</h3>
            {top.subtitle && (
              <p className="text-xs text-ink-2 truncate mt-1">{top.subtitle}</p>
            )}
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            transition={SPRING}
            onClick={onPlayTop}
            aria-label={playingTop ? `Pause ${title}` : `Play ${title}`}
            className="w-11 h-11 rounded-full bg-accent hover:bg-accent-hover text-black flex items-center justify-center shrink-0 shadow-lg transition-colors"
          >
            {busyPlayId === itemId ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : playingTop ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current translate-x-[1px]" />
            )}
          </motion.button>
        </div>
      </div>
    );
  };

  const renderAlbumGrid = (items: ExploreReleaseCard[]) => (
    <motion.div className={GRID} variants={gridVariants} initial="hidden" animate="show">
      {items.map((alb) => {
        const playingHere = !!currentTrack && isPlaying && currentTrack.albumId === alb.id;
        return (
          <MediaCard
            key={alb.id}
            artwork={<PosterArt src={alb.thumbnail} title={alb.title} />}
            title={alb.title}
            subtitle={[alb.kind, alb.artist, alb.year].filter(Boolean).join(' · ')}
            isPlaying={playingHere}
            onOpen={() => openAlbum(alb)}
            onPlay={() => playAlbum(alb)}
            contextActions={[
              {
                id: 'play',
                label: playingHere ? 'Pause' : 'Play release',
                icon: playingHere ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />,
                onSelect: () => playAlbum(alb),
              },
              {
                id: 'open',
                label: 'View tracklist',
                icon: <Disc3 className="w-4 h-4" />,
                onSelect: () => openAlbum(alb),
              },
            ]}
          />
        );
      })}
    </motion.div>
  );

  const renderArtistGrid = (items: RelatedArtistCard[]) => (
    <motion.div className={GRID} variants={gridVariants} initial="hidden" animate="show">
      {items.map((art) => {
        const playingHere = !!currentTrack && isPlaying && currentTrack.artistId === art.id;
        return (
          <MediaCard
            key={art.id}
            round
            artwork={<PosterArt src={art.thumbnail} title={art.name} round />}
            title={art.name}
            subtitle={art.subtitle || 'Artist'}
            isPlaying={playingHere}
            onOpen={() => openArtist(art.name, art.id)}
            onPlay={() => playArtistTop(art)}
            contextActions={[
              {
                id: 'play',
                label: 'Play top songs',
                icon: <Play className="w-4 h-4" />,
                onSelect: () => playArtistTop(art),
              },
              {
                id: 'open',
                label: 'Go to artist',
                icon: <Mic2 className="w-4 h-4" />,
                onSelect: () => openArtist(art.name, art.id),
              },
            ]}
          />
        );
      })}
    </motion.div>
  );

  const renderPlaylistGrid = (items: ExplorePlaylistCard[]) => (
    <motion.div className={GRID} variants={gridVariants} initial="hidden" animate="show">
      {items.map((pl) => (
        <MediaCard
          key={pl.id}
          artwork={<PosterArt src={pl.thumbnail} title={pl.title} />}
          title={pl.title}
          subtitle={pl.subtitle || 'Playlist'}
          onOpen={() => openPlaylist(pl)}
          onPlay={() => playPlaylist(pl)}
          contextActions={[
            {
              id: 'play',
              label: 'Play playlist',
              icon: <Play className="w-4 h-4" />,
              onSelect: () => playPlaylist(pl),
            },
            {
              id: 'open',
              label: 'View tracklist',
              icon: <ListMusic className="w-4 h-4" />,
              onSelect: () => openPlaylist(pl),
            },
          ]}
        />
      ))}
    </motion.div>
  );

  const onTabListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = SEARCH_TABS.findIndex((t) => t.id === searchTab);
    const nextIdx =
      e.key === 'ArrowRight'
        ? (idx + 1) % SEARCH_TABS.length
        : (idx - 1 + SEARCH_TABS.length) % SEARCH_TABS.length;
    void setSearchTab(SEARCH_TABS[nextIdx].id);
  };

  const loadMoreLabel =
    searchTab === 'songs'
      ? 'Load more songs'
      : searchTab === 'albums'
      ? 'Load more albums'
      : searchTab === 'artists'
      ? 'Load more artists'
      : 'Load more playlists';

  return (
    <section className="px-6 pt-3 pb-10 space-y-6">
      {/* Header + Category Filter Pills */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="text-2xl font-bold truncate">Results for “{searchQuery}”</h1>
            {!isSearching && searchTab !== 'all' && activeCount > 0 && (
              <span className="text-xs text-ink-3 tabular-nums shrink-0">
                {activeCount}{' '}
                {activeCount === 1 ? searchTab.slice(0, -1) : searchTab}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={clearSearch}
            className="text-sm font-bold text-ink-2 hover:text-ink hover:underline transition-colors shrink-0"
          >
            Clear
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Search categories"
          onKeyDown={onTabListKeyDown}
          className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {SEARCH_TABS.map((tab) => {
            const active = searchTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => void setSearchTab(tab.id)}
                className={`relative h-8 px-3.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                  active
                    ? 'text-ink'
                    : 'text-ink-2 hover:text-ink bg-surface/60 hover:bg-surface border border-line/70'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="search-tab-pill"
                    transition={SPRING_LAYOUT}
                    className="absolute inset-0 rounded-md bg-raised border border-ink-3/50"
                    aria-hidden
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      {isSearching ? (
        searchTab === 'all' ? (
          <AllOverviewSkeleton />
        ) : searchTab === 'songs' ? (
          <RowsSkeleton />
        ) : (
          <GridSkeleton round={searchTab === 'artists'} />
        )
      ) : searchError ? (
        <div className="py-16 text-center">
          <p className="text-lg font-bold">Search is unavailable</p>
          <p className="text-sm text-ink-2 mt-1">
            Could not reach the server. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => void performSearch(searchQuery, searchTab)}
            className="mt-5 h-9 px-5 rounded-md bg-ink text-black text-sm font-semibold hover:bg-white transition-colors"
          >
            Try again
          </button>
        </div>
      ) : isTabEmpty ? (
        <div className="py-16 text-center">
          <p className="text-lg font-bold">
            No {searchTab === 'all' ? 'results' : searchTab} found for “{searchQuery}”
          </p>
          <p className="text-sm text-ink-2 mt-1">
            {searchTab === 'all'
              ? 'Check the spelling or try a different search.'
              : 'Try switching back to All or searching something else.'}
          </p>
          {searchTab !== 'all' && (
            <button
              type="button"
              onClick={() => void setSearchTab('all')}
              className="mt-5 h-9 px-4 rounded-md bg-surface hover:bg-hover border border-line text-xs font-medium text-ink transition-colors"
            >
              Show all categories
            </button>
          )}
        </div>
      ) : searchTab === 'all' ? (
        <div className="space-y-10">
          {(searchTopResult || searchResults.length > 0) && (
            <div
              className={
                searchTopResult && searchResults.length > 0
                  ? 'grid grid-cols-1 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] gap-6 items-start'
                  : 'space-y-4'
              }
            >
              {searchTopResult && (
                <section aria-label="Top result">
                  <ShelfHeader title="Top result" />
                  {renderTopResultCard(searchTopResult)}
                </section>
              )}

              {searchResults.length > 0 && (
                <section aria-label="Songs">
                  <ShelfHeader
                    title="Songs"
                    onSeeAll={() => void setSearchTab('songs')}
                  />
                  <div>
                    {searchResults.slice(0, 5).map((track, i) => (
                      <TrackRow
                        key={`${track.id}-${i}`}
                        track={track}
                        index={i}
                        contextQueue={searchResults}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {searchAlbums.length > 0 && (
            <section aria-label="Albums">
              <ShelfHeader
                title="Albums & singles"
                onSeeAll={() => void setSearchTab('albums')}
              />
              {renderAlbumGrid(searchAlbums.slice(0, 6))}
            </section>
          )}

          {searchArtists.length > 0 && (
            <section aria-label="Artists">
              <ShelfHeader
                title="Artists"
                onSeeAll={() => void setSearchTab('artists')}
              />
              {renderArtistGrid(searchArtists.slice(0, 6))}
            </section>
          )}

          {searchPlaylists.length > 0 && (
            <section aria-label="Playlists">
              <ShelfHeader
                title="Playlists"
                onSeeAll={() => void setSearchTab('playlists')}
              />
              {renderPlaylistGrid(searchPlaylists.slice(0, 6))}
            </section>
          )}
        </div>
      ) : searchTab === 'songs' ? (
        <div>
          {searchResults.map((track, i) => (
            <TrackRow
              key={`${track.id}-${i}`}
              track={track}
              index={i}
              contextQueue={searchResults}
            />
          ))}
        </div>
      ) : searchTab === 'albums' ? (
        renderAlbumGrid(searchAlbums)
      ) : searchTab === 'artists' ? (
        renderArtistGrid(searchArtists)
      ) : (
        renderPlaylistGrid(searchPlaylists)
      )}

      {searchTab !== 'all' && searchHasMore && !isSearching && !searchError && (
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            disabled={isLoadingMoreSearch}
            onClick={() => void loadMoreSearch()}
            className="h-9 px-5 rounded-md bg-surface hover:bg-hover border border-line text-xs font-medium text-ink inline-flex items-center gap-2 disabled:opacity-60 transition-colors"
          >
            {isLoadingMoreSearch && <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />}
            <span>{isLoadingMoreSearch ? 'Loading more...' : loadMoreLabel}</span>
          </button>
        </div>
      )}

      {busyPlayId && (
        <div className="fixed bottom-24 right-6 z-40 h-9 px-3.5 rounded-md bg-raised border border-line shadow-xl flex items-center gap-2 text-xs text-ink-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
          <span>Loading tracks...</span>
        </div>
      )}
    </section>
  );
};
