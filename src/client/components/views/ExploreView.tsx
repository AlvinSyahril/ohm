import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Compass, Disc3, Loader2, TrendingUp } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import {
  ExploreCategoryRef,
  ExplorePlaylistCard,
  ExploreReleaseCard,
  Track,
  usePlayerStore,
} from '../../store/usePlayerStore';
import { toast } from '../../store/useToastStore';
import { MediaCard } from '../MediaCard';
import { ArtistLinks } from '../ArtistLinks';
import { TrackArtwork, TrackRow, upgradeThumbnail } from '../TrackCard';
import { gridVariants, itemVariants, SPRING } from '../../utils/motion';

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3';

const PosterArt: React.FC<{ src?: string; title: string; round?: boolean }> = ({
  src,
  title,
  round = false,
}) => {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setBroken(false);
    setLoaded(false);
  }, [src]);

  if (!src || broken) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center bg-hover text-ink-2 text-lg font-bold select-none ${
          round ? 'rounded-full' : ''
        }`}
      >
        {title.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      key={src}
      ref={(el) => {
        if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
      }}
      src={upgradeThumbnail(src, undefined, 'md')}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={() => setLoaded(true)}
      onError={() => {
        setLoaded(false);
        setBroken(true);
      }}
      className={`w-full h-full object-cover transition-opacity duration-500 ${
        loaded ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );
};

const CategorySkeleton: React.FC<{ browseId: string }> = ({ browseId }) => {
  if (browseId === 'FEmusic_moods_and_genres') {
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Loading moods and genres">
        {[1, 2].map((g) => (
          <div key={g} className="space-y-4">
            <div className="h-5 w-40 rounded-sm bg-raised animate-pulse" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 14 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 rounded-md bg-raised animate-pulse"
                  style={{ width: `${72 + ((i * 23) % 56)}px` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading category">
      <div className={GRID}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2.5 p-2.5">
            <div className="aspect-square rounded-md bg-raised animate-pulse" />
            <div className="h-3.5 w-3/4 rounded-sm bg-raised animate-pulse" />
            <div className="h-3 w-1/2 rounded-sm bg-raised animate-pulse" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-md bg-raised/60 animate-pulse" />
        ))}
      </div>
    </div>
  );
};

const ExploreSkeleton: React.FC = () => (
  <div className="space-y-8" aria-busy="true" aria-label="Loading explore">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-14 rounded-md bg-raised animate-pulse" />
      ))}
    </div>
    <div className={GRID}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2.5 p-2.5">
          <div className="aspect-square rounded-md bg-raised animate-pulse" />
          <div className="h-3.5 w-3/4 rounded-sm bg-raised animate-pulse" />
          <div className="h-3 w-1/2 rounded-sm bg-raised animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

const linkIcon = (browseId: string) => {
  if (browseId.includes('new_releases')) return <Disc3 className="w-4 h-4 text-accent shrink-0" />;
  if (browseId.includes('charts')) return <TrendingUp className="w-4 h-4 text-accent shrink-0" />;
  return <Compass className="w-4 h-4 text-accent shrink-0" />;
};

