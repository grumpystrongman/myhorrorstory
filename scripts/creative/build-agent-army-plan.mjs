import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const repoRoot = process.cwd();
const storiesDir = join(repoRoot, 'docs', 'stories');
const brandPackPath = join(repoRoot, 'assets', 'prompts', 'commercial-site-pack.json');
const manifestOutputPath = join(repoRoot, 'assets', 'manifests', 'commercial-agent-army-plan.json');
const promptOutputPath = join(repoRoot, 'assets', 'prompts', 'commercial-agent-army-prompts.json');
const backlogOutputPath = join(repoRoot, 'docs', 'operations', 'linear-agent-army-backlog.json');
const jobsOutputPath = join(repoRoot, 'docs', 'operations', 'openclaw-agent-army-jobs.json');

const QUALITY_GATES = [
  'brand_compliance_passed',
  'accessibility_contrast_passed',
  'narrative_coherence_passed',
  'rights_and_provenance_verified',
  'commercial_readiness_reviewed'
];

const PROVIDER_CHAIN_BY_MODALITY = {
  image: ['openai-images', 'stability', 'ideogram', 'manual-art-upload'],
  audio: ['piper', 'elevenlabs', 'openai-tts', 'polly', 'manual-audio-upload'],
  video: ['runway', 'pika', 'luma', 'stable-video', 'manual-video-upload'],
  artifact: ['gpt-4.1', 'claude', 'manual-editorial'],
  web: ['gpt-4.1', 'manual-design-review']
};

const BOT_BY_MODALITY = {
  image: 'AI-Media-Pipeline-Agent',
  audio: 'AI-Voice-Audio-Agent',
  video: 'AI-Media-Pipeline-Agent',
  artifact: 'AI-Story-Engine-Agent',
  web: 'AI-Web-App-Agent'
};

const PRIORITY_BY_MODALITY = {
  image: 1,
  audio: 1,
  video: 2,
  artifact: 2,
  web: 1
};

const NEGATIVE_PROMPT_BY_MODALITY = {
  image:
    'No logos, no unreadable text overlays, no cartoon style, no low-resolution blur, no gore excess, no meme aesthetics.',
  audio:
    'Avoid clipping, avoid muddy low-end, avoid unintelligible dialogue, avoid abrupt loudness spikes, avoid copyrighted melodic references.',
  video:
    'Avoid low frame-rate jitter, avoid compression artifacts, avoid incoherent camera cuts, avoid on-screen logos/watermarks.',
  artifact:
    'Avoid out-of-world slang, avoid anachronistic technology references, avoid contradictory chronology.',
  web: 'Avoid placeholder copy, avoid generic boilerplate UI, avoid inaccessible low-contrast controls, avoid inconsistent style language.'
};

const WEBSITE_SURFACES = [
  {
    id: 'landing',
    route: '/',
    title: 'Landing',
    objective: 'Commercial first impression and conversion confidence.'
  },
  {
    id: 'library',
    route: '/library',
    title: 'Case Library',
    objective: 'Browse and select stories with premium visual hierarchy.'
  },
  {
    id: 'onboarding',
    route: '/onboarding',
    title: 'Onboarding',
    objective: 'Explain player role and set expectations with high trust.'
  },
  {
    id: 'play',
    route: '/play',
    title: 'Play Session',
    objective: 'Sustain long-form immersion while preserving readability.'
  },
  {
    id: 'codex',
    route: '/codex',
    title: 'Codex Control Room',
    objective: 'Provide credible live-ops control surface for deep play.'
  },
  {
    id: 'mobile-home',
    route: 'mobile://home',
    title: 'Mobile Home',
    objective: 'Mobile-first discovery and campaign continuity.'
  },
  {
    id: 'mobile-session',
    route: 'mobile://session',
    title: 'Mobile Session',
    objective: 'Responsive companion play and async decision handling.'
  }
];

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function dedupe(values) {
  return Array.from(new Set(values));
}

function flattenActsToBeats(acts) {
  return asArray(acts).flatMap((act, actIndex) =>
    asArray(act.beats).map((beat, beatIndex) => ({
      ...beat,
      actId: act.id ?? `act-${actIndex + 1}`,
      actTitle: act.title ?? `Act ${actIndex + 1}`,
      beatOrder: beatIndex + 1
    }))
  );
}

function resolveOutputKey({ scope, storyId, modality, category, id }) {
  const extByModality = {
    image: 'png',
    audio: 'wav',
    video: 'mp4',
    artifact: 'md',
    web: 'html'
  };
  const extension = extByModality[modality] ?? 'bin';

  if (scope === 'website') {
    return `assets/production/agent-army/website/${modality}/${id}-v1.${extension}`;
  }

  return `assets/production/agent-army/stories/${storyId}/${modality}/${category}/${id}-v1.${extension}`;
}

