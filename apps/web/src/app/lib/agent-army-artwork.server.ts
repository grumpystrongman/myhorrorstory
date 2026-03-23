import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  selectStoryArtwork,
  type AgentArmyStoryManifest,
  type StoryArtworkSelection
} from './agent-army-artwork';

async function tryLoadManifest(path: string): Promise<AgentArmyStoryManifest | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as AgentArmyStoryManifest;
  } catch {
    return null;
  }
}

export async function loadStoryArtworkSelection(storyId: string): Promise<StoryArtworkSelection> {
  const cwd = process.cwd();
  const candidates = [
    join(cwd, 'public', 'agent-army', 'manifests', `${storyId}.json`),
    join(cwd, 'apps', 'web', 'public', 'agent-army', 'manifests', `${storyId}.json`),
    join(cwd, '..', 'public', 'agent-army', 'manifests', `${storyId}.json`)
  ];

  for (const candidate of candidates) {
    const manifest = await tryLoadManifest(candidate);
    if (manifest) {
      return selectStoryArtwork(manifest);
    }
  }

  return selectStoryArtwork(null);
}
