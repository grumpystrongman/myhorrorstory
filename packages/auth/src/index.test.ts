import { describe, expect, it } from 'vitest';
import { JwtTokenService } from './index';

describe('auth', () => {
  it('issues and validates access token', () => {
    const service = new JwtTokenService({
      issuer: 'myhorrorstory',
      audience: 'clients',
      accessSecret: 'access_secret_access_secret_access_secret',
      refreshSecret: 'refresh_secret_refresh_secret_refresh',
      accessTtlSeconds: 300,
      refreshTtlSeconds: 86400
    });

    const token = service.issueAccessToken({
      sub: 'user-1',
      email: 'detective@example.com',
      roles: ['PLAYER']
    });

    const claims = service.verifyAccessToken(token);
    expect(claims.sub).toBe('user-1');
  });
});
