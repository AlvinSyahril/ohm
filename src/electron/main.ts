import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  shell,
  Tray,
} from 'electron';
import { startServer, type StartedServer } from '../server/index.js';
import { getInnertube } from '../server/resolvers/youtube.js';
import { logError, logErrorSync } from '../server/logger.js';
import {
  DesktopUpdater,
  UPDATE_RELEASES_URL,
  UPDATE_REPO_URL,
  type UpdateStatusPayload,
} from './updater.js';
import { DiscordRpcClient, type DiscordPresencePayload } from './discordRpc.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_EXTERNAL_LINKS = {
  instagram: 'https://www.instagram.com/vinnssmokee',
  donate: 'https://teer.id/alvin_syahril',
  releases: UPDATE_RELEASES_URL,
  repo: UPDATE_REPO_URL,
} as const;

type ExternalTargetKey = keyof typeof ALLOWED_EXTERNAL_LINKS;

let mainWindow: BrowserWindow | null = null;
const discordRpc = new DiscordRpcClient();
let tray: Tray | null = null;
let embeddedServer: StartedServer | null = null;
let updater: DesktopUpdater | null = null;
let isQuitting = false;
let shownTrayHint = false;

const appRoot = path.resolve(__dirname, '..', '..');
const staticDir = path.join(appRoot, 'dist');
const windowIconPath = path.join(appRoot, 'build', 'icon.ico');
const trayIconPath = path.join(appRoot, 'build', 'tray.png');
const preloadPath = path.join(__dirname, 'preload.cjs');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });

  app.whenReady().then(async () => {
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.alvinsyahril.ohm');
    }

    process.env.OHM_CACHE_DIR = path.join(app.getPath('userData'), 'yt-cache');
    process.env.OHM_LOG_DIR = path.join(app.getPath('userData'), 'logs');

    process.on('uncaughtException', (err) => {
      logErrorSync('electron', 'main-uncaught-exception', err);
    });
    process.on('unhandledRejection', (reason) => {
      logError('electron', 'main-unhandled-rejection', reason);
    });

    updater = new DesktopUpdater(app.getVersion(), (payload: UpdateStatusPayload) => {
      if (payload.phase === 'error' && payload.error) {
        logError('electron', 'updater-error', payload.error);
      }
      sendToRenderer('updater:status', payload);
    });

    registerIpc();
    createTray();
    await createWindow();
  });

  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow().catch(() => {});
    } else {
      showMainWindow();
    }
  });

  app.on('before-quit', () => {
    isQuitting = true;
    discordRpc.clearAndDisconnect().catch(() => {});
    if (embeddedServer) {
      embeddedServer.close().catch(() => {});
      embeddedServer = null;
    }
    if (tray) {
      tray.destroy();
      tray = null;
    }
  });
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function sendToRenderer(channel: string, payload?: unknown) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel, payload);
}

function createTray() {
  if (tray) return;
  const fallbackIcon = path.join(appRoot, 'build', 'icon.png');
  const iconFile = fs.existsSync(trayIconPath) ? trayIconPath : fallbackIcon;
  const img = fs.existsSync(iconFile) ? nativeImage.createFromPath(iconFile) : nativeImage.createEmpty();

  tray = new Tray(img);
  tray.setToolTip('Ohm');

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Ohm',
      click: () => showMainWindow(),
    },
    { type: 'separator' },
    {
      label: 'Play / Pause',
      click: () => sendToRenderer('tray:media', 'toggle'),
    },
    {
      label: 'Next song',
      click: () => sendToRenderer('tray:media', 'next'),
    },
    {
      label: 'Previous song',
      click: () => sendToRenderer('tray:media', 'prev'),
    },
    { type: 'separator' },
    {
      label: 'About & Updates',
      click: () => {
        showMainWindow();
        sendToRenderer('app:open-about');
      },
    },
    {
      label: 'Quit Ohm',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      showMainWindow();
    }
  });
  tray.on('double-click', () => showMainWindow());
}

function registerIpc() {
  ipcMain.handle('app:info', () => ({
    name: app.getName(),
    version: app.getVersion(),
    repoUrl: UPDATE_REPO_URL,
    updaterStatus: updater?.getStatus() ?? null,
  }));

  ipcMain.handle('app:open-external', async (_event, rawKey: unknown) => {
    if (typeof rawKey !== 'string' || !(rawKey in ALLOWED_EXTERNAL_LINKS)) {
      return { ok: false, error: 'Blocked external target' };
    }
    const url = ALLOWED_EXTERNAL_LINKS[rawKey as ExternalTargetKey];
    await shell.openExternal(url);
    return { ok: true };
  });

  ipcMain.handle('updater:check', async () => {
    if (!updater) return null;
    return updater.checkForUpdates(false);
  });

  ipcMain.handle('updater:download', async () => {
    if (!updater) return null;
    return updater.downloadUpdate();
  });

  ipcMain.handle('updater:install', async () => {
    const status = updater?.getStatus();
    if (!status || status.phase !== 'ready' || !status.downloadedPath) {
      return { ok: false, error: 'No downloaded update is ready to install yet.' };
    }
    const openErr = await shell.openPath(status.downloadedPath);
    if (openErr) {
      return { ok: false, error: openErr };
    }
    setTimeout(() => {
      isQuitting = true;
      app.quit();
    }, 350);
    return { ok: true };
  });

  ipcMain.handle('discord:update', async (_event, payload: DiscordPresencePayload) => {
    if (!payload || typeof payload !== 'object') {
      return discordRpc.getStatus();
    }
    return discordRpc.update(payload);
  });

  ipcMain.handle('discord:status', () => discordRpc.getStatus());
}

const DESKTOP_DEFAULT_PORT = 45173;
const DESKTOP_FALLBACK_PORTS = [45174, 45175, 45176, 45177];

async function createWindow() {
  if (!embeddedServer) {
    embeddedServer = await startServer({
      host: '127.0.0.1',
      port: Number(process.env.OHM_DESKTOP_PORT) || DESKTOP_DEFAULT_PORT,
      fallbackPorts: DESKTOP_FALLBACK_PORTS,
      staticDir,
    });
    // Pre-warm Innertube in parallel with Chromium startup so first search/play is snappy
    getInnertube().catch(() => {});
  }

  const allowedOrigin = new URL(embeddedServer.url).origin;

  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 820,
    minHeight: 620,
    title: 'Ohm',
    backgroundColor: '#070807',
    show: false,
    autoHideMenuBar: true,
    icon: fs.existsSync(windowIconPath) ? windowIconPath : undefined,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#070807',
      symbolColor: '#a0a8a3',
      height: 32,
    },
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    try {
      if (new URL(targetUrl).origin !== allowedOrigin) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow?.hide();
    if (tray && !shownTrayHint && process.platform === 'win32') {
      shownTrayHint = true;
      tray.displayBalloon({
        title: 'Ohm is still running',
        content: 'Minimized to the system tray. Right-click the tray icon to quit.',
      });
    }
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logError('electron', 'render-process-gone', `Renderer exited: ${details.reason}`, {
      reason: details.reason,
      exitCode: details.exitCode,
    });
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return; // Ignore intentional navigation aborts
    logError('electron', 'did-fail-load', `${errorDescription} (${errorCode})`, {
      errorCode,
      url: validatedURL,
    });
  });

  mainWindow.once('ready-to-show', () => {
    showMainWindow();
    setTimeout(() => {
      updater?.checkForUpdates(true).catch(() => {});
    }, 4000);
  });

  await mainWindow.loadURL(embeddedServer.url);
}
