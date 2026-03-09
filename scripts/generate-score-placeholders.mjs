import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const sampleRate = 12000;
const durationSeconds = 12;
const amplitude = 0.28;

const tracks = [
  { file: 'platform-overture.wav', root: 47, pulse: 0.5 },
  { file: 'static-between-stations.wav', root: 61, pulse: 0.7 },
  { file: 'black-chapel-ledger.wav', root: 52, pulse: 0.45 },
  { file: 'the-harvest-men.wav', root: 58, pulse: 0.62 },
  { file: 'signal-from-kharon-9.wav', root: 44, pulse: 0.35 },
  { file: 'the-fourth-tenant.wav', root: 56, pulse: 0.57 },
  { file: 'tape-17-pinewatch.wav', root: 64, pulse: 0.72 },
  { file: 'crown-of-salt.wav', root: 54, pulse: 0.51 },
  { file: 'red-creek-winter.wav', root: 69, pulse: 0.76 },
  { file: 'ward-1908.wav', root: 50, pulse: 0.48 },
  { file: 'dead-channel-protocol.wav', root: 73, pulse: 0.82 }
];

function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function writeWav(path, samples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const value = clamp(samples[i], -1, 1);
    buffer.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }

  writeFileSync(path, buffer);
}

function generateTrack(track) {
  const totalSamples = sampleRate * durationSeconds;
  const samples = new Float32Array(totalSamples);

  const f1 = midiToHz(track.root);
  const f2 = midiToHz(track.root + 7);
  const f3 = midiToHz(track.root + 12);

  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const introEnvelope = Math.min(1, t / 2.5);
    const outroEnvelope = Math.min(1, (durationSeconds - t) / 1.8);
    const envelope = introEnvelope * outroEnvelope;

    const lfo = Math.sin(2 * Math.PI * 0.07 * t + track.pulse);
    const pulse = Math.sin(2 * Math.PI * track.pulse * 0.5 * t) > 0 ? 1 : 0.6;

    const signal =
      Math.sin(2 * Math.PI * f1 * t + lfo * 0.2) * 0.55 +
      Math.sin(2 * Math.PI * f2 * t) * 0.3 +
      Math.sin(2 * Math.PI * f3 * t + 0.3) * 0.15;

    const noise = (Math.sin(2 * Math.PI * 997 * t) + Math.sin(2 * Math.PI * 113 * t)) * 0.015;

    samples[i] = signal * amplitude * envelope * pulse + noise;
  }

  return samples;
}

const outDir = join(process.cwd(), 'apps', 'web', 'public', 'audio', 'scores');
mkdirSync(outDir, { recursive: true });

for (const track of tracks) {
  const path = join(outDir, track.file);
  writeWav(path, generateTrack(track));
}

console.log(`Generated ${tracks.length} score placeholders in ${outDir}`);
