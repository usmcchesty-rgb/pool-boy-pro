/**
 * Generate PWA and favicon PNGs from public/assets/logos/logo transparent.png.
 * Regenerate after updating official logo files: npm run icons
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const iconsDir = join(root, 'public', 'icons');
const logoPath = join(root, 'public', 'assets', 'logos', 'logo transparent.png');
const brandTeal = '#0b7377';

/**
 * Logo scale targets (contain fit, centered, aspect ratio preserved):
 * - Standard / Apple / favicon: ~93% of canvas (3.5% margin per edge for iOS rounded mask)
 * - Maskable Android: ~80% of canvas (10% margin per edge — max within safe-zone guidelines)
 */
const STANDARD_PADDING = 0.035;
const MASKABLE_PADDING = 0.1;

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-167x167.png', size: 167 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
];

async function renderIcon(size, { maskable = false } = {}) {
  const padding = maskable ? MASKABLE_PADDING : STANDARD_PADDING;
  const logoMax = Math.max(1, Math.round(size * (1 - padding * 2)));

  const logo = await sharp(logoPath)
    .resize(logoMax, logoMax, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const { width: logoWidth, height: logoHeight } = await sharp(logo).metadata();
  const offsetX = Math.round((size - logoWidth) / 2);
  const offsetY = Math.round((size - logoHeight) / 2);

  const background = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: brandTeal,
    },
  })
    .png()
    .toBuffer();

  return sharp(background)
    .composite([{ input: logo, left: offsetX, top: offsetY }])
    .png()
    .toBuffer();
}

mkdirSync(iconsDir, { recursive: true });

for (const { name, size, maskable = false } of sizes) {
  const png = await renderIcon(size, { maskable });
  await sharp(png).toFile(join(iconsDir, name));
  console.log(`Wrote ${name}`);
}

const favicon32 = await renderIcon(32);
await sharp(favicon32).toFile(join(iconsDir, 'favicon.ico'));
console.log('Wrote favicon.ico');

console.log(`Source logo: ${logoPath}`);
