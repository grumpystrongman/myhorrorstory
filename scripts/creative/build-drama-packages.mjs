import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const repoRoot = process.cwd();
const storyDir = join(repoRoot, 'docs', 'stories');
const runtimeOutputDir = join(repoRoot, 'apps', 'web', 'public', 'content', 'drama');
const playbookOutputDir = join(repoRoot, 'docs', 'stories', 'finalized-playbooks');
const indexOutputFile = join(runtimeOutputDir, 'index.json');

const defaultChannels = ['SMS', 'WHATSAPP', 'TELEGRAM', 'SIGNAL', 'EMAIL', 'VOICE_MESSAGE', 'DOCUMENT_DROP'];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function stageFromIndex(index, total) {
  if (total <= 1) {
    return 1;
  }
  const ratio = index / (total - 1);
  if (ratio < 0.25) {
    return 1;
  }
  if (ratio < 0.55) {
    return 2;
  }
  if (ratio < 0.8) {
    return 3;
  }
  return 4;
}

function inferIntent(label) {
  const normalized = label.toLowerCase();
  if (normalized.includes('accus') || normalized.includes('charge')) {
    return 'ACCUSATION';
  }
  if (normalized.includes('threat') || normalized.includes('force')) {
    return 'THREAT';
  }
  if (normalized.includes('trust') || normalized.includes('rescue') || normalized.includes('save')) {
    return 'COMPLIANCE';
  }
  if (normalized.includes('deal') || normalized.includes('trade') || normalized.includes('private')) {
    return 'BARGAIN';
  }
  if (normalized.includes('bluff') || normalized.includes('mislead') || normalized.includes('false')) {
    return 'DECEPTION';
  }
  if (normalized.includes('wait') || normalized.includes('delay') || normalized.includes('observe')) {
    return 'SILENCE';
  }
  if (normalized.includes('question') || normalized.includes('interview')) {
    return 'QUESTION';
  }
  if (normalized.includes('refuse') || normalized.includes('defy') || normalized.includes('continue')) {
    return 'DEFIANCE';
  }
  return 'CURIOSITY';
}

function storyRoleFromNpcRole(role) {
  switch (role) {
    case 'HANDLER':
      return 'operator';
    case 'ALLY':
      return 'investigator';
    case 'SUSPECT':
      return 'witness';
    case 'WITNESS':
      return 'witness';
    default:
      return 'investigator';
  }
}

function reputationDeltaFromEffects(effects) {
  const delta = {
    trustworthiness: 0,
    aggression: 0,
    curiosity: 0,
    deception: 0,
    morality: 0
  };

  for (const [key, value] of Object.entries(effects ?? {})) {
    if (typeof value !== 'number') {
      continue;
    }
    if (key === 'trustworthinessDelta') {
      delta.trustworthiness += value;
    } else if (key === 'aggressionDelta') {
      delta.aggression += value;
    } else if (key === 'curiosityDelta') {
      delta.curiosity += value;
    } else if (key === 'deceptionDelta') {
      delta.deception += value;
    } else if (key === 'moralityDelta') {
      delta.morality += value;
    }
  }

  return delta;
}

function buildFlagUpdates(effects) {
  const updates = {};
  for (const [key, value] of Object.entries(effects ?? {})) {
    if (key.endsWith('Delta') || key === 'scoreDelta') {
      continue;
    }
    updates[key] = value;
  }
  return updates;
}

function buildIncomingMessages(input) {
  const {
    story,
    beat,
    stage,
    beatIndex,
    channels,
    handlerNpc,
    secondaryNpc,
    villainTemplate
  } = input;
  const stageLabel =
    story.villain.escalationStages.find((entry) => entry.stage === stage)?.label ?? `Stage ${stage}`;
  const handlerChannel = channels[beatIndex % channels.length] ?? 'SMS';
  const secondaryChannel = channels[(beatIndex + 1) % channels.length] ?? 'WHATSAPP';
  const villainChannel = villainTemplate?.channels?.[0] ?? channels[(beatIndex + 2) % channels.length] ?? 'TELEGRAM';
  const villainText =
    villainTemplate?.textTemplate ??
    'I have watched every choice you made tonight. The next one costs blood.';

  return [
    {
      id: `${beat.id}.msg.handler`,
      senderName: handlerNpc?.displayName ?? 'Case Handler',
      role: storyRoleFromNpcRole(handlerNpc?.role),
      channel: handlerChannel,
      text: `${beat.narrative} Maintain chain-of-custody and keep your channel open.`,
      delaySeconds: 1,
      intensity: clamp(20 + stage * 12, 15, 75)
    },
    {
      id: `${beat.id}.msg.secondary`,
      senderName: secondaryNpc?.displayName ?? 'Witness Contact',
      role: storyRoleFromNpcRole(secondaryNpc?.role),
      channel: secondaryChannel,
      text: `Cross-reference this before dawn: ${story.clueEvidenceList[beatIndex % story.clueEvidenceList.length]}.`,
      delaySeconds: 3,
      intensity: clamp(35 + stage * 13, 25, 88)
    },
    {
      id: `${beat.id}.msg.villain`,
      senderName: story.villain.displayName,
      role: 'antagonist',
      channel: villainChannel,
      text: `${villainText} (${stageLabel})`,
      delaySeconds: 6,
      intensity: clamp(48 + stage * 14, 35, 100)
    }
  ];
}

