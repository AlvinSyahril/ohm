import { version as pkgVersion } from '../../../package.json';

export type DesktopExternalTarget = 'instagram' | 'donate' | 'releases' | 'repo';

export type DesktopUpdatePhase =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error';

export interface DesktopUpdateStatus {
  phase: DesktopUpdatePhase;
  currentVersion: string;
  latestVersion?: string;
  releaseDate?: string;
  changelog?: string[];
  downloadUrl?: string;
  downloadProgress?: number;
  downloadedPath?: string;
  feedPending?: boolean;
  error?: string;
}

export interface DesktopAppInfo {
  name: string;
  version: string;
  repoUrl: string;
  updaterStatus: DesktopUpdateStatus | null;
}

export type DiscordRpcStatus =
  | 'disabled'
  | 'needs_client_id'
  | 'disconnected'
  | 'connected';

export interface DiscordPresencePayload {
  enabled: boolean;
  clientId?: string;
  track: {
    title: string;
    artist: string;
    album?: string;
    artworkUrl?: string;
    trackUrl?: string;
    isPlaying: boolean;
    startMs?: number;
    endMs?: number;
  } | null;
}

export interface OhmDesktopBridge {
  isElectron: boolean;
  platform: string;
  getInfo: () => Promise<DesktopAppInfo>;
  checkForUpdates: () => Promise<DesktopUpdateStatus | null>;
  downloadUpdate: () => Promise<DesktopUpdateStatus | null>;
  installUpdate: () => Promise<{ ok: boolean; error?: string }>;
  openExternal: (targetKey: DesktopExternalTarget) => Promise<{ ok: boolean; error?: string }>;
  setDiscordPresence: (payload: DiscordPresencePayload) => Promise<DiscordRpcStatus>;
  getDiscordStatus: () => Promise<DiscordRpcStatus>;
  onDiscordStatus: (cb: (status: DiscordRpcStatus) => void) => () => void;
  onUpdateStatus: (cb: (status: DesktopUpdateStatus) => void) => () => void;
  onOpenAbout: (cb: () => void) => () => void;
  onMediaAction: (cb: (action: 'toggle' | 'next' | 'prev') => void) => () => void;
}

declare global {
  interface Window {
    ohmDesktop?: OhmDesktopBridge;
  }
}

export const APP_VERSION = pkgVersion;

export const CREATOR_INSTAGRAM_HANDLE = '@vinnssmokee';
export const CREATOR_INSTAGRAM_URL = 'https://www.instagram.com/vinnssmokee';
export const CREATOR_DONATE_LABEL = 'teer.id/alvin_syahril';
export const CREATOR_DONATE_URL = 'https://teer.id/alvin_syahril';
export const RELEASES_URL = 'https://github.com/AlvinSyahril/ohm/releases';

const EXTERNAL_FALLBACK_URLS: Record<DesktopExternalTarget, string> = {
  instagram: CREATOR_INSTAGRAM_URL,
  donate: CREATOR_DONATE_URL,
  releases: RELEASES_URL,
  repo: 'https://github.com/AlvinSyahril/ohm',
};

export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.ohmDesktop?.isElectron);
}

export async function openExternalSafe(target: DesktopExternalTarget): Promise<void> {
  if (typeof window !== 'undefined' && window.ohmDesktop?.openExternal) {
    await window.ohmDesktop.openExternal(target);
    return;
  }
  const url = EXTERNAL_FALLBACK_URLS[target];
  window.open(url, '_blank', 'noopener,noreferrer');
}
