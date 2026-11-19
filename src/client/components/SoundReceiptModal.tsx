import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { Check, Copy, Download, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../store/usePlayerStore';
import { EASE_OUT } from '../utils/motion';
import { CARD_DIMENSIONS, type LyricCardAspect } from '../utils/lyricCardRenderer';
import { computeReceiptSummary, type ReceiptPeriod } from '../utils/playStats';
import { type ReceiptTheme, renderSoundReceipt } from '../utils/soundReceiptRenderer';

const THEMES: Array<{ id: ReceiptTheme; label: string; swatchClass: string }> = [
  { id: 'thermal', label: 'Thermal Receipt', swatchClass: 'bg-[#f2f0eb] border-[#c8c2b6]' },
  { id: 'obsidian', label: 'Obsidian Studio', swatchClass: 'bg-[#0c0e0d] border-[#2eb872]/60' },
];

const PERIODS: Array<{ id: ReceiptPeriod; label: string }> = [
  { id: 'week', label: 'This Week' },
  { id: 'all', label: 'All Time' },
];

const ASPECTS: Array<{ id: LyricCardAspect; label: string }> = [
  { id: '4:5', label: '4:5 Post' },
  { id: '1:1', label: '1:1 Square' },
  { id: '9:16', label: '9:16 Story' },
];

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to encode PNG'));
    }, 'image/png');
  });
}