function defaultSpecs(modality, category) {
  if (modality === 'image') {
    if (category.includes('portrait')) {
      return { width: 1024, height: 1365, format: 'png' };
    }
    if (category.includes('social')) {
      return { width: 1080, height: 1080, format: 'png' };
    }
    if (category.includes('banner')) {
      return { width: 2048, height: 1152, format: 'png' };
    }
    return { width: 1600, height: 900, format: 'png' };
  }

  if (modality === 'audio') {
    if (category.includes('voice')) {
      return { durationSeconds: 20, format: 'wav', sampleRateHz: 48000, channels: 1 };
    }
    return { durationSeconds: 75, format: 'wav', sampleRateHz: 48000, channels: 2 };
  }

  if (modality === 'video') {
    return { durationSeconds: 18, width: 1920, height: 1080, fps: 24, format: 'mp4' };
  }

  if (modality === 'web') {
    return { format: 'html', responsive: true, minContrast: 4.5 };
  }

  return { format: 'md' };
}

function composeStoryContext(story) {
  const villain = story.villain ?? {};
  const motifs = dedupe(asArray(villain.symbolicMotifs)).slice(0, 4).join(', ');
  return [
    `Story: ${story.title} (${story.id})`,
    `Hook: ${story.hook}`,
    `Subgenre: ${story.subgenre}`,
    `Tone: ${story.tone}`,
    `Location: ${story.location}`,
    villain.displayName ? `Villain: ${villain.displayName}` : null,
    villain.worldview ? `Villain worldview: ${villain.worldview}` : null,
    motifs ? `Motifs: ${motifs}` : null
  ]
    .filter(Boolean)
    .join(' | ');
}

function buildAsset({
  id,
  title,
  modality,
  category,
  scope,
  storyId = null,
  storyTitle = null,
  arcId = null,
  arcTitle = null,
  arcStage = null,
  beatId = null,
  surfaceId = null,
  prompt,
  references = []
}) {
  const outputKey = resolveOutputKey({
    scope,
    storyId,
    modality,
    category,
    id
  });

  return {
    id,
    title,
    modality,
    category,
    scope,
    storyId,
    storyTitle,
    surfaceId,
    arcId,
    arcTitle,
    arcStage,
    beatId,
    prompt,
    negativePrompt: NEGATIVE_PROMPT_BY_MODALITY[modality],
    outputKey,
    specs: defaultSpecs(modality, category),
    providerChain: PROVIDER_CHAIN_BY_MODALITY[modality] ?? [],
    qualityGates: QUALITY_GATES,
    linear: {
      botId: BOT_BY_MODALITY[modality] ?? 'AI-Executive-Orchestrator',
      priority: PRIORITY_BY_MODALITY[modality] ?? 2
    },
    references
  };
}

async function loadStories() {
  const files = (await readdir(storiesDir))
    .filter((file) => file.endsWith('.story.json'))
    .sort((left, right) => left.localeCompare(right));

  const stories = [];
  for (const file of files) {
    const raw = await readFile(join(storiesDir, file), 'utf8');
    const parsed = JSON.parse(raw);
    stories.push(parsed);
  }
  return stories;
}

async function loadBrandDirection() {
  const raw = await readFile(brandPackPath, 'utf8');
  return JSON.parse(raw);
}

