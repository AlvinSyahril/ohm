import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  HeartHandshake,
  Instagram,
  RefreshCw,
  RotateCw,
  X,
} from 'lucide-react';
import {
  APP_VERSION,
  CREATOR_DONATE_LABEL,
  CREATOR_INSTAGRAM_HANDLE,
  isDesktopApp,
  openExternalSafe,
} from '../lib/desktop';
import { usePlayerStore } from '../store/usePlayerStore';
import { OhmLogo } from './OhmLogo';
import { EASE_OUT } from '../utils/motion';

interface ChangelogRelease {
  version: string;
  label: string;
  items: string[];
}

const APP_CHANGELOG: ChangelogRelease[] = [
  {
    version: '0.1.0',
    label: 'First Release',
    items: [
      'Discover trending tracks, search with instant suggestions, and organize Songs, Albums, Artists, and Playlists.',
      'Smooth transitions between songs, custom sound presets, and a built-in sleep timer.',
      'Full-screen Now Playing view with live synced lyrics and easy queue reordering.',
      'Stays handy in the Windows system tray and lets you update right inside the app.',
    ],
  },
];

export const AboutModal: React.FC = () => {
  const isOpen = usePlayerStore((s) => s.isAboutOpen);
  const setOpen = usePlayerStore((s) => s.setAboutOpen);
  const desktopVersion = usePlayerStore((s) => s.desktopVersion);
  const updateStatus = usePlayerStore((s) => s.updateStatus);
  const setUpdateStatus = usePlayerStore((s) => s.setUpdateStatus);
  const discordRpcEnabled = usePlayerStore((s) => s.discordRpcEnabled);
  const setDiscordRpcEnabled = usePlayerStore((s) => s.setDiscordRpcEnabled);
  const discordClientId = usePlayerStore((s) => s.discordClientId);
  const setDiscordClientId = usePlayerStore((s) => s.setDiscordClientId);
  const discordRpcStatus = usePlayerStore((s) => s.discordRpcStatus);

  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const version = desktopVersion || APP_VERSION;
  const desktop = isDesktopApp();
  const phase = updateStatus?.phase ?? 'idle';

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, setOpen]);

  const handleCheck = async () => {
    setBusy(true);
    setUpdateStatus({
      phase: 'checking',
      currentVersion: version,
    });
    try {
      if (desktop && window.ohmDesktop) {
        const next = await window.ohmDesktop.checkForUpdates();
        if (next) setUpdateStatus(next);
        return;
      }
      const res = await fetch('/api/updates', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Could not check for updates right now. Please try again later.');
      }
      const data = await res.json();
      setUpdateStatus(data);
    } catch {
      setUpdateStatus({
        phase: 'error',
        currentVersion: version,
        error: 'Could not check for updates. Check your internet connection and try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (desktop && window.ohmDesktop) {
      setBusy(true);
      try {
        const next = await window.ohmDesktop.downloadUpdate();
        if (next) setUpdateStatus(next);
      } finally {
        setBusy(false);
      }
      return;
    }
    const targetUrl = updateStatus?.downloadUrl;
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      openExternalSafe('releases');
    }
  };

  const handleInstall = async () => {
    if (!desktop || !window.ohmDesktop) return;
    await window.ohmDesktop.installUpdate();
  };

  const renderUpdateStatusLine = () => {
    switch (phase) {
      case 'checking':
        return 'Checking for a newer version...';
      case 'available':
        return `Ohm v${updateStatus?.latestVersion} is out and ready to download.`;
      case 'downloading':
        return `Downloading the latest version... ${updateStatus?.downloadProgress ?? 0}%`;
      case 'ready':
        return `Ohm v${updateStatus?.latestVersion} is ready to install.`;
      case 'error':
        return updateStatus?.error || 'Could not check for updates right now. Please try again later.';
      case 'up-to-date':
        return updateStatus?.feedPending
          ? `You are on v${version}. No new updates are available right now.`
          : `You are all caught up on v${version}.`;
      default:
        return `You are on v${version}. Check anytime to see if a new update is out.`;
    }
  };

  const remoteChangelog =
    phase === 'available' || phase === 'downloading' || phase === 'ready'
      ? updateStatus?.changelog ?? []
      : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="about-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 electron-top-bar z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="About Ohm"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-lg bg-surface border border-line overflow-hidden select-text"
          >
            <div className="h-14 px-5 border-b border-line flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">About Ohm</h2>
              <button
                ref={closeRef}
                onClick={() => setOpen(false)}
                aria-label="Close about dialog"
                className="w-8 h-8 rounded-md flex items-center justify-center text-ink-2 hover:text-ink hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[76vh] overflow-y-auto">
              {/* Brand identity */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-canvas border border-line flex items-center justify-center shrink-0">
                  <OhmLogo className="w-10 h-10" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-ink tracking-tight">ohm</h3>
                    <span className="px-2 py-0.5 text-[11px] font-medium rounded-sm bg-raised border border-line text-ink-2 tabular-nums">
                      v{version}
                    </span>
                  </div>
                  <p className="text-xs text-ink-2 mt-1">
                    A clean, distraction-free music player with smooth transitions, custom sound presets,
                    and synced lyrics.
                  </p>
                </div>
              </div>

              {/* Software updates card */}
              <section className="rounded-md bg-canvas/70 border border-line p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {phase === 'available' || phase === 'ready' ? (
                      <span className="w-2 h-2 rounded-full bg-accent shrink-0" aria-hidden />
                    ) : phase === 'up-to-date' ? (
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                    ) : null}
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">
                      App Updates
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openExternalSafe('releases')}
                    className="text-xs text-ink-3 hover:text-ink inline-flex items-center gap-1 transition-colors"
                  >
                    Version history
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-sm text-ink-2 leading-relaxed">{renderUpdateStatusLine()}</p>

                {phase === 'downloading' && (
                  <div className="w-full h-1.5 rounded-full bg-raised overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-150"
                      style={{ width: `${Math.max(4, updateStatus?.downloadProgress ?? 0)}%` }}
                    />
                  </div>
                )}

                {remoteChangelog.length > 0 && (
                  <div className="pt-1 space-y-1.5 border-t border-line/70">
                    <p className="text-[11px] font-medium text-ink-3">
                      {"What's new"}
                      {updateStatus?.latestVersion ? ` in v${updateStatus.latestVersion}` : ''}
                    </p>
                    <ul className="space-y-1 text-xs text-ink-2 list-disc list-inside">
                      {remoteChangelog.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {(phase === 'idle' || phase === 'up-to-date' || phase === 'error' || phase === 'checking') && (
                    <button
                      type="button"
                      disabled={busy || phase === 'checking'}
                      onClick={handleCheck}
                      className="h-8 px-3 rounded-md bg-raised hover:bg-hover border border-line text-xs font-medium text-ink inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${phase === 'checking' ? 'animate-spin' : ''}`} />
                      {phase === 'checking' ? 'Checking...' : 'Check for updates'}
                    </button>
                  )}

                  {phase === 'available' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleDownload}
                      className="h-8 px-3.5 rounded-md bg-accent hover:bg-accent-hover text-xs font-semibold text-black inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download update
                    </button>
                  )}

                  {desktop && phase === 'ready' && (
                    <button
                      type="button"
                      onClick={handleInstall}
                      className="h-8 px-3.5 rounded-md bg-accent hover:bg-accent-hover text-xs font-semibold text-black inline-flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Install and restart
                    </button>
                  )}
                </div>
              </section>

              {desktop && (
                <section className="rounded-md bg-canvas/70 border border-line p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          discordRpcStatus === 'connected'
                            ? 'bg-accent'
                            : discordRpcEnabled
                              ? 'bg-ink-2'
                              : 'bg-ink-3/50'
                        }`}
                        aria-hidden
                      />
                      <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">
                        Discord Rich Presence
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={discordRpcEnabled}
                      onClick={() => setDiscordRpcEnabled(!discordRpcEnabled)}
                      className={`h-7 px-3 rounded-md border text-[11px] font-semibold transition-colors ${
                        discordRpcEnabled
                          ? 'bg-accent border-accent text-black'
                          : 'bg-raised border-line text-ink-2 hover:text-ink'
                      }`}
                    >
                      {discordRpcEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-ink-2">
                      Show current track, artist, cover art, and progress on your Discord profile.
                    </span>
                    <span className="text-[11px] font-medium text-ink-3 shrink-0">
                      {discordRpcStatus === 'connected'
                        ? 'Connected'
                        : discordRpcStatus === 'needs_client_id'
                          ? 'App ID required'
                          : discordRpcStatus === 'disconnected'
                            ? 'Discord not running'
                            : 'Off'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="ohm-discord-client-id" className="block text-[11px] text-ink-3">
                      Custom Discord Application ID (optional — Ohm default built in)
                    </label>
                    <input
                      id="ohm-discord-client-id"
                      type="text"
                      value={discordClientId}
                      onChange={(e) => setDiscordClientId(e.target.value)}
                      placeholder="Paste Discord Application Client ID..."
                      className="w-full h-8 px-2.5 rounded-md bg-surface border border-line text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
                    />
                  </div>
                </section>
              )}

              {/* Release changelog */}
              <section className="rounded-md bg-canvas/70 border border-line p-4 space-y-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-ink-2">
                  {"What's New"}
                </span>
                <div className="space-y-3">
                  {APP_CHANGELOG.map((release) => (
                    <div key={release.version} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-sm bg-raised border border-line text-ink tabular-nums">
                          v{release.version}
                        </span>
                        <span className="text-xs font-medium text-ink-2">{release.label}</span>
                      </div>
                      <ul className="space-y-1 text-xs text-ink-2 leading-relaxed list-disc pl-4">
                        {release.items.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              {/* Creator & Support colophon */}
              <section className="rounded-md bg-canvas/70 border border-line p-4 space-y-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-ink-2">
                  Creator & Support
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => openExternalSafe('instagram')}
                    className="h-10 px-3 rounded-md bg-surface hover:bg-hover border border-line flex items-center justify-between gap-2 text-left transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Instagram className="w-4 h-4 text-ink-2 group-hover:text-ink shrink-0" />
                      <span className="text-xs font-medium text-ink truncate">
                        {CREATOR_INSTAGRAM_HANDLE}
                      </span>
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-ink-3 group-hover:text-ink shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openExternalSafe('donate')}
                    className="h-10 px-3 rounded-md bg-surface hover:bg-hover border border-line flex items-center justify-between gap-2 text-left transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <HeartHandshake className="w-4 h-4 text-accent shrink-0" />
                      <span className="text-xs font-medium text-ink truncate">
                        {CREATOR_DONATE_LABEL}
                      </span>
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-ink-3 group-hover:text-ink shrink-0" />
                  </button>
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
