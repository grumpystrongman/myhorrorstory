export type AssetType =
  | 'character_portrait'
  | 'scene_art'
  | 'evidence_image'
  | 'ui_background'
  | 'setting_art'
  | 'promo_image'
  | 'social_creative';

export interface AssetManifestEntry {
  id: string;
  type: AssetType;
  prompt: string;
  promptHash: string;
  revision: number;
  generatedAt: string;
  provider: string;
  outputKey: string;
}

export type CommercialQualityGate =
  | 'brand_compliance_passed'
  | 'accessibility_contrast_passed'
  | 'narrative_coherence_passed'
  | 'rights_and_provenance_verified';

export interface CommercialAssetPlanEntry extends AssetManifestEntry {
  scope: 'website' | 'story';
  storyId: string | null;
  providerChain: string[];
  qualityGates: CommercialQualityGate[];
}

export function createPromptHash(prompt: string): string {
  return Buffer.from(prompt).toString('base64url');
}

export function createManifestEntry(input: {
  id: string;
  type: AssetType;
  prompt: string;
  provider: string;
  outputKey: string;
  revision?: number;
}): AssetManifestEntry {
  return {
    id: input.id,
    type: input.type,
    prompt: input.prompt,
    promptHash: createPromptHash(input.prompt),
    revision: input.revision ?? 1,
    generatedAt: new Date().toISOString(),
    provider: input.provider,
    outputKey: input.outputKey
  };
}

function templatePrompt(template: string, replacements: Record<string, string>): string {
  let output = template;
  for (const [key, value] of Object.entries(replacements)) {
    output = output.replaceAll(`{${key}}`, value);
  }
  return output;
}

export function buildCommercialAssetPlan(input: {
  storyIds: string[];
  websitePrompts: Array<{ id: string; type: AssetType; prompt: string; outputKey: string }>;
  storyTemplates: Array<{ type: AssetType; count: number; promptTemplate: string }>;
  providerChain?: string[];
}): CommercialAssetPlanEntry[] {
  const providerChain = input.providerChain ?? ['openai-images', 'stability', 'manual-art-upload'];
  const qualityGates: CommercialQualityGate[] = [
    'brand_compliance_passed',
    'accessibility_contrast_passed',
    'narrative_coherence_passed',
    'rights_and_provenance_verified'
  ];

  const entries: CommercialAssetPlanEntry[] = [];

  for (const websiteAsset of input.websitePrompts) {
    const base = createManifestEntry({
      id: websiteAsset.id,
      type: websiteAsset.type,
      prompt: websiteAsset.prompt,
      provider: providerChain[0] ?? 'openai-images',
      outputKey: websiteAsset.outputKey,
      revision: 1
    });

    entries.push({
      ...base,
      scope: 'website',
      storyId: null,
      providerChain,
      qualityGates
    });
  }

  for (const storyId of input.storyIds) {
    for (const template of input.storyTemplates) {
      for (let index = 1; index <= template.count; index += 1) {
        const prompt = templatePrompt(template.promptTemplate, {
          story_id: storyId
        });

        const base = createManifestEntry({
          id: `${storyId}-${template.type}-${index}`,
          type: template.type,
          prompt,
          provider: providerChain[0] ?? 'openai-images',
          outputKey: `assets/production/stories/${storyId}/${template.type}-${index}-v1.png`,
          revision: 1
        });

        entries.push({
          ...base,
          scope: 'story',
          storyId,
          providerChain,
          qualityGates
        });
      }
    }
  }

  return entries;
}

export function validateCommercialAssetPlan(entries: CommercialAssetPlanEntry[]): {
  valid: boolean;
  duplicateIds: string[];
} {
  const seen = new Set<string>();
  const duplicateIds = new Set<string>();

  for (const entry of entries) {
    if (seen.has(entry.id)) {
      duplicateIds.add(entry.id);
    }
    seen.add(entry.id);
  }

  return {
    valid: duplicateIds.size === 0,
    duplicateIds: Array.from(duplicateIds.values())
  };
}