function buildWebsiteAssets(brandDirection) {
  const stylePrinciples = asArray(brandDirection?.brand_direction?.visual_principles).join('; ');
  const assets = [];

  for (const surface of WEBSITE_SURFACES) {
    const baseRef = [`website:${surface.route}`];
    const context = `Surface ${surface.title} (${surface.route}) objective: ${surface.objective}`;

    assets.push(
      buildAsset({
        id: `web-${surface.id}-page-banner`,
        title: `${surface.title} Page Banner`,
        modality: 'image',
        category: 'page_banner',
        scope: 'website',
        surfaceId: surface.id,
        prompt: `${context}. Create cinematic horror-luxe page banner art with layered atmosphere and typography-safe focal zone. Style principles: ${stylePrinciples}.`,
        references: baseRef
      })
    );

    assets.push(
      buildAsset({
        id: `web-${surface.id}-background-texture`,
        title: `${surface.title} Background Texture`,
        modality: 'image',
        category: 'background_texture',
        scope: 'website',
        surfaceId: surface.id,
        prompt: `${context}. Build high-detail background texture that supports readable overlays and rich depth without visual noise.`,
        references: baseRef
      })
    );

    assets.push(
      buildAsset({
        id: `web-${surface.id}-motion-teaser`,
        title: `${surface.title} Motion Teaser`,
        modality: 'video',
        category: 'surface_motion_teaser',
        scope: 'website',
        surfaceId: surface.id,
        prompt: `${context}. Produce a loop-ready motion teaser with subtle camera drift, practical light flicker, and safe pacing for homepage or section transitions.`,
        references: baseRef
      })
    );

    assets.push(
      buildAsset({
        id: `web-${surface.id}-ambient-loop`,
        title: `${surface.title} Ambient Loop`,
        modality: 'audio',
        category: 'surface_ambient_loop',
        scope: 'website',
        surfaceId: surface.id,
        prompt: `${context}. Compose an original ambient loop using restrained analog textures, distant field recordings, and tension pulses that remain unobtrusive under dialogue.`,
        references: baseRef
      })
    );

    assets.push(
      buildAsset({
        id: `web-${surface.id}-button-kit`,
        title: `${surface.title} Button Kit`,
        modality: 'artifact',
        category: 'button_system_artifact',
        scope: 'website',
        surfaceId: surface.id,
        prompt: `${context}. Design button system blueprint for primary, secondary, danger, disabled, hover, focus-visible, and pressed states with brand-coherent wording and accessibility notes.`,
        references: baseRef
      })
    );

    assets.push(
      buildAsset({
        id: `web-${surface.id}-layout-blueprint`,
        title: `${surface.title} Layout Blueprint`,
        modality: 'web',
        category: 'surface_layout_blueprint',
        scope: 'website',
        surfaceId: surface.id,
        prompt: `${context}. Generate complete webpage blueprint including hero, supporting modules, CTA hierarchy, legal-safe copy placeholders, and responsive breakpoints for mobile/tablet/desktop.`,
        references: baseRef
      })
    );
  }

  return assets;
}

