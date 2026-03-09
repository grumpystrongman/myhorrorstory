import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';

const repoRoot = process.cwd();
const manifestPath = join(repoRoot, 'assets', 'manifests', 'commercial-creative-plan.json');
const webPreviewRoot = join(repoRoot, 'apps', 'web', 'public', 'creative');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
    : clean;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16)
  };
}

function colorPaletteFromSeed(seed) {
  const baseHue = seed % 360;
  const altHue = (baseHue + 46) % 360;
  const highlightHue = (baseHue + 190) % 360;
  return [
    `hsl(${baseHue}deg 38% 17%)`,
    `hsl(${altHue}deg 32% 12%)`,
    `hsl(${highlightHue}deg 58% 61%)`
  ];
}

function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = light - c / 2;
  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (hue < 60) {
    rPrime = c;
    gPrime = x;
  } else if (hue < 120) {
    rPrime = x;
    gPrime = c;
  } else if (hue < 180) {
    gPrime = c;
    bPrime = x;
  } else if (hue < 240) {
    gPrime = x;
    bPrime = c;
  } else if (hue < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255)
  };
}

function parseHsl(input) {
  const match = /hsl\(([-\d.]+)deg\s+([-\d.]+)%\s+([-\d.]+)%\)/i.exec(input);
  if (!match) {
    return { r: 48, g: 60, b: 84 };
  }
  return hslToRgb(Number(match[1]), Number(match[2]), Number(match[3]));
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  const crcValue = crc32(Buffer.concat([typeBuffer, data]));
  crcBuffer.writeUInt32BE(crcValue, 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (stride + 1);
    raw[rowOffset] = 0;
    rgba.copy(raw, rowOffset + 1, y * stride, y * stride + stride);
  }

  const compressed = deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    createPngChunk('IHDR', ihdr),
    createPngChunk('IDAT', compressed),
    createPngChunk('IEND', Buffer.alloc(0))
  ]);
}

function chooseDimensions(assetType) {
  switch (assetType) {
    case 'character_portrait':
      return { width: 768, height: 1024 };
    case 'social_creative':
      return { width: 1080, height: 1080 };
    case 'promo_image':
      return { width: 1200, height: 628 };
    case 'evidence_image':
      return { width: 1400, height: 900 };
    default:
      return { width: 1600, height: 900 };
  }
}

function renderAssetImage(asset) {
  const { width, height } = chooseDimensions(asset.type);
  const bytes = Buffer.alloc(width * height * 4);
  const seed = hashString(`${asset.id}:${asset.storyId ?? 'global'}:${asset.type}:${asset.revision}`);
  const [cA, cB, cC] = colorPaletteFromSeed(seed).map(parseHsl);

  const waveA = (seed % 127) / 9 + 8;
  const waveB = ((seed >>> 8) % 127) / 12 + 5;
  const noiseScale = ((seed >>> 14) % 100) / 150 + 0.14;
  const cx = width * (0.28 + ((seed >>> 3) % 35) / 100);
  const cy = height * (0.22 + ((seed >>> 11) % 30) / 100);
  const hx = width * (0.75 + ((seed >>> 17) % 12) / 100);
  const hy = height * (0.63 + ((seed >>> 6) % 18) / 100);

  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = x / width;
      const ny = y / height;
      const dx1 = (x - cx) / width;
      const dy1 = (y - cy) / height;
      const dx2 = (x - hx) / width;
      const dy2 = (y - hy) / height;
      const radialA = Math.exp(-(dx1 * dx1 * 12 + dy1 * dy1 * 18));
      const radialB = Math.exp(-(dx2 * dx2 * 10 + dy2 * dy2 * 14));
      const wave = 0.5 + 0.5 * Math.sin(nx * waveA + ny * waveB + (seed % 17));
      const grain = ((Math.sin((x + seed) * 12.9898 + (y + seed) * 78.233) * 43758.5453) % 1 + 1) % 1;
      const vignette = clamp(1 - ((nx - 0.5) ** 2 + (ny - 0.5) ** 2) * 1.85, 0.18, 1);
      const blendA = clamp(0.3 + radialA * 0.55 + wave * 0.18, 0, 1);
      const blendB = clamp(0.25 + radialB * 0.6 + (1 - wave) * 0.2, 0, 1);
      const highlight = clamp(0.05 + radialA * 0.22 + radialB * 0.2, 0, 0.45);
      const noise = (grain - 0.5) * noiseScale;

      const r = clamp((cA.r * blendA + cB.r * (1 - blendA)) * vignette + cC.r * highlight + noise * 255, 0, 255);
      const g = clamp((cA.g * blendA + cB.g * (1 - blendA)) * vignette + cC.g * highlight + noise * 180, 0, 255);
      const b = clamp((cA.b * blendB + cB.b * (1 - blendB)) * vignette + cC.b * highlight + noise * 140, 0, 255);

      bytes[offset] = Math.round(r);
      bytes[offset + 1] = Math.round(g);
      bytes[offset + 2] = Math.round(b);
      bytes[offset + 3] = 255;
      offset += 4;
    }
  }

  return encodePng(width, height, bytes);
}

function resolveOutputPath(asset) {
  const declared = join(repoRoot, asset.outputKey);
  if (declared.endsWith('.png')) {
    return declared;
  }
  return `${declared}.png`;
}

async function main() {
  const manifestRaw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const assets = manifest.assets ?? [];
  let generatedCount = 0;

  for (const asset of assets) {
    const outputFile = resolveOutputPath(asset);
    await mkdir(dirname(outputFile), { recursive: true });

    const png = renderAssetImage(asset);
    await writeFile(outputFile, png);

    const previewScope = asset.storyId ? join('stories', asset.storyId) : 'website';
    const previewFile = join(webPreviewRoot, previewScope, `${asset.id}.png`);
    await mkdir(dirname(previewFile), { recursive: true });
    await writeFile(previewFile, png);

    const metadataPath = outputFile.replace(/\.png$/i, '.meta.json');
    await writeFile(
      metadataPath,
      JSON.stringify(
        {
          id: asset.id,
          type: asset.type,
          scope: asset.scope,
          storyId: asset.storyId ?? null,
          prompt: asset.prompt,
          revision: asset.revision,
          providerChain: asset.providerChain,
          qualityGates: asset.qualityGates,
          generatedAt: new Date().toISOString()
        },
        null,
        2
      ),
      'utf8'
    );

    generatedCount += 1;
  }

  console.log(`[creative-assets] Materialized ${generatedCount} production art assets from ${manifestPath}`);
  console.log(`[creative-assets] Preview assets mirrored to ${webPreviewRoot}`);
}

main().catch((error) => {
  console.error('[creative-assets] Failed:', error);
  process.exit(1);
});
