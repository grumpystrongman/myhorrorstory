import type { Job } from 'bullmq';
import type { EmailService } from '@myhorrorstory/email';
import { createManifestEntry } from '@myhorrorstory/media-pipeline';
import type { StoryEventType, VoiceEmotion, VoiceOrchestrator } from '@myhorrorstory/voice';

export interface TimedUnlockJob {
  type: 'timed_unlock';
  partyId: string;
  beatId: string;
}

export interface LifecycleEmailJob {
  type: 'lifecycle_email';
  to: string;
  subject: string;
  html: string;
}

export interface MediaGenerationJob {
  type: 'media_generation';
  assetId: string;
  prompt: string;
}

export interface VoiceGenerationJob {
  type: 'voice_generation';
  storyId?: string;
  characterId: string;
  text: string;
  emotion?: VoiceEmotion;
  eventType?: StoryEventType;
  tension?: number;
  urgency?: number;
}

export type WorkerJob = TimedUnlockJob | LifecycleEmailJob | MediaGenerationJob | VoiceGenerationJob;

export interface WorkerLogger {
  info(message: string, payload?: unknown): void;
  error(message: string, payload?: unknown): void;
}

export function createJobHandler(deps: {
  emailService: EmailService;
  voice: VoiceOrchestrator;
  logger: WorkerLogger;
}): (job: Job<WorkerJob>) => Promise<void> {
  return async function handle(job: Job<WorkerJob>): Promise<void> {
    switch (job.data.type) {
      case 'timed_unlock':
        deps.logger.info('[timed_unlock]', {
          partyId: job.data.partyId,
          beatId: job.data.beatId
        });
        return;
      case 'lifecycle_email':
        await deps.emailService.sendLifecycleEmail({
          to: job.data.to,
          subject: job.data.subject,
          html: job.data.html
        });
        return;
      case 'media_generation': {
        const entry = createManifestEntry({
          id: job.data.assetId,
          type: 'scene_art',
          prompt: job.data.prompt,
          provider: 'openai',
          outputKey: `assets/${job.data.assetId}.png`
        });
        deps.logger.info('[media_generation]', entry);
        return;
      }
      case 'voice_generation': {
        const clip = await deps.voice.synthesize({
          storyId: job.data.storyId,
          characterId: job.data.characterId,
          text: job.data.text,
          format: 'wav',
          emotion: job.data.emotion,
          style: job.data.emotion ? undefined : 'ominous',
          context: {
            storyId: job.data.storyId,
            eventType: job.data.eventType,
            tension: job.data.tension,
            urgency: job.data.urgency
          }
        });
        deps.logger.info('[voice_generation]', {
          provider: clip.provider,
          voiceId: clip.voiceId,
          emotion: clip.emotion,
          cacheKey: clip.cacheKey
        });
        return;
      }
      default:
        return;
    }
  };
}
