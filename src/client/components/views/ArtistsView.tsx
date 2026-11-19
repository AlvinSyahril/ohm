import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Mic2, Plus } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../../store/usePlayerStore';
import { toast } from '../../store/useToastStore';
import { GLOBAL_TRENDING_TRACKS } from '../../utils/recommendationEngine';
import { buildArtists, primaryArtist, trackCountLabel } from '../../utils/catalog';
import { TrackArtwork } from '../TrackCard';
import { MediaCard } from '../MediaCard';
import { LibraryFilterBar, SortChoice } from '../LibraryFilterBar';
import { gridVariants } from '../../utils/motion';

type ArtistSort = 'recent' | 'name' | 'tracks';

const SORT_OPTIONS: SortChoice<ArtistSort>[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'name', label: 'A–Z' },
  { id: 'tracks', label: 'Songs' },
];

export const ArtistsView: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    addToQueue,
    openArtist,
    history,
    favorites,
    playlists,
  } = usePlayerStore(
    useShallow((s) => ({
      currentTrack: s.currentTrack,
      isPlaying: s.isPlaying,
      playTrack: s.playTrack,
      togglePlay: s.togglePlay,
      addToQueue: s.addToQueue,
      openArtist: s.openArtist,
      history: s.history,
      favorites: s.favorites,
      playlists: s.playlists,
    }))
  );

  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<ArtistSort>('recent');

  const artists = useMemo(
    () =>
      buildArtists([
        ...favorites,
        ...history,
        ...playlists.flatMap((p) => p.tracks),
        ...GLOBAL_TRENDING_TRACKS,
      ]),
    [favorites, history, playlists]
  );

  const visibleArtists = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = q ? artists.filter((a) => a.name.toLowerCase().includes(q)) : artists;
    if (sort === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'tracks') return [...list].sort((a, b) => b.tracks.length - a.tracks.length);
    return list;
  }, [artists, filter, sort]);

  return (
    <div className="px-6 pb-8">
      <h1 className="text-3xl font-bold mb-1">Artists</h1>
      <p className="text-sm text-ink-2 mb-5">
        {visibleArtists.length} {visibleArtists.length === 1 ? 'artist' : 'artists'}
        {filter.trim() ? ` matching "${filter.trim()}"` : ''}
      </p>

      <LibraryFilterBar
        filter={filter}
        onFilterChange={setFilter}
        placeholder="Filter artists"
        sort={sort}
        sortOptions={SORT_OPTIONS}
        onSortChange={setSort}
      />

      {visibleArtists.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-base font-semibold">No matching artists</p>
          <p className="text-sm text-ink-2 mt-1">Try another name or clear the filter.</p>
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
          {visibleArtists.map((artist) => {
            const playingHere =
              !!currentTrack && isPlaying && primaryArtist(currentTrack.artist) === artist.name;
            const playArtist = () => {
              if (currentTrack && primaryArtist(currentTrack.artist) === artist.name) {
                togglePlay();
              } else {
                playTrack(artist.tracks[0], artist.tracks.slice(1));
              }
            };
            return (
              <MediaCard
                key={artist.name}
                round
                artwork={<TrackArtwork track={artist.tracks[0]} size="md" />}
                title={artist.name}
                subtitle={trackCountLabel(artist.tracks.length)}
                isPlaying={playingHere}
                onOpen={() => openArtist(artist.name, artist.tracks[0]?.artistId)}
                onPlay={playArtist}
                contextActions={[
                  {
                    id: 'play',
                    label: playingHere ? 'Pause' : 'Play top songs',
                    icon: playingHere ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />,
                    onSelect: playArtist,
                  },
                  {
                    id: 'open',
                    label: 'Go to artist',
                    icon: <Mic2 className="w-4 h-4" />,
                    onSelect: () => openArtist(artist.name, artist.tracks[0]?.artistId),
                  },
                  {
                    id: 'queue',
                    label: 'Add songs to queue',
                    icon: <Plus className="w-4 h-4" />,
                    onSelect: () => {
                      artist.tracks.forEach((t) => addToQueue(t));
                      toast(`Added ${artist.tracks.length} songs to queue`);
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
