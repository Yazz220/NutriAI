import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const brandRoot = path.join(projectRoot, 'brand');
const mastersRoot = path.join(brandRoot, 'masters');
const exportsRoot = path.join(brandRoot, 'exports', 'app-icons');
const runtimeRoot = path.join(projectRoot, 'assets', 'brand');

const master = (...parts) => path.join(mastersRoot, ...parts);
const output = (...parts) => path.join(exportsRoot, ...parts);
const runtime = (...parts) => path.join(runtimeRoot, ...parts);

async function ensureParent(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function renderSquare(source, destination, size, options = {}) {
  await ensureParent(destination);
  let image = sharp(source).resize(size, size, { fit: 'fill' });

  if (options.opaque) {
    image = image.flatten({ background: options.background ?? '#F7F2EA' }).removeAlpha();
  }

  await image
    .withMetadata({ icc: 'srgb' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(destination);
}

async function renderSplash(source, destination) {
  await ensureParent(destination);
  const mark = await sharp(source)
    .resize({ width: 620, height: 620, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .withMetadata({ icc: 'srgb' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(destination);
}

async function copySvgDirectory(sourceDirectory, destinationDirectory) {
  await mkdir(destinationDirectory, { recursive: true });
  const entries = await readdir(sourceDirectory, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
      .map(async (entry) => {
        const source = path.join(sourceDirectory, entry.name);
        const destination = path.join(destinationDirectory, entry.name);
        const svg = await readFile(source, 'utf8');

        // Some supplied masters encode line breaks as literal `\\n` text.
        // React Native treats those text nodes as invalid children of an SVG.
        await writeFile(destination, svg.replaceAll('\\n', '\n'), 'utf8');
      }),
  );
}

const lightIcon = master('app-icon', 'nosh-app-icon-light.svg');
const darkIcon = master('app-icon', 'nosh-app-icon-dark.svg');
const monochromeIcon = master('app-icon', 'nosh-app-icon-monochrome.svg');
const invertedIcon = master('app-icon', 'nosh-app-icon-inverted.svg');
const adaptiveForeground = master('app-icon', 'nosh-adaptive-foreground.svg');
const adaptiveBackground = master('app-icon', 'nosh-adaptive-background.svg');
const adaptiveMonochrome = master('app-icon', 'nosh-adaptive-monochrome.svg');

const iosSizes = [1024, 512, 180, 120, 87, 80, 60, 58, 40, 29];
const webSizes = [512, 192, 180, 48, 32];

await Promise.all([
  ...iosSizes.map((size) => renderSquare(lightIcon, output('ios', `nosh-app-icon-${size}.png`), size, { opaque: true })),
  renderSquare(darkIcon, output('ios', 'nosh-app-icon-dark-1024.png'), 1024, { opaque: true, background: '#65436F' }),
  renderSquare(monochromeIcon, output('ios', 'nosh-app-icon-monochrome-1024.png'), 1024, { opaque: true }),
  renderSquare(invertedIcon, output('ios', 'nosh-app-icon-inverted-1024.png'), 1024, { opaque: true, background: '#2B2B2B' }),
  renderSquare(adaptiveForeground, output('android', 'nosh-adaptive-foreground-1024.png'), 1024),
  renderSquare(adaptiveBackground, output('android', 'nosh-adaptive-background-1024.png'), 1024, { opaque: true }),
  renderSquare(adaptiveMonochrome, output('android', 'nosh-adaptive-monochrome-1024.png'), 1024),
  ...webSizes.map((size) => renderSquare(lightIcon, output('web', `nosh-icon-${size}.png`), size, { opaque: true })),
  renderSquare(lightIcon, runtime('platform', 'icon.png'), 1024, { opaque: true }),
  renderSquare(darkIcon, runtime('platform', 'icon-dark.png'), 1024, { opaque: true, background: '#65436F' }),
  renderSquare(monochromeIcon, runtime('platform', 'icon-tinted.png'), 1024, { opaque: true }),
  renderSquare(adaptiveForeground, runtime('platform', 'adaptive-icon.png'), 1024),
  renderSquare(adaptiveBackground, runtime('platform', 'adaptive-background.png'), 1024, { opaque: true }),
  renderSquare(adaptiveMonochrome, runtime('platform', 'adaptive-monochrome.png'), 1024),
  renderSquare(lightIcon, runtime('platform', 'favicon.png'), 48, { opaque: true }),
  renderSplash(master('lockups', 'nosh-lockup-stacked-plum.svg'), runtime('platform', 'splash.png')),
  renderSplash(master('lockups', 'nosh-lockup-stacked-ivory.svg'), runtime('platform', 'splash-dark.png')),
  copySvgDirectory(master('symbol'), runtime('marks', 'symbol')),
  copySvgDirectory(master('wordmark'), runtime('marks', 'wordmark')),
  copySvgDirectory(master('lockups'), runtime('marks', 'lockups')),
  copySvgDirectory(master('character'), runtime('characters')),
]);

console.log('Generated Nosh platform exports and synchronized runtime brand assets.');
