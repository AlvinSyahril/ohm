import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Download, RotateCw, Sparkles, X } from 'lucide-react';
import { APP_VERSION, openExternalSafe } from '../lib/desktop';
import { usePlayerStore } from '../store/usePlayerStore';
import { EASE_OUT } from '../utils/motion';

/**
 * Pop-up modal shown automatically when a newer desktop release is detected.
 */
export const UpdatePromptModal: React.FC = () => {
  const isOpen = usePlayerStore((s) => s.isUpdateModalOpen);
  const setOpen = usePlayerStore((s) => s.setUpdateModalOpen);
  const desktopVersion = usePlayerStore((s) => s.desktopVersion);
  const updateStatus = usePlayerStore((s) => s.updateStatus);
  const setUpdateStatus = usePlayerStore((s) => s.setUpdateStatus);

  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, setOpen]);

  const currentVersion = desktopVersion || APP_VERSION;
  const latestVersion = updateStatus?.latestVersion || currentVersion;
  const phase = updateStatus?.phase || 'available';
  const progress = Math.max(0, Math.min(100, Math.round(updateStatus?.downloadProgress ?? 0)));
  const items =
    updateStatus?.changelog && updateStatus.changelog.length > 0
      ? updateStatus.changelog
      : ['Includes stability fixes, audio polish, and performance improvements.'];

  const handleDownload = async () => {
    const desktop = typeof window !== 'undefined' ? window.ohmDesktop : undefined;
    if (!desktop?.downloadUpdate) return;
    try {
      const next = await desktop.downloadUpdate();
      if (next) setUpdateStatus(next);
    } catch {
      // Errors are surfaced via updater status events
    }
  };

  const handleInstall = async () => {
    const desktop = typeof window !== 'undefined' ? window.ohmDesktop : undefined;
    if (!desktop?.installUpdate) return;
    try {
      await desktop.installUpdate();
    } catch {
      // Ignore install IPC errors
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Update available"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 electron-top-bar z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg bg-surface border border-line shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-ink truncate">Update available</h2>
                  <p className="text-[11px] text-ink-3 tabular-nums">
                    v{currentVersion} -&gt; v{latestVersion}
                  </p>
                </div>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close update prompt"
                className="w-7 h-7 rounded-md hover:bg-hover flex items-center justify-center text-ink-2 hover:text-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="rounded-md bg-canvas/70 border border-line p-3.5 space-y-2 max-h-56 overflow-y-auto">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-sm bg-raised border border-line text-ink tabular-nums">
                    v{latestVersion}
                  </span>
                  <span className="text-xs font-medium text-ink-2">Release notes</span>
                </div>
                <ul className="space-y-1.5 text-xs text-ink-2 leading-relaxed list-disc pl-4">
                  {items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {phase === 'downloading' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-ink-2 tabular-nums">
                    <span>Downloading installer...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-raised overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {phase === 'error' && updateStatus?.error && (
                <p className="text-xs text-danger">{updateStatus.error}</p>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-line flex items-center justify-between gap-2 bg-base/40">
              <button
                type="button"
                onClick={() => void openExternalSafe('releases')}
                className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink transition-colors"
              >
                <span>GitHub Releases</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-8 px-3 rounded-md bg-raised hover:bg-hover text-xs font-medium text-ink-2 hover:text-ink transition-colors"
                >
                  Later
                </button>
                {phase === 'ready' ? (
                  <button
                    type="button"
                    onClick={() => void handleInstall()}
                    className="h-8 px-3.5 rounded-md bg-accent hover:bg-accent-hover text-black text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Restart &amp; install</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={phase === 'downloading'}
                    onClick={() => void handleDownload()}
                    className="h-8 px-3.5 rounded-md bg-accent hover:bg-accent-hover disabled:opacity-50 text-black text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{phase === 'downloading' ? 'Downloading...' : 'Download & install'}</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
