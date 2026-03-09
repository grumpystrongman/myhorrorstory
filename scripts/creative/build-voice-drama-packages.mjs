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

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function rolePreset(role) {
  switch (role) {
    case 'antagonist':
      return {
        archetype: 'ANTAGONIST',
        suggestedSex: 'UNKNOWN',
        expression: { rate: 0.86, pitch: -1.4, stability: 0.92, style: 0.76, gainDb: -0.5 }
      };
    case 'witness':
      return {
        archetype: 'WITNESS',
        suggestedSex: 'UNKNOWN',
        expression: { rate: 1.08, pitch: 0.8, stability: 0.56, style: 0.66, gainDb: 0.9 }
      };
    case 'operator':
      return {
        archetype: 'OPERATOR',
        suggestedSex: 'UNKNOWN',
        expression: { rate: 1.01, pitch: 0, stability: 0.82, style: 0.44, gainDb: 0.3 }
      };
    default:
      return {
        archetype: 'INVESTIGATOR',
        suggestedSex: 'UNKNOWN',
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

function buildProviderChain(characterId) {
  const slug = slugify(characterId);
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
      voiceId: 'alloy',
      model: 'gpt-4o-mini-tts',
      notes: 'Fast cloud fallback.'
    },
    {
      provider: 'POLLY',
      voiceId: 'Matthew',
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

    const characters = buildCharacterLineSheets(pack).map((character) => {
      const preset = rolePreset(character.role);
      const locale = localeByStoryId[pack.id] ?? localeByStoryId.default;
      const profile = {
        profileId: character.id,
        storyId: pack.id,
        characterId: character.characterId,
        role: character.role.toUpperCase(),
        locale,
        region: locale === 'en-GB' ? 'uk_atlantic' : 'north_america',
        suggestedSex: preset.suggestedSex,
        expression: preset.expression,
        providerChain: buildProviderChain(character.characterId)
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
