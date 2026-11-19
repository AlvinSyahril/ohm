import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { Check, Copy, Download, X } from 'lucide-react';
import type { Track } from '../store/usePlayerStore';
import { useCanvasExport, useModalEscapeFocus } from '../hooks/useCanvasExport';
import { EASE_OUT } from '../utils/motion';
import {
  CARD_DIMENSIONS,
  extractCoverPalette,
  type LyricCardAspect,
  type LyricCardLine,
  type LyricCardTheme,
  renderLyricCard,
} from '../utils/lyricCardRenderer';

interface LyricCardModalProps {
  open: boolean;
  onClose: () => void;
  track: Track;
  lines: LyricCardLine[];
}

const THEMES: Array<{ id: LyricCardTheme; label: string; swatchClass: string }> = [
  { id: 'obsidian', label: 'Obsidian Matte', swatchClass: 'bg-[#0c0e0d] border-[#2eb872]/60' },
  { id: 'paper', label: 'Editorial Paper', swatchClass: 'bg-[#f2f0eb] border-[#c8c2b6]' },
  { id: 'palette', label: 'Cover Palette', swatchClass: 'bg-[#252a2e] border-[#525a61]' },
];

const ASPECTS: Array<{ id: LyricCardAspect; label: string }> = [
  { id: '4:5', label: '4:5 Post' },
  { id: '1:1', label: '1:1 Square' },
  { id: '9:16', label: '9:16 Story' },
];

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim() || 'track';
}

