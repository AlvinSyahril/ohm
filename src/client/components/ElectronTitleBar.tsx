import React from 'react';
import { isDesktopApp } from '../lib/desktop';
import { OhmLogo } from './OhmLogo';

/**
 * Dedicated 36px Electron-only top window strip so Windows caption controls
 * (- [] X) never overlap MainCanvas, QueueDrawer, StageOverlay, or SearchBox.
 * Renders nothing in normal web browsers.
 */
export const ElectronTitleBar: React.FC = () => {
  if (!isDesktopApp()) return null;

  return (
    <div className="electron-drag h-9 shrink-0 bg-base border-b border-line px-3.5 pr-[144px] flex items-center gap-2 select-none">
      <OhmLogo className="w-3.5 h-3.5 opacity-90 shrink-0" />
      <span className="text-[11px] font-medium text-ink-3 tracking-wide">Ohm</span>
    </div>
  );
};
