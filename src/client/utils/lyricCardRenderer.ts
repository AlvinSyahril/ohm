import type { Track } from '../store/usePlayerStore';

export type LyricCardTheme = 'obsidian' | 'paper' | 'palette';
export type LyricCardAspect = '4:5' | '1:1' | '9:16';

export interface LyricCardLine {
  text: string;
  timeMs?: number;
}

export interface RenderLyricCardOptions {
  canvas: HTMLCanvasElement;
  track: Track;
  lines: LyricCardLine[];
  theme: LyricCardTheme;
  aspect: LyricCardAspect;
  artworkImg: HTMLImageElement | null;
  italicEmphasis?: boolean;
  albumVibe?: boolean;
  roundedCorners?: boolean;
}

export const CARD_DIMENSIONS: Record<LyricCardAspect, { width: number; height: number; label: string }> = {
  '4:5': { width: 1080, height: 1350, label: '4:5 Post' },
  '1:1': { width: 1080, height: 1080, label: '1:1 Square' },
  '9:16': { width: 1080, height: 1920, label: '9:16 Story' },
};

const SANS_STACK = 'Inter, "Helvetica Neue", "Segoe UI", Arial, sans-serif';
const SERIF_ITALIC_STACK = 'Georgia, "Palatino Linotype", "Times New Roman", serif';
const EMERALD = '#2eb872';

export interface AlbumPalette {
  bgTop: string;
  bgBottom: string;
  accent: string;
  paperTint: string;
  paperRule: string;
  quoteMark: string;
  rule: string;
  swatches: [string, string, string];
}

