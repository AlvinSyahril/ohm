import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Disc3, Plus } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../../store/usePlayerStore';
import { toast } from '../../store/useToastStore';
import { GLOBAL_TRENDING_TRACKS } from '../../utils/recommendationEngine';
import { buildAlbums } from '../../utils/catalog';
import { TrackArtwork } from '../TrackCard';
import { MediaCard } from '../MediaCard';
import { LibraryFilterBar, SortChoice } from '../LibraryFilterBar';
import { gridVariants } from '../../utils/motion';

type AlbumSort = 'recent' | 'title' | 'artist' | 'tracks';

const SORT_OPTIONS: SortChoice<AlbumSort>[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'title', label: 'A–Z' },
  { id: 'artist', label: 'Artist' },
  { id: 'tracks', label: 'Songs' },
];

export const AlbumsView: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    addToQueue,
    history,
    favorites,
    playlists,
    openCollection,
  } = usePlayerStore(
    useShallow((s) => ({
      currentTrack: s.currentTrack,
      isPlaying: s.isPlaying,
      playTrack: s.playTrack,
      togglePlay: s.togglePlay,
      addToQueue: s.addToQueue,
      history: s.history,
      favorites: s.favorites,
      playlists: s.playlists,
      openCollection: s.openCollection,
    }))
  );

  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<AlbumSort>('recent');

  const albums = useMemo(
    () =>
      buildAlbums([
        ...favorites,
        ...history,
        ...playlists.flatMap((p) => p.tracks),
        ...GLOBAL_TRENDING_TRACKS,
      ]),
    [favorites, history, playlists]
  );

  const visibleAlbums = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = q
      ? albums.filter(
          (a) => a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)
        )
      : albums;
    if (sort === 'title') return [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'artist') return [...list].sort((a, b) => a.artist.localeCompare(b.artist));
    if (sort === 'tracks') return [...list].sort((a, b) => b.tracks.length - a.tracks.length);
    return list;
  }, [albums, filter, sort]);

  return (
    <div className="px-6 pb-8">
      <h1 className="text-3xl font-bold mb-1">Albums</h1>
      <p className="text-sm text-ink-2 mb-5">
        {visibleAlbums.length} {visibleAlbums.length === 1 ? 'release' : 'releases'}
        {filter.trim() ? ` matching "${filter.trim()}"` : ''}
      </p>

      <LibraryFilterBar
        filter={filter}
        onFilterChange={setFilter}
        placeholder="Filter albums or artists"
        sort={sort}
        sortOptions={SORT_OPTIONS}
        onSortChange={setSort}
      />

      {visibleAlbums.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-base font-semibold">No matching releases</p>
          <p className="text-sm text-ink-2 mt-1">Try a different search or clear the filter.</p>
          <button
            type="button"
            onClick={() => setFilter('')}
            className="mt-4 h-8 px-4 rounded-md bg-surface hover:bg-hover border border-line text-xs font-medium text-ink transition-colors"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2"
          variants={gridVariants}
          initial="hidden"
          animate="show"
        >
          {visibleAlbums.map((album) => {
            const lead = album.tracks[0];
            const playingHere =
              !!currentTrack && isPlaying && album.tracks.some((t) => t.id === currentTrack.id);
            const openAlbum = () =>
              openCollection({
                title: album.title,
                kind: album.kind,
                albumId: lead.albumId,
                artist: lead.artist,
                thumbnail: lead.thumbnail,
                tracks: album.tracks,
              });
            const playAlbum = () => {
              if (currentTrack && album.tracks.some((t) => t.id === currentTrack.id)) {
                togglePlay();
              } else {
                playTrack(lead, album.tracks.slice(1));
              }
            };
            return (
              <MediaCard
                key={album.key}
                artwork={<TrackArtwork track={lead} size="md" />}
                title={album.title}
                subtitle={`${album.kind} · ${album.artist}`}
                isPlaying={playingHere}
                onOpen={openAlbum}
                onPlay={playAlbum}
                contextActions={[
                  {
                    id: 'play',
                    label: playingHere ? 'Pause' : 'Play release',
                    icon: playingHere ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />,
                    onSelect: playAlbum,
                  },
                  {
                    id: 'open',
                    label: 'View tracklist',
                    icon: <Disc3 className="w-4 h-4" />,
                    onSelect: openAlbum,
                  },
                  {
                    id: 'queue',
                    label: 'Add all to queue',
                    icon: <Plus className="w-4 h-4" />,
                    onSelect: () => {
                      album.tracks.forEach((t) => addToQueue(t));
                      toast(`Added ${album.tracks.length} songs to queue`);
                    },
                  },
                ]}
              />
            );
          })}
        </motion.div>
      )}
    </div>
  );
};