function buildStoryAssets(story) {
  const storyContext = composeStoryContext(story);
  const arcs = asArray(story.arcMap);
  const beats = flattenActsToBeats(story.acts);
  const npcs = asArray(story.npcProfiles);
  const endings = asArray(story.endingVariants);
  const puzzles = asArray(story.communityPuzzles);
  const branchingMoments = asArray(story.branchingMoments);
  const villain = story.villain ?? null;

  const evidenceFromList = asArray(story.clueEvidenceList).filter(
    (item) => typeof item === 'string' && item.length > 0
  );
  const evidenceFromBoard = asArray(story.investigationBoard?.nodes)
    .filter((node) => node?.type === 'EVIDENCE')
    .map((node) => node.label ?? node.summary)
    .filter((value) => typeof value === 'string' && value.length > 0);
  const evidenceItems = dedupe([...evidenceFromList, ...evidenceFromBoard]).slice(0, 8);

  const assets = [];
  const storyRef = [`docs/stories/${story.id}.story.json`];

  assets.push(
    buildAsset({
      id: `${story.id}-story-key-art`,
      title: `${story.title} Story Key Art`,
      modality: 'image',
      category: 'story_key_art',
      scope: 'story',
      storyId: story.id,
      storyTitle: story.title,
      prompt: `${storyContext}. Create premium launch key art that introduces player mission stakes and iconic environmental cues with poster-level composition.`,
      references: storyRef
    })
  );

  for (const arc of arcs) {
    assets.push(
      buildAsset({
        id: `${story.id}-${slugify(arc.id ?? arc.title)}-arc-key-art`,
        title: `${story.title} - ${arc.title} Arc Key Art`,
        modality: 'image',
        category: 'arc_key_art',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        arcId: arc.id ?? null,
        arcTitle: arc.title ?? null,
        arcStage: arc.stage ?? null,
        prompt: `${storyContext}. Arc focus: ${arc.title} (${arc.stage}). Summary: ${arc.summary}. Create cinematic key art with readable clue anchors and escalating threat language.`,
        references: storyRef
      })
    );

    assets.push(
      buildAsset({
        id: `${story.id}-${slugify(arc.id ?? arc.title)}-arc-ambience`,
        title: `${story.title} - ${arc.title} Arc Ambience`,
        modality: 'audio',
        category: 'arc_ambience',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        arcId: arc.id ?? null,
        arcTitle: arc.title ?? null,
        arcStage: arc.stage ?? null,
        prompt: `${storyContext}. Arc focus: ${arc.title}. Compose original ambience that mirrors arc tension and supports long-session listening fatigue constraints.`,
        references: storyRef
      })
    );

    assets.push(
      buildAsset({
        id: `${story.id}-${slugify(arc.id ?? arc.title)}-arc-teaser-video`,
        title: `${story.title} - ${arc.title} Arc Teaser Video`,
        modality: 'video',
        category: 'arc_teaser_video',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        arcId: arc.id ?? null,
        arcTitle: arc.title ?? null,
        arcStage: arc.stage ?? null,
        prompt: `${storyContext}. Arc focus: ${arc.title}. Produce teaser clip with coherent world continuity, practical lighting, and one clear clue motif transition.`,
        references: storyRef
      })
    );
  }

  for (const beat of beats) {
    assets.push(
      buildAsset({
        id: `${story.id}-${slugify(beat.id ?? `${beat.actId}-${beat.beatOrder}`)}-beat-scene`,
        title: `${story.title} - ${beat.title} Beat Scene`,
        modality: 'image',
        category: 'beat_scene_art',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        beatId: beat.id ?? null,
        prompt: `${storyContext}. Beat: ${beat.title} (${beat.actTitle}). Narrative: ${beat.narrative}. Render an immersive scene frame with spatial depth and hidden clue affordance.`,
        references: storyRef
      })
    );

    assets.push(
      buildAsset({
        id: `${story.id}-${slugify(beat.id ?? `${beat.actId}-${beat.beatOrder}`)}-beat-transition`,
        title: `${story.title} - ${beat.title} Beat Transition`,
        modality: 'video',
        category: 'beat_transition_video',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        beatId: beat.id ?? null,
        prompt: `${storyContext}. Beat: ${beat.title}. Create transition motion card suitable for chapter change moment with in-world typography-safe zones.`,
        references: storyRef
      })
    );
  }

  for (const npc of npcs) {
    assets.push(
      buildAsset({
        id: `${story.id}-${slugify(npc.id ?? npc.displayName)}-portrait`,
        title: `${story.title} - ${npc.displayName} Portrait`,
        modality: 'image',
        category: 'character_portrait',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        prompt: `${storyContext}. Character portrait for ${npc.displayName}, role ${npc.role}. Traits: ${asArray(npc.personalityTraits).join(', ')}. Response style: accusation=${npc.responseStyle?.accusation}; threat=${npc.responseStyle?.threat}; questioning=${npc.responseStyle?.questioning}.`,
        references: storyRef
      })
    );

    assets.push(
      buildAsset({
        id: `${story.id}-${slugify(npc.id ?? npc.displayName)}-voice-profile`,
        title: `${story.title} - ${npc.displayName} Voice Profile`,
        modality: 'audio',
        category: 'npc_voice_profile',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        prompt: `${storyContext}. Build unique voice profile for ${npc.displayName}. Baseline emotion=${npc.baselineEmotion}. Motivations=${asArray(
          npc.motivations
        ).join(
          '; '
        )}. Include cadence notes and emotional shifts for suspicion, trust, and panic states.`,
        references: storyRef
      })
    );

    assets.push(
      buildAsset({
        id: `${story.id}-${slugify(npc.id ?? npc.displayName)}-dossier`,
        title: `${story.title} - ${npc.displayName} Dossier`,
        modality: 'artifact',
        category: 'npc_dossier',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        prompt: `${storyContext}. Write in-world dossier for ${npc.displayName} including known history, hidden motives, trust thresholds, and clue-link references for interactive evidence board.`,
        references: storyRef
      })
    );
  }

  if (villain?.displayName) {
    assets.push(
      buildAsset({
        id: `${story.id}-villain-portrait`,
        title: `${story.title} - Villain Portrait`,
        modality: 'image',
        category: 'villain_portrait',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        prompt: `${storyContext}. Design portrait of antagonist ${villain.displayName} with archetype ${
          villain.archetype
        }, speech style "${villain.signatureSpeechStyle}", and motifs ${asArray(villain.symbolicMotifs).join(', ')}.`,
        references: storyRef
      })
    );

    assets.push(
      buildAsset({
        id: `${story.id}-villain-voice-profile`,
        title: `${story.title} - Villain Voice Profile`,
        modality: 'audio',
        category: 'villain_voice_profile',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        prompt: `${storyContext}. Create villain voice profile for ${villain.displayName}. Worldview: ${villain.worldview}. Manner: ${villain.humorOrCruelty}. Include escalation stage cues for stage 1-4 intimidation.`,
        references: storyRef
      })
    );

    assets.push(
      buildAsset({
        id: `${story.id}-villain-dossier`,
        title: `${story.title} - Villain Dossier`,
        modality: 'artifact',
        category: 'villain_dossier',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        prompt: `${storyContext}. Build antagonist dossier covering motive, manipulation tactics (${asArray(
          villain.manipulationTactics
        ).join(', ')}), risk tolerance ${villain.riskTolerance}, and predicted pressure pathways.`,
        references: storyRef
      })
    );
  }

  for (const evidence of evidenceItems) {
    const evidenceSlug = slugify(evidence).slice(0, 48);
    assets.push(
      buildAsset({
        id: `${story.id}-${evidenceSlug}-evidence-still`,
        title: `${story.title} - Evidence Still - ${evidence}`,
        modality: 'image',
        category: 'evidence_still',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        prompt: `${storyContext}. Render forensic evidence still for "${evidence}" with chain-of-custody cues, believable wear, and subtle hidden clue placement.`,
        references: storyRef
      })
    );

    assets.push(
      buildAsset({
        id: `${story.id}-${evidenceSlug}-evidence-document`,
        title: `${story.title} - Evidence Document - ${evidence}`,
        modality: 'artifact',
        category: 'evidence_document',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        prompt: `${storyContext}. Produce in-world evidence artifact for "${evidence}" with metadata blocks, witness notes, and authenticity anomalies that invite player deduction.`,
        references: storyRef
      })
    );
  }

  for (const puzzle of puzzles) {
    const puzzleSlug = slugify(puzzle.id ?? puzzle.title);
    assets.push(
      buildAsset({
        id: `${story.id}-${puzzleSlug}-puzzle-board`,
        title: `${story.title} - ${puzzle.title} Puzzle Board`,
        modality: 'image',
        category: 'puzzle_board',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        prompt: `${storyContext}. Puzzle visual for "${puzzle.title}". Objective: ${puzzle.objective}. Build layered clue board where each shard can be solved collaboratively.`,
        references: storyRef
      })
    );

    assets.push(
      buildAsset({
        id: `${story.id}-${puzzleSlug}-puzzle-worksheet`,
        title: `${story.title} - ${puzzle.title} Puzzle Worksheet`,
        modality: 'artifact',
        category: 'puzzle_worksheet',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        prompt: `${storyContext}. Create puzzle worksheet for "${puzzle.title}" with clear player instructions, shard mapping, and anti-spoiler hint progression.`,
        references: storyRef
      })
    );

    for (const shard of asArray(puzzle.shards)) {
      const shardSlug = slugify(shard.id ?? shard.heldBy);
      assets.push(
        buildAsset({
          id: `${story.id}-${puzzleSlug}-${shardSlug}-shard-card`,
          title: `${story.title} - ${puzzle.title} - ${shard.heldBy} Shard Card`,
          modality: 'image',
          category: 'puzzle_shard_card',
          scope: 'story',
          storyId: story.id,
          storyTitle: story.title,
          prompt: `${storyContext}. Create shard card for holder ${shard.heldBy}. Content brief: ${shard.content}. Ensure it can stand alone but becomes decisive when combined with other shards.`,
          references: storyRef
        })
      );
    }
  }

  for (const ending of endings) {
    const endingSlug = slugify(ending.id ?? ending.title);
    assets.push(
      buildAsset({
        id: `${story.id}-${endingSlug}-ending-card`,
        title: `${story.title} - ${ending.title} Ending Card`,
        modality: 'image',
        category: 'ending_card',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        prompt: `${storyContext}. Ending card for "${ending.title}" (${ending.type}). Summary: ${ending.summary}. Deliver emotional closure with sequel-hook tension.`,
        references: storyRef
      })
    );

    assets.push(
      buildAsset({
        id: `${story.id}-${endingSlug}-ending-score`,
        title: `${story.title} - ${ending.title} Ending Score`,
        modality: 'audio',
        category: 'ending_score',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        prompt: `${storyContext}. Compose ending score cue for "${ending.title}" that supports summary "${ending.summary}" and epilogue "${ending.epilogue}".`,
        references: storyRef
      })
    );

    assets.push(
      buildAsset({
        id: `${story.id}-${endingSlug}-ending-recap-video`,
        title: `${story.title} - ${ending.title} Ending Recap Video`,
        modality: 'video',
        category: 'ending_recap_video',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        prompt: `${storyContext}. Produce ending recap video for "${ending.title}" with three visual beats: aftermath, consequence, sequel hook.`,
        references: storyRef
      })
    );
  }

  for (const branch of branchingMoments.slice(0, 6)) {
    const branchSlug = slugify(branch);
    assets.push(
      buildAsset({
        id: `${story.id}-${branchSlug}-decision-ui`,
        title: `${story.title} - Branch UI - ${branch}`,
        modality: 'web',
        category: 'branch_decision_ui',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        prompt: `${storyContext}. Build interactive branch decision page for "${branch}" with tension-forward copy, clear options, and high-readability input controls.`,
        references: storyRef
      })
    );

    assets.push(
      buildAsset({
        id: `${story.id}-${branchSlug}-decision-artifact`,
        title: `${story.title} - Branch Artifact - ${branch}`,
        modality: 'artifact',
        category: 'branch_decision_artifact',
        scope: 'story',
        storyId: story.id,
        storyTitle: story.title,
        prompt: `${storyContext}. Create in-world branching evidence note for "${branch}" showing consequences of each path without explicit spoilers.`,
        references: storyRef
      })
    );
  }

  assets.push(
    buildAsset({
      id: `${story.id}-social-launch-vertical`,
      title: `${story.title} Social Launch Vertical`,
      modality: 'image',
      category: 'social_vertical',
      scope: 'story',
      storyId: story.id,
      storyTitle: story.title,
      prompt: `${storyContext}. Design vertical social launch creative with hook-forward typography zone and one undeniable clue motif.`,
      references: storyRef
    })
  );

  assets.push(
    buildAsset({
      id: `${story.id}-social-launch-square`,
      title: `${story.title} Social Launch Square`,
      modality: 'image',
      category: 'social_square',
      scope: 'story',
      storyId: story.id,
      storyTitle: story.title,
      prompt: `${storyContext}. Design square social creative for paid and organic campaigns with campaign-safe contrast and suspense focus.`,
      references: storyRef
    })
  );

  assets.push(
    buildAsset({
      id: `${story.id}-trailer-main`,
      title: `${story.title} Main Trailer`,
      modality: 'video',
      category: 'story_trailer',
      scope: 'story',
      storyId: story.id,
      storyTitle: story.title,
      prompt: `${storyContext}. Build 18-second story trailer with hook in first 3 seconds, middle clue escalation, and final unresolved threat card.`,
      references: storyRef
    })
  );

  assets.push(
    buildAsset({
      id: `${story.id}-story-theme-loop`,
      title: `${story.title} Story Theme Loop`,
      modality: 'audio',
      category: 'story_theme_loop',
      scope: 'story',
      storyId: story.id,
      storyTitle: story.title,
      prompt: `${storyContext}. Compose original story theme loop with memorable motif, controlled dynamics, and compatibility with dialogue-overlays.`,
      references: storyRef
    })
  );

  assets.push(
    buildAsset({
      id: `${story.id}-story-overview-page`,
      title: `${story.title} Story Overview Page`,
      modality: 'web',
      category: 'story_overview_page',
      scope: 'story',
      storyId: story.id,
      storyTitle: story.title,
      prompt: `${storyContext}. Design complete story overview webpage covering premise, cast cards, clue teaser, safety notes, and strong CTA to start case.`,
      references: storyRef
    })
  );

  return assets;
}

