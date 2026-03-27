import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { planTierSchema, roleSchema, type PlanTier, type Role } from '@myhorrorstory/contracts';

export interface StoredUserRecord {
  id: string;
  email: string;
  displayName: string;
  password: string;
  roles: Role[];
  tier: PlanTier;
  acceptedTermsAt: string;
  acceptedPrivacyAt: string;
  ageGateConfirmedAt: string;
  termsVersion: string;
  privacyVersion: string;
  createdAt: string;
  updatedAt: string;
}

function defaultStorePath(): string {
  const configured = process.env.AUTH_USERS_FILE?.trim();
  if (configured) {
    return resolve(configured);
  }
  return resolve(process.cwd(), '.runtime', 'auth-users.json');
}

function isPersistenceEnabled(): boolean {
  const explicit = process.env.AUTH_USERS_PERSIST?.trim().toLowerCase();
  if (explicit === 'false' || explicit === '0' || explicit === 'no') {
    return false;
  }
  if (explicit === 'true' || explicit === '1' || explicit === 'yes') {
    return true;
  }
  return process.env.NODE_ENV !== 'test';
}

function coerceUser(input: unknown): StoredUserRecord | null {
  if (typeof input !== 'object' || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.email !== 'string' ||
    typeof record.displayName !== 'string' ||
    typeof record.password !== 'string' ||
    typeof record.acceptedTermsAt !== 'string' ||
    typeof record.acceptedPrivacyAt !== 'string' ||
    typeof record.ageGateConfirmedAt !== 'string' ||
    typeof record.termsVersion !== 'string' ||
    typeof record.privacyVersion !== 'string' ||
    typeof record.createdAt !== 'string' ||
    typeof record.updatedAt !== 'string' ||
    !Array.isArray(record.roles)
  ) {
    return null;
  }

  const roles = record.roles
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.toUpperCase())
    .filter((value): value is Role => roleSchema.safeParse(value).success);

  const tierValue = typeof record.tier === 'string' ? record.tier.toUpperCase() : 'FREE';
  const tier = planTierSchema.safeParse(tierValue);
  if (!tier.success) {
    return null;
  }

  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    password: record.password,
    roles: roles.length > 0 ? roles : ['PLAYER'],
    tier: tier.data,
    acceptedTermsAt: record.acceptedTermsAt,
    acceptedPrivacyAt: record.acceptedPrivacyAt,
    ageGateConfirmedAt: record.ageGateConfirmedAt,
    termsVersion: record.termsVersion,
    privacyVersion: record.privacyVersion,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export class UserStore {
  private readonly persist = isPersistenceEnabled();
  private readonly filePath = defaultStorePath();

  load(): StoredUserRecord[] {
    if (!this.persist || !existsSync(this.filePath)) {
      return [];
    }
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, 'utf8')) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map((entry) => coerceUser(entry)).filter((entry): entry is StoredUserRecord => Boolean(entry));
    } catch (error) {
      console.warn('[auth] failed to load persisted users', error);
      return [];
    }
  }

  save(users: StoredUserRecord[]): void {
    if (!this.persist) {
      return;
    }
    const directory = dirname(this.filePath);
    mkdirSync(directory, { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(users, null, 2)}\n`, 'utf8');
    renameSync(tempPath, this.filePath);
  }

  getStorePath(): string | null {
    if (!this.persist) {
      return null;
    }
    return this.filePath;
  }
}
