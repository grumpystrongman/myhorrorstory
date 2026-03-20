import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const storiesDir = join(repoRoot, 'docs', 'stories');
const outPath = join(storiesDir, 'character-dossiers.md');

function titleCase(value) {
  return value
    .toLowerCase()
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((token) => token[0]?.toUpperCase() + token.slice(1))
    .join(' ');
}

function formatVillain(story) {
  const villain = story.villain;
  const lines = [
    `### Villain: ${villain.displayName}`,
    `- Archetype: ${titleCase(villain.archetype)}`,
    `- Worldview: ${villain.worldview}`,
    `- Motive: ${villain.motive}`,
    `- Signature Speech Style: ${villain.signatureSpeechStyle}`,
    `- Obsession Target: ${villain.obsessionTarget}`,
    `- Manipulation Tactics: ${villain.manipulationTactics.join(', ')}`,
    `- Symbolic Motifs: ${villain.symbolicMotifs.join(', ')}`
  ];

  for (const stage of villain.escalationStages) {
    lines.push(
      `- Stage ${stage.stage} (${stage.label}): ${stage.objective} ` +
        `[types: ${stage.allowedMessageTypes.join(', ')} | cadence: ${stage.timing.minIntervalMinutes}m min interval]`
    );
  }

  return lines.join('\n');
}

function formatNpc(npc) {
  const lines = [
    `#### ${npc.displayName} (${titleCase(npc.role)})`,
    `- Baseline Emotion: ${titleCase(npc.baselineEmotion)}`,
    `- Traits: ${npc.personalityTraits.join(', ')}`,
    `- Motivations: ${npc.motivations.join('; ')}`,
    `- Trust Range: ${npc.trustBaseline} -> ${npc.trustCeiling}`,
    `- Response Style:`,
    `  - Accusation: ${npc.responseStyle.accusation}`,
    `  - Threat: ${npc.responseStyle.threat}`,
    `  - Questioning: ${npc.responseStyle.questioning}`
  ];

  for (const secret of npc.secrets) {
    lines.push(
      `- Secret "${secret.title}": ${secret.summary} ` +
        `(reveal threshold: ${secret.trustThreshold}, consequence: ${secret.consequenceOnReveal})`
    );
  }

  return lines.join('\n');
}

function main() {
  const storyFiles = readdirSync(storiesDir)
    .filter((name) => name.endsWith('.story.json'))
    .sort();

  const sections = [
    '# Character Dossiers',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'This document provides complete NPC and villain background coverage for all launch stories.'
  ];

  for (const file of storyFiles) {
    const story = JSON.parse(readFileSync(join(storiesDir, file), 'utf8'));
    sections.push('');
    sections.push(`## ${story.title} (\`${story.id}\`)`);
    sections.push('');
    sections.push(`- Hook: ${story.hook}`);
    sections.push(`- Location: ${story.location}`);
    sections.push(`- Tone/Subgenre: ${story.tone} / ${story.subgenre}`);
    sections.push('');
    sections.push(formatVillain(story));
    sections.push('');
    sections.push('### NPC Backgrounds');
    sections.push('');
    for (const npc of story.npcProfiles) {
      sections.push(formatNpc(npc));
      sections.push('');
    }
  }

  writeFileSync(outPath, `${sections.join('\n')}\n`, 'utf8');
  process.stdout.write(`[character-dossiers] Wrote ${outPath}\n`);
}

main();
