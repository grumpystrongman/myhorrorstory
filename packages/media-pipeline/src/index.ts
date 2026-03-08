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