function groupAssetsForTasks(assets) {
  const groups = new Map();

  for (const asset of assets) {
    const storyKey = asset.storyId ?? 'website';
    const key = `${storyKey}::${asset.modality}`;
    const existing = groups.get(key) ?? {
      key,
      storyId: asset.storyId,
      storyTitle: asset.storyTitle,
      scope: asset.scope,
      modality: asset.modality,
      botId: asset.linear.botId,
      priority: asset.linear.priority,
      assets: []
    };
    existing.assets.push(asset);
    groups.set(key, existing);
  }

  return Array.from(groups.values()).sort((left, right) => left.key.localeCompare(right.key));
}

function modalityLabel(modality) {
  return (
    {
      image: 'Image',
      audio: 'Audio',
      video: 'Video',
      artifact: 'Artifact',
      web: 'Web'
    }[modality] ?? modality
  );
}

function buildLinearBacklog({ assets }) {
  const groups = groupAssetsForTasks(assets);
  const packageId = `agent-army-${new Date().toISOString().slice(0, 10)}`;
  const tasks = [];

  tasks.push({
    title: 'Agent Army Command - Global Creative Orchestration',
    botId: 'AI-Executive-Orchestrator',
    priority: 1,
    description:
      'Orchestrate all story and website production lanes across image, audio, video, artifact, and web outputs; maintain dependency board and unblock execution.',
    deliverables: [
      'Master execution board for all modalities and stories',
      'Daily burn-down snapshot with blocker tracking',
      'Final signoff memo for commercial readiness'
    ],
    signoffCriteria: [
      'Every modality lane has explicit ownership and acceptance target',
      'No unresolved blocker remains in launch-critical paths'
    ],
    assetSelection: {
      scope: 'all',
      modality: 'all',
      estimatedCount: assets.length
    }
  });

  for (const group of groups) {
    const categorySample = dedupe(group.assets.map((item) => item.category)).slice(0, 8);
    const title = group.storyId
      ? `Agent Army - ${group.storyTitle} - ${modalityLabel(group.modality)} Production`
      : `Agent Army - Website - ${modalityLabel(group.modality)} Production`;

    const description = group.storyId
      ? `Produce ${group.assets.length} ${group.modality} assets for ${group.storyTitle} using arc-aware and beat-aware prompts from the commercial agent-army manifest.`
      : `Produce ${group.assets.length} website ${group.modality} assets across landing, library, onboarding, play, codex, and mobile surfaces.`;

    tasks.push({
      title,
      botId: group.botId,
      priority: group.priority,
      description,
      deliverables: [
        `${group.assets.length} generated outputs mapped to manifest outputKey targets`,
        `Prompt execution metadata for each generated asset`,
        `Creative QA notes for categories: ${categorySample.join(', ')}`
      ],
      signoffCriteria: [
        'All outputs pass declared quality gates and are referenced in metadata',
        'No missing asset in the filtered modality queue'
      ],
      assetSelection: {
        scope: group.scope,
        storyId: group.storyId,
        modality: group.modality,
        estimatedCount: group.assets.length
      }
    });
  }

  tasks.push(
    {
      title: 'Agent Army - Cross-Modal QA Certification',
      botId: 'AI-QA-Test-Agent',
      priority: 1,
      description:
        'Run cross-modal QA on all generated outputs, including playback sanity, visual integrity, artifact continuity, and responsive web checks.',
      deliverables: [
        'Certification report by modality and story',
        'Blocking defect list with repro notes',
        'Final pass/fail matrix for launch gate'
      ],
      signoffCriteria: [
        'Critical defects resolved or waived by policy owner',
        'Certification report attached to release gate'
      ],
      assetSelection: {
        scope: 'all',
        modality: 'all',
        estimatedCount: assets.length
      }
    },
    {
      title: 'Agent Army - Rights, Safety, and Provenance Audit',
      botId: 'AI-Security-Compliance-Agent',
      priority: 1,
      description:
        'Audit generated media for rights provenance, safety policy compliance, and commercial usage constraints before launch.',
      deliverables: [
        'Rights/provenance manifest review',
        'Safety and policy checklist',
        'Risk exception log'
      ],
      signoffCriteria: [
        'No unresolved rights conflict',
        'Safety controls validated for all release surfaces'
      ],
      assetSelection: {
        scope: 'all',
        modality: 'all',
        estimatedCount: assets.length
      }
    },
    {
      title: 'Agent Army - Release Packaging and Deployment Sync',
      botId: 'AI-DevOps-Release-Agent',
      priority: 2,
      description:
        'Sync generated outputs into deterministic release packaging, cache strategy, and deployment gating across web and mobile delivery paths.',
      deliverables: [
        'Updated packaging checklist for generated assets',
        'Cache invalidation plan for revised media',
        'Rollback-safe deployment notes'
      ],
      signoffCriteria: [
        'Release pipeline handles new assets deterministically',
        'Rollback path proven in staging'
      ],
      assetSelection: {
        scope: 'all',
        modality: 'all',
        estimatedCount: assets.length
      }
    }
  );

  return {
    packageId,
    packageTitle: 'Commercial Agent Army - Full Multimodal Asset Production',
    sourceReferences: [
      'assets/manifests/commercial-agent-army-plan.json',
      'assets/prompts/commercial-agent-army-prompts.json',
      'assets/prompts/commercial-site-pack.json',
      'docs/stories/*.story.json'
    ],
    tasks
  };
}

