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

export type ActiveTab = 'discover' | 'search' | 'library' | 'queue';
export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  history: Track[];
  favorites: Track[];
  isPlaying: boolean;
  isLoadingStream: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  shuffle: boolean;
  activeTab: ActiveTab;
  isQueueOpen: boolean;
  sfxEnabled: boolean;
  searchQuery: string;
  searchResults: Track[];
  isSearching: boolean;

  // Actions
  setActiveTab: (tab: ActiveTab) => void;
  setQueueOpen: (open: boolean) => void;
  toggleSfx: () => void;
  setSearchQuery: (q: string) => void;
  performSearch: (q: string) => Promise<void>;

  playTrack: (track: Track, newQueue?: Track[]) => void;
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
  addToQueue: (track: Track) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  toggleFavorite: (track: Track) => void;
  isFavorite: (id: string) => boolean;
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

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  history: [],
  favorites: loadFavorites(),
  isPlaying: false,
  isLoadingStream: false,
  currentTime: 0,
  duration: 0,
  volume: 0.85,
  isMuted: false,
  repeatMode: 'off',
  shuffle: false,
  activeTab: 'discover',
  isQueueOpen: false,
  sfxEnabled: true,
  searchQuery: '',
  searchResults: [],
  isSearching: false,

  setActiveTab: (tab) => {
    sfx.playTap();
    set({ activeTab: tab });
  },

  setQueueOpen: (open) => {
    sfx.playTap();
    set({ isQueueOpen: open });
  },

  toggleSfx: () => {
    const next = !get().sfxEnabled;
    sfx.enabled = next;
    if (next) sfx.playTap();
    set({ sfxEnabled: next });
  },

  setSearchQuery: (q) => set({ searchQuery: q }),

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
    const { queue, currentTrack, repeatMode, shuffle, history } = get();
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

  toggleFavorite: (track) => {
    sfx.playTap();
    const { favorites } = get();
    const exists = favorites.some((t) => t.id === track.id);
    const updated = exists
      ? favorites.filter((t) => t.id !== track.id)
      : [track, ...favorites];
    saveFavorites(updated);
    set({ favorites: updated });
  },

  isFavorite: (id) => get().favorites.some((t) => t.id === id),
}));
