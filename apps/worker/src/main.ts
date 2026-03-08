import { Worker } from 'bullmq';
import { ConsoleEmailProvider, EmailService } from '@myhorrorstory/email';
import {
  DeterministicVoiceProvider,
  ElevenLabsVoiceProvider,
  OpenAIVoiceProvider,
  PiperVoiceProvider,
  type VoiceProvider,
  VoiceOrchestrator
} from '@myhorrorstory/voice';
import { createJobHandler, type WorkerJob } from './job-handler.js';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const redisHost = redisUrl.replace('redis://', '').split(':')[0] ?? 'localhost';
const redisPort = Number(redisUrl.split(':')[2] ?? '6379');
const connection = {
  host: redisHost,
  port: redisPort
};
const emailService = new EmailService(new ConsoleEmailProvider());

const voiceProviders: VoiceProvider[] = [];
if (process.env.PIPER_ENDPOINT || process.env.PIPER_BINARY_PATH) {
  voiceProviders.push(
    new PiperVoiceProvider({
      endpoint: process.env.PIPER_ENDPOINT,
      apiKey: process.env.PIPER_API_KEY,
      binaryPath: process.env.PIPER_BINARY_PATH,
      modelDirectory: process.env.PIPER_MODEL_DIR
    })
  );
}
if (process.env.ELEVENLABS_API_KEY) {
  voiceProviders.push(
    new ElevenLabsVoiceProvider({
      apiKey: process.env.ELEVENLABS_API_KEY
    })
  );
}
if (process.env.OPENAI_API_KEY) {
  voiceProviders.push(
    new OpenAIVoiceProvider({
      apiKey: process.env.OPENAI_API_KEY
    })
  );
}
voiceProviders.push(new DeterministicVoiceProvider('deterministic'));

const voice = new VoiceOrchestrator(voiceProviders);
const handle = createJobHandler({
  emailService,
  voice,
  logger: {
    info: (message: string, payload?: unknown) => console.log(message, payload),
    error: (message: string, payload?: unknown) => console.error(message, payload)
  }
});

const worker = new Worker<WorkerJob>('myhorrorstory-jobs', handle, { connection });
worker.on('completed', (job) => {
  console.log(`[worker] completed job ${job.id}`);
});
worker.on('failed', (job, error) => {
  console.error(`[worker] failed job ${job?.id}`, error);
});

console.log('Worker started');
