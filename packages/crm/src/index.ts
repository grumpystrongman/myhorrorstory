export interface CrmContact {
  email: string;
  externalId?: string;
  traits: Record<string, string | number | boolean | null>;
}

export interface CrmProvider {
  upsertContact(contact: CrmContact): Promise<void>;
  addToSegment(email: string, segment: string): Promise<void>;
}

export class InMemoryCrmProvider implements CrmProvider {
  readonly contacts = new Map<string, CrmContact>();
  readonly segments = new Map<string, Set<string>>();

  async upsertContact(contact: CrmContact): Promise<void> {
    this.contacts.set(contact.email, contact);
  }

  async addToSegment(email: string, segment: string): Promise<void> {
    if (!this.segments.has(segment)) {
      this.segments.set(segment, new Set<string>());
    }

    this.segments.get(segment)?.add(email);
  }
}

export class CrmService {
  constructor(private readonly provider: CrmProvider) {}

  async syncLead(contact: CrmContact): Promise<void> {
    await this.provider.upsertContact(contact);
  }

  async addToSegment(email: string, segment: string): Promise<void> {
    await this.provider.addToSegment(email, segment);
  }

  async markAbandonedCase(email: string): Promise<void> {
    await this.addToSegment(email, 'abandoned_case');
  }
}
