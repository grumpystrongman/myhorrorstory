import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { SetupMessagingChannel } from './channels.schemas.js';

export interface StoredChannelEnrollmentContact {
  channel: SetupMessagingChannel;
  address: string;
  normalizedAddress: string;
  optIn: boolean;
}

export interface StoredChannelEnrollment {
  caseId: string;
  playerId: string;
  contacts: StoredChannelEnrollmentContact[];
  updatedAt: string;
}

function defaultStorePath(): string {
  const configured = process.env.CHANNEL_ENROLLMENTS_FILE?.trim();
  if (configured) {
    return resolve(configured);
  }
  return resolve(process.cwd(), '.runtime', 'channel-enrollments.json');
}

function isPersistenceEnabled(): boolean {
  const explicit = process.env.CHANNEL_ENROLLMENTS_PERSIST?.trim().toLowerCase();
  if (explicit === 'false' || explicit === '0' || explicit === 'no') {
    return false;
  }
  if (explicit === 'true' || explicit === '1' || explicit === 'yes') {
    return true;
  }

  return process.env.NODE_ENV !== 'test';
}

function coerceEnrollment(input: unknown): StoredChannelEnrollment | null {
  if (typeof input !== 'object' || input === null) {
    return null;
  }

  const candidate = input as Record<string, unknown>;
  if (typeof candidate.caseId !== 'string' || typeof candidate.playerId !== 'string') {
    return null;
  }
  if (!Array.isArray(candidate.contacts) || typeof candidate.updatedAt !== 'string') {
    return null;
  }

  const contacts: StoredChannelEnrollmentContact[] = [];
  for (const rawContact of candidate.contacts) {
    if (typeof rawContact !== 'object' || rawContact === null) {
      continue;
    }
    const contact = rawContact as Record<string, unknown>;
    if (
      typeof contact.channel !== 'string' ||
      typeof contact.address !== 'string' ||
      typeof contact.normalizedAddress !== 'string'
    ) {
      continue;
    }

    const channel = contact.channel.toUpperCase();
    if (channel !== 'SMS' && channel !== 'WHATSAPP' && channel !== 'TELEGRAM' && channel !== 'SIGNAL') {
      continue;
    }

    contacts.push({
      channel: channel as SetupMessagingChannel,
      address: contact.address,
      normalizedAddress: contact.normalizedAddress,
      optIn: contact.optIn !== false
    });
  }

  return {
    caseId: candidate.caseId,
    playerId: candidate.playerId,
    contacts,
    updatedAt: candidate.updatedAt
  };
}

export class ChannelEnrollmentStore {
  private readonly persist = isPersistenceEnabled();
  private readonly filePath = defaultStorePath();

  load(): StoredChannelEnrollment[] {
    if (!this.persist || !existsSync(this.filePath)) {
      return [];
    }

    try {
      const raw = JSON.parse(readFileSync(this.filePath, 'utf8')) as unknown;
      if (!Array.isArray(raw)) {
        return [];
      }
      return raw.map((item) => coerceEnrollment(item)).filter((item): item is StoredChannelEnrollment => Boolean(item));
    } catch (error) {
      console.warn('[channels] failed to read persisted enrollments', error);
      return [];
    }
  }

  save(enrollments: StoredChannelEnrollment[]): void {
    if (!this.persist) {
      return;
    }

    const directory = dirname(this.filePath);
    mkdirSync(directory, { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    const payload = `${JSON.stringify(enrollments, null, 2)}\n`;
    writeFileSync(tempPath, payload, 'utf8');
    renameSync(tempPath, this.filePath);
  }

  getStorePath(): string | null {
    if (!this.persist) {
      return null;
    }
    return this.filePath;
  }
}
