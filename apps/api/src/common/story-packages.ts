import { storyPackageSchema, type StoryPackage } from '@myhorrorstory/contracts';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));

function loadStory(file: string): StoryPackage {
  const absolute = join(currentDir, '../../../../docs/stories', file);
  const raw = JSON.parse(readFileSync(absolute, 'utf8')) as unknown;
  return storyPackageSchema.parse(raw);
}

export const storyPackages: StoryPackage[] = [
  loadStory('static-between-stations.story.json'),
  loadStory('black-chapel-ledger.story.json'),
  loadStory('the-harvest-men.story.json'),
  loadStory('signal-from-kharon-9.story.json'),
  loadStory('the-fourth-tenant.story.json'),
  loadStory('tape-17-pinewatch.story.json'),
  loadStory('crown-of-salt.story.json'),
  loadStory('red-creek-winter.story.json'),
  loadStory('ward-1908.story.json'),
  loadStory('dead-channel-protocol.story.json')
];
