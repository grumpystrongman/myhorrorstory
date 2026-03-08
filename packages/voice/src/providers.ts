import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import type {
  ProviderVoiceRequest,
  ProviderVoiceResult,
  VoiceFormat,
  VoiceProvider,
  VoiceProviderName
} from './types.js';
import { clamp } from './utils.js';

interface ResponseLike {
  ok: boolean;
  status: number;
  statusText: string;
  headers: {
    get(name: string): string | null;
  };
  arrayBuffer(): Promise<ArrayBuffer>;
  json(): Promise<unknown>;
}

export type HttpFetcher = (
  input: string,
  init: {
    method: 'POST';
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  }
) => Promise<ResponseLike>;

function getDefaultFetcher(): HttpFetcher {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('No global fetch available. Provide a fetcher implementation.');
  }

  return globalThis.fetch as unknown as HttpFetcher;
}

async function parseAudioResponse(response: ResponseLike): Promise<Uint8Array> {
  if (!response.ok) {
    throw new Error(`Voice provider request failed: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as { audioBase64?: string };
    if (!payload.audioBase64) {
      throw new Error('Expected audioBase64 in JSON response.');
    }

    return new Uint8Array(Buffer.from(payload.audioBase64, 'base64'));
  }

  return new Uint8Array(await response.arrayBuffer());
}

export class DeterministicVoiceProvider implements VoiceProvider {
  readonly id: VoiceProviderName;

  constructor(providerName: VoiceProviderName = 'deterministic') {
    this.id = providerName;
  }

  async synthesize(request: ProviderVoiceRequest): Promise<ProviderVoiceResult> {
    const payload = JSON.stringify({
      cacheKey: request.cacheKey,
      profileId: request.profile.id,
      characterId: request.profile.characterId,
      provider: this.id,
      voiceId: request.providerPreference.voiceId,
      emotion: request.emotion,
      expression: request.expression,
      text: request.text
    });

    return {
      bytes: new TextEncoder().encode(payload),
      provider: this.id,
      voiceId: request.providerPreference.voiceId,
      format: request.format
    };
  }
}

export interface PiperCliSynthesisRequest {
  binaryPath: string;
  modelPath: string;
  outputFile: string;
  speakerId?: number;
  text: string;
  format: VoiceFormat;
  expression: ProviderVoiceRequest['expression'];
}

export function buildPiperCliArgs(request: PiperCliSynthesisRequest): string[] {
  const lengthScale = clamp(1 / request.expression.rate, 0.65, 1.55);
  const noiseScale = clamp(0.35 + request.expression.style, 0.1, 1.6);
  const noiseW = clamp(0.3 + (1 - request.expression.stability), 0.1, 1.3);

  const args = [
    '--model',
    request.modelPath,
    '--output_file',
    request.outputFile,
    '--length_scale',
    lengthScale.toFixed(3),
    '--noise_scale',
    noiseScale.toFixed(3),
    '--noise_w',
    noiseW.toFixed(3)
  ];

  if (typeof request.speakerId === 'number') {
    args.push('--speaker', String(request.speakerId));
  }

  return args;
}

export async function runPiperCliSynthesis(request: PiperCliSynthesisRequest): Promise<Uint8Array> {
  if (request.format !== 'wav') {
    throw new Error('Piper CLI synthesis currently supports wav output only.');
  }

  const args = buildPiperCliArgs(request);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(request.binaryPath, args, {
      stdio: ['pipe', 'ignore', 'pipe']
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Piper CLI exited with code ${code ?? -1}: ${stderr}`));
    });

    child.stdin.write(`${request.text}\n`);
    child.stdin.end();
  });

  return new Uint8Array(await readFile(request.outputFile));
}

export type PiperCommandRunner = (request: PiperCliSynthesisRequest) => Promise<Uint8Array>;

