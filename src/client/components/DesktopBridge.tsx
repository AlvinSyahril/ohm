import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '../store/useToastStore';
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
    if (!desktop?.isElectron) return;

    const handleStatus = (status: Parameters<Parameters<typeof desktop.onUpdateStatus>[0]>[0]) => {
      usePlayerStore.getState().setUpdateStatus(status);
      if (
        status.phase === 'available' &&
        status.latestVersion &&
        notifiedVersionRef.current !== status.latestVersion
      ) {
        notifiedVersionRef.current = status.latestVersion;
        toast(`Ohm v${status.latestVersion} is available — open About to update`);
      }
    };

    desktop
      .getInfo()
      .then((info) => {
        usePlayerStore.getState().setDesktopVersion(info.version);
        if (info.updaterStatus) {
          handleStatus(info.updaterStatus);
        }
      })
      .catch(() => {});

    const unsubStatus = desktop.onUpdateStatus(handleStatus);
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
              isPlaying,
              startMs,
              endMs,
            }
          : null,
      })
      .then((status) => {
        setDiscordRpcStatus(status);
      })
      .catch(() => {});
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
