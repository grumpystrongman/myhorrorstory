import { Controller, Get, Inject, Param } from '@nestjs/common';
import type { StoryPackage } from '@myhorrorstory/contracts';
import { StoriesService } from './stories.service.js';

@Controller('stories')
export class StoriesController {
  constructor(@Inject(StoriesService) private readonly storiesService: StoriesService) {}

  @Get()
  list(): StoryPackage[] {
    return this.storiesService.list();
  }

  @Get(':id')
  getById(@Param('id') id: string): StoryPackage {
    return this.storiesService.getById(id);
  }
}
