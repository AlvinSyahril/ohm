import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type ErrorSource = 'electron' | 'server' | 'client';

export interface ErrorLogEntry {
  ts: string;
  source: ErrorSource;
  event: string;
  message: string;
  stack?: string;
  context?: Record<string, string | number | boolean | null>;
}

const MAX_LOG_BYTES = 2 * 1024 * 1024;
const MAX_MESSAGE_CHARS = 500;
const MAX_STACK_CHARS = 2000;
const MAX_CONTEXT_KEYS = 8;
const MAX_CONTEXT_VAL_CHARS = 200;

let writeChain: Promise<void> = Promise.resolve();
let pendingWrites = 0;
const MAX_PENDING_WRITES = 100;

/** Resolve the persistent directory used for Ohm's rotating local error log. */
export function getLogDir(): string {
  if (process.env.OHM_LOG_DIR) {
    return process.env.OHM_LOG_DIR;
  }
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'Ohm', 'logs');
  }
  return path.join(os.homedir(), '.ohm', 'logs');
}

/** Return the full file path of the active JSONL error log. */
export function getErrorLogPath(): string {
  return path.join(getLogDir(), 'ohm-errors.jsonl');
}

/** Ensure the local log directory exists so maintenance checks never hit PathNotFound. */
export async function ensureLogDir(): Promise<void> {
  try {
    await fs.promises.mkdir(getLogDir(), { recursive: true });
  } catch {
    // Non-fatal if filesystem is read-only
  }
}

function truncateText(value: string, maxLen: number): string {
  return value.length > maxLen ? `${value.slice(0, maxLen)}...` : value;
}

function sanitizeContext(
  context?: Record<string, unknown>
): Record<string, string | number | boolean | null> | undefined {
  if (!context || typeof context !== 'object') return undefined;
  const cleaned: Record<string, string | number | boolean | null> = {};
  let count = 0;
  for (const [key, val] of Object.entries(context)) {
    if (count >= MAX_CONTEXT_KEYS) break;
    if (val === undefined) continue;
    const safeKey = key.slice(0, 48);
    if (val === null || typeof val === 'boolean' || typeof val === 'number') {
      cleaned[safeKey] = typeof val === 'number' && !Number.isFinite(val) ? null : val;
    } else if (typeof val === 'string') {
      cleaned[safeKey] = truncateText(val, MAX_CONTEXT_VAL_CHARS);
    } else {
      cleaned[safeKey] = truncateText(String(val), MAX_CONTEXT_VAL_CHARS);
    }
    count += 1;
  }
  return count > 0 ? cleaned : undefined;
}

function formatErrorLine(
  source: ErrorSource,
  event: string,
  err: unknown,
  context?: Record<string, unknown>
): string {
  const errObj = err instanceof Error ? err : null;
  const rawMessage = errObj ? errObj.message : typeof err === 'string' ? err : String(err ?? 'Unknown error');
  const entry: ErrorLogEntry = {
    ts: new Date().toISOString(),
    source,
    event: event.slice(0, 64),
    message: truncateText(rawMessage || 'Unknown error', MAX_MESSAGE_CHARS),
  };
  if (errObj?.stack) {
    entry.stack = truncateText(errObj.stack, MAX_STACK_CHARS);
  }
  const safeContext = sanitizeContext(context);
  if (safeContext) {
    entry.context = safeContext;
  }
  return `${JSON.stringify(entry)}\n`;
}

function rotateSyncIfNeeded(logPath: string) {
  try {
    const stat = fs.statSync(logPath);
    if (stat.size >= MAX_LOG_BYTES) {
      fs.renameSync(logPath, `${logPath.slice(0, -'.jsonl'.length)}.prev.jsonl`);
    }
  } catch {
    // Missing log file or rotation race is safe to ignore on next write
  }
}

async function rotateAsyncIfNeeded(logPath: string) {
  try {
    const stat = await fs.promises.stat(logPath);
    if (stat.size >= MAX_LOG_BYTES) {
      await fs.promises.rename(logPath, `${logPath.slice(0, -'.jsonl'.length)}.prev.jsonl`);
    }
  } catch {
    // Missing log file or concurrent rotation is safe to ignore
  }
}

/** Queue a non-blocking structured error record to the local rotating JSONL log. */
export function logError(
  source: ErrorSource,
  event: string,
  err: unknown,
  context?: Record<string, unknown>
): void {
  if (pendingWrites >= MAX_PENDING_WRITES) return;
  pendingWrites += 1;
  const line = formatErrorLine(source, event, err, context);

  writeChain = writeChain
    .then(async () => {
      const logPath = getErrorLogPath();
      await fs.promises.mkdir(path.dirname(logPath), { recursive: true });
      await rotateAsyncIfNeeded(logPath);
      await fs.promises.appendFile(logPath, line, 'utf8');
    })
    .catch(() => {
      // Never let telemetry/logging failures crash the app
    })
    .finally(() => {
      pendingWrites = Math.max(0, pendingWrites - 1);
    });
}

/** Synchronously flush a critical crash/process error before shutdown. */
export function logErrorSync(
  source: ErrorSource,
  event: string,
  err: unknown,
  context?: Record<string, unknown>
): void {
  try {
    const logPath = getErrorLogPath();
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    rotateSyncIfNeeded(logPath);
    fs.appendFileSync(logPath, formatErrorLine(source, event, err, context), 'utf8');
  } catch {
    // Swallow disk errors during crash reporting
  }
}
