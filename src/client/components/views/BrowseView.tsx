import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  Radio,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore, Track } from '../../store/usePlayerStore';
import { GLOBAL_TRENDING_TRACKS } from '../../utils/recommendationEngine';
import {
  buildHomeArtists,
  buildHomeCuts,
  cleanTrackTitle,
  primaryArtist,
} from '../../utils/catalog';
import { ArtistLinks } from '../ArtistLinks';
import {
  ArtistAvatar,
  TrackArtwork,
  PlayingBars,
  formatTrackDuration,
  upgradeThumbnail,
} from '../TrackCard';
import { HeartButton } from '../HeartButton';
import { MediaCard } from '../MediaCard';
import { MenuCoords, TrackContextMenu } from '../TrackContextMenu';
import { gridVariants, itemVariants } from '../../utils/motion';

const SectionHeader: React.FC<{
  title: string;
  action?: { label: string; onClick: () => void };
  controls?: React.ReactNode;
}> = ({ title, action, controls }) => (
  <div className="flex items-center justify-between gap-4 mb-4">
    <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.02em] truncate">
      {title}
    </h2>
    {(controls || action) && (
      <div className="flex items-center gap-3 shrink-0">
        {controls}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="text-xs font-medium text-ink-2 hover:text-ink transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    )}
  </div>
);

/**
 * Horizontal snap rail paired with explicit prev/next buttons in the section header
 * so mouse-wheel desktop users never have to hunt tiny scrollbars and rows never orphan.
 */
const ShelfRail: React.FC<{
  title: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}> = ({ title, action, children }) => {
  const railRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncScrollBounds = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  const getCardStep = (el: HTMLDivElement): number => {
    const first = el.firstElementChild as HTMLElement | null;
    return first && first.offsetWidth > 0 ? first.offsetWidth + 12 : 198;
  };

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    syncScrollBounds();
  }, [title, syncScrollBounds]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    syncScrollBounds();
    const ro = new ResizeObserver(() => {
      if (el.scrollLeft > 0) {
        const cardStep = getCardStep(el);
        el.scrollLeft = Math.round(el.scrollLeft / cardStep) * cardStep;
      }
      syncScrollBounds();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, syncScrollBounds]);

  const step = (dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const cardStep = getCardStep(el);
    const cardsPerPage = Math.max(1, Math.floor(el.clientWidth / cardStep));
    const target = Math.max(
      0,
      Math.round((el.scrollLeft + dir * cardsPerPage * cardStep) / cardStep) * cardStep
    );
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  const navControls =
    canPrev || canNext ? (
      <div className="hidden sm:flex items-center gap-1">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={!canPrev}
          aria-label={`Scroll ${title} left`}
          className="w-7 h-7 rounded-md border border-line bg-surface hover:bg-hover disabled:opacity-30 disabled:hover:bg-surface flex items-center justify-center text-ink-2 hover:text-ink transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={!canNext}
          aria-label={`Scroll ${title} right`}
          className="w-7 h-7 rounded-md border border-line bg-surface hover:bg-hover disabled:opacity-30 disabled:hover:bg-surface flex items-center justify-center text-ink-2 hover:text-ink transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    ) : null;

  return (
    <section aria-label={title}>
      <SectionHeader title={title} action={action} controls={navControls} />
      <motion.div
        ref={railRef}
        onScroll={syncScrollBounds}
        variants={gridVariants}
        initial="hidden"
        animate="show"
        className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1"
      >
        {children}
      </motion.div>
    </section>
  );
};

interface HomeTrackItemProps {
  track: Track;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}

/** Compact numbered row inside the Hero "On rotation" column with Heart + "..." menu. */
const RotationRow: React.FC<
  HomeTrackItemProps & { index: number }
> = ({ track, index, isCurrent, isPlaying, onPlay }) => {
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);

  return (
    <>
      <motion.div
        variants={itemVariants}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuCoords({ x: e.clientX, y: e.clientY });
        }}
        className="group flex items-center gap-3 py-2 px-1.5 rounded-sm hover:bg-surface focus-within:bg-surface transition-colors"
      >
        <button
          type="button"
          onClick={onPlay}
          aria-label={isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          className="flex items-center gap-3 shrink-0 focus-visible:outline-none"
        >
          <span className="w-5 shrink-0 text-[11px] text-ink-3 tabular-nums flex items-center justify-center">
            {isCurrent ? (
              <PlayingBars active={isPlaying} className="h-3 w-3" />
            ) : (
              <>
                <span className="group-hover:hidden group-focus-within:hidden">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Play className="hidden group-hover:block group-focus-within:block w-3 h-3 fill-current text-ink" />
              </>
            )}
          </span>
          <div className="w-8 h-8 rounded-md overflow-hidden bg-surface shrink-0">
            <TrackArtwork track={track} />
          </div>
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onPlay}
            className="block w-full text-left truncate focus-visible:outline-none focus-visible:underline"
          >
            <span
              className={`text-sm font-medium hover:underline ${
                isCurrent ? 'text-accent' : 'text-ink'
              }`}
            >
              {cleanTrackTitle(track.title)}
            </span>
          </button>
          <div className="text-xs text-ink-3 truncate">
            <ArtistLinks
              artist={track.artist}
              artistId={track.artistId}
              className="block max-w-full truncate"
              linkClassName="hover:text-ink hover:underline transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <div className="hidden group-hover:flex group-focus-within:flex items-center gap-0.5">
            <HeartButton
              track={track}
              revealClass="opacity-100"
              className="!w-7 !h-7"
              iconClassName="w-3.5 h-3.5"
            />
            <button
              type="button"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuCoords({ x: rect.right, y: rect.bottom + 4, alignRight: true });
              }}
              aria-label={`More actions for ${track.title}`}
              className="w-7 h-7 rounded-full flex items-center justify-center text-ink-2 hover:text-ink transition-opacity"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="w-9 text-right text-[11px] text-ink-3 tabular-nums">
            {formatTrackDuration(track.duration)}
          </span>
        </div>
      </motion.div>

      <TrackContextMenu
        track={track}
        coords={menuCoords}
        onClose={() => setMenuCoords(null)}
      />
    </>
  );
};

