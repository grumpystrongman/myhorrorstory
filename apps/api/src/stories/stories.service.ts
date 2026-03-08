import { Injectable, NotFoundException } from '@nestjs/common';
import type { StoryPackage } from '@myhorrorstory/contracts';
import { storyPackages } from '../common/story-packages.js';

@Injectable()
export class StoriesService {
  list(): StoryPackage[] {
    return storyPackages;
  }

  getById(id: string): StoryPackage {
    const found = storyPackages.find((story) => story.id === id);
    if (!found) {
      throw new NotFoundException('Story not found');
    }

    return found;
  }
}
