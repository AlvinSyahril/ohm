import net from 'node:net';
import crypto from 'node:crypto';
import path from 'node:path';
import { logError } from '../server/logger.js';

export type DiscordRpcConnectionStatus =
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

const OP_HANDSHAKE = 0;
const OP_FRAME = 1;
const OP_CLOSE = 2;

const DEFAULT_CLIENT_ID = (
  process.env.OHM_DISCORD_CLIENT_ID || '1572644578626900159'
).trim();

function getIpcPath(index: number): string {
  if (process.platform === 'win32') {
    return `\\\\.\\pipe\\discord-ipc-${index}`;
  }
  const base =
    process.env.XDG_RUNTIME_DIR ||
    process.env.TMPDIR ||
    process.env.TMP ||
    process.env.TEMP ||
    '/tmp';
  return path.join(base, `discord-ipc-${index}`);
}

function encodeFrame(op: number, payload: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  const header = Buffer.allocUnsafe(8);
  header.writeUInt32LE(op, 0);
  header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}

function clampRpcText(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return fallback;
  if (trimmed.length === 1) return `${trimmed} `;
  return trimmed.slice(0, 128);
}

export class DiscordRpcClient {
  private socket: net.Socket | null = null;
  private ready = false;
  private connecting = false;
  private activeClientId = DEFAULT_CLIENT_ID;
  private enabled = false;
  private latestTrack: DiscordPresencePayload['track'] = null;
  private incomingBuffer = Buffer.alloc(0);
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectGen = 0;
  private onStatusChange?: (status: DiscordRpcConnectionStatus) => void;

  public setStatusListener(listener: (status: DiscordRpcConnectionStatus) => void): void {
    this.onStatusChange = listener;
  }

  private emitStatus(): void {
    this.onStatusChange?.(this.getStatus());
  }

  public getStatus(): DiscordRpcConnectionStatus {
    if (!this.enabled) return 'disabled';
    if (!this.activeClientId) return 'needs_client_id';
    return this.ready && this.socket ? 'connected' : 'disconnected';
  }

  public async update(payload: DiscordPresencePayload): Promise<DiscordRpcConnectionStatus> {
    this.enabled = Boolean(payload.enabled);
    const nextClientId = (payload.clientId || DEFAULT_CLIENT_ID || '').trim();

    if (nextClientId !== this.activeClientId) {
      this.connectGen += 1;
      if (this.socket) {
        this.destroySocket();
      }
    }
    this.activeClientId = nextClientId;
    this.latestTrack = payload.track;

    if (!this.enabled) {
      this.connectGen += 1;
      await this.clearAndDisconnect();
      return 'disabled';
    }

    if (!this.activeClientId) {
      this.connectGen += 1;
      this.destroySocket();
      return 'needs_client_id';
    }

    const wasReady = this.ready;
    if (!this.socket && !this.connecting) {
      await this.connect();
    }

    if (wasReady && this.ready && this.socket) {
      this.sendActivity();
    }

    return this.getStatus();
  }

