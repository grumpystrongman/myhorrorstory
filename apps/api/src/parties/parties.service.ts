import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createPartySchema, type CreatePartyInput } from '@myhorrorstory/contracts';

export interface PartyRecord {
  id: string;
  storyId: string;
  mode: 'SOLO' | 'PARTY';
  hostless: boolean;
  status: 'LOBBY' | 'ACTIVE';
  createdAt: string;
}

@Injectable()
export class PartiesService {
  private readonly parties = new Map<string, PartyRecord>();

  create(input: unknown): PartyRecord {
    const parsed: CreatePartyInput = createPartySchema.parse(input);
    const party: PartyRecord = {
      id: randomUUID(),
      storyId: parsed.storyId,
      mode: parsed.mode,
      hostless: parsed.hostless,
      status: 'LOBBY',
      createdAt: new Date().toISOString()
    };

    this.parties.set(party.id, party);
    return party;
  }

  list(): PartyRecord[] {
    return [...this.parties.values()];
  }
}