export const ExploreView: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    exploreFeed,
    isLoadingExplore,
    hasFetchedExplore,
    exploreCategory,
    exploreCategoryData,
    isLoadingExploreCategory,
    fetchExploreFeed,
    openExploreCategory,
    clearExploreCategory,
    openCollection,
    openArtist,
    playTrack,
    togglePlay,
  } = usePlayerStore(
    useShallow((s) => ({
      currentTrack: s.currentTrack,
      isPlaying: s.isPlaying,
      exploreFeed: s.exploreFeed,
      isLoadingExplore: s.isLoadingExplore,
      hasFetchedExplore: s.hasFetchedExplore,
      exploreCategory: s.exploreCategory,
      exploreCategoryData: s.exploreCategoryData,
      isLoadingExploreCategory: s.isLoadingExploreCategory,
      fetchExploreFeed: s.fetchExploreFeed,
      openExploreCategory: s.openExploreCategory,
      clearExploreCategory: s.clearExploreCategory,
      openCollection: s.openCollection,
      openArtist: s.openArtist,
      playTrack: s.playTrack,
      togglePlay: s.togglePlay,
    }))
  );

  const [busyPlayId, setBusyPlayId] = useState<string | null>(null);
  const playAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!hasFetchedExplore) fetchExploreFeed();
  }, [hasFetchedExplore, fetchExploreFeed]);

  useEffect(() => {
    return () => {
      playAbortRef.current?.abort();
    };
  }, []);

  const openRelease = (rel: ExploreReleaseCard) => {
    openCollection({
      title: rel.title,
      kind: rel.kind,
      albumId: rel.id,
      artist: rel.artist,
      year: rel.year,
      thumbnail: rel.thumbnail,
      tracks: [],
    });
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

  const playRemoteCollection = async (
    id: string,
    endpoint: string,
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
      const data = (await res.json()) as { tracks?: Track[] };
      if (ctrl.signal.aborted) return;
      const list = data.tracks || [];
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

  const quickLinks: ExploreCategoryRef[] =
    exploreFeed?.quickLinks && exploreFeed.quickLinks.length > 0
      ? exploreFeed.quickLinks
      : [
          { title: 'New releases', browseId: 'FEmusic_new_releases' },
          { title: 'Charts', browseId: 'FEmusic_charts', params: 'sgYPRkVtdXNpY19leHBsb3Jl' },
          { title: 'Moods & genres', browseId: 'FEmusic_moods_and_genres' },
        ];

  if (exploreCategory) {
    const data = exploreCategoryData;
    const isEmpty =
      data &&
      data.playlistShelves.length === 0 &&
      data.releases.length === 0 &&
      data.tracks.length === 0 &&
      data.artists.length === 0 &&
      data.moodGroups.length === 0;

    return (
      <div className="px-6 pb-12 space-y-8">
        <div className="pt-2 pb-2">
          <button
            type="button"
            onClick={clearExploreCategory}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-2 hover:text-ink mb-3 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Explore</span>
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em]">
            {data?.title || exploreCategory.title}
          </h1>
        </div>

        {isLoadingExploreCategory && !data ? (
          <CategorySkeleton browseId={exploreCategory.browseId} />
        ) : !data || isEmpty ? (
          <div className="py-16 text-center">
            <p className="text-base font-semibold">Nothing found in this category</p>
            <p className="text-sm text-ink-2 mt-1">
              Try another mood or return to Explore.
            </p>
          </div>
        ) : (
          <>
            {data.moodGroups.map((group) => (
              <section key={group.heading}>
                <h2 className="text-xl font-semibold tracking-[-0.02em] mb-4">
                  {group.heading}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((mood) => (
                    <motion.button
                      key={`${mood.title}-${mood.params || ''}`}
                      whileTap={{ scale: 0.96 }}
                      transition={SPRING}
                      onClick={() => openExploreCategory(mood)}
                      className="h-9 px-4 rounded-md bg-surface hover:bg-hover border border-line hover:border-ink-3 text-xs font-medium text-ink-2 hover:text-ink transition-colors"
                    >
                      {mood.title}
                    </motion.button>
                  ))}
                </div>
              </section>
            ))}

            {data.releases.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold tracking-[-0.02em] mb-4">
                  Albums &amp; singles
                </h2>
                <motion.div
                  className={GRID}
                  variants={gridVariants}
                  initial="hidden"
                  animate="show"
                >
                  {data.releases.slice(0, 18).map((rel) => (
                    <MediaCard
                      key={rel.id}
                      artwork={<PosterArt src={rel.thumbnail} title={rel.title} />}
                      title={rel.title}
                      subtitle={[rel.kind, rel.artist].filter(Boolean).join(' · ')}
                      onOpen={() => openRelease(rel)}
                      onPlay={() =>
                        playRemoteCollection(
                          rel.id,
                          `/api/album?id=${encodeURIComponent(rel.id)}`,
                          () => openRelease(rel)
                        )
                      }
                    />
                  ))}
                </motion.div>
              </section>
            )}

            {data.playlistShelves.map((shelf) => (
              <section key={shelf.heading}>
                <h2 className="text-xl font-semibold tracking-[-0.02em] mb-4">
                  {shelf.heading}
                </h2>
                <motion.div
                  className={GRID}
                  variants={gridVariants}
                  initial="hidden"
                  animate="show"
                >
                  {shelf.items.slice(0, 18).map((pl) => (
                    <MediaCard
                      key={pl.id}
                      artwork={<PosterArt src={pl.thumbnail} title={pl.title} />}
                      title={pl.title}
                      subtitle={pl.subtitle}
                      onOpen={() => openPlaylist(pl)}
                      onPlay={() =>
                        playRemoteCollection(
                          pl.id,
                          `/api/playlist?id=${encodeURIComponent(pl.id)}`,
                          () => openPlaylist(pl)
                        )
                      }
                    />
                  ))}
                </motion.div>
              </section>
            ))}

            {data.artists.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold tracking-[-0.02em] mb-4">
                  Top artists
                </h2>
                <motion.div
                  className={GRID}
                  variants={gridVariants}
                  initial="hidden"
                  animate="show"
                >
                  {data.artists.slice(0, 12).map((art) => (
                    <MediaCard
                      key={art.id}
                      round
                      artwork={<PosterArt src={art.thumbnail} title={art.name} round />}
                      title={art.name}
                      subtitle={art.subtitle || 'Artist'}
                      onOpen={() => openArtist(art.name, art.id)}
                      onPlay={() => openArtist(art.name, art.id)}
                    />
                  ))}
                </motion.div>
              </section>
            )}

            {data.tracks.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold tracking-[-0.02em] mb-4">
                  Songs &amp; videos
                </h2>
                <div>
                  {data.tracks.slice(0, 20).map((t, i) => (
                    <TrackRow
                      key={t.id}
                      track={t}
                      index={i}
                      contextQueue={data.tracks.slice(0, 20)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="px-6 pb-12 space-y-10">
      <div className="pt-2">
        <h1 className="text-3xl font-bold mb-1">Explore</h1>
        <p className="text-sm text-ink-2">New releases, charts, and moods from YouTube Music.</p>
      </div>

      {/* Top quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {quickLinks.map((link) => (
          <motion.button
            key={link.browseId}
            whileTap={{ scale: 0.98 }}
            transition={SPRING}
            onClick={() => openExploreCategory(link)}
            className="h-14 px-4 rounded-md bg-surface hover:bg-raised border border-line hover:border-ink-3 flex items-center gap-3 text-left transition-colors"
          >
            {linkIcon(link.browseId)}
            <span className="text-sm font-semibold text-ink">{link.title}</span>
          </motion.button>
        ))}
      </div>

      {isLoadingExplore && !exploreFeed ? (
        <ExploreSkeleton />
      ) : !exploreFeed ||
        (exploreFeed.newReleases.length === 0 &&
          exploreFeed.moods.length === 0 &&
          exploreFeed.trendingTracks.length === 0 &&
          exploreFeed.musicVideos.length === 0) ? (
        <div className="py-16 text-center border border-line rounded-lg bg-surface/40">
          <p className="text-base font-semibold text-ink">Couldn&apos;t load Explore right now</p>
          <p className="text-sm text-ink-2 mt-1">
            Check that the local server is running or try fetching again.
          </p>
          <button
            type="button"
            onClick={() => fetchExploreFeed()}
            className="mt-5 h-9 px-5 rounded-md bg-ink text-black text-sm font-semibold hover:bg-white transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* New albums & singles */}
          {exploreFeed && exploreFeed.newReleases.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.02em]">
                  New albums &amp; singles
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    openExploreCategory({
                      title: 'New releases',
                      browseId: 'FEmusic_new_releases',
                    })
                  }
                  className="text-xs font-medium text-ink-2 hover:text-ink transition-colors"
                >
                  See all
                </button>
              </div>
              <motion.div
                className={GRID}
                variants={gridVariants}
                initial="hidden"
                animate="show"
              >
                {exploreFeed.newReleases.slice(0, 12).map((rel) => (
                  <MediaCard
                    key={rel.id}
                    artwork={<PosterArt src={rel.thumbnail} title={rel.title} />}
                    title={rel.title}
                    subtitle={[rel.kind, rel.artist].filter(Boolean).join(' · ')}
                    onOpen={() => openRelease(rel)}
                    onPlay={() =>
                      playRemoteCollection(
                        rel.id,
                        `/api/album?id=${encodeURIComponent(rel.id)}`,
                        () => openRelease(rel)
                      )
                    }
                  />
                ))}
              </motion.div>
            </section>
          )}

          {/* Moods & genres */}
          {exploreFeed && exploreFeed.moods.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.02em]">
                  Moods &amp; genres
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    openExploreCategory({
                      title: 'Moods & genres',
                      browseId: 'FEmusic_moods_and_genres',
                    })
                  }
                  className="text-xs font-medium text-ink-2 hover:text-ink transition-colors"
                >
                  Browse all
                </button>
              </div>
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2"
                variants={gridVariants}
                initial="hidden"
                animate="show"
              >
                {exploreFeed.moods.slice(0, 20).map((mood) => (
                  <motion.button
                    variants={itemVariants}
                    whileTap={{ scale: 0.97 }}
                    key={`${mood.title}-${mood.params || ''}`}
                    onClick={() => openExploreCategory(mood)}
                    className="h-11 px-3.5 rounded-md bg-surface hover:bg-raised border border-line hover:border-ink-3 text-left flex items-center justify-between gap-2 transition-colors group"
                  >
                    <span className="text-xs font-medium text-ink-2 group-hover:text-ink truncate">
                      {mood.title}
                    </span>
                    <span className="w-1 h-3 rounded-full bg-accent/50 group-hover:bg-accent shrink-0 transition-colors" />
                  </motion.button>
                ))}
              </motion.div>
            </section>
          )}

          {/* Trending ranked songs */}
          {exploreFeed && exploreFeed.trendingTracks.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.02em]">
                  Trending
                </h2>
              </div>
              <div>
                {exploreFeed.trendingTracks.slice(0, 12).map((t, i) => (
                  <TrackRow
                    key={t.id}
                    track={t}
                    index={i}
                    contextQueue={exploreFeed.trendingTracks.slice(0, 12)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* New music videos */}
          {exploreFeed && exploreFeed.musicVideos.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.02em]">
                  New music videos
                </h2>
              </div>
              <motion.div
                className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3"
                variants={gridVariants}
                initial="hidden"
                animate="show"
              >
                {exploreFeed.musicVideos.slice(0, 12).map((track, idx) => (
                  <MediaCard
                    key={track.id}
                    track={track}
                    aspect="video"
                    artwork={<TrackArtwork track={track} size="md" />}
                    title={track.title}
                    subtitle={<ArtistLinks artist={track.artist} artistId={track.artistId} />}
                    isPlaying={isPlaying && currentTrack?.id === track.id}
                    onPlay={() =>
                      currentTrack?.id === track.id
                        ? togglePlay()
                        : playTrack(track, exploreFeed.musicVideos.slice(idx + 1))
                    }
                  />
                ))}
              </motion.div>
            </section>
          )}

          {busyPlayId && (
            <div className="fixed bottom-24 right-6 z-40 h-9 px-3.5 rounded-md bg-raised border border-line shadow-xl flex items-center gap-2 text-xs text-ink-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              <span>Loading tracks...</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