  public async clearAndDisconnect(): Promise<void> {
    this.connectGen += 1;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ready && this.socket) {
      const sock = this.socket;
      this.socket = null;
      this.ready = false;
      this.connecting = false;
      this.incomingBuffer = Buffer.alloc(0);
      try {
        sock.removeAllListeners();
        sock.write(
          encodeFrame(OP_FRAME, {
            cmd: 'SET_ACTIVITY',
            args: { pid: process.pid, activity: null },
            nonce: crypto.randomUUID(),
          })
        );
        sock.end(encodeFrame(OP_CLOSE, {}));
        setTimeout(() => {
          try {
            sock.destroy();
          } catch {
            // Ignore cleanup errors
          }
        }, 150).unref?.();
      } catch {
        try {
          sock.destroy();
        } catch {
          // Ignore cleanup errors
        }
      }
      this.emitStatus();
      return;
    }
    this.destroySocket();
  }

  private destroySocket(): void {
    const wasReady = this.ready;
    this.ready = false;
    this.connecting = false;
    this.incomingBuffer = Buffer.alloc(0);
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.destroy();
      } catch {
        // Ignore socket destroy errors
      }
      this.socket = null;
    }
    if (wasReady) {
      this.emitStatus();
    }
  }

  private async connect(): Promise<void> {
    if (this.connecting || !this.activeClientId) return;
    this.connecting = true;
    const gen = this.connectGen;
    const clientId = this.activeClientId;

    for (let i = 0; i <= 9; i += 1) {
      if (!this.enabled || gen !== this.connectGen || this.activeClientId !== clientId) {
        this.connecting = false;
        return;
      }
      const connected = await this.tryConnectPipe(getIpcPath(i), clientId);
      if (connected) {
        this.connecting = false;
        if (!this.enabled || gen !== this.connectGen || this.activeClientId !== clientId) {
          this.destroySocket();
          return;
        }
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        return;
      }
    }

    this.connecting = false;
    if (this.enabled && gen === this.connectGen && this.activeClientId === clientId) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (!this.enabled || !this.activeClientId || this.socket || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.enabled && this.activeClientId && !this.socket && !this.connecting) {
        void this.connect();
      }
    }, 15_000);
    this.reconnectTimer.unref?.();
  }

  private tryConnectPipe(pipePath: string, clientId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const sock = net.createConnection(pipePath);
      let settled = false;

      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (!ok) {
          if (this.socket === sock) {
            this.destroySocket();
          } else {
            try {
              sock.removeAllListeners();
              sock.destroy();
            } catch {
              // Ignore cleanup errors
            }
          }
        }
        resolve(ok);
      };

      const timeout = setTimeout(() => finish(false), 1200);

      sock.once('error', () => {
        clearTimeout(timeout);
        finish(false);
      });

      sock.once('connect', () => {
        this.socket = sock;
        this.incomingBuffer = Buffer.alloc(0);

        sock.on('data', (chunk) => {
          this.handleData(
            chunk,
            () => {
              clearTimeout(timeout);
              finish(true);
            },
            () => {
              clearTimeout(timeout);
              finish(false);
              this.scheduleReconnect();
            }
          );
        });

        sock.on('close', () => {
          clearTimeout(timeout);
          const wasCurrent = this.socket === sock;
          finish(false);
          if (wasCurrent) {
            this.destroySocket();
            this.scheduleReconnect();
          }
        });

        try {
          sock.write(encodeFrame(OP_HANDSHAKE, { v: 1, client_id: clientId }));
        } catch {
          clearTimeout(timeout);
          finish(false);
        }
      });
    });
  }

  private handleData(chunk: Buffer, onReady: () => void, onClose: () => void): void {
    this.incomingBuffer = Buffer.concat([this.incomingBuffer, chunk]);

    while (this.incomingBuffer.length >= 8) {
      const op = this.incomingBuffer.readUInt32LE(0);
      const len = this.incomingBuffer.readUInt32LE(4);
      if (len > 1_048_576) {
        this.destroySocket();
        onClose();
        return;
      }
      if (this.incomingBuffer.length < 8 + len) break;

      const rawJson = this.incomingBuffer.subarray(8, 8 + len).toString('utf8');
      this.incomingBuffer = this.incomingBuffer.subarray(8 + len);

      if (op === OP_CLOSE) {
        this.destroySocket();
        onClose();
        return;
      }

      if (op === OP_FRAME) {
        try {
          const msg = JSON.parse(rawJson) as {
            cmd?: string;
            evt?: string;
            data?: { message?: string; code?: number };
          };
          if (msg.cmd === 'DISPATCH' && msg.evt === 'READY') {
            this.ready = true;
            this.emitStatus();
            onReady();
            this.sendActivity();
          } else if (msg.evt === 'ERROR') {
            logError(
              'electron',
              'discord-rpc',
              msg.data?.message || 'Discord IPC error frame',
              { code: msg.data?.code }
            );
          }
        } catch {
          // Ignore malformed RPC frames
        }
      }
    }
  }

  private sendActivity(): void {
    if (!this.ready || !this.socket || !this.enabled) return;
    const track = this.latestTrack;

    const albumText = track?.album?.trim();
    const largeText =
      albumText && albumText.toLowerCase() !== 'empty'
        ? `on ${albumText}`
        : 'Ohm Desktop';

    const buttons: { label: string; url: string }[] = [
      { label: 'Download Ohm', url: 'https://www.nexorastudio.my.id/apps/ohm' },
    ];
    if (track?.trackUrl && track.trackUrl.startsWith('https://')) {
      buttons.push({ label: 'Listen to Track', url: track.trackUrl });
    }

    const activity = track
      ? {
          type: 2,
          details: clampRpcText(track.title, 'Unknown Track'),
          state: clampRpcText(`by ${track.artist}`, 'Ohm Player'),
          ...(track.isPlaying && track.startMs
            ? {
                timestamps: {
                  start: Math.floor(track.startMs / 1000),
                  ...(track.endMs && track.endMs > track.startMs
                    ? { end: Math.floor(track.endMs / 1000) }
                    : {}),
                },
              }
            : {}),
          assets: {
            large_image:
              track.artworkUrl && track.artworkUrl.startsWith('https://')
                ? track.artworkUrl
                : 'ohm_logo',
            large_text: clampRpcText(largeText, 'Ohm Desktop'),
          },
          buttons,
          instance: false,
        }
      : null;

    try {
      this.socket.write(
        encodeFrame(OP_FRAME, {
          cmd: 'SET_ACTIVITY',
          args: { pid: process.pid, activity },
          nonce: crypto.randomUUID(),
        })
      );
    } catch {
      this.destroySocket();
    }
  }
}
