import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { EASE_OUT, SPRING } from '../utils/motion';

export interface SliderProps {
  value: number; // 0..1
  buffered?: number; // 0..1
  label: string;
  valueText?: string;
  variant?: 'bar' | 'rail';
  formatTooltip?: (ratio: number) => string;
  /** Optional sampler polled inside requestAnimationFrame for 60fps compositor updates without React re-renders. */
  getLiveValue?: () => number | null;
  liveActive?: boolean;
  onScrub?: (v: number | null) => void;
  onCommit: (v: number) => void;
  className?: string;
}

/**
 * Pointer and keyboard driven slider used for seek rails and volume.
 * Updates progress fill and thumb directly via GPU transforms in rAF while active,
 * halting immediately when paused, hidden, or scrubbed.
 */
export const Slider: React.FC<SliderProps> = ({
  value,
  buffered,
  label,
  valueText,
  variant = 'bar',
  formatTooltip,
  getLiveValue,
  liveActive = false,
  onScrub,
  onCommit,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbWrapRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(0);
  const draggingRef = useRef(false);
  const latestRatioRef = useRef(Math.min(1, Math.max(0, value)));
  const getLiveRef = useRef(getLiveValue);
  getLiveRef.current = getLiveValue;

  const [isDragging, setIsDragging] = useState(false);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const applyVisualRatio = useCallback(
    (r: number) => {
      const clamped = Math.min(1, Math.max(0, r));
      latestRatioRef.current = clamped;
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${clamped})`;
      }
      if (thumbWrapRef.current) {
        const w = widthRef.current;
        let px = clamped * w;
        if (variant === 'rail' && w > 16) {
          px = Math.min(w - 6, Math.max(6, px));
        }
        thumbWrapRef.current.style.transform = `translate3d(${px}px, 0, 0)`;
      }
    },
    [variant]
  );

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const syncWidth = () => {
      widthRef.current = track.clientWidth;
      applyVisualRatio(latestRatioRef.current);
    };
    syncWidth();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(syncWidth);
    ro.observe(track);
    return () => ro.disconnect();
  }, [applyVisualRatio]);

  useLayoutEffect(() => {
    if (draggingRef.current) return;
    // While 60fps rAF owns the seek rail, ignore slower ~4Hz timeupdate ticks to prevent micro-jitter
    if (liveActive && getLiveRef.current) return;
    applyVisualRatio(value);
  }, [value, liveActive, applyVisualRatio]);

  useEffect(() => {
    if (!liveActive || !getLiveRef.current) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    let rafId = 0;
    const tick = () => {
      if (document.visibilityState !== 'visible') {
        rafId = 0;
        return;
      }
      if (!draggingRef.current) {
        const next = getLiveRef.current?.();
        if (next !== null && next !== undefined && isFinite(next)) {
          applyVisualRatio(next);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    if (document.visibilityState === 'visible') {
      rafId = requestAnimationFrame(tick);
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [liveActive, applyVisualRatio]);

  const ratioFrom = (clientX: number) => {
    const el = ref.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const pct = Math.min(100, Math.max(0, value * 100));
  const bufRatio = buffered !== undefined ? Math.min(1, Math.max(0, buffered)) : 0;

  const nudge = (delta: number) => {
    const next = Math.min(1, Math.max(0, value + delta));
    applyVisualRatio(next);
    onScrub?.(next);
    onCommit(next);
  };

  const tooltipRatio = isDragging ? value : hoverRatio;
  const thumbActive = hovered || isDragging || focused;

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={valueText}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        draggingRef.current = true;
        setIsDragging(true);
        setHovered(true);
        const r = ratioFrom(e.clientX);
        setHoverRatio(r);
        applyVisualRatio(r);
        onScrub?.(r);
      }}
      onPointerMove={(e) => {
        const r = ratioFrom(e.clientX);
        setHoverRatio(r);
        if (draggingRef.current) {
          applyVisualRatio(r);
          onScrub?.(r);
        }
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        if (!draggingRef.current) {
          setHovered(false);
          setHoverRatio(null);
        }
      }}
      onPointerUp={(e) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        setIsDragging(false);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        const r = ratioFrom(e.clientX);
        applyVisualRatio(r);
        onCommit(r);
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
        setIsDragging(false);
        setHovered(false);
        setHoverRatio(null);
        onScrub?.(null);
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 0.1 : 0.02;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          nudge(step);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          nudge(-step);
        } else if (e.key === 'Home') {
          e.preventDefault();
          nudge(-1);
        } else if (e.key === 'End') {
          e.preventDefault();
          nudge(1);
        }
      }}
      className={`group relative h-4 flex items-center cursor-pointer touch-none select-none ${className}`}
    >
      <AnimatePresence>
        {formatTooltip && tooltipRatio !== null && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.96 }}
            transition={{ duration: 0.12, ease: EASE_OUT }}
            className="pointer-events-none absolute bottom-full mb-1.5 -translate-x-1/2 px-2 py-0.5 rounded-md bg-raised/95 border border-line text-[11px] font-medium text-ink tabular-nums shadow-xl"
            style={{ left: `${Math.min(96, Math.max(4, tooltipRatio * 100))}%` }}
          >
            {formatTooltip(tooltipRatio)}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={trackRef}
        className={`relative w-full overflow-visible transition-[height,background-color] duration-150 ${
          variant === 'rail'
            ? thumbActive
              ? 'h-[5px] bg-white/15'
              : 'h-[3px] bg-white/[0.12]'
            : 'h-1 rounded-full bg-white/25'
        }`}
      >
        {bufRatio > 0 && (
          <div
            className={`absolute inset-0 origin-left pointer-events-none transition-transform duration-300 ease-out ${
              variant === 'rail' ? 'bg-white/[0.14]' : 'rounded-full bg-white/30'
            }`}
            style={{ transform: `scaleX(${bufRatio})` }}
          />
        )}

        {variant === 'rail' && hoverRatio !== null && !isDragging && (
          <div
            className="absolute inset-0 origin-left bg-white/15 pointer-events-none"
            style={{ transform: `scaleX(${hoverRatio})` }}
          />
        )}

        <div
          ref={fillRef}
          className={`absolute inset-0 origin-left pointer-events-none will-change-transform ${
            variant === 'rail'
              ? 'bg-accent'
              : 'rounded-full bg-ink group-hover:bg-accent group-focus-visible:bg-accent transition-colors'
          }`}
        />

        <div
          ref={thumbWrapRef}
          className="absolute left-0 top-1/2 pointer-events-none will-change-transform"
        >
          <motion.div
            initial={false}
            animate={{
              scale: thumbActive ? (isDragging ? 1.15 : 1) : 0,
              opacity: thumbActive ? 1 : 0,
            }}
            transition={SPRING}
            className={`-translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_8px_rgba(46,184,114,0.45)] ring-2 ring-black/60 ${
              variant === 'rail' ? 'w-3.5 h-3.5' : 'w-3 h-3'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
