import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const repoRoot = process.cwd();
const storiesDir = join(repoRoot, 'docs', 'stories');
const outputFile = join(repoRoot, 'docs', 'stories', 'branching-compendium.md');

function formatList(values) {
  return values.map((value) => `- ${value}`).join('\n');
}

async function loadStories() {
  const files = await readdir(storiesDir);
  const storyFiles = files.filter((name) => name.endsWith('.story.json')).sort();
  const stories = [];
  for (const file of storyFiles) {
    const raw = await readFile(join(storiesDir, file), 'utf8');
    stories.push(JSON.parse(raw));
  }
  return stories;
}

async function main() {
  const stories = await loadStories();
  const sections = [];
  sections.push('# Story Branching Compendium');
  sections.push('');
  sections.push(`Generated: ${new Date().toISOString()}`);
  sections.push('');
  sections.push(
    'This index summarizes each shipped story package: hook, arc progression, trigger rules, branching moments, and ending outcomes.'
  );
  sections.push('');

  for (const story of stories) {
    sections.push(`## ${story.title}`);
    sections.push(`- Story ID: \`${story.id}\``);
    sections.push(`- Subgenre: ${story.subgenre}`);
    sections.push(`- Tone: ${story.tone}`);
    sections.push(`- Hook: ${story.hook}`);
    sections.push(`- Session Window: ${story.timelineLabel ?? `${story.targetSessionMinutes} minutes`}`);
    sections.push(`- Replay Hooks: ${story.replayHooks.length}`);
    sections.push('');
    sections.push('### Arc Map');
    sections.push(
      formatList(
        story.arcMap.map(
          (arc) =>
            `${arc.stage}: **${arc.title}** — ${arc.summary} (rules: ${arc.primaryRuleIds.join(', ')})`
        )
      )
    );
    sections.push('');
    sections.push('### Branching Moments');
    sections.push(formatList(story.branchingMoments));
    sections.push('');
    sections.push('### Trigger Rules');
    sections.push(
      formatList(
        story.triggerRules.map(
          (rule) =>
            `\`${rule.id}\` (${rule.eventType}) — ${rule.name}; actions: ${rule.actions
              .map((action) => action.type)
              .join(', ')}`
        )
      )
    );
    sections.push('');
    sections.push('### Ending Variants');
    sections.push(
      formatList(
        story.endingVariants.map(
          (ending) => `${ending.type}: **${ending.title}** — ${ending.summary} (hook: ${ending.sequelHook})`
        )
      )
    );
    sections.push('');
    sections.push('### Villain Escalation');
    sections.push(
      formatList(
        story.villain.escalationStages.map(
          (stage) =>
            `Stage ${stage.stage}: ${stage.label} — ${stage.objective} (max touches/day: ${stage.timing.maxTouchesPerDay})`
        )
      )
    );
    sections.push('');
  }

  await mkdir(join(repoRoot, 'docs', 'stories'), { recursive: true });
  await writeFile(outputFile, `${sections.join('\n')}\n`, 'utf8');
  console.log(`[story-compendium] Wrote ${outputFile}`);
}

main().catch((error) => {
  console.error('[story-compendium] Failed:', error);
  process.exit(1);
});