export interface PiperVoiceProviderOptions {
  endpoint?: string;
  apiKey?: string;
  timeoutMs?: number;
  fetcher?: HttpFetcher;
  binaryPath?: string;
  modelDirectory?: string;
  commandRunner?: PiperCommandRunner;
}

export class PiperVoiceProvider implements VoiceProvider {
  readonly id: VoiceProviderName = 'piper';

  private readonly fetcher?: HttpFetcher;

  private readonly timeoutMs: number;

  private readonly commandRunner: PiperCommandRunner;

  constructor(private readonly options: PiperVoiceProviderOptions) {
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetcher = options.endpoint ? (options.fetcher ?? getDefaultFetcher()) : undefined;
    this.commandRunner = options.commandRunner ?? runPiperCliSynthesis;
  }

  async synthesize(request: ProviderVoiceRequest): Promise<ProviderVoiceResult> {
    if (this.options.endpoint && this.fetcher) {
      return this.synthesizeViaEndpoint(request);
    }

    if (this.options.binaryPath) {
      return this.synthesizeViaCli(request);
    }

    throw new Error('PiperVoiceProvider requires either endpoint or binaryPath configuration.');
  }

  private async synthesizeViaEndpoint(request: ProviderVoiceRequest): Promise<ProviderVoiceResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetcher!(this.options.endpoint!, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.options.apiKey ? { authorization: `Bearer ${this.options.apiKey}` } : {})
        },
        body: JSON.stringify({
          text: request.text,
          model: request.providerPreference.model,
          voice_id: request.providerPreference.voiceId,
          speaker_id: request.providerPreference.speaker,
          format: request.format,
          rate: request.expression.rate,
          pitch: request.expression.pitch,
          stability: request.expression.stability,
          style: request.expression.style,
          emotion: request.emotion,
          story_id: request.profile.storyId,
          character_id: request.profile.characterId
        }),
        signal: controller.signal
      });

      const bytes = await parseAudioResponse(response);
      return {
        bytes,
        provider: this.id,
        voiceId: request.providerPreference.voiceId,
        format: request.format,
        metadata: {
          transport: 'http',
          model: request.providerPreference.model ?? 'default'
        }
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async synthesizeViaCli(request: ProviderVoiceRequest): Promise<ProviderVoiceResult> {
    if (request.format !== 'wav') {
      throw new Error('Piper CLI only supports wav output.');
    }

    const configuredModel = request.providerPreference.model;
    if (!configuredModel) {
      throw new Error('Piper CLI synthesis requires providerPreference.model to be set to a model path.');
    }
    const modelPath =
      this.options.modelDirectory && !isAbsolute(configuredModel)
        ? join(
            this.options.modelDirectory,
            configuredModel.endsWith('.onnx') ? configuredModel : `${configuredModel}.onnx`
          )
        : configuredModel;

    const outputFile = join(tmpdir(), `myhorrorstory-piper-${randomUUID()}.wav`);

    try {
      const bytes = await this.commandRunner({
        binaryPath: this.options.binaryPath!,
        modelPath,
        outputFile,
        speakerId: request.providerPreference.speaker,
        text: request.text,
        format: request.format,
        expression: request.expression
      });

      return {
        bytes,
        provider: this.id,
        voiceId: request.providerPreference.voiceId,
        format: request.format,
        metadata: {
          transport: 'cli',
          model: modelPath
        }
      };
    } finally {
      await rm(outputFile, { force: true });
    }
  }
}

export interface ElevenLabsVoiceProviderOptions {
  apiKey?: string;
  endpoint?: string;
  timeoutMs?: number;
  fetcher?: HttpFetcher;
}

export class ElevenLabsVoiceProvider implements VoiceProvider {
  readonly id: VoiceProviderName = 'elevenlabs';

  private readonly fetcher: HttpFetcher;

  private readonly endpoint: string;

  private readonly timeoutMs: number;

