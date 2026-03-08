export interface UploadRequest {
  key: string;
  contentType: string;
  body: Uint8Array;
}

export interface StorageProvider {
  upload(request: UploadRequest): Promise<string>;
}

export class InMemoryStorageProvider implements StorageProvider {
  private readonly map = new Map<string, Uint8Array>();

  async upload(request: UploadRequest): Promise<string> {
    this.map.set(request.key, request.body);
    return `memory://${request.key}`;
  }
}

export class StorageService {
  constructor(private readonly provider: StorageProvider) {}

  async uploadAsset(request: UploadRequest): Promise<string> {
    return this.provider.upload(request);
  }
}
