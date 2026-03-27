import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

interface StoredSettingRecord {
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
}

function defaultStorePath(): string {
  const configured = process.env.ADMIN_SETTINGS_FILE?.trim();
  if (configured) {
    return resolve(configured);
  }
  return resolve(process.cwd(), '.runtime', 'admin-settings.json');
}

function isPersistenceEnabled(): boolean {
  const explicit = process.env.ADMIN_SETTINGS_PERSIST?.trim().toLowerCase();
  if (explicit === 'false' || explicit === '0' || explicit === 'no') {
    return false;
  }
  if (explicit === 'true' || explicit === '1' || explicit === 'yes') {
    return true;
  }
  return process.env.NODE_ENV !== 'test';
}

function coerceRecord(input: unknown): StoredSettingRecord | null {
  if (typeof input !== 'object' || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  if (typeof record.key !== 'string' || typeof record.updatedAt !== 'string') {
    return null;
  }
  return {
    key: record.key,
    value: record.value,
    description: typeof record.description === 'string' ? record.description : null,
    updatedAt: record.updatedAt
  };
}

export class AdminSettingsStore {
  private readonly persist = isPersistenceEnabled();
  private readonly filePath = defaultStorePath();

  load(): StoredSettingRecord[] {
    if (!this.persist || !existsSync(this.filePath)) {
      return [];
    }
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, 'utf8')) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map((entry) => coerceRecord(entry)).filter((entry): entry is StoredSettingRecord => Boolean(entry));
    } catch (error) {
      console.warn('[admin] failed to read settings store', error);
      return [];
    }
  }

  save(records: StoredSettingRecord[]): void {
    if (!this.persist) {
      return;
    }
    const directory = dirname(this.filePath);
    mkdirSync(directory, { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
    renameSync(tempPath, this.filePath);
  }
}
