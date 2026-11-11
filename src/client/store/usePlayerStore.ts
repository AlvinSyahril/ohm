import { create } from 'zustand';
import { sfx } from '../utils/soundFx';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  thumbnail?: string;
  source: 'youtube';
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
}

export type ActiveTab = 'discover' | 'explore' | 'library';
export type RepeatMode = 'off' | 'all' | 'one';
export type InspectorTab = 'queue' | 'intel';

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  history: Track[];
  favorites: Track[];
  playlists: Playlist[];
  activePlaylistId: string | null;

  isPlaying: boolean;
  isLoadingStream: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  shuffle: boolean;
  autoplay: boolean;

  activeTab: ActiveTab;
  isQueueOpen: boolean;
  inspectorTab: InspectorTab;
  sfxEnabled: boolean;

  searchQuery: string;
  searchResults: Track[];
  isSearching: boolean;
  activeMood: string | null;

  tasteTracks: Track[];
  isLoadingTaste: boolean;

  // Actions
  setActiveTab: (tab: ActiveTab) => void;
  setQueueOpen: (open: boolean) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  toggleSfx: () => void;
  setSearchQuery: (q: string) => void;
  setActiveMood: (mood: string | null) => void;
  setActivePlaylistId: (id: string | null) => void;
  performSearch: (q: string) => Promise<void>;

  playTrack: (track: Track, newQueue?: Track[]) => void;
  startRadio: (track: Track) => Promise<void>;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  setIsLoadingStream: (loading: boolean) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  toggleAutoplay: () => void;

  addToQueue: (track: Track) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;

  toggleFavorite: (track: Track) => void;
  isFavorite: (id: string) => boolean;

  createPlaylist: (name: string) => string;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;

  fetchTasteRecommendations: () => Promise<void>;
}

