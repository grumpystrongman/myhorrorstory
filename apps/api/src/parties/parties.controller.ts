import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { PartiesService } from './parties.service.js';
import { type PartyRecord } from './parties.service.js';

@Controller('parties')
export class PartiesController {
  constructor(@Inject(PartiesService) private readonly partiesService: PartiesService) {}

  @Post()
  create(@Body() input: unknown): PartyRecord {
    return this.partiesService.create(input);
  }

  @Get()
  list(): PartyRecord[] {
    return this.partiesService.list();
  }
}