/** Dense 3-column Quick Picks cut item with accessible non-nested controls. */
const CompactCutTile: React.FC<HomeTrackItemProps> = ({
  track,
  isCurrent,
  isPlaying,
  onPlay,
}) => {
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);

  return (
    <>
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuCoords({ x: e.clientX, y: e.clientY });
        }}
        className="group flex items-center gap-3 p-2 rounded-md hover:bg-surface focus-within:bg-surface transition-colors"
      >
        <button
          type="button"
          onClick={onPlay}
          aria-label={isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          className="relative w-12 h-12 rounded-md overflow-hidden bg-surface ring-1 ring-white/[0.06] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <TrackArtwork track={track} />
          <span
            className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
              isCurrent
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            }`}
          >
            {isCurrent ? (
              <PlayingBars active={isPlaying} className="h-3.5 w-3.5" />
            ) : (
              <Play className="w-4 h-4 fill-current text-white translate-x-[1px]" />
            )}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onPlay}
            className="block w-full text-left truncate focus-visible:outline-none focus-visible:underline"
          >
            <span
              className={`text-sm font-semibold hover:underline ${
                isCurrent ? 'text-accent' : 'text-ink'
              }`}
            >
              {cleanTrackTitle(track.title)}
            </span>
          </button>
          <div className="text-xs text-ink-2 mt-0.5 truncate">
            <ArtistLinks
              artist={track.artist}
              artistId={track.artistId}
              className="block max-w-full truncate"
              linkClassName="hover:text-ink hover:underline transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <HeartButton
            track={track}
            revealClass="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
            className="!w-7 !h-7"
            iconClassName="w-3.5 h-3.5"
          />
          <button
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setMenuCoords({ x: rect.right, y: rect.bottom + 4, alignRight: true });
            }}
            aria-label={`More actions for ${track.title}`}
            className="w-7 h-7 rounded-full hidden group-hover:flex group-focus-within:flex items-center justify-center text-ink-2 hover:text-ink transition-opacity"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          <span className="hidden sm:inline-block w-9 text-right text-[11px] text-ink-3 tabular-nums">
            {formatTrackDuration(track.duration)}
          </span>
        </div>
      </div>

      <TrackContextMenu
        track={track}
        coords={menuCoords}
        onClose={() => setMenuCoords(null)}
      />
    </>
  );
};

export const BrowseView: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    startRadio,
    history,
    favorites,
    playlists,
    tasteTracks,
    exploreFeed,
    exploreSections,
    fetchExploreFeed,
    fetchTasteRecommendations,
    setActiveTab,
    openArtist,
    openCollection,
    isQueueOpen,
  } = usePlayerStore(
    useShallow((s) => ({
      currentTrack: s.currentTrack,
      isPlaying: s.isPlaying,
      playTrack: s.playTrack,
      togglePlay: s.togglePlay,
      startRadio: s.startRadio,
      history: s.history,
      favorites: s.favorites,
      playlists: s.playlists,
      tasteTracks: s.tasteTracks,
      exploreFeed: s.exploreFeed,
      exploreSections: s.exploreSections,
      fetchExploreFeed: s.fetchExploreFeed,
      fetchTasteRecommendations: s.fetchTasteRecommendations,
      setActiveTab: s.setActiveTab,
      openArtist: s.openArtist,
      openCollection: s.openCollection,
      isQueueOpen: s.isQueueOpen,
    }))
  );

  const [heroMenuCoords, setHeroMenuCoords] = useState<MenuCoords | null>(null);

  useEffect(() => {
    fetchExploreFeed();
    if (tasteTracks.length === 0) {
      fetchTasteRecommendations();
    }
  }, [fetchExploreFeed, fetchTasteRecommendations, tasteTracks.length]);

  const exploreTrending = useMemo(
    () => exploreFeed?.trendingTracks ?? [],
    [exploreFeed]
  );
  const playlistTracks = useMemo(
    () => playlists.flatMap((p) => p.tracks),
    [playlists]
  );
  const trending = GLOBAL_TRENDING_TRACKS;

  // Exclude the active footer track from the Hero when possible so Home never echoes FloatingPlayerDeck
  const quick: Track[] = useMemo(() => {
    const seen = new Set<string>();
    const out: Track[] = [];
    const pool = [...history, ...favorites, ...exploreTrending, ...trending];
    for (const t of pool) {
      if (currentTrack && t.id === currentTrack.id) continue;
      if (!seen.has(t.id)) {
        seen.add(t.id);
        out.push(t);
      }
      if (out.length === 5) break;
    }
    if (out.length === 0 && currentTrack) {
      out.push(currentTrack);
    }
    return out;
  }, [currentTrack, history, favorites, exploreTrending, trending]);

  const leadTrack = quick[0] ?? exploreTrending[0] ?? trending[0];
  const rotationTracks = quick.slice(1, 5);

  const popular: Track[] = useMemo(() => {
    const excludeIds = new Set(quick.map((t) => t.id));
    if (currentTrack) excludeIds.add(currentTrack.id);
    return buildHomeCuts({
      exploreTrending,
      tasteTracks,
      favorites,
      playlists: playlistTracks,
      fallbackTracks: trending,
      excludeIds,
      limit: 9,
    });
  }, [quick, currentTrack, exploreTrending, tasteTracks, favorites, playlistTracks, trending]);

  const artists = useMemo(
    () =>
      buildHomeArtists({
        favorites,
        history,
        playlists: playlistTracks,
        exploreTrending,
        tasteTracks,
        fallbackTracks: trending,
        limit: 12,
      }),
    [favorites, history, playlistTracks, exploreTrending, tasteTracks, trending]
  );

  const seedArtist = useMemo(() => {
    const ref = currentTrack || favorites[0] || history[0];
    return ref ? primaryArtist(ref.artist) : null;
  }, [currentTrack, favorites, history]);

  const recommended = useMemo(() => {
    if (tasteTracks.length === 0) return [];
    const curId = currentTrack?.id;
    return tasteTracks.filter((t) => t.id !== curId).slice(0, 12);
  }, [tasteTracks, currentTrack?.id]);

  const liveShelves = useMemo(() => exploreSections.slice(0, 2), [exploreSections]);

  const playFrom = (track: Track, list: Track[]) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }
    const i = list.findIndex((t) => t.id === track.id);
    playTrack(track, i >= 0 ? list.slice(i + 1) : []);
  };

  const openTrackAlbum = (track: Track) => {
    if (!track.albumId && !track.album) return;
    openCollection({
      title: track.album || track.title,
      kind: 'Album',
      albumId: track.albumId,
      artist: primaryArtist(track.artist),
      thumbnail: track.thumbnail,
      tracks: [],
    });
  };

  const leadIsCurrent = !!leadTrack && currentTrack?.id === leadTrack.id;
  const leadPlaying = leadIsCurrent && isPlaying;
  const leadInHistory = !!leadTrack && history.some((t) => t.id === leadTrack.id);
  const leadInFavorites = !!leadTrack && favorites.some((t) => t.id === leadTrack.id);
  const leadGlowArt = leadTrack
    ? upgradeThumbnail(leadTrack.thumbnail, leadTrack.id, 'xs')
    : '';

  const leadEyebrow = leadIsCurrent
    ? isPlaying
      ? 'Now playing'
      : 'Paused'
    : leadInHistory
    ? 'Continue listening'
    : leadInFavorites
    ? 'From your favorites'
    : 'Featured pick';

  return (
    <div className="relative">
      {leadGlowArt && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[360px] overflow-hidden"
        >
          <img
            src={leadGlowArt}
            alt=""
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover scale-125 blur-[96px] opacity-[0.12] saturate-150"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-canvas/35 via-canvas/75 to-canvas" />
        </div>
      )}

      <div className="relative z-10 px-6 py-7 space-y-12">
        {leadTrack && (
          <section
            aria-label="Featured"
            onContextMenu={(e) => {
              e.preventDefault();
              setHeroMenuCoords({ x: e.clientX, y: e.clientY });
            }}
          >
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-7 items-center">
              <div className="flex flex-col sm:flex-row sm:items-end gap-6 min-w-0">
                <button
                  type="button"
                  onClick={() => playFrom(leadTrack, quick)}
                  aria-label={
                    leadPlaying ? `Pause ${leadTrack.title}` : `Play ${leadTrack.title}`
                  }
                  className="group relative w-32 h-32 sm:w-40 sm:h-40 shrink-0 rounded-md overflow-hidden bg-surface ring-1 ring-white/[0.08] text-left shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <TrackArtwork track={leadTrack} size="md" />
                  <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="w-11 h-11 rounded-full bg-accent text-black flex items-center justify-center shadow-lg">
                      {leadPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current translate-x-[1px]" />
                      )}
                    </span>
                  </span>
                </button>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-accent mb-1.5">
                    {leadEyebrow}
                  </div>
                  <h1
                    title={leadTrack.title}
                    className="text-3xl sm:text-[38px] font-bold tracking-[-0.03em] leading-[1.08] line-clamp-2 break-words"
                  >
                    {leadTrack.title}
                  </h1>
                  <div className="mt-2 flex items-center gap-2 text-sm text-ink-2 min-w-0">
                    <ArtistLinks
                      artist={leadTrack.artist}
                      artistId={leadTrack.artistId}
                      className="truncate min-w-0"
                      linkClassName="hover:text-ink hover:underline transition-colors"
                    />
                    {leadTrack.album && (
                      <>
                        <span className="text-ink-3 shrink-0">·</span>
                        <button
                          type="button"
                          onClick={() => openTrackAlbum(leadTrack)}
                          className="truncate text-ink-3 hover:text-ink hover:underline transition-colors"
                        >
                          {leadTrack.album}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => playFrom(leadTrack, quick)}
                      className="h-9 px-4 rounded-md bg-accent hover:bg-accent-hover text-black text-xs font-semibold inline-flex items-center gap-2 transition-colors"
                    >
                      {leadPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current translate-x-[1px]" />
                          <span>{leadIsCurrent ? 'Resume' : 'Play'}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => startRadio(leadTrack)}
                      className="h-9 px-4 rounded-md border border-line hover:border-ink-2 hover:bg-surface text-xs font-medium text-ink-2 hover:text-ink inline-flex items-center gap-2 transition-colors"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Radio</span>
                    </button>
                    <HeartButton
                      track={leadTrack}
                      className="border border-line hover:border-ink-2 bg-surface/60"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHeroMenuCoords({
                          x: rect.right,
                          y: rect.bottom + 6,
                          alignRight: true,
                        });
                      }}
                      aria-label={`More actions for ${leadTrack.title}`}
                      className="w-8 h-8 rounded-full border border-line hover:border-ink-2 hover:bg-surface flex items-center justify-center text-ink-2 hover:text-ink transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {rotationTracks.length > 0 && (
                <div className="min-w-0">
                  <div className="text-xs font-medium text-ink-3 mb-2">On rotation</div>
                  <motion.div
                    className="space-y-0.5"
                    variants={gridVariants}
                    initial="hidden"
                    animate="show"
                  >
                    {rotationTracks.map((track, idx) => (
                      <RotationRow
                        key={track.id}
                        track={track}
                        index={idx}
                        isCurrent={currentTrack?.id === track.id}
                        isPlaying={isPlaying}
                        onPlay={() => playFrom(track, quick)}
                      />
                    ))}
                  </motion.div>
                </div>
              )}
            </div>

            <TrackContextMenu
              track={leadTrack}
              coords={heroMenuCoords}
              onClose={() => setHeroMenuCoords(null)}
            />
          </section>
        )}

        <section aria-label="Selected cuts">
          <SectionHeader
            title="Selected cuts"
            action={{ label: 'View all', onClick: () => setActiveTab('songs') }}
          />
          <div
            className={`grid grid-cols-1 ${
              isQueueOpen ? 'lg:grid-cols-2 2xl:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-3'
            } gap-x-4 gap-y-1`}
          >
            {popular.map((track) => (
              <CompactCutTile
                key={track.id}
                track={track}
                isCurrent={currentTrack?.id === track.id}
                isPlaying={isPlaying}
                onPlay={() => playFrom(track, popular)}
              />
            ))}
          </div>
        </section>

        {recommended.length > 0 && (
          <ShelfRail title={seedArtist ? `Related to ${seedArtist}` : 'Recommended'}>
            {recommended.map((track) => (
              <MediaCard
                key={track.id}
                track={track}
                artwork={<TrackArtwork track={track} size="md" />}
                title={cleanTrackTitle(track.title)}
                subtitle={<ArtistLinks artist={track.artist} artistId={track.artistId} />}
                isPlaying={currentTrack?.id === track.id && isPlaying}
                onPlay={() => playFrom(track, recommended)}
                className="w-[168px] sm:w-[178px] lg:w-[186px] shrink-0 snap-start"
              />
            ))}
          </ShelfRail>
        )}

        <ShelfRail
          title="Artists"
          action={{ label: 'View all', onClick: () => setActiveTab('artists') }}
        >
          {artists.map((artist) => (
            <MediaCard
              key={artist.name}
              round
              artwork={<ArtistAvatar name={artist.name} fallbackTrack={artist.tracks[0]} />}
              title={artist.name}
              subtitle="Artist"
              isPlaying={
                !!currentTrack &&
                isPlaying &&
                primaryArtist(currentTrack.artist) === artist.name
              }
              onOpen={() => openArtist(artist.name, artist.tracks[0]?.artistId)}
              onPlay={() => playFrom(artist.tracks[0], artist.tracks)}
              className="w-[164px] sm:w-[174px] lg:w-[182px] shrink-0 snap-start"
            />
          ))}
        </ShelfRail>

        {liveShelves.map((section, idx) => {
          const isVideoShelf =
            /video/i.test(section.title) ||
            (section.tracks.length > 0 &&
              section.tracks
                .slice(0, 6)
                .every((t) => !t.thumbnail || t.thumbnail.includes('i.ytimg.com')));
          return (
            <ShelfRail key={`${section.title}-${idx}`} title={section.title}>
              {section.tracks.slice(0, 12).map((track) => (
                <MediaCard
                  key={track.id}
                  track={track}
                  aspect={isVideoShelf ? 'video' : 'square'}
                  artwork={<TrackArtwork track={track} size="md" />}
                  title={cleanTrackTitle(track.title)}
                  subtitle={<ArtistLinks artist={track.artist} artistId={track.artistId} />}
                  isPlaying={currentTrack?.id === track.id && isPlaying}
                  onPlay={() => playFrom(track, section.tracks)}
                  className={
                    isVideoShelf
                      ? 'w-[228px] sm:w-[248px] lg:w-[264px] shrink-0 snap-start'
                      : 'w-[168px] sm:w-[178px] lg:w-[186px] shrink-0 snap-start'
                  }
                />
              ))}
            </ShelfRail>
          );
        })}
      </div>
    </div>
  );
};