const loadFavorites = (): Track[] => {
  try {
    const raw = localStorage.getItem('ohm_favorites');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveFavorites = (tracks: Track[]) => {
  try {
    localStorage.setItem('ohm_favorites', JSON.stringify(tracks));
  } catch {
    // Ignore storage errors
  }
};

const loadPlaylists = (): Playlist[] => {
  try {
    const raw = localStorage.getItem('ohm_playlists');
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return [
    {
      id: 'pl-synth-classics',
      name: 'Cyberpunk & Synth',
      tracks: [],
      createdAt: Date.now() - 86400000,
    },
    {
      id: 'pl-late-night',
      name: 'Late Night Chill',
      tracks: [],
      createdAt: Date.now() - 43200000,
    },
  ];
};

const savePlaylists = (playlists: Playlist[]) => {
  try {
    localStorage.setItem('ohm_playlists', JSON.stringify(playlists));
  } catch {
    // Ignore storage errors
  }
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  history: [],
  favorites: loadFavorites(),
  playlists: loadPlaylists(),
  activePlaylistId: null,

  isPlaying: false,
  isLoadingStream: false,
  currentTime: 0,
  duration: 0,
  volume: 0.85,
  isMuted: false,
  repeatMode: 'off',
  shuffle: false,
  autoplay: true,

  activeTab: 'discover',
  isQueueOpen: true,
  inspectorTab: 'queue',
  sfxEnabled: true,

  searchQuery: '',
  searchResults: [],
  isSearching: false,
  activeMood: 'All',

  tasteTracks: [],
  isLoadingTaste: false,

  setActiveTab: (tab) => {
    sfx.playTap();
    set({ activeTab: tab, activePlaylistId: null });
  },

  setQueueOpen: (open) => {
    sfx.playTap();
    set({ isQueueOpen: open });
  },

  setInspectorTab: (tab) => {
    sfx.playTap();
    set({ inspectorTab: tab });
  },

  toggleSfx: () => {
    const next = !get().sfxEnabled;
    sfx.enabled = next;
    if (next) sfx.playTap();
    set({ sfxEnabled: next });
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveMood: (mood) => set({ activeMood: mood }),
  setActivePlaylistId: (id) => set({ activePlaylistId: id }),

  performSearch: async (q) => {
    if (!q.trim()) return;
    set({ isSearching: true, searchQuery: q });
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) throw new Error('Search request failed');
      const data = await res.json();
      set({ searchResults: data.tracks || [], isSearching: false });
    } catch (err) {
      console.error('Search failed:', err);
      set({ isSearching: false });
    }
  },

  playTrack: (track, newQueue) => {
    sfx.playEngage();
    const { currentTrack, history, queue } = get();
    const updatedHistory = currentTrack
      ? [currentTrack, ...history.filter((t) => t.id !== currentTrack.id)].slice(0, 30)
      : history;

    set({
      currentTrack: track,
      isPlaying: true,
      isLoadingStream: true,
      currentTime: 0,
      duration: track.duration || 0,
      history: updatedHistory,
      queue: newQueue !== undefined ? newQueue : queue,
    });

    // Dynamically trigger taste adaptation in background
    get().fetchTasteRecommendations();
  },

  startRadio: async (track) => {
    sfx.playEngage();
    const { currentTrack, history } = get();
    const updatedHistory = currentTrack
      ? [currentTrack, ...history.filter((t) => t.id !== currentTrack.id)].slice(0, 30)
      : history;

    set({
      currentTrack: track,
      isPlaying: true,
      isLoadingStream: true,
      currentTime: 0,
      duration: track.duration || 0,
      history: updatedHistory,
      isQueueOpen: true,
      inspectorTab: 'queue',
    });

    try {
      const res = await fetch(`/api/radio/${encodeURIComponent(track.id)}`);
      if (res.ok) {
        const data = await res.json();
        const algorithmicTracks: Track[] = (data.tracks || []).filter(
          (t: Track) => t.id !== track.id
        );
        set({
          queue: algorithmicTracks,
          tasteTracks: algorithmicTracks.slice(0, 16),
        });
      }
    } catch (err) {
      console.warn('Failed to start radio:', err);
    }
  },

  togglePlay: () => {
    const { currentTrack, isPlaying, queue } = get();
    sfx.playTap();
    if (!currentTrack && queue.length > 0) {
      get().playTrack(queue[0], queue.slice(1));
      return;
    }
    if (currentTrack) {
      set({ isPlaying: !isPlaying });
    }
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsLoadingStream: (loading) => set({ isLoadingStream: loading }),

  nextTrack: () => {
    const { queue, currentTrack, repeatMode, shuffle, history, autoplay } = get();
    sfx.playTap();

    if (repeatMode === 'one' && currentTrack) {
      set({ currentTime: 0, isPlaying: true });
      return;
    }

    if (queue.length === 0) {
      if (repeatMode === 'all' && history.length > 0) {
        const reversed = [...history].reverse();
        const next = reversed[0];
        set({
          currentTrack: next,
          queue: reversed.slice(1),
          history: [],
          currentTime: 0,
          isPlaying: true,
          isLoadingStream: true,
        });
      } else if (autoplay && currentTrack) {
        // Smart Autoplay: fetch next radio tracks from YouTube Music!
        fetch(`/api/radio/${encodeURIComponent(currentTrack.id)}`)
          .then((r) => r.json())
          .then((data) => {
            const nextList: Track[] = (data.tracks || []).filter(
              (t: Track) => t.id !== currentTrack.id
            );
            if (nextList.length > 0) {
              get().playTrack(nextList[0], nextList.slice(1));
            } else {
              set({ isPlaying: false });
            }
          })
          .catch(() => set({ isPlaying: false }));
      } else {
        set({ isPlaying: false });
      }
      return;
    }

    let nextIndex = 0;
    if (shuffle && queue.length > 1) {
      nextIndex = Math.floor(Math.random() * queue.length);
    }

    const next = queue[nextIndex];
    const remainingQueue = queue.filter((_, idx) => idx !== nextIndex);
    const updatedHistory = currentTrack
      ? [currentTrack, ...history.filter((t) => t.id !== currentTrack.id)].slice(0, 30)
      : history;

    set({
      currentTrack: next,
      queue: remainingQueue,
      history: updatedHistory,
      currentTime: 0,
      duration: next.duration || 0,
      isPlaying: true,
      isLoadingStream: true,
    });

    get().fetchTasteRecommendations();
  },

  prevTrack: () => {
    const { currentTime, history, currentTrack, queue } = get();
    sfx.playTap();

    if (currentTime > 4) {
      set({ currentTime: 0 });
      return;
    }

    if (history.length > 0) {
      const prev = history[0];
      const remainingHistory = history.slice(1);
      const updatedQueue = currentTrack ? [currentTrack, ...queue] : queue;

      set({
        currentTrack: prev,
        history: remainingHistory,
        queue: updatedQueue,
        currentTime: 0,
        duration: prev.duration || 0,
        isPlaying: true,
        isLoadingStream: true,
      });
    }
  },

  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),

  setVolume: (vol) => {
    const clamped = Math.max(0, Math.min(1, vol));
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  toggleMute: () => {
    sfx.playTap();
    set((state) => ({ isMuted: !state.isMuted }));
  },

  toggleRepeat: () => {
    sfx.playTap();
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const current = get().repeatMode;
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    set({ repeatMode: next });
  },

  toggleShuffle: () => {
    sfx.playTap();
    set((state) => ({ shuffle: !state.shuffle }));
  },

  toggleAutoplay: () => {
    sfx.playTap();
    set((state) => ({ autoplay: !state.autoplay }));
  },

  addToQueue: (track) => {
    sfx.playTap();
    set((state) => {
      if (state.queue.some((t) => t.id === track.id)) return state;
      return { queue: [...state.queue, track] };
    });
  },

  removeFromQueue: (id) => {
    sfx.playTap();
    set((state) => ({ queue: state.queue.filter((t) => t.id !== id) }));
  },

  clearQueue: () => {
    sfx.playTap();
    set({ queue: [] });
  },

  reorderQueue: (fromIndex, toIndex) => {
    const { queue } = get();
    if (fromIndex < 0 || fromIndex >= queue.length || toIndex < 0 || toIndex >= queue.length) return;
    const updated = [...queue];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    set({ queue: updated });
  },

  toggleFavorite: (track) => {
    sfx.playTap();
    const { favorites } = get();
    const exists = favorites.some((t) => t.id === track.id);
    const updated = exists
      ? favorites.filter((t) => t.id !== track.id)
      : [track, ...favorites];
    saveFavorites(updated);
    set({ favorites: updated });

    // Dynamically update recommendations based on favorite shift
    get().fetchTasteRecommendations();
  },

  isFavorite: (id) => get().favorites.some((t) => t.id === id),

  createPlaylist: (name) => {
    sfx.playEngage();
    const newPlaylist: Playlist = {
      id: `pl-${Date.now()}`,
      name: name.trim() || 'Untitled Playlist',
      tracks: [],
      createdAt: Date.now(),
    };
    const updated = [...get().playlists, newPlaylist];
    savePlaylists(updated);
    set({ playlists: updated, activePlaylistId: newPlaylist.id, activeTab: 'library' });
    return newPlaylist.id;
  },

  deletePlaylist: (id) => {
    sfx.playTap();
    const updated = get().playlists.filter((p) => p.id !== id);
    savePlaylists(updated);
    set({
      playlists: updated,
      activePlaylistId: get().activePlaylistId === id ? null : get().activePlaylistId,
    });
  },

  addTrackToPlaylist: (playlistId, track) => {
    sfx.playTap();
    const updated = get().playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      if (pl.tracks.some((t) => t.id === track.id)) return pl;
      return { ...pl, tracks: [...pl.tracks, track] };
    });
    savePlaylists(updated);
    set({ playlists: updated });

    get().fetchTasteRecommendations();
  },

  removeTrackFromPlaylist: (playlistId, trackId) => {
    sfx.playTap();
    const updated = get().playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      return { ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) };
    });
    savePlaylists(updated);
    set({ playlists: updated });
  },

  fetchTasteRecommendations: async () => {
    const { favorites, history, playlists, currentTrack } = get();
    const seedTrack = currentTrack || favorites[0] || history[0];
    if (!seedTrack) return;

    set({ isLoadingTaste: true });
    try {
      const res = await fetch(`/api/radio/${encodeURIComponent(seedTrack.id)}`);
      if (res.ok) {
        const data = await res.json();
        const tracks: Track[] = (data.tracks || []).slice(0, 16);
        set({ tasteTracks: tracks, isLoadingTaste: false });
      } else {
        set({ isLoadingTaste: false });
      }
    } catch {
      set({ isLoadingTaste: false });
    }
  },
}));