export const SoundReceiptModal: React.FC = () => {
  const { open, setOpen, playEvents, history, favorites, currentTrack } = usePlayerStore(
    useShallow((s) => ({
      open: s.isReceiptOpen,
      setOpen: s.setReceiptOpen,
      playEvents: s.playEvents,
      history: s.history,
      favorites: s.favorites,
      currentTrack: s.currentTrack,
    }))
  );

  const [theme, setTheme] = useState<ReceiptTheme>('thermal');
  const [period, setPeriod] = useState<ReceiptPeriod>('week');
  const [aspect, setAspect] = useState<LyricCardAspect>('4:5');
  const [roundedCorners, setRoundedCorners] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previewControls = useAnimationControls();

  const summary = useMemo(
    () =>
      computeReceiptSummary({
        period,
        events: playEvents,
        history,
        favorites,
        currentTrack,
      }),
    [period, playEvents, history, favorites, currentTrack]
  );

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => closeRef.current?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    renderSoundReceipt({
      canvas: canvasRef.current,
      summary,
      theme,
      aspect,
      roundedCorners,
    });
    void previewControls.start({
      opacity: [0.72, 1],
      scale: [0.975, 1],
      transition: { duration: 0.24, ease: EASE_OUT },
    });
  }, [open, summary, theme, aspect, roundedCorners, previewControls]);

  const showTempStatus = (msg: string) => {
    setStatusMessage(msg);
    window.setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const handleCopy = async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await canvasToPngBlob(canvasRef.current);
      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
        showTempStatus('Clipboard unavailable here — use Download PNG');
        return;
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      showTempStatus('Copied PNG to clipboard');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      showTempStatus('Clipboard blocked — use Download PNG');
    }
  };

  const handleDownload = async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await canvasToPngBlob(canvasRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Ohm - Sound Receipt (${period === 'week' ? 'This Week' : 'All Time'}).png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showTempStatus('Saved PNG to downloads');
    } catch {
      showTempStatus('Failed to export PNG');
    }
  };

  const dims = CARD_DIMENSIONS[aspect];

  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="receipt-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Your Sound Receipt"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-xl bg-surface border border-line overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="h-14 px-5 border-b border-line flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-ink truncate">Your sound receipt</h2>
                <p className="text-xs text-ink-3 truncate">
                  {summary.tracks.length === 0
                    ? 'Play a few songs to generate your receipt'
                    : summary.isFallbackSample
                      ? 'Seeded from your history and favorites — play stats build as you listen'
                      : `${summary.totalPlays} plays · ${summary.topArtist} on repeat`}
                </p>
              </div>
              <button
                ref={closeRef}
                onClick={() => setOpen(false)}
                aria-label="Close sound receipt"
                className="w-8 h-8 rounded-md flex items-center justify-center text-ink-2 hover:text-ink hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6 items-center">
              {/* Live Canvas Preview */}
              <div className="flex items-center justify-center rounded-lg bg-canvas/70 border border-line p-4 min-h-[320px]">
                {summary.tracks.length === 0 ? (
                  <p className="text-xs text-ink-3 text-center max-w-[220px]">
                    Listen to a track for 15 seconds or heart a song to generate your first sound receipt.
                  </p>
                ) : (
                  <motion.div
                    layout
                    animate={previewControls}
                    transition={{ layout: { duration: 0.26, ease: EASE_OUT } }}
                    className="flex items-center justify-center"
                  >
                    <canvas
                      ref={canvasRef}
                      aria-label="Preview of your Sound Receipt card"
                      className="max-h-[54vh] max-w-full w-auto h-auto object-contain drop-shadow-[0_18px_38px_rgba(0,0,0,0.45)]"
                      style={{ aspectRatio: `${dims.width} / ${dims.height}` }}
                    />
                  </motion.div>
                )}
              </div>

              {/* Studio Controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink-3 mb-2">Theme</label>
                  <div className="space-y-1.5">
                    {THEMES.map((item) => {
                      const active = theme === item.id;
                      return (
                        <motion.button
                          key={item.id}
                          type="button"
                          whileTap={{ scale: 0.985 }}
                          onClick={() => setTheme(item.id)}
                          className={`relative w-full h-9 px-3 rounded-md border text-xs font-medium flex items-center justify-between transition-colors ${
                            active
                              ? 'border-accent text-ink'
                              : 'bg-canvas/50 border-line text-ink-2 hover:text-ink hover:bg-hover'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="receipt-theme-pill"
                              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                              className="absolute inset-0 rounded-[5px] bg-raised -z-0"
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-2.5">
                            <span className={`w-3.5 h-3.5 rounded-sm border ${item.swatchClass}`} />
                            {item.label}
                          </span>
                          {active && <Check className="relative z-10 w-3.5 h-3.5 text-accent" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-3 mb-2">Timeframe</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PERIODS.map((item) => {
                      const active = period === item.id;
                      return (
                        <motion.button
                          key={item.id}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setPeriod(item.id)}
                          className={`relative h-8 px-2 rounded-md border text-[11px] font-medium transition-colors ${
                            active
                              ? 'border-accent text-ink'
                              : 'bg-canvas/50 border-line text-ink-2 hover:text-ink hover:bg-hover'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="receipt-period-pill"
                              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                              className="absolute inset-0 rounded-[5px] bg-raised -z-0"
                            />
                          )}
                          <span className="relative z-10">{item.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-3 mb-2">Format</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ASPECTS.map((item) => {
                      const active = aspect === item.id;
                      return (
                        <motion.button
                          key={item.id}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setAspect(item.id)}
                          className={`relative h-8 px-2 rounded-md border text-[11px] font-medium transition-colors ${
                            active
                              ? 'border-accent text-ink'
                              : 'bg-canvas/50 border-line text-ink-2 hover:text-ink hover:bg-hover'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="receipt-aspect-pill"
                              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                              className="absolute inset-0 rounded-[5px] bg-raised -z-0"
                            />
                          )}
                          <span className="relative z-10">{item.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setRoundedCorners((v) => !v)}
                    className={`w-full h-9 px-3 rounded-md border text-xs font-medium flex items-center justify-between transition-colors ${
                      roundedCorners
                        ? 'bg-raised border-line text-ink'
                        : 'bg-canvas/50 border-line text-ink-2 hover:text-ink'
                    }`}
                  >
                    <span>Card corners</span>
                    <span className={`text-[11px] transition-colors ${roundedCorners ? 'text-accent' : 'text-ink-2'}`}>
                      {roundedCorners ? 'ROUNDED' : 'SQUARE (IG)'}
                    </span>
                  </motion.button>
                </div>

                <div className="pt-2 border-t border-line space-y-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    disabled={summary.tracks.length === 0}
                    onClick={handleDownload}
                    className="w-full h-9 px-3.5 rounded-md bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    disabled={summary.tracks.length === 0}
                    onClick={handleCopy}
                    className="w-full h-9 px-3.5 rounded-md bg-raised hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed border border-line text-ink text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-accent" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-ink-2" />
                    )}
                    {copied ? 'Copied' : 'Copy image'}
                  </motion.button>
                  <AnimatePresence>
                    {statusMessage && (
                      <motion.p
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.16, ease: EASE_OUT }}
                        className="text-[11px] text-center text-ink-2 pt-0.5"
                      >
                        {statusMessage}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
