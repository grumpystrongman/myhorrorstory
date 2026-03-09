import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const sampleRate = 16000;
const targetDurationSeconds = 42;

const tracks = [
  { file: 'platform-overture.wav', root: 47, bpm: 58, mood: 'cinematic' },
  { file: 'static-between-stations.wav', root: 61, bpm: 62, mood: 'psychological' },
  { file: 'black-chapel-ledger.wav', root: 52, bpm: 56, mood: 'gothic' },
  { file: 'the-harvest-men.wav', root: 58, bpm: 64, mood: 'folk' },
  { file: 'signal-from-kharon-9.wav', root: 44, bpm: 54, mood: 'cosmic' },
  { file: 'the-fourth-tenant.wav', root: 56, bpm: 60, mood: 'supernatural' },
  { file: 'tape-17-pinewatch.wav', root: 64, bpm: 66, mood: 'found_footage' },
  { file: 'crown-of-salt.wav', root: 54, bpm: 63, mood: 'occult' },
  { file: 'red-creek-winter.wav', root: 69, bpm: 70, mood: 'slasher' },
  { file: 'ward-1908.wav', root: 50, bpm: 57, mood: 'institutional' },
  { file: 'dead-channel-protocol.wav', root: 73, bpm: 74, mood: 'techno' },
  { file: 'midnight-lockbox.wav', root: 57, bpm: 59, mood: 'mystery' }
];

function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hash(seed) {
  let current = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    current ^= seed.charCodeAt(index);
    current = Math.imul(current, 16777619);
  }
  return current >>> 0;
}

function createRandom(seed) {
  let state = hash(seed) || 0xa341316c;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quantizedCycles(frequency, durationSeconds) {
  return Math.max(1, Math.round(frequency * durationSeconds));
}

function selectMoodProfile(mood) {
  switch (mood) {
    case 'gothic':
      return { drone: 0.66, choir: 0.48, percussion: 0.24, piano: 0.38, noise: 0.12 };
    case 'folk':
      return { drone: 0.54, choir: 0.52, percussion: 0.36, piano: 0.3, noise: 0.1 };
    case 'cosmic':
      return { drone: 0.74, choir: 0.45, percussion: 0.22, piano: 0.22, noise: 0.15 };
    case 'slasher':
      return { drone: 0.44, choir: 0.25, percussion: 0.65, piano: 0.2, noise: 0.16 };
    case 'techno':
      return { drone: 0.46, choir: 0.2, percussion: 0.7, piano: 0.22, noise: 0.22 };
    case 'institutional':
      return { drone: 0.62, choir: 0.35, percussion: 0.28, piano: 0.26, noise: 0.18 };
    default:
      return { drone: 0.58, choir: 0.36, percussion: 0.34, piano: 0.3, noise: 0.14 };
  }
}

function writeWav(path, samples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const byteRate = sampleRate * numChannels * bytesPerSample;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
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

function createEventMap(totalBeats, random, minSpacing, triggerChance) {
  const events = [];
  let cursor = 0;
  while (cursor < totalBeats) {
    if (random() < triggerChance) {
      events.push(cursor);
    }
    cursor += minSpacing + random() * 1.25;
  }
  return events;
}

function normalize(samples) {
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    peak = Math.max(peak, Math.abs(samples[index]));
  }
  if (peak < 1e-9) {
    return;
  }
  const scale = 0.9 / peak;
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = clamp(samples[index] * scale, -1, 1);
  }
}

function generateTrack(track) {
  const random = createRandom(track.file);
  const profile = selectMoodProfile(track.mood);
  const barSeconds = 240 / track.bpm;
  const bars = Math.max(8, Math.round(targetDurationSeconds / barSeconds));
  const durationSeconds = bars * barSeconds;
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const totalBeats = bars * 4;

  const root = midiToHz(track.root);
  const fifth = midiToHz(track.root + 7);
  const octave = midiToHz(track.root + 12);
  const low = midiToHz(track.root - 12);

  const rootCycles = quantizedCycles(root, durationSeconds);
  const fifthCycles = quantizedCycles(fifth, durationSeconds);
  const octaveCycles = quantizedCycles(octave, durationSeconds);
  const lowCycles = quantizedCycles(low, durationSeconds);
  const hissCycles = quantizedCycles(913 + random() * 111, durationSeconds);
  const textureCycles = quantizedCycles(171 + random() * 87, durationSeconds);

  const pianoEvents = createEventMap(totalBeats, random, 0.75, 0.62);
  const percussionEvents = createEventMap(totalBeats, random, 0.5, profile.percussion);

  const samples = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i += 1) {
    const loopPhase = totalSamples <= 1 ? 0 : i / (totalSamples - 1);
    const beatPosition = loopPhase * totalBeats;

    const drone =
      Math.sin(2 * Math.PI * lowCycles * loopPhase) * 0.55 +
      Math.sin(2 * Math.PI * rootCycles * loopPhase + 0.12 * Math.sin(2 * Math.PI * 3 * loopPhase)) * 0.35 +
      Math.sin(2 * Math.PI * fifthCycles * loopPhase + 0.35) * 0.1;

    const choir =
      Math.sin(2 * Math.PI * (rootCycles / 2) * loopPhase + 0.8) * 0.55 +
      Math.sin(2 * Math.PI * (fifthCycles / 2) * loopPhase + 1.6) * 0.45;

    let piano = 0;
    for (const eventBeat of pianoEvents) {
      const delta = beatPosition - eventBeat;
      if (delta >= 0 && delta <= 1.4) {
        const env = Math.exp(-delta * 4.5);
        const strike =
          Math.sin(2 * Math.PI * octaveCycles * loopPhase + delta * 0.5) * 0.72 +
          Math.sin(2 * Math.PI * (octaveCycles * 1.5) * loopPhase + 0.4) * 0.28;
        piano += strike * env;
      }
    }

    let percussion = 0;
    for (const eventBeat of percussionEvents) {
      const delta = beatPosition - eventBeat;
      if (delta >= 0 && delta <= 0.5) {
        const env = Math.exp(-delta * 10);
        const kick = Math.sin(2 * Math.PI * (45 + delta * -30) * (delta * 0.12)) * 0.7;
        const metallic = Math.sin(2 * Math.PI * (260 + eventBeat * 7) * delta) * 0.3;
        percussion += (kick + metallic) * env;
      }
    }

    const texture =
      Math.sin(2 * Math.PI * textureCycles * loopPhase) * 0.5 +
      Math.sin(2 * Math.PI * hissCycles * loopPhase + Math.sin(2 * Math.PI * 5 * loopPhase)) * 0.5;

    const swell = 0.7 + 0.3 * Math.sin(2 * Math.PI * 1.5 * loopPhase + 0.7);

    samples[i] =
      drone * profile.drone * 0.4 * swell +
      choir * profile.choir * 0.25 +
      piano * profile.piano * 0.22 +
      percussion * profile.percussion * 0.25 +
      texture * profile.noise * 0.12;
  }

  normalize(samples);
  return {
    samples,
    durationSeconds
  };
}

const outDir = join(process.cwd(), 'apps', 'web', 'public', 'audio', 'scores');
mkdirSync(outDir, { recursive: true });

for (const track of tracks) {
  const path = join(outDir, track.file);
  const rendered = generateTrack(track);
  writeWav(path, rendered.samples);
  console.log(`[scores] ${track.file} -> ${rendered.durationSeconds.toFixed(2)}s`);
}

console.log(`Generated ${tracks.length} commercial score loops in ${outDir}`);

