import React, { Suspense, lazy } from 'react';
import { Sidebar, MobileNav } from './components/Sidebar';
import { MainCanvas } from './components/MainCanvas';
import { FloatingPlayerDeck } from './components/FloatingPlayerDeck';
import { QueueDrawer } from './components/QueueDrawer';
import { DesktopBridge } from './components/DesktopBridge';
import { ElectronTitleBar } from './components/ElectronTitleBar';
import { Toaster } from './components/Toaster';

const StageOverlay = lazy(() =>
  import('./components/StageOverlay').then((m) => ({ default: m.StageOverlay }))
);
const KeyboardShortcutsModal = lazy(() =>
  import('./components/KeyboardShortcutsModal').then((m) => ({
    default: m.KeyboardShortcutsModal,
  }))
);
const AboutModal = lazy(() =>
  import('./components/AboutModal').then((m) => ({ default: m.AboutModal }))
);
const SoundReceiptModal = lazy(() =>
  import('./components/SoundReceiptModal').then((m) => ({ default: m.SoundReceiptModal }))
);

export const App: React.FC = () => {
  return (
    <div className="h-screen w-screen flex flex-col bg-base text-ink overflow-hidden select-none">
      <DesktopBridge />
      <ElectronTitleBar />
      <div className="flex-1 flex min-h-0 bg-canvas">
        <Sidebar />
        <MainCanvas />
        <QueueDrawer />
      </div>
      <MobileNav />
      <Suspense fallback={null}>
        <StageOverlay />
        <KeyboardShortcutsModal />
        <AboutModal />
        <SoundReceiptModal />
      </Suspense>
      <FloatingPlayerDeck />
      <Toaster />
    </div>
  );
};

export default App;
