import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const repoRoot = process.cwd();
const dramaDir = join(repoRoot, 'apps', 'web', 'public', 'content', 'drama');
const outputRoot = join(repoRoot, 'assets', 'voice-drama');
const manifestPath = join(repoRoot, 'assets', 'manifests', 'voice-drama-manifest.json');

const localeByStoryId = {
  'black-chapel-ledger': 'en-GB',
  'crown-of-salt': 'en-GB',
  default: 'en-US'
};

const OPENAI_ROLE_VOICES = {
  ANTAGONIST: ['onyx', 'fable', 'ash', 'sage', 'echo'],
  WITNESS: ['nova', 'coral', 'alloy', 'shimmer', 'echo'],
  OPERATOR: ['sage', 'alloy', 'ash', 'coral', 'shimmer'],
  INVESTIGATOR: ['echo', 'alloy', 'nova', 'sage', 'ash']
};

const POLLY_BY_LOCALE_AND_SEX = {
  'en-US': {
    female: ['Joanna', 'Kendra'],
    male: ['Matthew', 'Joey'],
    unknown: ['Matthew', 'Joanna']
  },
  'en-GB': {
    female: ['Amy', 'Emma'],
    male: ['Brian', 'Arthur'],
    unknown: ['Amy', 'Brian']
  }
};

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickDeterministic(values, seedKey) {
  const list = Array.isArray(values) ? values.filter(Boolean) : [];
  if (list.length === 0) {
    return '';
  }
  return list[hashString(seedKey) % list.length];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function guessSexFromDisplayName(displayName) {
  const normalized = String(displayName || '').toLowerCase();
  const femaleMarkers = [
    'mara',
    'nia',
    'elara',
    'sera',
    'dina',
    'helene',
    'leda',
    'maris',
    'priya',
    'juno',
    'talia',
    'lin',
    'nella',
    'joanna',
    'amy'
  ];
  const maleMarkers = [
    'ilya',
    'bram',
    'tomas',
    'cal',
    'rowan',
    'jarek',
    'micah',
    'owen',
    'felix',
    'cade',
    'ellis',
    'evan',
    'hale',
    'niko',
    'brian',
    'arthur',
    'matthew'
  ];

  if (femaleMarkers.some((marker) => normalized.includes(marker))) {
    return 'female';
  }
  if (maleMarkers.some((marker) => normalized.includes(marker))) {
    return 'male';
  }
  return 'unknown';
}

function rolePreset(role, suggestedSex) {
  switch (role) {
    case 'antagonist':
      return {
        archetype: 'ANTAGONIST',
        suggestedSex: suggestedSex.toUpperCase(),
        expression: { rate: 0.86, pitch: -1.4, stability: 0.92, style: 0.76, gainDb: -0.5 }
      };
    case 'witness':
      return {
        archetype: 'WITNESS',
        suggestedSex: suggestedSex.toUpperCase(),
        expression: { rate: 1.08, pitch: 0.8, stability: 0.56, style: 0.66, gainDb: 0.9 }
      };
    case 'operator':
      return {
        archetype: 'OPERATOR',
        suggestedSex: suggestedSex.toUpperCase(),
        expression: { rate: 1.01, pitch: 0, stability: 0.82, style: 0.44, gainDb: 0.3 }
      };
    default:
      return {
        archetype: 'INVESTIGATOR',
        suggestedSex: suggestedSex.toUpperCase(),
        expression: { rate: 0.97, pitch: -0.2, stability: 0.86, style: 0.38, gainDb: 0 }
      };
  }
}

async function readDramaPackages() {
  const files = (await readdir(dramaDir))
    .filter((file) => file.endsWith('.json') && file !== 'index.json')
    .sort((left, right) => left.localeCompare(right));

  const packages = [];
  for (const file of files) {
    const raw = await readFile(join(dramaDir, file), 'utf8');
    packages.push(JSON.parse(raw));
  }
  return packages;
}

function buildCharacterLineSheets(pack) {
  const byCharacter = new Map();

  for (const beat of pack.beats) {
    for (const message of beat.incomingMessages) {
      const key = message.senderName;
      const existing = byCharacter.get(key) ?? {
        id: `voice.${pack.id}.${slugify(key)}`,
        storyId: pack.id,
        characterId: key,
        role: message.role,
        lines: []
      };
      existing.lines.push({
        beatId: beat.id,
        beatTitle: beat.title,
        channel: message.channel,
        text: message.text
      });
      byCharacter.set(key, existing);
    }
  }

  return [...byCharacter.values()];
}

function buildProviderChain({ storyId, characterId, role, locale, sex, usedOpenAiVoices }) {
  const slug = slugify(characterId);
  const roleKey = String(role || 'INVESTIGATOR').toUpperCase();
  const rolePool = OPENAI_ROLE_VOICES[roleKey] || OPENAI_ROLE_VOICES.INVESTIGATOR;
  const openAiCandidates = Array.from(new Set([
    ...rolePool,
    ...Object.values(OPENAI_ROLE_VOICES).flat()
  ].filter(Boolean)));
  let openAiVoice = pickDeterministic(openAiCandidates, `${storyId}:${characterId}:openai`);
  if (usedOpenAiVoices && usedOpenAiVoices.size < openAiCandidates.length) {
    for (const candidate of openAiCandidates) {
      if (!usedOpenAiVoices.has(candidate)) {
        openAiVoice = candidate;
        break;
      }
    }
    usedOpenAiVoices.add(openAiVoice);
  }
  const pollyVoice = pickDeterministic(
    POLLY_BY_LOCALE_AND_SEX[locale]?.[sex] || POLLY_BY_LOCALE_AND_SEX['en-US'].unknown,
    `${storyId}:${characterId}:polly`
  );

  return [
    {
      provider: 'PIPER',
      voiceId: `piper-${slug}`,
      model: 'en_US-lessac-high',
      notes: 'Primary local/offline synthesis path.'
    },
    {
      provider: 'ELEVENLABS',
      voiceId: `elv-${slug}`,
      model: 'eleven_multilingual_v2',
      notes: 'Premium high-fidelity fallback.'
    },
    {
      provider: 'OPENAI',
      voiceId: openAiVoice || 'alloy',
      model: 'gpt-4o-mini-tts',
      notes: 'Fast cloud fallback.'
    },
    {
      provider: 'POLLY',
      voiceId: pollyVoice || 'Matthew',
      model: 'neural',
      notes: 'Enterprise cloud fallback.'
    }
  ];
}

async function main() {
  const dramaPackages = await readDramaPackages();
  await mkdir(outputRoot, { recursive: true });

  const manifest = {
    version: 'v2',
    generatedAt: new Date().toISOString(),
    stories: []
  };

  for (const pack of dramaPackages) {
    const storyOutputDir = join(outputRoot, pack.id);
    await mkdir(storyOutputDir, { recursive: true });
    const usedOpenAiVoices = new Set();

    const characters = buildCharacterLineSheets(pack).map((character) => {
      const suggestedSex = guessSexFromDisplayName(character.characterId);
      const preset = rolePreset(character.role, suggestedSex);
      const locale = localeByStoryId[pack.id] ?? localeByStoryId.default;
      const voiceSeed = hashString(`${pack.id}:${character.characterId}:${character.role}`);
      const expression = {
        rate: Number(clamp(preset.expression.rate + (((voiceSeed % 9) - 4) * 0.012), 0.82, 1.18).toFixed(3)),
        pitch: Number(clamp(preset.expression.pitch + ((((voiceSeed >>> 3) % 11) - 5) * 0.14), -4.2, 4.2).toFixed(3)),
        stability: Number(clamp(preset.expression.stability + ((((voiceSeed >>> 6) % 9) - 4) * 0.03), 0.35, 0.97).toFixed(3)),
        style: Number(clamp(preset.expression.style + ((((voiceSeed >>> 9) % 9) - 4) * 0.025), 0.2, 0.92).toFixed(3)),
        gainDb: Number(clamp(preset.expression.gainDb + ((((voiceSeed >>> 12) % 7) - 3) * 0.25), -2.0, 2.0).toFixed(3))
      };
      const profile = {
        profileId: character.id,
        storyId: pack.id,
        characterId: character.characterId,
        role: character.role.toUpperCase(),
        locale,
        region: locale === 'en-GB' ? 'uk_atlantic' : 'north_america',
        suggestedSex: preset.suggestedSex,
        expression,
        providerChain: buildProviderChain({
          storyId: pack.id,
          characterId: character.characterId,
          role: character.role,
          locale,
          sex: suggestedSex,
          usedOpenAiVoices
        })
      };

      return {
        ...character,
        profile
      };
    });

    const synthesisPlan = {
      storyId: pack.id,
      title: pack.title,
      generatedAt: new Date().toISOString(),
      clips: characters.flatMap((character) => {
        return character.lines.map((line, index) => ({
          clipId: `${character.profile.profileId}.clip-${index + 1}`,
          profileId: character.profile.profileId,
          beatId: line.beatId,
          beatTitle: line.beatTitle,
          channel: line.channel,
          text: line.text,
          targetPath: `assets/audio/voices/${pack.id}/${slugify(character.characterId)}-${index + 1}.wav`,
          providers: character.profile.providerChain
        }));
      })
    };

    for (const character of characters) {
      const lineSheetPath = join(storyOutputDir, `${slugify(character.characterId)}.txt`);
      const lineSheet = [
        `Story: ${pack.title} (${pack.id})`,
        `Character: ${character.characterId}`,
        `Role: ${character.role}`,
        `Profile: ${character.profile.profileId}`,
        '',
        ...character.lines.map((line, index) => {
          return `${index + 1}. [${line.channel}] ${line.beatTitle} - ${line.text}`;
        })
      ].join('\n');
      await writeFile(lineSheetPath, `${lineSheet}\n`, 'utf8');
    }

    await writeFile(join(storyOutputDir, 'synthesis-plan.json'), JSON.stringify(synthesisPlan, null, 2), 'utf8');

    manifest.stories.push({
      storyId: pack.id,
      title: pack.title,
      characterCount: characters.length,
      clipCount: synthesisPlan.clips.length,
      outputDir: storyOutputDir,
      profiles: characters.map((character) => character.profile)
    });
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`[voice-drama] Generated manifests and line sheets for ${manifest.stories.length} stories`);
}

main().catch((error) => {
  console.error('[voice-drama] Failed:', error);
  process.exit(1);
});