function buildRuntimePackage(story) {
  const channels = [...story.channelCadence.primaryChannels, ...story.channelCadence.auxiliaryChannels];
  const channelList = channels.length > 0 ? channels : defaultChannels;
  const flatBeats = [];

  for (const act of story.acts) {
    for (const beat of act.beats) {
      flatBeats.push({
        ...beat,
        actId: act.id,
        actTitle: act.title
      });
    }
  }

  const beatPackages = flatBeats.map((beat, beatIndex) => {
    const stage = stageFromIndex(beatIndex, flatBeats.length);
    const handlerNpc = story.npcProfiles[beatIndex % story.npcProfiles.length];
    const secondaryNpc = story.npcProfiles[(beatIndex + 1) % story.npcProfiles.length];
    const villainTemplate = story.villainMessageTemplates.find((entry) => entry.stage === stage);
    const defaultNextBeatId = flatBeats[beatIndex + 1]?.id ?? null;
    const incomingMessages = buildIncomingMessages({
      story,
      beat,
      stage,
      beatIndex,
      channels: channelList,
      handlerNpc,
      secondaryNpc,
      villainTemplate
    });

    const responseOptions =
      beat.choices.length > 0
        ? beat.choices.map((choice, choiceIndex) => ({
            id: choice.id,
            label: choice.label,
            intent: inferIntent(choice.label),
            summary: `Choice ${choiceIndex + 1}: ${choice.label}`,
            nextBeatId: choice.nextBeatId ?? defaultNextBeatId,
            progressDelta: clamp(12 + stage * 6 + (choice.effects.scoreDelta ? Number(choice.effects.scoreDelta) * 2 : 0), 8, 34),
            reputationDelta: reputationDeltaFromEffects(choice.effects),
            flagUpdates: buildFlagUpdates(choice.effects)
          }))
        : [
            {
              id: `${beat.id}.choice.default-forward`,
              label: 'Proceed with controlled pressure',
              intent: 'CURIOSITY',
              summary: 'Advance investigation while preserving evidence discipline.',
              nextBeatId: defaultNextBeatId,
              progressDelta: clamp(11 + stage * 5, 10, 30),
              reputationDelta: {
                trustworthiness: 1,
                aggression: 0,
                curiosity: 2,
                deception: 0,
                morality: 1
              },
              flagUpdates: {
                [`${beat.id}.defaultPath`]: true
              }
            }
          ];

    return {
      id: beat.id,
      actId: beat.actId,
      actTitle: beat.actTitle,
      title: beat.title,
      narrative: beat.narrative,
      stage,
      unlockAfterSeconds: beat.unlockAfterSeconds,
      revealClueIds: beat.revealsClueIds,
      incomingMessages,
      responseOptions,
      defaultNextBeatId,
      backgroundVisual: `/visuals/stories/${story.id}.svg`
    };
  });

  return {
    id: story.id,
    title: story.title,
    version: story.version,
    hook: story.hook,
    tone: story.tone,
    subgenre: story.subgenre,
    location: story.location,
    warnings: story.ageWarnings,
    channels: channelList,
    villain: {
      id: story.villain.id,
      displayName: story.villain.displayName,
      archetype: story.villain.archetype,
      worldview: story.villain.worldview,
      motive: story.villain.motive
    },
    arcs: story.arcMap.map((arc) => ({
      id: arc.id,
      title: arc.title,
      stage: arc.stage,
      summary: arc.summary,
      primaryRuleIds: arc.primaryRuleIds
    })),
    beats: beatPackages,
    endings: story.endingVariants.map((ending) => ({
      id: ending.id,
      title: ending.title,
      type: ending.type,
      summary: ending.summary,
      epilogue: ending.epilogue,
      sequelHook: ending.sequelHook
    })),
    investigationBoard: story.investigationBoard,
    replayHooks: story.replayHooks,
    sequelHooks: story.sequelHooks,
    branchingMoments: story.branchingMoments
  };
}