export const LyricCardModal: React.FC<LyricCardModalProps> = ({
  open,
  onClose,
  track,
  lines,
}) => {
  const [theme, setTheme] = useState<LyricCardTheme>('palette');
  const [aspect, setAspect] = useState<LyricCardAspect>('4:5');
  const [italicEmphasis, setItalicEmphasis] = useState(true);
  const [albumVibe, setAlbumVibe] = useState(false);
  const [roundedCorners, setRoundedCorners] = useState(true);
  const [artworkImg, setArtworkImg] = useState<HTMLImageElement | null>(null);

  const albumPalette = useMemo(() => extractCoverPalette(artworkImg), [artworkImg]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previewControls = useAnimationControls();

  const getFilename = useCallback(
    () => `${sanitizeFilenamePart(track.artist)} - ${sanitizeFilenamePart(track.title)} (lyric).png`,
    [track.artist, track.title]
  );
  const { statusMessage, copied, handleCopy, handleDownload } = useCanvasExport(
    canvasRef,
    getFilename
  );

  // Escape capture handler prevents dismissing underlying StageOverlay
  useModalEscapeFocus(open, onClose, closeRef);

  // Load CORS-safe artwork via /api/artwork proxy
  useEffect(() => {
    if (!open) return;
    const rawThumb = track.thumbnail?.trim();
    if (!rawThumb) {
      setArtworkImg(null);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) setArtworkImg(img);
    };
    img.onerror = () => {
      if (!cancelled) setArtworkImg(null);
    };

    if (rawThumb.startsWith('https://')) {
      img.src = `/api/artwork?url=${encodeURIComponent(rawThumb)}`;
    } else if (rawThumb.startsWith('/') || rawThumb.startsWith('data:')) {
      img.src = rawThumb;
    } else {
      setArtworkImg(null);
    }

    return () => {
      cancelled = true;
    };
  }, [open, track.thumbnail]);

  // Re-render card canvas whenever options or artwork update
  useEffect(() => {
    if (!open || !canvasRef.current) return;
    renderLyricCard({
      canvas: canvasRef.current,
      track,
      lines,
      theme,
      aspect,
      artworkImg,
      italicEmphasis,
      albumVibe,
      roundedCorners,
    });
    void previewControls.start({
      opacity: [0.7, 1],
      scale: [0.975, 1],
      transition: { duration: 0.24, ease: EASE_OUT },
    });
  }, [open, track, lines, theme, aspect, artworkImg, italicEmphasis, albumVibe, roundedCorners, previewControls]);

  const dims = CARD_DIMENSIONS[aspect];

  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="lyric-card-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
          onClick={onClose}
          className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Export Lyric Card"
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
                <h2 className="text-sm font-semibold text-ink truncate">Export lyric card</h2>
                <p className="text-xs text-ink-3 truncate">
                  {track.title} — {track.artist}
                </p>
              </div>
              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="Close lyric card studio"
                className="w-8 h-8 rounded-md flex items-center justify-center text-ink-2 hover:text-ink hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6 items-center">
              {/* Live Canvas Preview */}
              <div className="flex items-center justify-center rounded-lg bg-canvas/70 border border-line p-4 min-h-[320px]">
                <motion.div
                  layout
                  animate={previewControls}
                  transition={{ layout: { duration: 0.26, ease: EASE_OUT } }}
                  className="flex items-center justify-center"
                >
                  <canvas
                    ref={canvasRef}
                    aria-label={`Preview of ${track.title} lyric card`}
                    className="max-h-[54vh] max-w-full w-auto h-auto object-contain drop-shadow-[0_18px_38px_rgba(0,0,0,0.45)]"
                    style={{ aspectRatio: `${dims.width} / ${dims.height}` }}
                  />
                </motion.div>
              </div>

              {/* Studio Controls */}
              <div className="space-y-5">
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
                              layoutId="lyric-theme-pill"
                              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                              className="absolute inset-0 rounded-[5px] bg-raised -z-0"
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-2.5">
                            <span className={`w-3.5 h-3.5 rounded-sm border ${item.swatchClass}`} />
                            {item.label}
                          </span>
                          {active && (
                            <motion.span
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.16, ease: EASE_OUT }}
                              className="relative z-10"
                            >
                              <Check className="w-3.5 h-3.5 text-accent" />
                            </motion.span>
                          )}
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
                              layoutId="lyric-aspect-pill"
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

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-ink-3">Styling</label>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setItalicEmphasis((v) => !v)}
                    className={`w-full h-9 px-3 rounded-md border text-xs font-medium flex items-center justify-between transition-colors ${
                      italicEmphasis
                        ? 'bg-raised border-line text-ink'
                        : 'bg-canvas/50 border-line text-ink-2 hover:text-ink'
                    }`}
                  >
                    <span>Sans + italic serif accent</span>
                    <span className={`text-[11px] transition-colors ${italicEmphasis ? 'text-accent' : 'text-ink-3'}`}>
                      {italicEmphasis ? 'ON' : 'OFF'}
                    </span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={theme === 'palette' ? undefined : { scale: 0.985 }}
                    disabled={theme === 'palette'}
                    onClick={() => setAlbumVibe((v) => !v)}
                    className={`w-full h-9 px-3 rounded-md border text-xs font-medium flex items-center justify-between transition-colors ${
                      theme === 'palette' || albumVibe
                        ? 'bg-raised border-line text-ink'
                        : 'bg-canvas/50 border-line text-ink-2 hover:text-ink'
                    } ${theme === 'palette' ? 'opacity-85 cursor-default' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      <span>Match album vibe</span>
                      <span className="flex items-center gap-1" aria-hidden="true">
                        {albumPalette.swatches.map((color, idx) => (
                          <span
                            key={idx}
                            className="w-2.5 h-2.5 rounded-full border border-white/15 transition-colors duration-300"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </span>
                    </span>
                    <span
                      className={`text-[11px] transition-colors ${
                        theme === 'palette' || albumVibe ? 'text-accent' : 'text-ink-3'
                      }`}
                    >
                      {theme === 'palette' ? 'AUTO' : albumVibe ? 'ON' : 'OFF'}
                    </span>
                  </motion.button>
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
                    onClick={handleDownload}
                    className="w-full h-9 px-3.5 rounded-md bg-accent hover:bg-accent/90 text-black text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopy}
                    className="w-full h-9 px-3.5 rounded-md bg-raised hover:bg-hover border border-line text-ink text-xs font-medium flex items-center justify-center gap-2 transition-colors"
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
