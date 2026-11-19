import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from '../store/useToastStore';
import { EASE_OUT } from '../utils/motion';

export const Toaster: React.FC = () => {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-[104px] left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.16 } }}
            className="pointer-events-auto flex items-center gap-4 h-11 pl-4 pr-3 rounded-md bg-ink text-black text-sm font-medium"
          >
            <span>{t.message}</span>
            {t.actionLabel && (
              <button
                onClick={() => {
                  t.onAction?.();
                  dismiss(t.id);
                }}
                className="font-bold underline underline-offset-2 hover:no-underline"
              >
                {t.actionLabel}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
