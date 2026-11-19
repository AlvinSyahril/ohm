import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Play,
  Pause,
  Shuffle,
  Search,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronDown,
  Check,
  Pencil,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore, Track } from '../../store/usePlayerStore';
import { toast } from '../../store/useToastStore';
import { GLOBAL_TRENDING_TRACKS } from '../../utils/recommendationEngine';
import { trackCountLabel } from '../../utils/catalog';
import { TrackRow, TrackArtwork } from '../TrackCard';
import { PlaylistCollage } from '../PlaylistCollage';
import { popoverVariants, SPRING } from '../../utils/motion';

type SortKey = 'default' | 'title' | 'artist' | 'duration';

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'default', label: 'Custom order' },
  { id: 'title', label: 'Title' },
  { id: 'artist', label: 'Artist' },
  { id: 'duration', label: 'Duration' },
];

const totalLabel = (tracks: Track[]): string => {
  const secs = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  if (!secs) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.max(1, Math.round((secs % 3600) / 60));
  return h > 0 ? `${h} hr ${m} min` : `${m} min`;
};

export const SongsView: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    favorites,
    history,
    activeTab,
    playlists,
    activePlaylistId,
    renamePlaylist,
    deletePlaylist,
    reorderPlaylistTrack,
    setActiveTab,
    collection,
    closeCollection,
  } = usePlayerStore(
    useShallow((s) => ({
      currentTrack: s.currentTrack,
      isPlaying: s.isPlaying,
      playTrack: s.playTrack,
      togglePlay: s.togglePlay,
      favorites: s.favorites,
      history: s.history,
      activeTab: s.activeTab,
      playlists: s.playlists,
      activePlaylistId: s.activePlaylistId,
      renamePlaylist: s.renamePlaylist,
      deletePlaylist: s.deletePlaylist,
      reorderPlaylistTrack: s.reorderPlaylistTrack,
      setActiveTab: s.setActiveTab,
      collection: s.collection,
      closeCollection: s.closeCollection,
    }))
  );

  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortKey>('default');
  const [sortOpen, setSortOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [hydratedAlbum, setHydratedAlbum] = useState<{
    tracks: Track[];
    artist?: string;
    year?: string;
    thumbnail?: string;
  } | null>(null);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [albumError, setAlbumError] = useState(false);
  const [coverBroken, setCoverBroken] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Reset local controls whenever the list underneath changes
  useEffect(() => {
    setFilter('');
    setSort('default');
    setSortOpen(false);
    setConfirmDelete(false);
    setIsRenaming(false);
    setHydratedAlbum(null);
    setAlbumError(false);
    setCoverBroken(false);
  }, [activeTab, activePlaylistId, collection?.title, collection?.albumId, collection?.playlistId]);

  // Hydrate full official tracklist when opening an Album, Single, or Curated Playlist collection
  useEffect(() => {
    if (!collection) {
      setLoadingCollection(false);
      setAlbumError(false);
      return;
    }

    const isRemotePlaylist = !!collection.playlistId;
    const isRelease =
      collection.kind === 'Album' || collection.kind === 'Single' || !!collection.albumId;
    if (!isRemotePlaylist && !isRelease) {
      setLoadingCollection(false);
      return;
    }
    if (!isRemotePlaylist && !collection.albumId && collection.tracks.length >= 6) {
      setLoadingCollection(false);
      return;
    }

    const ctrl = new AbortController();
    setLoadingCollection(true);
    setAlbumError(false);

    const url = isRemotePlaylist
      ? `/api/playlist?${new URLSearchParams({ id: collection.playlistId! }).toString()}`
      : `/api/album?${(() => {
          const p = new URLSearchParams();
          if (collection.albumId) p.set('id', collection.albumId);
          if (collection.title) p.set('title', collection.title);
          if (collection.artist) p.set('artist', collection.artist);
          return p.toString();
        })()}`;

    fetch(url, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Collection fetch failed'))))
      .then(
        (data: {
          tracks?: Track[];
          artist?: string;
          subtitle?: string;
          year?: string;
          thumbnail?: string;
        }) => {
          if (data.tracks && data.tracks.length > 0) {
            setHydratedAlbum({
              tracks: data.tracks,
              artist: data.artist || data.subtitle,
              year: data.year,
              thumbnail: data.thumbnail,
            });
          } else if (collection.tracks.length === 0) {
            setAlbumError(true);
          }
          setLoadingCollection(false);
        }
      )
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        if (collection.tracks.length === 0) setAlbumError(true);
        setLoadingCollection(false);
      });

    return () => ctrl.abort();
  }, [collection]);

  // Close sort popover on outside click / Escape
  useEffect(() => {
    if (!sortOpen) return;
    const onDown = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSortOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [sortOpen]);

  // A pending delete confirmation expires on its own
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  const playlist = useMemo(
    () => (activePlaylistId ? playlists.find((p) => p.id === activePlaylistId) ?? null : null),
    [activePlaylistId, playlists]
  );

  const source: Track[] = useMemo(() => {
    if (collection) {
      if (hydratedAlbum && hydratedAlbum.tracks.length > 0) return hydratedAlbum.tracks;
      return collection.tracks;
    }
    if (playlist) return playlist.tracks;
    if (activeTab === 'favorites') return favorites;
    if (activeTab === 'recent') return history;
    const seen = new Set<string>();
    return [...GLOBAL_TRENDING_TRACKS, ...favorites, ...history].filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [activeTab, collection, hydratedAlbum, playlist, favorites, history]);

  const tracks = useMemo(() => {
    const q = filter.toLowerCase().trim();
    const list = q
      ? source.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.artist.toLowerCase().includes(q) ||
            (s.album && s.album.toLowerCase().includes(q))
        )
      : [...source];
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'artist') list.sort((a, b) => a.artist.localeCompare(b.artist));
    else if (sort === 'duration') list.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    return list;
  }, [source, filter, sort]);

  const kind = collection ? collection.kind : playlist ? 'Playlist' : null;
  const title = collection
    ? collection.title
    : playlist
    ? playlist.name
    : activeTab === 'favorites'
    ? 'Liked songs'
    : activeTab === 'recent'
    ? 'Recently played'
    : 'Songs';

  const meta = [
    collection ? hydratedAlbum?.artist || collection.artist || collection.subtitle : null,
    collection ? hydratedAlbum?.year || collection.year : null,
    trackCountLabel(source.length),
    totalLabel(source),
  ]
    .filter(Boolean)
    .join(' · ');

  const inThisList = !!currentTrack && tracks.some((t) => t.id === currentTrack.id);
  const listPlaying = inThisList && isPlaying;
  const canReorder = !!playlist && sort === 'default' && !filter.trim();

  const playAll = () => {
    if (inThisList) {
      togglePlay();
    } else if (tracks.length > 0) {
      playTrack(tracks[0], tracks.slice(1));
    }
  };

  const shuffleAll = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    playTrack(shuffled[0], shuffled.slice(1));
  };

  const commitRename = () => {
    if (!playlist) return;
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== playlist.name) {
      renamePlaylist(playlist.id, trimmed);
      toast(`Renamed to "${trimmed}"`);
    }
    setIsRenaming(false);
  };

  const onDelete = () => {
    if (!playlist) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const name = playlist.name;
    deletePlaylist(playlist.id);
    setActiveTab('songs');
    toast(`Deleted ${name}`);
  };

  const emptyCopy =
    collection && albumError
      ? { head: 'Could not load album tracks', body: 'Try playing another release or going back.' }
      : playlist
      ? { head: 'This playlist is empty', body: 'Use the options menu on any song to add it here.' }
      : activeTab === 'favorites' && !collection
      ? { head: 'Songs you like will appear here', body: 'Tap the heart on any song to save it.' }
      : activeTab === 'recent' && !collection
      ? { head: 'Nothing played yet', body: 'Songs you listen to will show up here.' }
      : { head: 'No matching songs', body: 'Try a different filter.' };

  const activeSortLabel = SORT_OPTIONS.find((o) => o.id === sort)?.label ?? 'Custom order';

  return (
    <div className="pb-8">
      <div className="px-6 pt-2 pb-6">
        <AnimatePresence initial={false}>
          {collection && (
            <motion.button
              key="back"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              onClick={closeCollection}
              aria-label="Back"
              className="mb-4 h-8 px-2.5 rounded-md bg-surface border border-line hover:bg-hover inline-flex items-center gap-1.5 text-xs font-medium text-ink-2 hover:text-ink transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </motion.button>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-6">
          {collection && (hydratedAlbum?.thumbnail || collection.thumbnail || source[0]) && (
            <div className="w-[176px] h-[176px] shrink-0 rounded-md overflow-hidden bg-surface ring-1 ring-white/[0.08] hidden sm:block">
              {source[0] ? (
                <TrackArtwork
                  size="md"
                  track={{
                    ...source[0],
                    thumbnail: hydratedAlbum?.thumbnail || collection.thumbnail || source[0].thumbnail,
                  }}
                />
              ) : !coverBroken ? (
                <img
                  src={hydratedAlbum?.thumbnail || collection.thumbnail}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setCoverBroken(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-surface" />
              )}
            </div>
          )}
          {playlist && !collection && (
            <PlaylistCollage
              tracks={playlist.tracks}
              className="w-[176px] h-[176px] hidden sm:grid"
            />
          )}
          <div className="min-w-0 flex-1">
            {kind && <div className="text-sm font-bold mb-2">{kind}</div>}
            {playlist && isRenaming ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commitRename();
                }}
              >
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsRenaming(false);
                    }
                  }}
                  aria-label="Rename playlist"
                  className="w-full max-w-xl text-4xl sm:text-[52px] font-bold leading-[1.06] tracking-[-0.03em] bg-transparent border-b-2 border-accent text-ink pb-1"
                />
              </form>
            ) : playlist ? (
              <button
                onClick={() => {
                  setDraftName(playlist.name);
                  setIsRenaming(true);
                }}
                title="Click to rename playlist"
                className="group inline-flex items-center gap-3 max-w-full text-left"
              >
                <h1 className="text-4xl sm:text-[54px] font-bold leading-[1.06] tracking-[-0.03em] truncate">
                  {title}
                </h1>
                <Pencil className="w-5 h-5 text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ) : (
              <h1 className="text-4xl sm:text-[54px] font-bold leading-[1.06] tracking-[-0.03em] truncate">
                {title}
              </h1>
            )}
            <p className="text-sm text-ink-2 mt-3">{meta}</p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={tracks.length > 0 ? { scale: 0.96 } : undefined}
            transition={SPRING}
            onClick={playAll}
            disabled={tracks.length === 0}
            aria-label={listPlaying ? 'Pause' : 'Play'}
            className="h-9 px-5 rounded-md bg-accent hover:bg-accent-hover disabled:bg-hover disabled:text-ink-3 text-black text-xs font-semibold inline-flex items-center gap-2 transition-colors"
          >
            {listPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current translate-x-[1px]" />
                <span>Play</span>
              </>
            )}
          </motion.button>
          <motion.button
            whileTap={tracks.length > 0 ? { scale: 0.96 } : undefined}
            transition={SPRING}
            onClick={shuffleAll}
            disabled={tracks.length === 0}
            aria-label="Shuffle play"
            className="h-9 px-4 rounded-md border border-line hover:border-ink-2 hover:bg-surface text-xs font-medium text-ink disabled:opacity-40 inline-flex items-center gap-2 transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle</span>
          </motion.button>
          {playlist && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={SPRING}
              onClick={onDelete}
              aria-label={confirmDelete ? 'Confirm delete playlist' : 'Delete playlist'}
              className={`h-9 flex items-center gap-2 rounded-md border transition-colors ${
                confirmDelete
                  ? 'px-3.5 border-danger bg-danger text-black text-xs font-semibold'
                  : 'px-3 border-line text-ink-2 hover:text-danger hover:border-danger/40 hover:bg-surface'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <AnimatePresence initial={false}>
                {confirmDelete && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    Click again to delete
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-48 sm:w-56">
            <Search className="w-4 h-4 text-ink-2 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter"
              aria-label="Filter this list"
              className="w-full h-9 pl-9 pr-3 text-sm bg-raised hover:bg-hover focus:bg-hover rounded-md text-ink placeholder:text-ink-3 transition-colors focus:ring-1 focus:ring-ink-2"
            />
          </div>

          <div ref={sortRef} className="relative">
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={sortOpen}
              aria-label="Sort"
              className="h-9 px-3 text-sm bg-raised hover:bg-hover rounded-md text-ink-2 hover:text-ink transition-colors flex items-center gap-2"
            >
              <span>{activeSortLabel}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {sortOpen && (
                <motion.div
                  role="menu"
                  variants={popoverVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  style={{ transformOrigin: 'top right' }}
                  className="absolute right-0 top-full mt-1 w-44 bg-hover border border-line rounded-md p-1 z-30"
                >
                  {SORT_OPTIONS.map((opt) => {
                    const selected = sort === opt.id;
                    return (
                      <button
                        key={opt.id}
                        role="menuitemradio"
                        aria-checked={selected}
                        onClick={() => {
                          setSort(opt.id);
                          setSortOpen(false);
                        }}
                        className={`w-full text-left h-9 px-3 rounded-sm text-sm flex items-center justify-between transition-colors ${
                          selected ? 'text-accent bg-white/[0.06]' : 'text-ink hover:bg-white/10'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {selected && <Check className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="px-2">
        <div className="sticky top-0 z-10 bg-canvas grid grid-cols-[2rem_minmax(0,1fr)_auto] md:grid-cols-[2rem_minmax(0,3fr)_minmax(0,2fr)_auto] gap-4 h-9 px-4 mb-1 items-center text-sm text-ink-2 border-b border-line">
          <span className="text-center">#</span>
          <span>Title</span>
          <span className="hidden md:block">Album</span>
          <span className="w-[7.5rem] flex justify-end pr-9">
            <Clock className="w-4 h-4" aria-label="Duration" />
          </span>
        </div>

        {loadingCollection && tracks.length === 0 ? (
          <div aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 h-14 px-4 animate-pulse">
                <div className="w-6 h-3 rounded-sm bg-raised" />
                <div className="w-10 h-10 rounded-sm bg-raised shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 rounded-sm bg-raised" />
                  <div className="h-3 w-1/3 rounded-sm bg-raised" />
                </div>
              </div>
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-xl font-bold">{emptyCopy.head}</p>
            <p className="text-sm text-ink-2 mt-2">{emptyCopy.body}</p>
          </div>
        ) : (
          tracks.map((track, i) => (
            <TrackRow
              key={`${track.id}-${i}`}
              track={track}
              index={i}
              contextQueue={tracks}
              onMoveUp={
                canReorder && i > 0 ? () => reorderPlaylistTrack(playlist!.id, i, i - 1) : undefined
              }
              onMoveDown={
                canReorder && i < tracks.length - 1
                  ? () => reorderPlaylistTrack(playlist!.id, i, i + 1)
                  : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  );
};