const DEFAULT_PALETTE: AlbumPalette = {
  bgTop: '#1f2326',
  bgBottom: '#16191b',
  accent: EMERALD,
  paperTint: '#f2f0eb',
  paperRule: '#dad6cd',
  quoteMark: '#3c4246',
  rule: '#2f3538',
  swatches: ['#1f2326', EMERALD, '#f2f0eb'],
};

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function hslCss(h: number, s: number, l: number): string {
  const normalizedHue = ((h % 360) + 360) % 360;
  return `hsl(${Math.round(normalizedHue)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

export function extractCoverPalette(img: HTMLImageElement | null): AlbumPalette {
  if (!img || !img.naturalWidth || !img.naturalHeight) return DEFAULT_PALETTE;
  try {
    const sample = document.createElement('canvas');
    sample.width = 24;
    sample.height = 24;
    const sctx = sample.getContext('2d');
    if (!sctx) return DEFAULT_PALETTE;
    sctx.drawImage(img, 0, 0, 24, 24);
    const { data } = sctx.getImageData(0, 0, 24, 24);

    // 12 hue buckets (30 deg each) to separate dominant mood hue from vibrant accent hue
    const bins = Array.from({ length: 12 }, () => ({
      weight: 0,
      chromaWeight: 0,
      rSum: 0,
      gSum: 0,
      bSum: 0,
    }));

    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let totalCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (r + g + b) / 3;
      if (lum <= 16 || lum >= 238) continue;

      const [h, s] = rgbToHsl(r, g, b);
      const bucket = Math.min(11, Math.floor((((h % 360) + 360) % 360) / 30));
      const bData = bins[bucket];
      const w = 1 + s * 2;
      bData.weight += w;
      bData.chromaWeight += s * s * (lum > 35 && lum < 215 ? 1.4 : 0.6);
      bData.rSum += r * w;
      bData.gSum += g * w;
      bData.bSum += b * w;

      totalR += r;
      totalG += g;
      totalB += b;
      totalCount += 1;
    }

    if (totalCount === 0) return DEFAULT_PALETTE;

    let dominantBin = bins[0];
    let accentBin = bins[0];
    for (const bData of bins) {
      if (bData.weight > dominantBin.weight) dominantBin = bData;
      if (bData.chromaWeight > accentBin.chromaWeight) accentBin = bData;
    }

    const domR = dominantBin.weight > 0 ? dominantBin.rSum / dominantBin.weight : totalR / totalCount;
    const domG = dominantBin.weight > 0 ? dominantBin.gSum / dominantBin.weight : totalG / totalCount;
    const domB = dominantBin.weight > 0 ? dominantBin.bSum / dominantBin.weight : totalB / totalCount;
    const [domH, domS] = rgbToHsl(domR, domG, domB);

    const accR = accentBin.weight > 0 ? accentBin.rSum / accentBin.weight : domR;
    const accG = accentBin.weight > 0 ? accentBin.gSum / accentBin.weight : domG;
    const accB = accentBin.weight > 0 ? accentBin.bSum / accentBin.weight : domB;
    const [accH, accS] = rgbToHsl(accR, accG, accB);

    const isMonochrome = domS < 0.08 && accS < 0.12;
    const mutedSat = isMonochrome ? 0.03 : Math.min(0.28, Math.max(0.08, domS * 0.5));

    const bgTop = hslCss(domH, mutedSat, 0.15);
    const bgBottom = hslCss(domH, mutedSat * 0.85, 0.1);
    const accent = isMonochrome
      ? EMERALD
      : hslCss(accH, Math.min(0.74, Math.max(0.48, accS)), 0.56);
    const paperTint = isMonochrome ? '#d4d5d7' : hslCss(domH, Math.min(0.18, domS * 0.34), 0.85);
    const paperRule = isMonochrome ? '#babcc0' : hslCss(domH, Math.min(0.14, domS * 0.25), 0.75);
    const quoteMark = hslCss(domH, mutedSat * 0.8, 0.28);
    const rule = hslCss(domH, mutedSat * 0.75, 0.23);

    return {
      bgTop,
      bgBottom,
      accent,
      paperTint,
      paperRule,
      quoteMark,
      rule,
      swatches: [bgTop, accent, paperTint],
    };
  } catch {
    return DEFAULT_PALETTE;
  }
}

export function formatLyricTimestamp(timeMs?: number): string {
  if (typeof timeMs !== 'number' || !Number.isFinite(timeMs) || timeMs < 0) return '';
  const totalSec = Math.floor(timeMs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCoverThumb(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
  radius: number,
  darkTheme: boolean
) {
  ctx.save();
  drawRoundedRectPath(ctx, x, y, size, size, radius);
  ctx.clip();

  if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
    const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = x + (size - dw) / 2;
    const dy = y + (size - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = darkTheme ? '#1a1d1c' : '#e2dfd7';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = darkTheme ? '#2f3533' : '#c6c1b6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * 0.24, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

const OHM_RING_PATH =
  typeof Path2D !== 'undefined'
    ? new Path2D('M 218.5 386.7 A 136 136 0 1 1 293.5 386.7')
    : null;

export function drawOhmWordmark(
  ctx: CanvasRenderingContext2D,
  x: number,
  baselineY: number,
  fontSize: number,
  color: string,
  alignRight = false,
  accentColor = EMERALD
) {
  ctx.save();
  ctx.font = `700 ${fontSize}px ${SANS_STACK}`;
  ctx.textBaseline = 'alphabetic';

  const word = 'ohm';
  const wordWidth = ctx.measureText(word).width;
  const iconSize = Math.round(fontSize * 1.18);
  const iconGap = Math.round(fontSize * 0.34);
  const totalWidth = iconSize + iconGap + wordWidth;

  const lockupX = alignRight ? x - totalWidth : x;
  const iconY = baselineY - fontSize * 0.34 - iconSize / 2;

  // Draw exact Ohm resonance mark (matching OhmLogo.tsx viewBox 96 96 320 320)
  ctx.save();
  ctx.translate(lockupX, iconY);
  ctx.scale(iconSize / 320, iconSize / 320);
  ctx.translate(-96, -96);

  if (OHM_RING_PATH) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 32;
    ctx.lineCap = 'round';
    ctx.stroke(OHM_RING_PATH);
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 32;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(256, 256, 136, Math.PI * 0.62, Math.PI * 2.38, false);
    ctx.stroke();
  }

  ctx.fillStyle = accentColor;
  drawRoundedRectPath(ctx, 182, 198, 28, 104, 14);
  ctx.fill();
  drawRoundedRectPath(ctx, 242, 166, 28, 160, 14);
  ctx.fill();
  drawRoundedRectPath(ctx, 302, 204, 28, 104, 14);
  ctx.fill();

  ctx.fillStyle = color;
  drawRoundedRectPath(ctx, 182, 242, 28, 60, 14);
  ctx.fill();
  drawRoundedRectPath(ctx, 242, 248, 28, 78, 14);
  ctx.fill();
  drawRoundedRectPath(ctx, 302, 226, 28, 32, 14);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = color;
  ctx.fillText(word, lockupX + iconSize + iconGap, baselineY);
  ctx.restore();
}

export function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let end = text.length;
  while (end > 0 && ctx.measureText(`${text.slice(0, end).trimEnd()}...`).width > maxWidth) {
    end -= 1;
  }
  return `${text.slice(0, end).trimEnd()}...`;
}

interface StyledWord {
  text: string;
  italic: boolean;
}

interface WrappedStyledLine {
  words: StyledWord[];
}

function buildStyledWords(text: string, italicTailCount: number): StyledWord[] {
  const rawWords = text.trim().split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [];
  const tailStart = italicTailCount > 0 ? Math.max(0, rawWords.length - italicTailCount) : rawWords.length;
  return rawWords.map((w, idx) => ({
    text: w,
    italic: idx >= tailStart,
  }));
}

function wrapStyledWords(
  ctx: CanvasRenderingContext2D,
  words: StyledWord[],
  maxWidth: number,
  sansFont: string,
  italicFont: string
): WrappedStyledLine[] {
  const lines: WrappedStyledLine[] = [];
  let current: StyledWord[] = [];
  let currentWidth = 0;

  for (const word of words) {
    ctx.font = word.italic ? italicFont : sansFont;
    const spaceW = current.length > 0 ? ctx.measureText(' ').width : 0;
    const wordW = ctx.measureText(word.text).width;

    if (current.length > 0 && currentWidth + spaceW + wordW > maxWidth) {
      lines.push({ words: current });
      current = [word];
      currentWidth = wordW;
    } else {
      current.push(word);
      currentWidth += spaceW + wordW;
    }
  }
  if (current.length > 0) {
    lines.push({ words: current });
  }
  return lines;
}

function drawWrappedStyledLines(
  ctx: CanvasRenderingContext2D,
  lines: WrappedStyledLine[],
  startX: number,
  startY: number,
  lineHeight: number,
  sansFont: string,
  italicFont: string,
  color: string
): number {
  ctx.save();
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  let y = startY;

  for (const line of lines) {
    let x = startX;
    for (let i = 0; i < line.words.length; i += 1) {
      const word = line.words[i];
      ctx.font = word.italic ? italicFont : sansFont;
      const chunk = i < line.words.length - 1 ? `${word.text} ` : word.text;
      ctx.fillText(chunk, x, y);
      x += ctx.measureText(chunk).width;
    }
    y += lineHeight;
  }
  ctx.restore();
  return y;
}

type LineRole = 'setup' | 'hero' | 'release';

interface PreparedBlock {
  role: LineRole;
  fontSize: number;
  lineHeight: number;
  sansFont: string;
  italicFont: string;
  wrapped: WrappedStyledLine[];
}

function assignLineRoles(count: number): LineRole[] {
  if (count <= 1) return ['hero'];
  if (count === 2) return ['setup', 'hero'];
  if (count === 3) return ['setup', 'hero', 'release'];
  return ['setup', 'hero', 'hero', 'release'];
}

function layoutLyricBlocks(
  ctx: CanvasRenderingContext2D,
  lines: LyricCardLine[],
  maxWidth: number,
  maxHeight: number,
  baseHeroSize: number,
  italicEmphasis: boolean
): { blocks: PreparedBlock[]; totalHeight: number; blockGap: number } {
  const roles = assignLineRoles(lines.length);
  let heroSize = baseHeroSize;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const setupSize = Math.round(heroSize * 0.72);
    const releaseSize = Math.round(heroSize * 0.72);
    const blockGap = Math.round(heroSize * 0.42);
    const blocks: PreparedBlock[] = [];
    let totalHeight = 0;

    lines.forEach((line, idx) => {
      const role = roles[idx] ?? 'hero';
      const fontSize = role === 'hero' ? heroSize : role === 'setup' ? setupSize : releaseSize;
      const lineHeight = Math.round(fontSize * 1.24);
      const sansFont =
        role === 'hero'
          ? `700 ${fontSize}px ${SANS_STACK}`
          : `500 ${fontSize}px ${SANS_STACK}`;
      const italicFont = `italic ${Math.round(fontSize * 1.1)}px ${SERIF_ITALIC_STACK}`;

      const wordCount = line.text.trim().split(/\s+/).filter(Boolean).length;
      const isLastHero =
        role === 'hero' && (idx === roles.length - 1 || roles[idx + 1] !== 'hero');
      const italicTailCount =
        italicEmphasis && isLastHero
          ? wordCount >= 5
            ? 3
            : wordCount >= 3
              ? 2
              : 1
          : role === 'release' && italicEmphasis
            ? wordCount
            : 0;

      const styledWords = buildStyledWords(line.text, italicTailCount);
      const wrapped = wrapStyledWords(ctx, styledWords, maxWidth, sansFont, italicFont);
      totalHeight += wrapped.length * lineHeight;
      if (idx < lines.length - 1) totalHeight += blockGap;

      blocks.push({
        role,
        fontSize,
        lineHeight,
        sansFont,
        italicFont,
        wrapped,
      });
    });

    if (totalHeight <= maxHeight || heroSize <= 34) {
      return { blocks, totalHeight, blockGap };
    }
    heroSize -= 4;
  }

  return { blocks: [], totalHeight: 0, blockGap: 16 };
}

function computeDynamicHeroSize(lines: LyricCardLine[], aspect: LyricCardAspect): number {
  const totalChars = lines.reduce((sum, l) => sum + l.text.trim().length, 0);
  const aspectDelta = aspect === '1:1' ? -6 : aspect === '9:16' ? 8 : 0;
  if (lines.length <= 2 && totalChars <= 68) return 82 + aspectDelta;
  if (totalChars <= 115) return 70 + aspectDelta;
  return 60 + aspectDelta;
}

let cachedGrainCanvas: HTMLCanvasElement | null = null;

export function drawFilmGrain(ctx: CanvasRenderingContext2D, width: number, height: number, alpha = 0.032) {
  if (!cachedGrainCanvas) {
    const tile = document.createElement('canvas');
    tile.width = 96;
    tile.height = 96;
    const tctx = tile.getContext('2d');
    if (!tctx) return;
    const img = tctx.createImageData(96, 96);
    const buf = img.data;
    // Deterministic LCG noise so grain renders identically across exports
    let seed = 1337;
    for (let i = 0; i < buf.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const v = (seed >>> 24) & 0xff;
      buf[i] = v;
      buf[i + 1] = v;
      buf[i + 2] = v;
      buf[i + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    cachedGrainCanvas = tile;
  }

  const pattern = ctx.createPattern(cachedGrainCanvas, 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawThemeBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: LyricCardTheme,
  palette: AlbumPalette,
  albumVibe: boolean
) {
  if (theme === 'paper') {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    if (albumVibe) {
      grad.addColorStop(0, palette.paperRule);
      grad.addColorStop(1, palette.paperTint);
    } else {
      grad.addColorStop(0, '#e5e1d8');
      grad.addColorStop(1, '#dbd6cb');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    drawFilmGrain(ctx, w, h, 0.024);
    return;
  }

  if (theme === 'palette') {
    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, palette.bgBottom);
    base.addColorStop(1, '#090a0b');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    const glow = ctx.createRadialGradient(w * 0.28, h * 0.24, 20, w * 0.28, h * 0.24, Math.max(w, h) * 0.72);
    glow.addColorStop(0, palette.bgTop);
    glow.addColorStop(1, 'rgba(9, 10, 11, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    drawFilmGrain(ctx, w, h, 0.025);
    return;
  }

  // 'obsidian' ambient studio backdrop
  ctx.fillStyle = '#111312';
  ctx.fillRect(0, 0, w, h);

  const obsGlow = ctx.createRadialGradient(w * 0.3, h * 0.24, 20, w * 0.3, h * 0.24, Math.max(w, h) * 0.65);
  obsGlow.addColorStop(0, albumVibe ? palette.bgTop : 'rgba(46, 184, 114, 0.12)');
  obsGlow.addColorStop(1, 'rgba(17, 19, 18, 0)');
  ctx.fillStyle = obsGlow;
  ctx.fillRect(0, 0, w, h);
  drawFilmGrain(ctx, w, h, 0.022);
}

export function renderLyricCard(options: RenderLyricCardOptions): void {
  const {
    canvas,
    track,
    lines,
    theme,
    aspect,
    artworkImg,
    italicEmphasis = true,
    albumVibe = false,
    roundedCorners = true,
  } = options;
  const { width: canvasW, height: canvasH } = CARD_DIMENSIONS[aspect];
  canvas.width = canvasW;
  canvas.height = canvasH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cleanLines = lines.filter((l) => l.text.trim().length > 0).slice(0, 4);
  const firstTimestamp = formatLyricTimestamp(cleanLines[0]?.timeMs);
  const palette = extractCoverPalette(artworkImg);

  let cardX = 0;
  let cardY = 0;
  let cardW = canvasW;
  let cardH = canvasH;
  const isStoryFloating = roundedCorners && aspect === '9:16';
  const cardRadius = roundedCorners ? (isStoryFloating ? 40 : 56) : 0;

  if (isStoryFloating) {
    drawThemeBackdrop(ctx, canvasW, canvasH, theme, palette, albumVibe);

    cardW = Math.round(canvasW * 0.74);
    cardH = Math.round(cardW * 1.25);
    cardX = Math.round((canvasW - cardW) / 2);
    cardY = Math.round((canvasH - cardH) / 2);

    ctx.save();
    ctx.shadowColor = theme === 'paper' ? 'rgba(20, 18, 15, 0.16)' : 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = theme === 'paper' ? 44 : 56;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = theme === 'paper' ? '#f2f0eb' : '#0c0e0d';
    drawRoundedRectPath(ctx, cardX, cardY, cardW, cardH, cardRadius);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.clearRect(0, 0, canvasW, canvasH);
  }

  const width = cardW;
  const height = cardH;
  const scaleFactor = width / 1080;
  const padX = Math.round(92 * scaleFactor);
  const padY = Math.round((aspect === '1:1' ? 84 : 96) * scaleFactor);
  const contentW = width - padX * 2;

  ctx.save();
  try {
    if (cardRadius > 0) {
      drawRoundedRectPath(ctx, cardX, cardY, cardW, cardH, cardRadius);
      ctx.clip();
      ctx.translate(cardX, cardY);
    }

    if (theme === 'obsidian') {
    // Matte obsidian card surface (optionally tinted gently by album palette)
    if (albumVibe) {
      const obsGrad = ctx.createLinearGradient(0, 0, 0, height);
      obsGrad.addColorStop(0, palette.bgBottom);
      obsGrad.addColorStop(1, '#0c0e0d');
      ctx.fillStyle = obsGrad;
    } else {
      ctx.fillStyle = '#0c0e0d';
    }
    ctx.fillRect(0, 0, width, height);
    drawFilmGrain(ctx, width, height, 0.032);

    // Subtle hairline border inset
    ctx.strokeStyle = albumVibe ? palette.rule : '#1c201e';
    ctx.lineWidth = 2;
    if (cardRadius > 0) {
      drawRoundedRectPath(ctx, 1, 1, width - 2, height - 2, cardRadius - 1);
      ctx.stroke();
    } else {
      ctx.strokeRect(1, 1, width - 2, height - 2);
    }

    const railColor = albumVibe ? palette.accent : EMERALD;

    // Top-left cover + metadata
    const thumbSize = aspect === '1:1' ? 88 : 98;
    drawCoverThumb(ctx, artworkImg, padX, padY, thumbSize, 16, true);

    const metaX = padX + thumbSize + 28;
    const metaMaxW = contentW - thumbSize - 28;

    ctx.fillStyle = '#f5f5f3';
    ctx.font = `700 34px ${SANS_STACK}`;
    ctx.textBaseline = 'top';
    ctx.fillText(truncateText(ctx, track.title, metaMaxW), metaX, padY + 12);

    const subText = track.album ? `${track.artist} · ${track.album}` : track.artist;
    ctx.fillStyle = '#787e7b';
    ctx.font = `500 24px ${SANS_STACK}`;
    ctx.fillText(truncateText(ctx, subText, metaMaxW), metaX, padY + 56);

    // Lyric zone with left #2eb872 vertical accent bar
    const headerBottom = padY + thumbSize + 44;
    const footerTop = height - padY - 48;
    const lyricZoneH = Math.max(240, footerTop - headerBottom);
    const barGap = 32;
    const barW = 6;
    const baseHero = Math.round(computeDynamicHeroSize(cleanLines, aspect) * scaleFactor);

    const { blocks, totalHeight, blockGap } = layoutLyricBlocks(
      ctx,
      cleanLines,
      contentW - barGap - barW,
      lyricZoneH,
      baseHero,
      italicEmphasis
    );

    const startY = headerBottom + Math.max(0, (lyricZoneH - totalHeight) / 2);

    // Accent left rail spanning the lyric block height
    if (totalHeight > 0) {
      ctx.fillStyle = railColor;
      drawRoundedRectPath(ctx, padX, startY + 6, barW, Math.max(48, totalHeight - 12), 3);
      ctx.fill();
    }

    let cursorY = startY;
    for (let i = 0; i < blocks.length; i += 1) {
      const b = blocks[i];
      const color = b.role === 'hero' ? '#f5f5f3' : '#787e7b';
      cursorY = drawWrappedStyledLines(
        ctx,
        b.wrapped,
        padX + barW + barGap,
        cursorY,
        b.lineHeight,
        b.sansFont,
        b.italicFont,
        color
      );
      if (i < blocks.length - 1) cursorY += blockGap;
    }

    // Footer: ohm• left, timestamp right
    const footerBaseline = height - padY;
    drawOhmWordmark(ctx, padX, footerBaseline, 34, '#787e7b', false, railColor);

    if (firstTimestamp) {
      ctx.save();
      ctx.fillStyle = '#686e6b';
      ctx.font = `500 26px ${SANS_STACK}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(firstTimestamp, width - padX, footerBaseline);
      ctx.restore();
    }
    return;
  }

    if (theme === 'paper') {
      // Tactile matte cotton / cover-stone pocket card
      ctx.fillStyle = albumVibe ? palette.paperTint : '#f2f0eb';
      ctx.fillRect(0, 0, width, height);
      drawFilmGrain(ctx, width, height, 0.036);

      // Top-anchored artwork + title/artist (clean 3-element layout)
      const thumbSize = Math.round((aspect === '1:1' ? 88 : 96) * scaleFactor);
      drawCoverThumb(ctx, artworkImg, padX, padY, thumbSize, Math.round(14 * scaleFactor), false);

      const metaX = padX + thumbSize + Math.round(24 * scaleFactor);
      const metaMaxW = contentW - thumbSize - Math.round(24 * scaleFactor);

      ctx.fillStyle = '#121211';
      ctx.font = `700 ${Math.round(33 * scaleFactor)}px ${SANS_STACK}`;
      ctx.textBaseline = 'top';
      ctx.fillText(truncateText(ctx, track.title, metaMaxW), metaX, padY + Math.round(10 * scaleFactor));

      ctx.fillStyle = albumVibe ? '#4d4a44' : '#78746d';
      ctx.font = `500 ${Math.round(24 * scaleFactor)}px ${SANS_STACK}`;
      ctx.fillText(truncateText(ctx, track.artist, metaMaxW), metaX, padY + Math.round(52 * scaleFactor));

      // Center lyric zone
      const headerBottom = padY + thumbSize + Math.round(36 * scaleFactor);
      const footerTop = height - padY - Math.round(46 * scaleFactor);
      const lyricZoneH = Math.max(200, footerTop - headerBottom);
      const baseHero = Math.round((computeDynamicHeroSize(cleanLines, aspect) - 2) * scaleFactor);

      const { blocks, totalHeight, blockGap } = layoutLyricBlocks(
        ctx,
        cleanLines,
        contentW,
        lyricZoneH,
        baseHero,
        italicEmphasis
      );

      let cursorY = headerBottom + Math.max(0, (lyricZoneH - totalHeight) / 2);
      for (let i = 0; i < blocks.length; i += 1) {
        const b = blocks[i];
        const color =
          b.role === 'release' ? (albumVibe ? '#4d4a44' : '#78746d') : '#121211';
        cursorY = drawWrappedStyledLines(
          ctx,
          b.wrapped,
          padX,
          cursorY,
          b.lineHeight,
          b.sansFont,
          b.italicFont,
          color
        );
        if (i < blocks.length - 1) cursorY += blockGap;
      }

      // Clean footer: ohm• on left, timestamp on right
      const footerBaseline = height - padY;
      drawOhmWordmark(
        ctx,
        padX,
        footerBaseline,
        34,
        '#121211',
        false,
        albumVibe ? palette.accent : EMERALD
      );

      if (firstTimestamp) {
        ctx.save();
        ctx.fillStyle = albumVibe ? '#4d4a44' : '#78746d';
        ctx.font = `500 26px ${SANS_STACK}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(firstTimestamp, width - padX, footerBaseline);
        ctx.restore();
      }
      return;
    }

  // 'palette' — Cover Palette sampled from album art
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, palette.bgTop);
  grad.addColorStop(1, palette.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  drawFilmGrain(ctx, width, height, 0.035);

  // Subtle top-left editorial opening quote mark balancing upper negative space
  ctx.save();
  ctx.fillStyle = palette.quoteMark;
  ctx.font = `700 ${Math.round(124 * scaleFactor)}px ${SERIF_ITALIC_STACK}`;
  ctx.textBaseline = 'top';
  ctx.fillText('\u201C', padX - Math.round(8 * scaleFactor), padY - Math.round(12 * scaleFactor));
  ctx.restore();

  const headerBottom = padY + Math.round(90 * scaleFactor);
  const ruleY = height - padY - Math.round(112 * scaleFactor);
  const lyricZoneH = Math.max(200, ruleY - Math.round(32 * scaleFactor) - headerBottom);
  const baseHero = Math.round((computeDynamicHeroSize(cleanLines, aspect) - 2) * scaleFactor);

  const { blocks, totalHeight, blockGap } = layoutLyricBlocks(
    ctx,
    cleanLines,
    contentW,
    lyricZoneH,
    baseHero,
    italicEmphasis
  );

  let cursorY = headerBottom + Math.max(0, (lyricZoneH - totalHeight) / 2);
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    const color =
      b.role === 'hero' ? '#f4f4f0' : b.role === 'setup' ? '#8a9094' : '#b8bec2';
    cursorY = drawWrappedStyledLines(
      ctx,
      b.wrapped,
      padX,
      cursorY,
      b.lineHeight,
      b.sansFont,
      b.italicFont,
      color
    );
    if (i < blocks.length - 1) cursorY += blockGap;
  }

  // Hairline rule + bottom cover footer
  ctx.fillStyle = palette.rule;
  ctx.fillRect(padX, ruleY, contentW, 2);

  const thumbSize = 84;
  const thumbY = ruleY + 28;
  drawCoverThumb(ctx, artworkImg, padX, thumbY, thumbSize, 14, true);

  const metaX = padX + thumbSize + 24;
  const metaMaxW = contentW - thumbSize - 140;

  ctx.save();
  ctx.fillStyle = '#f4f4f0';
  ctx.font = `600 29px ${SANS_STACK}`;
  ctx.textBaseline = 'top';
  ctx.fillText(truncateText(ctx, track.title, metaMaxW), metaX, thumbY + 12);

  ctx.fillStyle = '#8a9094';
  ctx.font = `500 23px ${SANS_STACK}`;
  ctx.fillText(truncateText(ctx, track.artist, metaMaxW), metaX, thumbY + 48);
  ctx.restore();

    drawOhmWordmark(ctx, width - padX, thumbY + 56, 33, '#8a9094', true, palette.accent);
  } finally {
    ctx.restore();
  }
}