function buildPlaybookMarkdown(story, runtimePackage) {
  const lines = [];
  lines.push(`# ${story.title} - Finalized Story Playbook`);
  lines.push('');
  lines.push(`- Story ID: \`${story.id}\``);
  lines.push(`- Version: \`${story.version}\``);
  lines.push(`- Subgenre: ${story.subgenre}`);
  lines.push(`- Tone: ${story.tone}`);
  lines.push(`- Hook: ${story.hook}`);
  lines.push(`- Location: ${story.location}`);
  lines.push(`- Target Session: ${story.targetSessionMinutes} minutes`);
  lines.push('');
  lines.push('## Arc Map');
  for (const arc of runtimePackage.arcs) {
    lines.push(`- ${arc.title} (${arc.stage}): ${arc.summary}`);
  }
  lines.push('');
  lines.push('## Beat-by-Beat Runtime Package');
  for (const beat of runtimePackage.beats) {
    lines.push(`### ${beat.title} (\`${beat.id}\`)`);
    lines.push(`- Act: ${beat.actTitle}`);
    lines.push(`- Villain Stage: ${beat.stage}`);
    lines.push(`- Narrative: ${beat.narrative}`);
    lines.push('- Incoming Message Sequence:');
    for (const message of beat.incomingMessages) {
      lines.push(
        `  - [${message.channel}] ${message.senderName}: ${message.text} (delay ${message.delaySeconds}s, intensity ${message.intensity})`
      );
    }
    lines.push('- Player Response Branches:');
    for (const option of beat.responseOptions) {
      lines.push(
        `  - ${option.label} -> ${option.nextBeatId ?? 'ending'} | intent=${option.intent} | progress +${option.progressDelta}`
      );
    }
    lines.push(`- Clue Reveals: ${beat.revealClueIds.join(', ') || 'none'}`);
    lines.push('');
  }
  lines.push('## Ending Variants');
  for (const ending of runtimePackage.endings) {
    lines.push(`- ${ending.title} [${ending.type}]`);
    lines.push(`  - Summary: ${ending.summary}`);
    lines.push(`  - Epilogue: ${ending.epilogue}`);
    lines.push(`  - Sequel Hook: ${ending.sequelHook}`);
  }
  lines.push('');
  lines.push('## Replay Hooks');
  for (const hook of runtimePackage.replayHooks) {
    lines.push(`- ${hook}`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  await mkdir(runtimeOutputDir, { recursive: true });
  await mkdir(playbookOutputDir, { recursive: true });

  const files = await readdir(storyDir);
  const storyFiles = files
    .filter((file) => file.endsWith('.story.json'))
    .sort((left, right) => left.localeCompare(right));

  const generated = [];

  for (const file of storyFiles) {
    const sourcePath = join(storyDir, file);
    const raw = await readFile(sourcePath, 'utf8');
    const story = JSON.parse(raw);
    const runtimePackage = buildRuntimePackage(story);
    const runtimePath = join(runtimeOutputDir, `${story.id}.json`);
    const playbookPath = join(playbookOutputDir, `${story.id}.md`);

    await writeFile(runtimePath, JSON.stringify(runtimePackage, null, 2), 'utf8');
    await writeFile(playbookPath, buildPlaybookMarkdown(story, runtimePackage), 'utf8');

    generated.push({
      storyId: story.id,
      title: story.title,
      beatCount: runtimePackage.beats.length,
      endingCount: runtimePackage.endings.length,
      runtimePath,
      playbookPath
    });
  }

  await writeFile(indexOutputFile, JSON.stringify(generated, null, 2), 'utf8');
  console.log(
    `[drama-packages] Generated ${generated.length} runtime packages and playbooks at ${runtimeOutputDir} and ${playbookOutputDir}`
  );
}

main().catch((error) => {
  console.error('[drama-packages] Failed:', error);
  process.exit(1);
});
