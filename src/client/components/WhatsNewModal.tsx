import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, X } from 'lucide-react';
import { APP_VERSION, openExternalSafe } from '../lib/desktop';
import { LATEST_RELEASE, LAST_SEEN_VERSION_KEY } from '../lib/changelog';
import { usePlayerStore } from '../store/usePlayerStore';
import { OhmLogo } from './OhmLogo';
import { EASE_OUT } from '../utils/motion';

/**
 * Shown once per version when the user opens Ohm on a newly installed or updated release.
 */
export const WhatsNewModal: React.FC = () => {
  const isOpen = usePlayerStore((s) => s.isWhatsNewOpen);
  const setOpen = usePlayerStore((s) => s.setWhatsNewOpen);
  const desktopVersion = usePlayerStore((s) => s.desktopVersion);

  const closeRef = useRef<HTMLButtonElement>(null);
  const version = desktopVersion || APP_VERSION;

  const dismiss = () => {
    try {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, version);
    } catch {
      // Ignore storage errors
    }
    setOpen(false);
    const state = usePlayerStore.getState();
    if (state.updateStatus?.phase === 'available') {
      state.setUpdateModalOpen(true);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, version]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`What's new in Ohm v${version}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
          onClick={dismiss}
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
                <OhmLogo className="w-6 h-6 shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-ink truncate">
                    What&apos;s new in Ohm
                  </h2>
                  <p className="text-[11px] text-ink-3 tabular-nums">v{version}</p>
                </div>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={dismiss}
                aria-label="Close what's new"
                className="w-7 h-7 rounded-md hover:bg-hover flex items-center justify-center text-ink-2 hover:text-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="rounded-md bg-canvas/70 border border-line p-4 space-y-2.5 max-h-72 overflow-y-auto">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-sm bg-raised border border-line text-ink tabular-nums">
                    v{version}
                  </span>
                  <span className="text-xs font-medium text-ink-2">{LATEST_RELEASE.label}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-ink-2 leading-relaxed list-disc pl-4">
                  {LATEST_RELEASE.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-line flex items-center justify-between gap-2 bg-base/40">
              <button
                type="button"
                onClick={() => void openExternalSafe('releases')}
                className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink transition-colors"
              >
                <span>Full release history on GitHub</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={dismiss}
                className="h-8 px-4 rounded-md bg-accent hover:bg-accent-hover text-black text-xs font-semibold transition-colors"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
