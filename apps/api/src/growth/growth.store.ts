import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  growthCampaignSummarySchema,
  growthLeadRecordSchema,
  type GrowthCampaignSummary,
  type GrowthLeadRecord
} from '@myhorrorstory/contracts';

interface StoredGrowthData {
  campaigns: GrowthCampaignSummary[];
  leads: GrowthLeadRecord[];
}

function defaultStorePath(): string {
  const configured = process.env.GROWTH_DATA_FILE?.trim();
  if (configured) {
    return resolve(configured);
  }
  return resolve(process.cwd(), '.runtime', 'growth-data.json');
}

function isPersistenceEnabled(): boolean {
  const explicit = process.env.GROWTH_DATA_PERSIST?.trim().toLowerCase();
  if (explicit === 'false' || explicit === '0' || explicit === 'no') {
    return false;
  }
  if (explicit === 'true' || explicit === '1' || explicit === 'yes') {
    return true;
  }
  return process.env.NODE_ENV !== 'test';
}

function coerceData(input: unknown): StoredGrowthData {
  if (typeof input !== 'object' || input === null) {
    return { campaigns: [], leads: [] };
  }
  const candidate = input as Record<string, unknown>;
  const campaigns = Array.isArray(candidate.campaigns)
    ? candidate.campaigns
        .map((value) => growthCampaignSummarySchema.safeParse(value))
        .filter((result) => result.success)
        .map((result) => result.data)
    : [];
  const leads = Array.isArray(candidate.leads)
    ? candidate.leads
        .map((value) => growthLeadRecordSchema.safeParse(value))
        .filter((result) => result.success)
        .map((result) => result.data)
    : [];
  return { campaigns, leads };
}

export class GrowthStore {
  private readonly persist = isPersistenceEnabled();
  private readonly filePath = defaultStorePath();

  load(): StoredGrowthData {
    if (!this.persist || !existsSync(this.filePath)) {
      return { campaigns: [], leads: [] };
    }
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, 'utf8')) as unknown;
      return coerceData(parsed);
    } catch (error) {
      console.warn('[growth] failed to read persisted growth data', error);
      return { campaigns: [], leads: [] };
    }
  }

  save(data: StoredGrowthData): void {
    if (!this.persist) {
      return;
    }
    const directory = dirname(this.filePath);
    mkdirSync(directory, { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    renameSync(tempPath, this.filePath);
  }
}
