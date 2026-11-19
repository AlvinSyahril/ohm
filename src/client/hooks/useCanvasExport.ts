import { useCallback, useEffect, useRef, useState } from 'react';

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to encode PNG'));
    }, 'image/png');
  });
}

/**
 * Focuses the modal close button on open and captures Escape before underlying overlays.
 */
export function useModalEscapeFocus(
  open: boolean,
  onClose: () => void,
  closeRef: React.RefObject<HTMLButtonElement | null>
): void {
  useEffect(() => {
    if (!open) return;
    const rafId = requestAnimationFrame(() => closeRef.current?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose, closeRef]);
}

/**
 * Shared PNG clipboard copy and download export state with leak-safe timeout cleanup.
 */
export function useCanvasExport(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  getFilename: () => string
) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const statusTimerRef = useRef<number | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current !== null) clearTimeout(statusTimerRef.current);
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const showTempStatus = useCallback((msg: string) => {
    if (statusTimerRef.current !== null) clearTimeout(statusTimerRef.current);
    setStatusMessage(msg);
    statusTimerRef.current = window.setTimeout(() => {
      statusTimerRef.current = null;
      setStatusMessage(null);
    }, 2400);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await canvasToPngBlob(canvasRef.current);
      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
        showTempStatus('Clipboard unavailable here — use Download PNG');
        return;
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
      setCopied(true);
      showTempStatus('Copied PNG to clipboard');
      copiedTimerRef.current = window.setTimeout(() => {
        copiedTimerRef.current = null;
        setCopied(false);
      }, 1800);
    } catch {
      showTempStatus('Clipboard blocked — use Download PNG');
    }
  }, [canvasRef, showTempStatus]);

  const handleDownload = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await canvasToPngBlob(canvasRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showTempStatus('Saved PNG to downloads');
    } catch {
      showTempStatus('Failed to export PNG');
    }
  }, [canvasRef, getFilename, showTempStatus]);

  return {
    statusMessage,
    copied,
    handleCopy,
    handleDownload,
  };
}
