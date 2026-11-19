import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import {
  compareSemver,
  fetchUpdateCheck,
  FriendlyUpdateError,
  isAllowedDownloadUrl,
  UPDATE_MANIFEST_URL,
  UPDATE_RELEASES_URL,
  UPDATE_REPO_URL,
  type UpdateManifest,
  type UpdatePhase,
  type UpdateStatusPayload,
} from '../server/updates.js';

export {
  compareSemver,
  UPDATE_MANIFEST_URL,
  UPDATE_RELEASES_URL,
  UPDATE_REPO_URL,
  type UpdateManifest,
  type UpdatePhase,
  type UpdateStatusPayload,
};

export class DesktopUpdater {
  private status: UpdateStatusPayload;
  private manifest: UpdateManifest | null = null;
  private downloading = false;
  private onChange: (payload: UpdateStatusPayload) => void;

  constructor(currentVersion: string, onChange: (payload: UpdateStatusPayload) => void) {
    this.onChange = onChange;
    this.status = {
      phase: 'idle',
      currentVersion,
    };
  }

  getStatus(): UpdateStatusPayload {
    return this.status;
  }

  private emit(next: Partial<UpdateStatusPayload>) {
    this.status = { ...this.status, ...next };
    this.onChange(this.status);
    return this.status;
  }

  async checkForUpdates(silent = false): Promise<UpdateStatusPayload> {
    if (this.downloading) return this.status;
    this.emit({ phase: 'checking', error: undefined });

    try {
      const { status, manifest } = await fetchUpdateCheck(this.status.currentVersion);
      this.manifest = manifest;
      return this.emit(status);
    } catch (err) {
      if (silent) {
        return this.emit({ phase: 'idle', error: undefined });
      }
      return this.emit({
        phase: 'error',
        error:
          err instanceof FriendlyUpdateError
            ? err.message
            : 'Could not check for updates. Check your internet connection and try again.',
      });
    }
  }

  async downloadUpdate(): Promise<UpdateStatusPayload> {
    if (this.downloading) return this.status;
    if (!this.manifest) {
      const checked = await this.checkForUpdates(false);
      if (checked.phase !== 'available' || !this.manifest) return checked;
    }

    const manifest = this.manifest;
    this.downloading = true;
    this.emit({ phase: 'downloading', downloadProgress: 0, error: undefined });

    const safeVersion = manifest.version.replace(/[^0-9A-Za-z._-]/g, '');
    const updatesDir = path.join(os.tmpdir(), 'ohm-updates');
    fs.mkdirSync(updatesDir, { recursive: true });
    const targetPath = path.join(updatesDir, `Ohm-Setup-${safeVersion}.exe`);
    const partPath = `${targetPath}.part`;

    try {
      const res = await fetch(manifest.downloadUrl, {
        signal: AbortSignal.timeout(180_000),
        redirect: 'follow',
      });

      if (!res.ok || !res.body) {
        throw new FriendlyUpdateError('Download could not be started right now. Please try again in a moment.');
      }

      if (res.url && !isAllowedDownloadUrl(res.url)) {
        throw new FriendlyUpdateError('Could not confirm the download source. Try opening Version history instead.');
      }

      const totalBytes = Number(res.headers.get('content-length') || '0');
      let bytesRead = 0;
      let lastPct = -1;

      const hash = crypto.createHash('sha256');
      const writeStream = fs.createWriteStream(partPath);
      const nodeReadable = Readable.fromWeb(res.body as unknown as import('node:stream/web').ReadableStream);

      await new Promise<void>((resolve, reject) => {
        nodeReadable.on('data', (chunk: Buffer) => {
          hash.update(chunk);
          bytesRead += chunk.length;
          if (totalBytes > 0) {
            const pct = Math.min(99, Math.round((bytesRead / totalBytes) * 100));
            if (pct !== lastPct) {
              lastPct = pct;
              this.emit({ downloadProgress: pct });
            }
          }
        });
        nodeReadable.on('error', reject);
        writeStream.on('error', reject);
        writeStream.on('finish', resolve);
        nodeReadable.pipe(writeStream);
      });

      if (manifest.sha256) {
        const expected = manifest.sha256.toLowerCase();
        const actual = hash.digest('hex').toLowerCase();
        if (actual !== expected) {
          fs.rmSync(partPath, { force: true });
          throw new FriendlyUpdateError('The downloaded file looks incomplete. Please try downloading again.');
        }
      }

      fs.renameSync(partPath, targetPath);
      this.downloading = false;
      return this.emit({
        phase: 'ready',
        downloadProgress: 100,
        downloadedPath: targetPath,
        error: undefined,
      });
    } catch (err) {
      fs.rmSync(partPath, { force: true });
      this.downloading = false;
      return this.emit({
        phase: 'error',
        error:
          err instanceof FriendlyUpdateError
            ? err.message
            : 'Download was interrupted. Check your connection and try again.',
      });
    }
  }
}
