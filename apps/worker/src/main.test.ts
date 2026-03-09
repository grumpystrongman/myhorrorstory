import { describe, expect, it, vi } from 'vitest';
import type { Job } from 'bullmq';
import { EmailService, type EmailProvider } from '@myhorrorstory/email';
import { DeterministicVoiceProvider, VoiceOrchestrator } from '@myhorrorstory/voice';
import { createJobHandler, type WorkerJob } from './job-handler.js';

function makeJob(data: WorkerJob): Job<WorkerJob> {
  return {
    id: 'job-1',
    data
  } as Job<WorkerJob>;
}

function mockEmailProvider(send?: EmailProvider['send']): EmailProvider {
  return {
    id: 'test-email-provider',
    send:
      send ??
      (vi.fn(async () => ({
        providerId: 'test-email-provider',
        messageId: 'msg-1',
        acceptedAt: new Date().toISOString()
      })) as EmailProvider['send'])
  };
}

describe('worker job handler', () => {
  it('processes timed unlock jobs', async () => {
    const info = vi.fn();
    const handler = createJobHandler({
      emailService: new EmailService(mockEmailProvider()),
      voice: new VoiceOrchestrator([new DeterministicVoiceProvider('deterministic')]),
      logger: { info, error: vi.fn() }
    });

    await handler(makeJob({ type: 'timed_unlock', partyId: 'party-1', beatId: 'beat-1' }));
    expect(info).toHaveBeenCalledWith('[timed_unlock]', { partyId: 'party-1', beatId: 'beat-1' });
  });

  it('dispatches lifecycle email jobs', async () => {
    const send = vi.fn(async () => ({
      providerId: 'test-email-provider',
      messageId: 'msg-send',
      acceptedAt: new Date().toISOString()
    }));
    const provider = mockEmailProvider(send as EmailProvider['send']);

    const handler = createJobHandler({
      emailService: new EmailService(provider),
      voice: new VoiceOrchestrator([new DeterministicVoiceProvider('deterministic')]),
      logger: { info: vi.fn(), error: vi.fn() }
    });

    await handler(
      makeJob({
        type: 'lifecycle_email',
        to: 'player@example.com',
        subject: 'Resume your case',
        html: '<p>Resume</p>'
      })
    );

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('generates media manifest entries', async () => {
    const info = vi.fn();
    const handler = createJobHandler({
      emailService: new EmailService(mockEmailProvider()),
      voice: new VoiceOrchestrator([new DeterministicVoiceProvider('deterministic')]),
      logger: { info, error: vi.fn() }
    });

    await handler(
      makeJob({
        type: 'media_generation',
        assetId: 'asset-1',
        prompt: 'Eerie abandoned station'
      })
    );

    expect(info).toHaveBeenCalledWith(
      '[media_generation]',
      expect.objectContaining({
        id: 'asset-1',
        outputKey: 'assets/asset-1.png'
      })
    );
  });

  it('synthesizes voice jobs with cache key', async () => {
    const info = vi.fn();
    const handler = createJobHandler({
      emailService: new EmailService(mockEmailProvider()),
      voice: new VoiceOrchestrator([new DeterministicVoiceProvider('deterministic')]),
      logger: { info, error: vi.fn() }
    });

    await handler(
      makeJob({
        type: 'voice_generation',
        characterId: 'narrator',
        text: 'The line crackles.'
      })
    );

    expect(info).toHaveBeenCalledWith(
      '[voice_generation]',
      expect.objectContaining({
        provider: 'deterministic',
        cacheKey: expect.any(String)
      })
    );
  });

  it('builds commercial creative batch plans', async () => {
    const info = vi.fn();
    const handler = createJobHandler({
      emailService: new EmailService(mockEmailProvider()),
      voice: new VoiceOrchestrator([new DeterministicVoiceProvider('deterministic')]),
      logger: { info, error: vi.fn() }
    });

    await handler(
      makeJob({
        type: 'commercial_creative_batch',
        storyIds: ['midnight-lockbox'],
        websitePrompts: [
          {
            id: 'web-landing',
            type: 'ui_background',
            prompt: 'Premium hero scene',
            outputKey: 'assets/production/web/landing-v1.png'
          }
        ],
        storyTemplates: [
          {
            type: 'character_portrait',
            count: 2,
            promptTemplate: 'Character portrait for {story_id}.'
          }
        ]
      })
    );

    expect(info).toHaveBeenCalledWith(
      '[commercial_creative_batch]',
      expect.objectContaining({
        assetCount: 3,
        valid: true
      })
    );
  });
});
