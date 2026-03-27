import { Injectable } from '@nestjs/common';
import { AdminSettingsStore } from './admin-settings.store.js';

type SettingValue = string | number | boolean | Record<string, unknown> | unknown[];

export interface AdminSettingRecord {
  key: string;
  value: SettingValue;
  description: string | null;
  updatedAt: string;
}

@Injectable()
export class AdminSettingsService {
  private readonly settings = new Map<string, AdminSettingRecord>();
  private readonly settingsStore = new AdminSettingsStore();

  constructor() {
    const now = new Date().toISOString();
    const defaults: AdminSettingRecord[] = [
      {
        key: 'platform.maintenance_mode',
        value: false,
        description: 'When true, non-admin traffic should be considered maintenance mode.',
        updatedAt: now
      },
      {
        key: 'platform.onboarding_enabled',
        value: true,
        description: 'Enable onboarding funnel and signup surfaces.',
        updatedAt: now
      },
      {
        key: 'growth.email_campaigns_enabled',
        value: true,
        description: 'Master switch for lifecycle email sends.',
        updatedAt: now
      },
      {
        key: 'messaging.external_relay_enabled',
        value: true,
        description: 'Master switch for SMS/WhatsApp/Telegram/Signal relay.',
        updatedAt: now
      }
    ];
    for (const record of defaults) {
      this.settings.set(record.key, record);
    }

    for (const record of this.settingsStore.load()) {
      this.settings.set(record.key, {
        key: record.key,
        value: record.value as SettingValue,
        description: record.description,
        updatedAt: record.updatedAt
      });
    }
  }

  list(): AdminSettingRecord[] {
    return [...this.settings.values()].sort((left, right) => left.key.localeCompare(right.key));
  }

  upsert(input: { key: string; value: SettingValue; description?: string }): AdminSettingRecord {
    const now = new Date().toISOString();
    const current = this.settings.get(input.key);
    const next: AdminSettingRecord = {
      key: input.key,
      value: input.value,
      description: input.description ?? current?.description ?? null,
      updatedAt: now
    };
    this.settings.set(input.key, next);
    this.persistSettings();
    return next;
  }

  delete(key: string): { deleted: true; key: string } {
    const removed = this.settings.delete(key);
    if (!removed) {
      throw new Error('setting_not_found');
    }
    this.persistSettings();
    return { deleted: true, key };
  }

  private persistSettings(): void {
    this.settingsStore.save([...this.settings.values()]);
  }
}
