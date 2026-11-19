import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const UPDATE_REPO_URL = 'https://github.com/AlvinSyahril/ohm';
export const UPDATE_MANIFEST_URL =
  'https://raw.githubusercontent.com/AlvinSyahril/ohm/main/update-ohm.json';
export const UPDATE_RELEASES_URL = `${UPDATE_REPO_URL}/releases`;

const ALLOWED_DOWNLOAD_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
]);

export interface UpdateManifest {
  app?: string;
  version: string;
  releaseDate?: string;
  downloadUrl: string;
  sha256?: string;
  releaseNotesUrl?: string;
  changelog?: string[];
}

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error';

export interface UpdateStatusPayload {
  phase: UpdatePhase;
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

export class FriendlyUpdateError extends Error {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Read the current package version from package.json for server-side update checks. */
export function readPackageVersion(): string {
  try {
    const pkgPath = path.resolve(__dirname, '..', '..', 'package.json');
    const raw = fs.readFileSync(pkgPath, 'utf8');
    const parsed = JSON.parse(raw) as { version?: string };
    if (typeof parsed.version === 'string' && parsed.version.trim()) {
      return parsed.version.trim();
    }
  } catch {
    // Fallback below if package.json cannot be read
  }
  return '0.1.0';
}

/** Parse dotted numeric semver (stripping optional leading v and pre-release tags). */
export function compareSemver(aRaw: string, bRaw: string): number {
  const parse = (v: string) =>
    v
      .trim()
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .slice(0, 3)
      .map((n) => Number.parseInt(n, 10) || 0);

  const a = parse(aRaw);
  const b = parse(bRaw);
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export function isAllowedDownloadUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    if (!ALLOWED_DOWNLOAD_HOSTS.has(parsed.hostname)) return false;
    if (
      parsed.hostname === 'github.com' &&
      !parsed.pathname.startsWith('/AlvinSyahril/ohm/releases/')
    ) {
      return false;
    }
    return parsed.pathname.toLowerCase().endsWith('.exe');
  } catch {
    return false;
  }
}

export async function fetchUpdateCheck(
  currentVersion: string
): Promise<{ status: UpdateStatusPayload; manifest: UpdateManifest | null }> {
  const res = await fetch(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`, {
    signal: AbortSignal.timeout(10_000),
    headers: { 'Cache-Control': 'no-cache' },
  });

  if (res.status === 404) {
    return {
      manifest: null,
      status: {
        phase: 'up-to-date',
        currentVersion,
        latestVersion: currentVersion,
        feedPending: true,
        error: undefined,
      },
    };
  }

  if (!res.ok) {
    throw new FriendlyUpdateError('Could not reach the update server right now. Please try again later.');
  }

  const data = (await res.json()) as Partial<UpdateManifest>;
  if (!data || typeof data.version !== 'string' || !data.version.trim()) {
    throw new FriendlyUpdateError('Update details are temporarily unavailable. Please try again later.');
  }

  const remoteVersion = data.version.trim().replace(/^v/i, '');
  const hasUpdate = compareSemver(remoteVersion, currentVersion) > 0;
  const changelog = Array.isArray(data.changelog)
    ? data.changelog.filter((c): c is string => typeof c === 'string')
    : [];

  if (!hasUpdate) {
    return {
      manifest: null,
      status: {
        phase: 'up-to-date',
        currentVersion,
        latestVersion: remoteVersion,
        releaseDate: data.releaseDate,
        changelog,
        feedPending: false,
        error: undefined,
      },
    };
  }

  if (typeof data.downloadUrl !== 'string' || !isAllowedDownloadUrl(data.downloadUrl)) {
    throw new FriendlyUpdateError(
      'This update is not ready for automatic download yet. Try checking Version history instead.'
    );
  }

  const manifest: UpdateManifest = {
    app: data.app,
    version: remoteVersion,
    releaseDate: data.releaseDate,
    downloadUrl: data.downloadUrl,
    sha256: typeof data.sha256 === 'string' ? data.sha256.trim() : undefined,
    releaseNotesUrl: data.releaseNotesUrl,
    changelog,
  };

  return {
    manifest,
    status: {
      phase: 'available',
      currentVersion,
      latestVersion: remoteVersion,
      releaseDate: data.releaseDate,
      changelog,
      downloadUrl: data.downloadUrl,
      feedPending: false,
      downloadProgress: 0,
      error: undefined,
    },
  };
}
