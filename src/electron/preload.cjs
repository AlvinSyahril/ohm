const { contextBridge, ipcRenderer } = require('electron');

const applyElectronMarker = () => {
  if (document.documentElement) {
    document.documentElement.dataset.electron = 'true';
    document.documentElement.dataset.platform = process.platform;
  }
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', applyElectronMarker, { once: true });
} else {
  applyElectronMarker();
}

const subscribe = (channel, callback) => {
  if (typeof callback !== 'function') return () => {};
  const handler = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('ohmDesktop', {
  isElectron: true,
  platform: process.platform,
  getInfo: () => ipcRenderer.invoke('app:info'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  openExternal: (targetKey) => ipcRenderer.invoke('app:open-external', targetKey),
  setDiscordPresence: (payload) => ipcRenderer.invoke('discord:update', payload),
  getDiscordStatus: () => ipcRenderer.invoke('discord:status'),
  onDiscordStatus: (cb) => subscribe('discord:status', cb),
  onUpdateStatus: (cb) => subscribe('updater:status', cb),
  onOpenAbout: (cb) => subscribe('app:open-about', cb),
  onMediaAction: (cb) => subscribe('tray:media', cb),
});
