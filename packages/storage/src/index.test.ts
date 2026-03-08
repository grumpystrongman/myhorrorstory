import { describe, expect, it } from 'vitest';
import { InMemoryStorageProvider, StorageService } from './index';

describe('storage', () => {
  it('uploads asset', async () => {
    const service = new StorageService(new InMemoryStorageProvider());
    const url = await service.uploadAsset({
      key: 'test.txt',
      contentType: 'text/plain',
      body: new TextEncoder().encode('evidence')
    });

    expect(url).toBe('memory://test.txt');
  });
});
