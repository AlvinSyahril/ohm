import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Radio } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Track, usePlayerStore } from '../../store/usePlayerStore';
import { toast } from '../../store/useToastStore';
import { GLOBAL_TRENDING_TRACKS } from '../../utils/recommendationEngine';
import { buildAlbums, primaryArtist, trackCountLabel } from '../../utils/catalog';
import { needsYoutubeLetterboxCrop, TrackArtwork, TrackRow, upgradeThumbnail } from '../TrackCard';
import { MediaCard } from '../MediaCard';
import { gridVariants } from '../../utils/motion';

interface ArtistRelease {
  id: string;
  title: string;
  kind: 'Album' | 'Single';
  year?: string;
  thumbnail?: string;
}

interface RelatedArtist {
  id: string;
  name: string;
  subtitle?: string;
  thumbnail?: string;
}

interface ArtistProfile {
  id?: string;
  name: string;
  description?: string;
  avatar?: string;
  topSongs: Track[];
  albums: ArtistRelease[];
  singles: ArtistRelease[];
  relatedArtists: RelatedArtist[];
}

interface ArtistViewProps {
  artistName: string;
  artistId?: string;
}

const SafeRemoteImg: React.FC<{
  src?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}> = ({ src, className = 'w-full h-full object-cover', loading }) => {
  const [tier, setTier] = useState(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    setTier(0);
  }, [src]);
  const upgraded = src ? upgradeThumbnail(src, undefined, 'md') : '';
  const candidates = upgraded && upgraded !== src ? [upgraded, src] : src ? [src] : [];
  const activeSrc = candidates[tier];
  const needsLetterboxCrop = needsYoutubeLetterboxCrop(activeSrc);

  useEffect(() => {
    const el = imgRef.current;
    if (!el || !el.complete) return;
    if (el.naturalWidth === 0) {
      setTier((t) => t + 1);
      return;
    }
    if (
      activeSrc &&
      activeSrc.includes('i.ytimg.com') &&
      el.naturalWidth === 120 &&
      el.naturalHeight === 90 &&
      tier < candidates.length - 1
    ) {
      setTier((t) => t + 1);
    }
  }, [activeSrc]);

  if (!activeSrc) return <div className="w-full h-full bg-surface" />;
  return (
    <img
      key={activeSrc}
      ref={imgRef}
      src={activeSrc}
      alt=""
      decoding="async"
      referrerPolicy="no-referrer"
      loading={loading}
      onLoad={(e) => {
        const el = e.currentTarget;
        if (
          activeSrc.includes('i.ytimg.com') &&
          el.naturalWidth === 120 &&
          el.naturalHeight === 90 &&
          tier < candidates.length - 1
        ) {
          setTier((t) => t + 1);
        }
      }}
      onError={() => setTier((t) => t + 1)}
      className={`${className} ${needsLetterboxCrop ? 'scale-[1.35]' : ''}`}
    />
  );
};