function buildOpenClawJobs({ backlog, manifest }) {
  return backlog.tasks.map((task, index) => {
    const selector = task.assetSelection ?? {};
    const scopeLine = selector.storyId
      ? `scope=story storyId=${selector.storyId} modality=${selector.modality}`
      : `scope=${selector.scope ?? 'all'} modality=${selector.modality ?? 'all'}`;

    const prompt = [
      `You are ${task.botId} operating in MyHorrorStory production mode.`,
      `Mission: ${task.title}.`,
      `Work queue selector: ${scopeLine}.`,
      'Source manifest: assets/manifests/commercial-agent-army-plan.json',
      'Prompt index: assets/prompts/commercial-agent-army-prompts.json',
      '',
      'Execution requirements:',
      '- Produce all outputs for the selected queue and write to each asset outputKey path.',
      '- Record prompt/provider metadata adjacent to each output.',
      '- Respect quality gates and negative prompt constraints for each modality.',
      '- Keep narrative continuity anchored to story hook, arc summaries, and villain motifs.',
      '',
      'Deliverables for this mission:',
      ...task.deliverables.map((item) => `- ${item}`),
      '',
      'Signoff criteria:',
      ...task.signoffCriteria.map((item) => `- ${item}`),
      '',
      'Return ONLY a valid JSON object (no markdown, no prose) with keys:',
      '{"taskTitle": string, "generatedCount": number, "failedCount": number, "skippedCount": number, "blockers": string[], "notes": string[]}.'
    ].join('\n');

    return {
      id: `openclaw-agent-army-job-${index + 1}`,
      taskTitle: task.title,
      botId: task.botId,
      priority: task.priority,
      assetSelection: selector,
      estimatedCount: selector.estimatedCount ?? null,
      prompt,
      references: {
        manifestVersion: manifest.version,
        manifestGeneratedAt: manifest.generatedAt
      }
    };
  });
}

