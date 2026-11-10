import React from 'react';
import { Sidebar } from './components/Sidebar';
import { MainCanvas } from './components/MainCanvas';
import { PlayerBar } from './components/PlayerBar';
import { QueueDrawer } from './components/QueueDrawer';

export const App: React.FC = () => {
  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0b0e] text-[#f3f4f6] overflow-hidden">
      <div className="flex-1 flex min-h-0 relative">
        <Sidebar />
        <MainCanvas />
        <QueueDrawer />
      </div>
      <PlayerBar />
    </div>
  );
};

export default App;