export const ArtistView: React.FC<ArtistViewProps> = ({ artistName, artistId }) => {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    startRadio,
    openCollection,
    openArtist,
    favorites,
    history,
    playlists,
  } = usePlayerStore(
    useShallow((s) => ({
      currentTrack: s.currentTrack,
      isPlaying: s.isPlaying,
      playTrack: s.playTrack,
      togglePlay: s.togglePlay,
      startRadio: s.startRadio,
      openCollection: s.openCollection,
      openArtist: s.openArtist,
      favorites: s.favorites,
      history: s.history,
      playlists: s.playlists,
    }))
  );

  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyReleaseId, setBusyReleaseId] = useState<string | null>(null);
  const releaseCtrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      releaseCtrlRef.current?.abort();
    };
  }, []);

  const localTracks = useMemo(() => {
    const target = artistName.toLowerCase();
    const pool = [
      ...GLOBAL_TRENDING_TRACKS,
      ...favorites,
      ...history,
      ...playlists.flatMap((p) => p.tracks),
    ];
    const seen = new Set<string>();
    return pool.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return (
        primaryArtist(t.artist).toLowerCase() === target ||
        t.artist.toLowerCase().includes(target)
      );
    });
  }, [artistName, favorites, history, playlists]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setProfile(null);

    const params = new URLSearchParams();
    if (artistId) params.set('id', artistId);
    if (artistName) params.set('name', artistName);

    fetch(`/api/artist?${params.toString()}`, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Artist profile failed'))))
      .then((data: ArtistProfile) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setLoading(false);
      });

    return () => ctrl.abort();
  }, [artistName, artistId]);

  const tracks = useMemo(() => {
    const seen = new Set<string>();
    const merged: Track[] = [];
    for (const t of [...(profile?.topSongs || []), ...localTracks]) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      merged.push(t);
    }
    return merged.slice(0, 15);
  }, [profile?.topSongs, localTracks]);

  const fallbackReleases = useMemo(() => buildAlbums(tracks), [tracks]);
  const albums = profile?.albums || [];
  const singles = profile?.singles || [];
  const related = profile?.relatedArtists || [];

  const displayName = profile?.name || artistName;
  const avatarTrack = tracks[0];
  const avatarUrl = profile?.avatar || avatarTrack?.thumbnail;
  const inArtist = !!currentTrack && tracks.some((t) => t.id === currentTrack.id);
  const playingArtist = inArtist && isPlaying;

  const playTop = () => {
    if (inArtist) {
      togglePlay();
    } else if (tracks.length > 0) {
      playTrack(tracks[0], tracks.slice(1));
    }
  };

  const openRelease = (rel: ArtistRelease) => {
    openCollection({
      title: rel.title,
      kind: rel.kind,
      albumId: rel.id,
      artist: displayName,
      year: rel.year,
      thumbnail: rel.thumbnail,
      tracks: [],
    });
  };

  const playRelease = async (rel: ArtistRelease) => {
    if (busyReleaseId) return;
    releaseCtrlRef.current?.abort();
    const ctrl = new AbortController();
    releaseCtrlRef.current = ctrl;
    setBusyReleaseId(rel.id);
    try {
      const params = new URLSearchParams({
        id: rel.id,
        title: rel.title,
        artist: displayName,
      });
      const res = await fetch(`/api/album?${params.toString()}`, { signal: ctrl.signal });
      if (!res.ok) throw new Error('Album fetch failed');
      const data = (await res.json()) as { tracks?: Track[] };
      if (ctrl.signal.aborted) return;
      const list = data.tracks || [];
      if (list.length > 0) {
        playTrack(list[0], list.slice(1));
      } else {
        openRelease(rel);
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        toast('Could not play release');
      }
    } finally {
      if (!ctrl.signal.aborted) {
        setBusyReleaseId(null);
      }
    }
  };

  return (
    <div className="pb-12">
      <div className="px-6 pt-4 pb-6 flex flex-col sm:flex-row sm:items-end gap-6">
        {(avatarUrl || avatarTrack) && (
          <div className="w-32 h-32 sm:w-40 sm:h-40 shrink-0 rounded-full overflow-hidden bg-surface ring-1 ring-white/[0.08]">
            {avatarTrack ? (
              <TrackArtwork track={{ ...avatarTrack, thumbnail: avatarUrl }} size="md" />
            ) : (
              <SafeRemoteImg src={avatarUrl} />
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-accent mb-1.5">Artist</div>
          <h1 className="text-4xl sm:text-[54px] font-bold leading-[1.04] tracking-[-0.03em] truncate">
            {displayName}
          </h1>
          {profile?.description && (
            <p className="text-sm text-ink-2 mt-2.5 max-w-2xl line-clamp-2">
              {profile.description}
            </p>
          )}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={playTop}
              disabled={tracks.length === 0}
              aria-label={playingArtist ? 'Pause' : `Play ${displayName}`}
              className="h-9 px-5 rounded-md bg-accent hover:bg-accent-hover disabled:bg-hover disabled:text-ink-3 text-black text-xs font-semibold inline-flex items-center gap-2 transition-colors"
            >
              {playingArtist ? (
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
            </button>

            <button
              onClick={() => tracks[0] && startRadio(tracks[0])}
              disabled={tracks.length === 0}
              className="h-9 px-4 rounded-md border border-line hover:border-ink-2 hover:bg-surface text-xs font-medium text-ink disabled:opacity-40 inline-flex items-center gap-2 transition-colors"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Radio</span>
            </button>

            <span className="hidden md:inline text-xs text-ink-3 ml-1 tabular-nums">
              {loading && tracks.length === 0 ? 'Resolving...' : trackCountLabel(tracks.length)}
            </span>
          </div>
        </div>
      </div>

      {/* Top Songs */}
      <section className="px-2 mt-8 mb-10" aria-label="Popular tracks">
        <div className="px-4 mb-3 flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Top songs</h2>
        </div>
        {loading && tracks.length === 0 ? (
          <div aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
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
          <p className="px-4 py-8 text-sm text-ink-2">No songs found for {displayName}.</p>
        ) : (
          tracks.slice(0, 10).map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              index={i}
              contextQueue={tracks.slice(0, 10)}
            />
          ))
        )}
      </section>

      {/* Albums */}
      {albums.length > 0 && (
        <section className="px-6 mb-10" aria-label="Albums">
          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-[-0.02em]">Albums</h2>
          </div>
          <motion.div
            className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3"
            variants={gridVariants}
            initial="hidden"
            animate="show"
          >
            {albums.map((album) => {
              const playingHere =
                !!currentTrack && isPlaying && currentTrack.albumId === album.id;
              return (
                <MediaCard
                  key={album.id}
                  artwork={<SafeRemoteImg src={album.thumbnail} loading="lazy" />}
                  title={album.title}
                  subtitle={[album.kind, album.year].filter(Boolean).join(' · ')}
                  isPlaying={playingHere}
                  onOpen={() => openRelease(album)}
                  onPlay={() => playRelease(album)}
                />
              );
            })}
          </motion.div>
        </section>
      )}

      {/* Singles & EPs */}
      {singles.length > 0 && (
        <section className="px-6 mb-10" aria-label="Singles and EPs">
          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-[-0.02em]">Singles &amp; EPs</h2>
          </div>
          <motion.div
            className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3"
            variants={gridVariants}
            initial="hidden"
            animate="show"
          >
            {singles.map((single) => {
              const playingHere =
                !!currentTrack && isPlaying && currentTrack.albumId === single.id;
              return (
                <MediaCard
                  key={single.id}
                  artwork={<SafeRemoteImg src={single.thumbnail} loading="lazy" />}
                  title={single.title}
                  subtitle={[single.kind, single.year].filter(Boolean).join(' · ')}
                  isPlaying={playingHere}
                  onOpen={() => openRelease(single)}
                  onPlay={() => playRelease(single)}
                />
              );
            })}
          </motion.div>
        </section>
      )}

      {/* Fallback local releases if artist profile has no remote discography */}
      {albums.length === 0 && singles.length === 0 && fallbackReleases.length > 0 && (
        <section className="px-6 mb-10" aria-label="Releases">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Releases</h2>
          </div>
          <motion.div
            className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3"
            variants={gridVariants}
            initial="hidden"
            animate="show"
          >
            {fallbackReleases.map((album) => {
              const lead = album.tracks[0];
              const playingHere =
                !!currentTrack && isPlaying && album.tracks.some((t) => t.id === currentTrack.id);
              return (
                <MediaCard
                  key={album.key}
                  artwork={<TrackArtwork track={lead} size="md" />}
                  title={album.title}
                  subtitle={`${album.kind} · ${trackCountLabel(album.tracks.length)}`}
                  isPlaying={playingHere}
                  onOpen={() =>
                    openCollection({
                      title: album.title,
                      kind: album.kind,
                      albumId: lead.albumId,
                      artist: displayName,
                      thumbnail: lead.thumbnail,
                      tracks: album.tracks,
                    })
                  }
                  onPlay={() => {
                    if (currentTrack && album.tracks.some((t) => t.id === currentTrack.id)) {
                      togglePlay();
                    } else {
                      playTrack(lead, album.tracks.slice(1));
                    }
                  }}
                />
              );
            })}
          </motion.div>
        </section>
      )}

      {/* Related Artists */}
      {related.length > 0 && (
        <section className="px-6" aria-label="Related artists">
          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-[-0.02em]">Fans might also like</h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(156px,1fr))] gap-3">
            {related.map((rel) => (
              <button
                key={rel.id}
                onClick={() => openArtist(rel.name, rel.id)}
                className="group p-2.5 rounded-md hover:bg-surface text-left transition-colors"
              >
                <div className="w-full aspect-square rounded-full overflow-hidden bg-surface ring-1 ring-white/[0.06] mb-3">
                  <SafeRemoteImg
                    src={rel.thumbnail}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="text-sm font-semibold text-ink group-hover:text-accent truncate transition-colors">
                  {rel.name}
                </div>
                {rel.subtitle && (
                  <div className="text-xs text-ink-3 truncate mt-0.5">{rel.subtitle}</div>
                )}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