function buildPromptIndex(manifest) {
  const website = [];
  const stories = new Map();

  for (const asset of manifest.assets) {
    const entry = {
      id: asset.id,
      title: asset.title,
      modality: asset.modality,
      category: asset.category,
      prompt: asset.prompt,
      negativePrompt: asset.negativePrompt,
      outputKey: asset.outputKey
    };

    if (asset.storyId) {
      const existing = stories.get(asset.storyId) ?? {
        storyId: asset.storyId,
        storyTitle: asset.storyTitle,
        prompts: []
      };
      existing.prompts.push(entry);
      stories.set(asset.storyId, existing);
    } else {
      website.push(entry);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    totalPrompts: manifest.assets.length,
    websitePrompts: website,
    storyPrompts: Array.from(stories.values()).sort((left, right) =>
      left.storyId.localeCompare(right.storyId)
    )
  };
}

function summarizeByModality(assets) {
  const bucket = new Map();
  for (const asset of assets) {
    bucket.set(asset.modality, (bucket.get(asset.modality) ?? 0) + 1);
  }
  return Object.fromEntries(
    Array.from(bucket.entries()).sort((left, right) => left[0].localeCompare(right[0]))
  );
}

function summarizeByStory(assets) {
  const bucket = new Map();
  for (const asset of assets) {
    const key = asset.storyId ?? 'website';
    bucket.set(key, (bucket.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(
    Array.from(bucket.entries()).sort((left, right) => left[0].localeCompare(right[0]))
  );
}

async function main() {
  const [stories, brandDirection] = await Promise.all([loadStories(), loadBrandDirection()]);

  const websiteAssets = buildWebsiteAssets(brandDirection);
  const storyAssets = stories.flatMap((story) => buildStoryAssets(story));
  const assets = [...websiteAssets, ...storyAssets];

  const manifest = {
    version: 'v1',
    generatedAt: new Date().toISOString(),
    strategy: brandDirection.brand_direction ?? {},
    totals: {
      stories: stories.length,
      websiteAssets: websiteAssets.length,
      storyAssets: storyAssets.length,
      allAssets: assets.length
    },
    totalsByModality: summarizeByModality(assets),
    totalsByStory: summarizeByStory(assets),
    assets
  };

  const promptIndex = buildPromptIndex(manifest);
  const backlog = buildLinearBacklog({ assets });
  const jobs = {
    generatedAt: new Date().toISOString(),
    packageId: backlog.packageId,
    packageTitle: backlog.packageTitle,
    jobs: buildOpenClawJobs({ backlog, manifest })
  };

  await Promise.all([
    mkdir(join(repoRoot, 'assets', 'manifests'), { recursive: true }),
    mkdir(join(repoRoot, 'assets', 'prompts'), { recursive: true }),
    mkdir(join(repoRoot, 'docs', 'operations'), { recursive: true })
  ]);

  await Promise.all([
    writeFile(manifestOutputPath, JSON.stringify(manifest, null, 2), 'utf8'),
    writeFile(promptOutputPath, JSON.stringify(promptIndex, null, 2), 'utf8'),
    writeFile(backlogOutputPath, JSON.stringify(backlog, null, 2), 'utf8'),
    writeFile(jobsOutputPath, JSON.stringify(jobs, null, 2), 'utf8')
  ]);

  console.log(`[agent-army] Stories: ${stories.length}`);
  console.log(`[agent-army] Assets: ${manifest.totals.allAssets}`);
  console.log(`[agent-army] By modality: ${JSON.stringify(manifest.totalsByModality)}`);
  console.log(`[agent-army] Manifest: ${manifestOutputPath}`);
  console.log(`[agent-army] Prompt index: ${promptOutputPath}`);
  console.log(`[agent-army] Linear backlog: ${backlogOutputPath}`);
  console.log(`[agent-army] OpenClaw jobs: ${jobsOutputPath}`);
}

main().catch((error) => {
  console.error('[agent-army] Failed:', error);
  process.exit(1);
});
