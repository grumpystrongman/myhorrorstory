import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const outputPath = join(process.cwd(), 'assets', 'manifests', 'commercial-creative-plan.json');
const promptsPath = join(process.cwd(), 'assets', 'prompts', 'commercial-site-pack.json');
const storiesDir = join(process.cwd(), 'docs', 'stories');

const countsByType = {
  character_portrait: 4,
  scene_art: 3,
  evidence_image: 4,
  promo_image: 2,
  social_creative: 3
};

async function loadStoryIds() {
  const files = await readdir(storiesDir);
  const storyFiles = files.filter((file) => file.endsWith('.story.json'));
  const ids = [];

  for (const file of storyFiles) {
    const raw = await readFile(join(storiesDir, file), 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.id === 'string') {
      ids.push(parsed.id);
    }
  }

  return ids.sort();
}

function fillTemplate(template, storyId) {
  return template.replaceAll('{story_id}', storyId);
}

function makeEntry({ id, type, prompt, outputKey, scope, storyId = null }) {
  return {
    id,
    type,
    scope,
    storyId,
    prompt,
    outputKey,
    providerChain: ['openai-images', 'stability', 'manual-art-upload'],
    revision: 1,
    qualityGates: [
      'brand_compliance_passed',
      'accessibility_contrast_passed',
      'narrative_coherence_passed',
      'rights_and_provenance_verified'
    ]
  };
}

async function main() {
  const stories = await loadStoryIds();
  const promptsRaw = await readFile(promptsPath, 'utf8');
  const promptPack = JSON.parse(promptsRaw);

  const websiteEntries = promptPack.website_surfaces.map((surface) =>
    makeEntry({
      id: `web-${surface.surface}`,
      type: surface.asset_type,
      prompt: surface.prompt,
      outputKey: `assets/production/web/${surface.surface}-v1.png`,
      scope: 'website'
    })
  );

  const storyEntries = [];
  for (const storyId of stories) {
    for (const template of promptPack.story_asset_templates) {
      const count = countsByType[template.asset_type] ?? 1;
      for (let index = 1; index <= count; index += 1) {
        storyEntries.push(
          makeEntry({
            id: `${storyId}-${template.asset_type}-${index}`,
            type: template.asset_type,
            prompt: fillTemplate(template.prompt_template, storyId),
            outputKey: `assets/production/stories/${storyId}/${template.asset_type}-${index}-v1.png`,
            scope: 'story',
            storyId
          })
        );
      }
    }
  }

  const payload = {
    version: 'v1',
    generatedAt: new Date().toISOString(),
    strategy: promptPack.brand_direction,
    totals: {
      stories: stories.length,
      websiteAssets: websiteEntries.length,
      storyAssets: storyEntries.length,
      allAssets: websiteEntries.length + storyEntries.length
    },
    assets: [...websiteEntries, ...storyEntries]
  };

  await mkdir(join(process.cwd(), 'assets', 'manifests'), { recursive: true });
  await writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[creative-plan] Generated ${payload.totals.allAssets} assets -> ${outputPath}`);
}

main().catch((error) => {
  console.error('[creative-plan] Failed:', error);
  process.exit(1);
});
