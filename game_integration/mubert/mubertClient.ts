import type {
  MubertCredentials,
  MubertStreamingRequestBody,
  MubertTrackRequestBody
} from './types';

interface RequestOptions {
  signal?: AbortSignal;
}

interface MubertClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

export class MubertApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly payload?: unknown
  ) {
    super(message);
    this.name = 'MubertApiError';
  }
}

/**
 * Mubert endpoint assumptions are based on public snippets at https://mubert.com/api.
 * Confirm exact payload/response structure against your account docs before shipping.
 */
export class MubertClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly credentials: MubertCredentials,
    options: MubertClientOptions = {}
  ) {
    this.baseUrl = options.baseUrl ?? 'https://music-api.mubert.com/api/v3/public';
    this.timeoutMs = options.timeoutMs ?? 20_000;
  }

  async requestTrackUrl(
    body: MubertTrackRequestBody,
    options: RequestOptions = {}
  ): Promise<string> {
    const payload = await this.requestJson('/tracks', {
      method: 'POST',
      body: JSON.stringify(body),
      signal: options.signal
    });
    const url = this.extractFirstAudioUrl(payload);
    if (!url) {
      throw new MubertApiError(
        'Track request succeeded but no audio URL was found in response.',
        undefined,
        payload
      );
    }
    return url;
  }

  async requestStreamingUrl(
    body: MubertStreamingRequestBody,
    options: RequestOptions = {}
  ): Promise<string> {
    /**
     * Public snippet shows GET for /streaming/get-link.
     * Some fetch runtimes reject GET bodies, so we encode query params first.
     * If your Mubert account expects JSON body instead, adapt this method.
     */
    const query = new URLSearchParams({
      playlist_index: body.playlist_index,
      bitrate: String(body.bitrate),
      intensity: body.intensity,
      type: body.type
    });

    const payload = await this.requestJson(`/streaming/get-link?${query.toString()}`, {
      method: 'GET',
      signal: options.signal
    });
    const url = this.extractFirstAudioUrl(payload);
    if (!url) {
      throw new MubertApiError(
        'Streaming request succeeded but no stream URL was found in response.',
        undefined,
        payload
      );
    }
    return url;
  }

  private async requestJson(
    endpoint: string,
    init: RequestInit
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: HeadersInit = {
        'content-type': 'application/json',
        'customer-id': this.credentials.customerId,
        'access-token': this.credentials.accessToken
      };
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...init,
        headers: {
          ...headers,
          ...(init.headers ?? {})
        },
        signal: init.signal ?? controller.signal
      });
      const text = await response.text();
      const parsed = this.safeJsonParse(text);
      if (!response.ok) {
        throw new MubertApiError(
          `Mubert API request failed (${response.status})`,
          response.status,
          parsed ?? text
        );
      }
      return parsed ?? text;
    } catch (error) {
      if (error instanceof MubertApiError) {
        throw error;
      }
      throw new MubertApiError(`Mubert API request failed: ${String(error)}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private safeJsonParse(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  private extractFirstAudioUrl(payload: unknown): string | null {
    const candidates = this.collectStringValues(payload);
    const url = candidates.find((value) => {
      if (!/^https?:\/\//i.test(value)) {
        return false;
      }
      return (
        value.includes('.mp3') ||
        value.includes('.wav') ||
        value.includes('.ogg') ||
        value.includes('stream') ||
        value.includes('mubert')
      );
    });
    return url ?? null;
  }

  private collectStringValues(value: unknown): string[] {
    if (typeof value === 'string') {
      return [value];
    }
    if (Array.isArray(value)) {
      return value.flatMap((entry) => this.collectStringValues(entry));
    }
    if (value && typeof value === 'object') {
      return Object.values(value as Record<string, unknown>).flatMap((entry) =>
        this.collectStringValues(entry)
      );
    }
    return [];
  }
}