  constructor(private readonly options: ElevenLabsVoiceProviderOptions) {
    this.endpoint = options.endpoint ?? 'https://api.elevenlabs.io/v1/text-to-speech';
    this.fetcher = options.fetcher ?? getDefaultFetcher();
    this.timeoutMs = options.timeoutMs ?? 20_000;
  }

  async synthesize(request: ProviderVoiceRequest): Promise<ProviderVoiceResult> {
    if (!this.options.apiKey) {
      throw new Error('ElevenLabsVoiceProvider requires apiKey configuration.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const voiceId = request.providerPreference.voiceId;
      const outputFormat = request.format === 'wav' ? 'pcm_44100' : 'mp3_44100_128';
      const response = await this.fetcher(`${this.endpoint}/${encodeURIComponent(voiceId)}?output_format=${outputFormat}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'xi-api-key': this.options.apiKey
        },
        body: JSON.stringify({
          text: request.text,
          model_id: request.providerPreference.model ?? 'eleven_multilingual_v2',
          voice_settings: {
            stability: request.expression.stability,
            style: request.expression.style,
            speed: request.expression.rate
          }
        }),
        signal: controller.signal
      });

      const bytes = await parseAudioResponse(response);
      return {
        bytes,
        provider: this.id,
        voiceId,
        format: request.format
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export interface OpenAIVoiceProviderOptions {
  apiKey?: string;
  endpoint?: string;
  timeoutMs?: number;
  fetcher?: HttpFetcher;
}

export class OpenAIVoiceProvider implements VoiceProvider {
  readonly id: VoiceProviderName = 'openai';

  private readonly fetcher: HttpFetcher;

  private readonly endpoint: string;

  private readonly timeoutMs: number;

  constructor(private readonly options: OpenAIVoiceProviderOptions) {
    this.endpoint = options.endpoint ?? 'https://api.openai.com/v1/audio/speech';
    this.fetcher = options.fetcher ?? getDefaultFetcher();
    this.timeoutMs = options.timeoutMs ?? 20_000;
  }

  async synthesize(request: ProviderVoiceRequest): Promise<ProviderVoiceResult> {
    if (!this.options.apiKey) {
      throw new Error('OpenAIVoiceProvider requires apiKey configuration.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const responseFormat = request.format === 'ogg' ? 'opus' : request.format;
      const response = await this.fetcher(this.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.options.apiKey}`
        },
        body: JSON.stringify({
          model: request.providerPreference.model ?? 'gpt-4o-mini-tts',
          voice: request.providerPreference.voiceId,
          input: request.text,
          response_format: responseFormat,
          speed: request.expression.rate
        }),
        signal: controller.signal
      });

      const bytes = await parseAudioResponse(response);
      return {
        bytes,
        provider: this.id,
        voiceId: request.providerPreference.voiceId,
        format: request.format
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export interface PollySynthesisInput {
  text: string;
  voiceId: string;
  model?: string;
  format: VoiceFormat;
  locale: string;
  rate: number;
  pitch: number;
}

export type PollySynthesizer = (input: PollySynthesisInput) => Promise<Uint8Array>;

const defaultPollySynthesizer: PollySynthesizer = async () => {
  throw new Error(
    'PollyVoiceProvider is configured without a synthesizer implementation. Inject an AWS SDK adapter via PollySynthesizer.'
  );
};

export class PollyVoiceProvider implements VoiceProvider {
  readonly id: VoiceProviderName = 'polly';

  constructor(private readonly synthesizeFn: PollySynthesizer = defaultPollySynthesizer) {}

  async synthesize(request: ProviderVoiceRequest): Promise<ProviderVoiceResult> {
    const bytes = await this.synthesizeFn({
      text: request.text,
      voiceId: request.providerPreference.voiceId,
      model: request.providerPreference.model,
      format: request.format,
      locale: request.profile.locale,
      rate: request.expression.rate,
      pitch: request.expression.pitch
    });

    return {
      bytes,
      provider: this.id,
      voiceId: request.providerPreference.voiceId,
      format: request.format
    };
  }
}
