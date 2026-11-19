import {
  CARD_DIMENSIONS,
  drawFilmGrain,
  drawOhmWordmark,
  drawRoundedRectPath,
  drawStudioBackdrop,
  type LyricCardAspect,
  prepareCardFrame,
  truncateText,
} from './lyricCardRenderer';
import {
  formatReceiptDuration,
  formatTotalListeningTime,
  type ReceiptSummary,
} from './playStats';

export type ReceiptTheme = 'thermal' | 'obsidian';

export interface RenderSoundReceiptOptions {
  canvas: HTMLCanvasElement;
  summary: ReceiptSummary;
  theme: ReceiptTheme;
  aspect: LyricCardAspect;
  roundedCorners?: boolean;
}

const SANS_STACK = 'Inter, "Helvetica Neue", "Segoe UI", Arial, sans-serif';
const MONO_STACK = '"JetBrains Mono", "SFMono-Regular", ui-monospace, Consolas, monospace';
const EMERALD = '#2eb872';

export function renderSoundReceipt(options: RenderSoundReceiptOptions): void {
  const { canvas, summary, theme, aspect, roundedCorners = true } = options;
  const { width: canvasW, height: canvasH } = CARD_DIMENSIONS[aspect];
  canvas.width = canvasW;
  canvas.height = canvasH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { cardX, cardY, cardW, cardH, cardRadius, scaleFactor: scale } = prepareCardFrame(
    ctx,
    canvasW,
    canvasH,
    aspect,
    roundedCorners,
    theme === 'thermal',
    () =>
      drawStudioBackdrop(ctx, canvasW, canvasH, {
        variant: theme === 'thermal' ? 'paper' : 'obsidian',
        glowColor: 'rgba(46, 184, 114, 0.14)',
      })
  );

  const width = cardW;
  const height = cardH;
  const padX = Math.round(88 * scale);
  const padY = Math.round((aspect === '1:1' ? 76 : 92) * scale);
  const contentW = width - padX * 2;
  const totalTimeLabel = formatTotalListeningTime(summary.totalSeconds);

  ctx.save();
  try {
    if (cardRadius > 0) {
      drawRoundedRectPath(ctx, cardX, cardY, cardW, cardH, cardRadius);
      ctx.clip();
      ctx.translate(cardX, cardY);
    }

    if (theme === 'thermal') {
      ctx.fillStyle = '#f2f0eb';
      ctx.fillRect(0, 0, width, height);
      drawFilmGrain(ctx, width, height, 0.032);

      // Header metadata
      ctx.save();
      ctx.fillStyle = '#78746d';
      ctx.font = `500 ${Math.round(25 * scale)}px ${MONO_STACK}`;
      ctx.textBaseline = 'top';
      ctx.fillText('SOUND RECEIPT', padX, padY);

      ctx.textAlign = 'right';
      ctx.fillText(summary.dateLabel, width - padX, padY);
      ctx.restore();

      ctx.fillStyle = '#121211';
      ctx.font = `700 ${Math.round(58 * scale)}px ${SANS_STACK}`;
      ctx.textBaseline = 'top';
      ctx.fillText(summary.periodLabel, padX, padY + Math.round(38 * scale));

      const topRuleY = padY + Math.round(122 * scale);
      ctx.save();
      ctx.strokeStyle = '#c9c4b8';
      ctx.lineWidth = Math.max(1.5, 2 * scale);
      ctx.setLineDash([Math.round(8 * scale), Math.round(8 * scale)]);
      ctx.beginPath();
      ctx.moveTo(padX, topRuleY);
      ctx.lineTo(width - padX, topRuleY);
      ctx.stroke();
      ctx.restore();

      // Itemized rows
      const bottomRuleY = height - padY - Math.round(138 * scale);
      const listTop = topRuleY + Math.round(28 * scale);
      const listH = Math.max(200, bottomRuleY - listTop - Math.round(22 * scale));
      const rows = summary.tracks;
      const rowStep = rows.length > 0 ? Math.min(Math.round(132 * scale), listH / rows.length) : 0;

      rows.forEach((row, idx) => {
        const ry = listTop + idx * rowStep + Math.round(14 * scale);

        if (idx > 0) {
          ctx.fillStyle = '#e3dfd6';
          ctx.fillRect(padX, listTop + idx * rowStep - Math.round(4 * scale), contentW, 1.5);
        }

        // Rank
        ctx.fillStyle = '#78746d';
        ctx.font = `500 ${Math.round(26 * scale)}px ${MONO_STACK}`;
        ctx.textBaseline = 'top';
        ctx.fillText(row.rank, padX, ry + Math.round(6 * scale));

        const textX = padX + Math.round(58 * scale);
        const durText = formatReceiptDuration(row.durationSec);
        ctx.font = `500 ${Math.round(26 * scale)}px ${MONO_STACK}`;
        const durW = ctx.measureText(durText).width;
        const maxTitleW = contentW - Math.round(58 * scale) - durW - Math.round(28 * scale);

        ctx.fillStyle = '#121211';
        ctx.font = `600 ${Math.round(33 * scale)}px ${SANS_STACK}`;
        ctx.fillText(truncateText(ctx, row.title, maxTitleW), textX, ry);

        ctx.fillStyle = '#78746d';
        ctx.font = `500 ${Math.round(24 * scale)}px ${SANS_STACK}`;
        ctx.fillText(
          truncateText(ctx, `${row.artist} · ${row.plays}x`, maxTitleW),
          textX,
          ry + Math.round(42 * scale)
        );

        ctx.save();
        ctx.fillStyle = '#4d4a44';
        ctx.font = `500 ${Math.round(26 * scale)}px ${MONO_STACK}`;
        ctx.textAlign = 'right';
        ctx.fillText(durText, width - padX, ry + Math.round(6 * scale));
        ctx.restore();
      });

      // Dashed footer rule
      ctx.save();
      ctx.strokeStyle = '#c9c4b8';
      ctx.lineWidth = Math.max(1.5, 2 * scale);
      ctx.setLineDash([Math.round(8 * scale), Math.round(8 * scale)]);
      ctx.beginPath();
      ctx.moveTo(padX, bottomRuleY);
      ctx.lineTo(width - padX, bottomRuleY);
      ctx.stroke();
      ctx.restore();

      const subY = bottomRuleY + Math.round(26 * scale);
      ctx.save();
      ctx.fillStyle = '#78746d';
      ctx.font = `500 ${Math.round(25 * scale)}px ${MONO_STACK}`;
      ctx.textBaseline = 'top';
      ctx.fillText(`TOTAL (${summary.totalPlays} PLAYS)`, padX, subY);

      ctx.fillStyle = '#121211';
      ctx.font = `700 ${Math.round(27 * scale)}px ${MONO_STACK}`;
      ctx.textAlign = 'right';
      ctx.fillText(totalTimeLabel, width - padX, subY);
      ctx.restore();

      const footerBase = height - padY;
      drawOhmWordmark(ctx, padX, footerBase, Math.round(34 * scale), '#121211', false, EMERALD);

      ctx.save();
      ctx.fillStyle = '#78746d';
      ctx.font = `500 ${Math.round(23 * scale)}px ${MONO_STACK}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(
        truncateText(ctx, `TOP: ${summary.topArtist.toUpperCase()}`, contentW * 0.58),
        width - padX,
        footerBase
      );
      ctx.restore();
      return;
    }

    // 'obsidian' — Obsidian Studio Sheet
    ctx.fillStyle = '#0c0e0d';
    ctx.fillRect(0, 0, width, height);
    drawFilmGrain(ctx, width, height, 0.032);

    ctx.strokeStyle = '#1c201e';
    ctx.lineWidth = 2;
    if (cardRadius > 0) {
      drawRoundedRectPath(ctx, 1, 1, width - 2, height - 2, cardRadius - 1);
      ctx.stroke();
    } else {
      ctx.strokeRect(1, 1, width - 2, height - 2);
    }

    // Header stat lockup
    ctx.save();
    ctx.fillStyle = EMERALD;
    ctx.font = `600 ${Math.round(24 * scale)}px ${MONO_STACK}`;
    ctx.textBaseline = 'top';
    ctx.fillText(summary.periodLabel, padX, padY);

    ctx.fillStyle = '#f5f5f3';
    ctx.font = `700 ${Math.round(62 * scale)}px ${SANS_STACK}`;
    ctx.fillText(totalTimeLabel, padX, padY + Math.round(34 * scale));

    ctx.textAlign = 'right';
    ctx.fillStyle = '#787e7b';
    ctx.font = `500 ${Math.round(22 * scale)}px ${MONO_STACK}`;
    ctx.fillText('TOP ARTIST', width - padX, padY + Math.round(6 * scale));

    ctx.fillStyle = '#f5f5f3';
    ctx.font = `600 ${Math.round(32 * scale)}px ${SANS_STACK}`;
    ctx.fillText(truncateText(ctx, summary.topArtist, contentW * 0.48), width - padX, padY + Math.round(38 * scale));
    ctx.restore();

    const headerBottom = padY + Math.round(126 * scale);
    ctx.fillStyle = '#1c201e';
    ctx.fillRect(padX, headerBottom, contentW, 2);

    const footerRuleY = height - padY - Math.round(78 * scale);
    const listTop = headerBottom + Math.round(34 * scale);
    const listH = Math.max(200, footerRuleY - listTop - Math.round(28 * scale));
    const rows = summary.tracks;
    const rowStep = rows.length > 0 ? Math.min(Math.round(134 * scale), listH / rows.length) : 0;

    // Left emerald rail
    if (rows.length > 0) {
      const railH = Math.max(60, rows.length * rowStep - Math.round(28 * scale));
      ctx.fillStyle = EMERALD;
      drawRoundedRectPath(ctx, padX, listTop + Math.round(8 * scale), Math.round(6 * scale), railH, 3);
      ctx.fill();
    }

    const rowX = padX + Math.round(34 * scale);
    rows.forEach((row, idx) => {
      const ry = listTop + idx * rowStep + Math.round(10 * scale);

      ctx.fillStyle = idx === 0 ? EMERALD : '#686e6b';
      ctx.font = `600 ${Math.round(26 * scale)}px ${MONO_STACK}`;
      ctx.textBaseline = 'top';
      ctx.fillText(row.rank, rowX, ry + Math.round(6 * scale));

      const textX = rowX + Math.round(56 * scale);
      const badgeLabel = `${row.plays}x`;
      ctx.font = `500 ${Math.round(24 * scale)}px ${MONO_STACK}`;
      const badgeW = ctx.measureText(badgeLabel).width + Math.round(26 * scale);
      const badgeH = Math.round(40 * scale);
      const maxTitleW = contentW - Math.round(90 * scale) - badgeW - Math.round(24 * scale);

      ctx.fillStyle = idx === 0 ? '#f5f5f3' : '#d2d5d3';
      ctx.font = `600 ${Math.round(33 * scale)}px ${SANS_STACK}`;
      ctx.fillText(truncateText(ctx, row.title, maxTitleW), textX, ry);

      ctx.fillStyle = '#787e7b';
      ctx.font = `500 ${Math.round(24 * scale)}px ${SANS_STACK}`;
      ctx.fillText(truncateText(ctx, row.artist, maxTitleW), textX, ry + Math.round(42 * scale));

      // Play count pill
      const badgeX = width - padX - badgeW;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      drawRoundedRectPath(ctx, badgeX, ry + Math.round(8 * scale), badgeW, badgeH, Math.round(8 * scale));
      ctx.fill();

      ctx.save();
      ctx.fillStyle = idx === 0 ? '#f5f5f3' : '#9aa09d';
      ctx.font = `500 ${Math.round(23 * scale)}px ${MONO_STACK}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeLabel, badgeX + badgeW / 2, ry + Math.round(8 * scale) + badgeH / 2 + 1);
      ctx.restore();
    });

    ctx.fillStyle = '#1c201e';
    ctx.fillRect(padX, footerRuleY, contentW, 2);

    const footerBase = height - padY;
    drawOhmWordmark(ctx, padX, footerBase, Math.round(34 * scale), '#8d9390', false, EMERALD);

    ctx.save();
    ctx.fillStyle = '#686e6b';
    ctx.font = `500 ${Math.round(24 * scale)}px ${MONO_STACK}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${summary.totalPlays} PLAYS`, width - padX, footerBase);
    ctx.restore();
  } finally {
    ctx.restore();
  }
}
