import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { EASE_OUT } from '../utils/motion';

interface ShortcutGroup {
  heading: string;
  items: { keys: string[]; label: string }[];
}

const GROUPS: ShortcutGroup[] = [
  {
    heading: 'Playback',
    items: [
      { keys: ['Space'], label: 'Play or pause' },
      { keys: ['N'], label: 'Next song' },
      { keys: ['P'], label: 'Previous song' },
      { keys: ['Left', 'Right'], label: 'Seek 5 seconds' },
      { keys: ['Shift', 'Left / Right'], label: 'Previous / next song' },
      { keys: ['M'], label: 'Mute or unmute' },
    ],
  },
  {
    heading: 'Navigation',
    items: [
      { keys: ['1–5'], label: 'Home, Explore, Songs, Albums, Artists' },
      { keys: ['Alt', 'Left / Right'], label: 'Back / forward' },
      { keys: ['/', 'Ctrl+K'], label: 'Focus search' },
    ],
  },
  {
    heading: 'Panels',
    items: [
      { keys: ['L'], label: 'Toggle Now Playing stage' },
      { keys: ['Q'], label: 'Toggle Up Next queue' },
      { keys: ['?'], label: 'Show keyboard shortcuts' },
      { keys: ['Esc'], label: 'Close open overlay or menu' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC = () => {
  const isOpen = usePlayerStore((s) => s.isShortcutsOpen);
  const setOpen = usePlayerStore((s) => s.setShortcutsOpen);
  const closeRef = useRef<HTMLButtonElement>(null);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="shortcuts-backdrop"
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
            aria-label="Keyboard shortcuts"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-lg bg-surface border border-line overflow-hidden"
          >
            <div className="h-14 px-5 border-b border-line flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Keyboard shortcuts</h2>
              <button
                ref={closeRef}
                onClick={() => setOpen(false)}
                aria-label="Close keyboard shortcuts"
                className="w-8 h-8 rounded-md flex items-center justify-center text-ink-2 hover:text-ink hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6 max-h-[72vh] overflow-y-auto">
              {GROUPS.map((group) => (
                <section key={group.heading}>
                  <h3 className="text-xs font-medium text-ink-3 mb-2.5">{group.heading}</h3>
                  <div className="divide-y divide-line border border-line rounded-md bg-canvas/60">
                    {group.items.map((item) => (
                      <div
                        key={item.label}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-4 text-sm"
                      >
                        <span className="text-ink-2">{item.label}</span>
                        <span className="flex items-center gap-1 shrink-0">
                          {item.keys.map((k, idx) => (
                            <React.Fragment key={k}>
                              {idx > 0 && <span className="text-xs text-ink-3">+</span>}
                              <kbd className="px-2 py-0.5 text-[11px] font-medium text-ink bg-raised border border-line rounded-sm tabular-nums">
                                {k}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
