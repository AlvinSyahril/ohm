import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { APP_VERSION } from '../lib/desktop';
import { LAST_SEEN_VERSION_KEY } from '../lib/changelog';
import { usePlayerStore } from '../store/usePlayerStore';

/**
 * Connects Electron main-process events (auto-update notifications, Tray "About",
 * and Tray playback shortcuts) cleanly into the React/Zustand client store.
 */
export const DesktopBridge: React.FC = () => {
  const notifiedVersionRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const desktop = typeof window !== 'undefined' ? window.ohmDesktop : undefined;
    if (desktop?.isElectron && document.documentElement) {
      document.documentElement.dataset.electron = 'true';
      document.documentElement.dataset.platform = desktop.platform;
    }
  }, []);

  useEffect(() => {
    const desktop = typeof window !== 'undefined' ? window.ohmDesktop : undefined;

    const maybeOpenWhatsNew = (version: string) => {
      try {
        const lastSeen = localStorage.getItem(LAST_SEEN_VERSION_KEY);
        if (lastSeen !== version && !usePlayerStore.getState().isUpdateModalOpen) {
          usePlayerStore.getState().setWhatsNewOpen(true);
        }
      } catch {
        // Ignore storage errors
      }
    };

    if (!desktop?.isElectron) {
      maybeOpenWhatsNew(APP_VERSION);
      return;
    }

    const handleStatus = (status: Parameters<Parameters<typeof desktop.onUpdateStatus>[0]>[0]) => {
      usePlayerStore.getState().setUpdateStatus(status);
      if (
        status.phase === 'available' &&
        status.latestVersion &&
        notifiedVersionRef.current !== status.latestVersion
      ) {
        notifiedVersionRef.current = status.latestVersion;
        if (!usePlayerStore.getState().isWhatsNewOpen) {
          usePlayerStore.getState().setUpdateModalOpen(true);
        }
      }
    };

    desktop
      .getInfo()
      .then((info) => {
        const version = info.version || APP_VERSION;
        usePlayerStore.getState().setDesktopVersion(info.version);
        if (info.updaterStatus) {
          handleStatus(info.updaterStatus);
        }
        maybeOpenWhatsNew(version);
      })
      .catch(() => {
        maybeOpenWhatsNew(APP_VERSION);
      });

    const unsubStatus = desktop.onUpdateStatus(handleStatus);
    const unsubDiscord = desktop.onDiscordStatus?.((status) => {
      usePlayerStore.getState().setDiscordRpcStatus(status);
    });
    const unsubAbout = desktop.onOpenAbout(() => {
      usePlayerStore.getState().setAboutOpen(true);
    });
    const unsubMedia = desktop.onMediaAction((action) => {
      const store = usePlayerStore.getState();
      if (action === 'toggle') store.togglePlay();
      else if (action === 'next') store.nextTrack();
      else if (action === 'prev') store.prevTrack();
    });

    return () => {
      unsubStatus();
      unsubDiscord?.();
      unsubAbout();
      unsubMedia();
    };
  }, []);

  const {
    currentTrack,
    isPlaying,
    duration,
    seekNonce,
    discordRpcEnabled,
    discordClientId,
    setDiscordRpcStatus,
  } = usePlayerStore(
    useShallow((s) => ({
      currentTrack: s.currentTrack,
      isPlaying: s.isPlaying,
      duration: s.duration,
      seekNonce: s.seekNonce,
      discordRpcEnabled: s.discordRpcEnabled,
      discordClientId: s.discordClientId,
      setDiscordRpcStatus: s.setDiscordRpcStatus,
    }))
  );

  // Event-driven Discord Rich Presence sync (updates only on track, play/pause, seek, or setting change)
  useEffect(() => {
    const desktop = typeof window !== 'undefined' ? window.ohmDesktop : undefined;
    if (!desktop?.isElectron || typeof desktop.setDiscordPresence !== 'function') return;

    const currentSec = usePlayerStore.getState().currentTime;
    const totalSec = duration || currentTrack?.duration || 0;
    const startMs = isPlaying ? Date.now() - Math.max(0, currentSec) * 1000 : undefined;
    const endMs =
      isPlaying && startMs && totalSec > 0 ? startMs + totalSec * 1000 : undefined;

    const trackUrl =
      currentTrack?.id && /^[A-Za-z0-9_-]{11}$/.test(currentTrack.id)
        ? `https://music.youtube.com/watch?v=${currentTrack.id}`
        : undefined;

    let cancelled = false;
    desktop
      .setDiscordPresence({
        enabled: discordRpcEnabled,
        clientId: discordClientId || undefined,
        track: currentTrack
          ? {
              title: currentTrack.title,
              artist: currentTrack.artist,
              album: currentTrack.album,
              artworkUrl: currentTrack.thumbnail,
              trackUrl,
              isPlaying,
              startMs,
              endMs,
            }
          : null,
      })
      .then((status) => {
        if (!cancelled) {
          setDiscordRpcStatus(status);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    currentTrack?.id,
    currentTrack?.title,
    currentTrack?.artist,
    currentTrack?.album,
    currentTrack?.thumbnail,
    isPlaying,
    duration,
    seekNonce,
    discordRpcEnabled,
    discordClientId,
    setDiscordRpcStatus,
  ]);

  return null;
};
