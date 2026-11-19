import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../audio/audioEngine';

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  phase: number;
  tone: 'silver' | 'amber' | 'accent';
}

interface EmberDriftCanvasProps {
  active: boolean;
  isPlaying: boolean;
}

const TONE_RGB: Record<Mote['tone'], string> = {
  silver: '226, 232, 228',
  amber: '224, 194, 152',
  accent: '46, 184, 114',
};

function createMote(width: number, height: number, scatterY = true): Mote {
  const roll = Math.random();
  const tone: Mote['tone'] = roll < 0.62 ? 'silver' : roll < 0.85 ? 'amber' : 'accent';
  return {
    x: Math.random() * width,
    y: scatterY ? Math.random() * height : height + Math.random() * 20,
    vx: (Math.random() - 0.5) * 8,
    vy: -(5 + Math.random() * 11),
    radius: 0.75 + Math.random() * 1.15,
    baseAlpha: 0.14 + Math.random() * 0.24,
    twinkleSpeed: 0.55 + Math.random() * 1.15,
    phase: Math.random() * Math.PI * 2,
    tone,
  };
}

/**
 * Minimal starlight / ember drift backdrop for the Now Playing stage.
 * Uses smooth star-like shimmer as the base and lets damped bass/energy inertia
 * gently carry drift velocity without distracting flashes.
 */
export const EmberDriftCanvas: React.FC<EmberDriftCanvasProps> = ({ active, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(isPlaying);
  playingRef.current = isPlaying;

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let motes: Mote[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targetCount = Math.min(72, Math.max(36, Math.round((width * height) / 22000)));
      if (motes.length === 0) {
        motes = Array.from({ length: targetCount }, () => createMote(width, height, true));
      } else if (motes.length < targetCount) {
        while (motes.length < targetCount) motes.push(createMote(width, height, true));
      } else if (motes.length > targetCount) {
        motes.length = targetCount;
      }
    };

    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro && canvas.parentElement) ro.observe(canvas.parentElement);

    const drawFrame = (nowSec: number, dt: number, smoothBass: number, smoothEnergy: number) => {
      ctx.clearRect(0, 0, width, height);
      const playing = playingRef.current;
      // Calm starfield when paused; smooth thermal lift driven by sustained energy + damped bass
      const driftScale = playing ? 0.45 + smoothEnergy * 1.15 + smoothBass * 0.85 : 0.08;
      const warmthBoost = playing ? smoothBass * 0.12 + smoothEnergy * 0.08 : 0;

      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        if (!reducedMotion) {
          m.x += m.vx * dt * driftScale;
          m.y += m.vy * dt * driftScale;

          if (m.y < -12) {
            m.y = height + 10;
            m.x = Math.random() * width;
          }
          if (m.x < -12) m.x = width + 10;
          else if (m.x > width + 12) m.x = -10;
        }

        const twinkle = 0.65 + 0.35 * Math.sin(nowSec * m.twinkleSpeed + m.phase);
        const alpha = Math.min(0.55, m.baseAlpha * twinkle + (m.tone !== 'silver' ? warmthBoost : warmthBoost * 0.45));
        ctx.fillStyle = `rgba(${TONE_RGB[m.tone]}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    if (reducedMotion) {
      drawFrame(0, 0, 0, 0);
      return () => ro?.disconnect();
    }

    let rafId = 0;
    let lastTs = performance.now();
    let smoothBass = 0;
    let smoothEnergy = 0;

    const tick = (ts: number) => {
      if (document.visibilityState !== 'visible') {
        rafId = 0;
        return;
      }
      const dt = Math.min(0.05, Math.max(0.001, (ts - lastTs) / 1000));
      lastTs = ts;

      const sample = playingRef.current ? audioEngine.sampleAtmosphere() : { bass: 0, overall: 0 };
      const lerp = 1 - Math.exp(-dt * 4.5);
      smoothBass += (sample.bass - smoothBass) * lerp;
      smoothEnergy += (sample.overall - smoothEnergy) * lerp;

      drawFrame(ts / 1000, dt, smoothBass, smoothEnergy);
      rafId = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        lastTs = performance.now();
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
      ro?.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0"
    />
  );
};
