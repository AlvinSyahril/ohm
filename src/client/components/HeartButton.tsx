import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Track, usePlayerStore } from '../store/usePlayerStore';
import { toast } from '../store/useToastStore';
import { SPRING } from '../utils/motion';

interface HeartButtonProps {
  track: Track;
  className?: string;
  iconClassName?: string;
  /** Keep the idle (outline) state hidden until the parent is hovered. */
  revealClass?: string;
}

/** Like button with a spring pop on state change and user feedback. */
export const HeartButton: React.FC<HeartButtonProps> = ({
  track,
  className = '',
  iconClassName = 'w-4 h-4',
  revealClass = '',
}) => {
  const liked = usePlayerStore((s) => s.favorites.some((f) => f.id === track.id));
  const toggleFavorite = usePlayerStore((s) => s.toggleFavorite);

  return (
    <motion.button
      whileTap={{ scale: 0.82 }}
      transition={SPRING}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(track);
        toast(liked ? 'Removed from Liked songs' : 'Added to Liked songs');
      }}
      aria-label={liked ? 'Remove from Liked songs' : 'Add to Liked songs'}
      aria-pressed={liked}
      className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
        liked ? 'text-accent opacity-100' : `text-ink-2 hover:text-ink ${revealClass}`
      } ${className}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={liked ? 'on' : 'off'}
          initial={{ scale: liked ? 0.5 : 1, opacity: liked ? 0.4 : 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.08 } }}
          transition={liked ? { type: 'spring', stiffness: 600, damping: 14 } : { duration: 0.14 }}
          className="flex"
        >
          <Heart className={`${iconClassName} ${liked ? 'fill-current' : ''}`} />
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
};
