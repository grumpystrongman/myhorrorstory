import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const repoRoot = process.cwd();
const outputRoot = join(repoRoot, 'apps', 'web', 'public', 'visuals');

const storyArt = [
  ['static-between-stations', '#1c3c62', '#34203f', '#d9a867', 'abandoned rail signal tower under storm'],
  ['black-chapel-ledger', '#2b3047', '#3d1f24', '#d0b078', 'cliffside chapel bells and ledger desk'],
  ['the-harvest-men', '#29452a', '#3e2518', '#d6b970', 'ritual field at dusk with masked silhouettes'],
  ['signal-from-kharon-9', '#1d2a52', '#1a1535', '#91b7ff', 'observatory dish array under aurora static'],
  ['the-fourth-tenant', '#1f3347', '#2e2226', '#d5bb85', 'flood district apartment hallway with missing door'],
  ['tape-17-pinewatch', '#213a34', '#2d1f1a', '#c5b181', 'forest watchtower and distorted camcorder light'],
  ['crown-of-salt', '#2c3950', '#2f1e20', '#d8b37a', 'port catacombs with relic crates and candles'],
  ['red-creek-winter', '#304764', '#2a1f2a', '#d8c9a1', 'snowed logging town street with police tape'],
  ['ward-1908', '#27384d', '#2b1e28', '#ceb588', 'hilltop ward corridor lit by archival lamps'],
  ['dead-channel-protocol', '#1d3d4f', '#241b30', '#7ccae0', 'smart-city transit hub with glitching signage'],
  ['midnight-lockbox', '#27394f', '#2a1e27', '#dbb77c', 'self-storage corridor with unit 331 light']
].map(([id, c1, c2, c3, motif]) => ({
  id,
  colorA: c1,
  colorB: c2,
  colorC: c3,
  motif
}));

const surfaceArt = [
  ['landing-hero', '#1f3657', '#3a2127', '#d5ab67', 'cinematic investigation board with illuminated strings'],
  ['onboarding', '#1e304f', '#33212f', '#cfb07a', 'briefing desk with legal dossier and invitation cards'],
  ['library', '#1f3148', '#2d2231', '#d8bc85', 'vault shelves containing case files and evidence boxes']
].map(([id, c1, c2, c3, motif]) => ({
  id,
  colorA: c1,
  colorB: c2,
  colorC: c3,
  motif
}));

function svgTemplate(input) {
  const seed = input.id
    .split('')
    .reduce((total, char) => total + char.charCodeAt(0), 0);
  const waveA = 210 + (seed % 90);
  const waveB = 440 + (seed % 120);
  const waveC = 680 + (seed % 140);
  const blurX = 140 + (seed % 50);
  const blurY = 60 + (seed % 45);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-label="${input.id}">
  <defs>
    <linearGradient id="bg-${input.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${input.colorA}" />
      <stop offset="58%" stop-color="${input.colorB}" />
      <stop offset="100%" stop-color="#080b12" />
    </linearGradient>
    <radialGradient id="flare-${input.id}" cx="72%" cy="20%" r="55%">
      <stop offset="0%" stop-color="${input.colorC}" stop-opacity="0.48" />
      <stop offset="100%" stop-color="${input.colorC}" stop-opacity="0" />
    </radialGradient>
    <filter id="grain-${input.id}">
      <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.08" />
      </feComponentTransfer>
    </filter>
    <filter id="blur-${input.id}">
      <feGaussianBlur stdDeviation="42" />
    </filter>
  </defs>
  <rect width="1600" height="900" fill="url(#bg-${input.id})" />
  <rect width="1600" height="900" fill="url(#flare-${input.id})" />
  <g opacity="0.4">
    <path d="M-60,${waveA} C180,${waveA - 120} 480,${waveA + 180} 760,${waveA - 70} C1030,${waveA - 290} 1310,${waveA + 190} 1680,${waveA - 30}" fill="none" stroke="${input.colorC}" stroke-opacity="0.45" stroke-width="2.5" />
    <path d="M-80,${waveB} C220,${waveB - 150} 530,${waveB + 130} 830,${waveB - 90} C1120,${waveB - 280} 1390,${waveB + 110} 1690,${waveB - 70}" fill="none" stroke="${input.colorC}" stroke-opacity="0.25" stroke-width="1.6" />
    <path d="M-50,${waveC} C220,${waveC - 140} 540,${waveC + 95} 860,${waveC - 110} C1160,${waveC - 200} 1400,${waveC + 70} 1680,${waveC - 45}" fill="none" stroke="#f4e2bd" stroke-opacity="0.2" stroke-width="1.2" />
  </g>
  <g filter="url(#blur-${input.id})" opacity="0.3">
    <ellipse cx="${blurX}" cy="${blurY}" rx="220" ry="130" fill="${input.colorC}" />
    <ellipse cx="1280" cy="720" rx="250" ry="140" fill="#2b5a71" />
  </g>
  <g filter="url(#grain-${input.id})">
    <rect width="1600" height="900" fill="#fff" />
  </g>
  <text x="90" y="756" fill="#f5e9d2" fill-opacity="0.82" font-size="36" letter-spacing="0.08em" font-family="Georgia,serif">${input.id.replaceAll('-', ' ').toUpperCase()}</text>
  <text x="90" y="804" fill="#d8c6a4" fill-opacity="0.75" font-size="22" font-family="Georgia,serif">${input.motif}</text>
</svg>
`;
}

async function main() {
  await mkdir(join(outputRoot, 'stories'), { recursive: true });
  await mkdir(join(outputRoot, 'surfaces'), { recursive: true });

  for (const story of storyArt) {
    await writeFile(join(outputRoot, 'stories', `${story.id}.svg`), svgTemplate(story), 'utf8');
  }

  for (const surface of surfaceArt) {
    await writeFile(join(outputRoot, 'surfaces', `${surface.id}.svg`), svgTemplate(surface), 'utf8');
  }

  console.log(
    `[visual-assets] Generated ${storyArt.length} story visuals and ${surfaceArt.length} surface visuals in ${outputRoot}`
  );
}

main().catch((error) => {
  console.error('[visual-assets] Failed:', error);
  process.exit(1);
});
