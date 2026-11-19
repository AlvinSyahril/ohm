import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';

const svgPath = path.resolve('public/ohm-icon.svg');
const buildDir = path.resolve('build');
fs.mkdirSync(buildDir, { recursive: true });

const svgData = fs.readFileSync(svgPath, 'utf8');

const renderPng = (size) => {
  const resvg = new Resvg(svgData, {
    fitTo: { mode: 'width', value: size },
  });
  return resvg.render().asPng();
};

const png512 = renderPng(512);
fs.writeFileSync(path.join(buildDir, 'icon.png'), png512);

const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const icoPngs = icoSizes.map((size) => renderPng(size));
const icoBuffer = await pngToIco(icoPngs);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);

// 32x32 crisp tray icon for Windows system tray
const trayPng = renderPng(32);
fs.writeFileSync(path.join(buildDir, 'tray.png'), trayPng);

console.log('Generated build/icon.png, build/icon.ico, and build/tray.png from public/ohm-icon.svg');
