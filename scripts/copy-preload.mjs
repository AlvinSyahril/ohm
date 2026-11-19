import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve('src/electron/preload.cjs');
const destDir = path.resolve('dist/electron');
const dest = path.join(destDir, 'preload.cjs');

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
