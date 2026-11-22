import React from 'react';
import { isDesktopApp } from '../lib/desktop';

/**
 * Dedicated 32px Electron-only top drag strip so Windows caption controls
 * (- [] X) never overlap MainCanvas, QueueDrawer, StageOverlay, or SearchBox.
 * Renders nothing in normal web browsers.
 */
export const ElectronTitleBar: React.FC = () => {
  if (!isDesktopApp()) return null;

  return (
    <div className="electron-drag h-8 shrink-0 bg-base pr-[144px] select-none" aria-hidden />
  );
};
