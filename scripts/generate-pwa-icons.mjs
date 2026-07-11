/**
 * Generate PWA and favicon PNGs from public/icons/icon.svg
 * Run: npm run icons
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const iconsDir = join(root, 'public', 'icons');

const standardSvg = readFileSync(join(iconsDir, 'icon.svg'));
const maskableSvg = readFileSync(join(iconsDir, 'icon-maskable.svg'));

const sizes = [
  { name: 'favicon-16x16.png', size: 16, svg: standardSvg },
  { name: 'favicon-32x32.png', size: 32, svg: standardSvg },
  { name: 'favicon-48x48.png', size: 48, svg: standardSvg },
  { name: 'icon-72x72.png', size: 72, svg: standardSvg },
  { name: 'icon-96x96.png', size: 96, svg: standardSvg },
  { name: 'icon-128x128.png', size: 128, svg: standardSvg },
  { name: 'icon-144x144.png', size: 144, svg: standardSvg },
  { name: 'icon-152x152.png', size: 152, svg: standardSvg },
  { name: 'icon-167x167.png', size: 167, svg: standardSvg },
  { name: 'apple-touch-icon.png', size: 180, svg: standardSvg },
  { name: 'icon-192x192.png', size: 192, svg: standardSvg },
  { name: 'icon-384x384.png', size: 384, svg: standardSvg },
  { name: 'icon-512x512.png', size: 512, svg: standardSvg },
  { name: 'icon-maskable-512x512.png', size: 512, svg: maskableSvg },
];

mkdirSync(iconsDir, { recursive: true });

for (const { name, size, svg } of sizes) {
  await sharp(svg).resize(size, size).png().toFile(join(iconsDir, name));
  console.log(`Wrote ${name}`);
}

// Multi-size favicon.ico for legacy browsers
await sharp(standardSvg)
  .resize(32, 32)
  .toFile(join(iconsDir, 'favicon.ico'));

console.log('Wrote favicon.ico');
