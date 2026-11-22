import type { Transition, Variants } from 'framer-motion';

/** Expo-out style curve: fast start, long soft landing. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Tactile spring for small controls (hearts, pills, toggles). */
export const SPRING: Transition = { type: 'spring', stiffness: 460, damping: 32, mass: 0.7 };

/** Softer spring for layout moves (queue reorder, sliding indicators). */
export const SPRING_LAYOUT: Transition = { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 };

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } },
};

export const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.02, delayChildren: 0.02 } },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};

export const popoverVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -4 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.16, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.1 } },
};

/** Row entrance delay that caps out so long lists never feel slow. */
export const rowDelay = (index: number): number => Math.min(index, 12) * 0.018;
