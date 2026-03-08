import jwt from 'jsonwebtoken';
import type { Role } from '@myhorrorstory/contracts';

export interface AuthClaims {
  sub: string;
  email: string;
  roles: Role[];
  tokenType: 'access' | 'refresh';
}

export interface AuthConfig {
  issuer: string;
  audience: string;
  accessSecret: string;
  refreshSecret: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
}

export class JwtTokenService {
  constructor(private readonly config: AuthConfig) {}

  issueAccessToken(claims: Omit<AuthClaims, 'tokenType'>): string {
    return jwt.sign(
      {
        ...claims,
        tokenType: 'access'
      },
      this.config.accessSecret,
      {
        expiresIn: this.config.accessTtlSeconds,
        issuer: this.config.issuer,
        audience: this.config.audience
      }
    );
  }

  issueRefreshToken(claims: Omit<AuthClaims, 'tokenType'>): string {
    return jwt.sign(
      {
        ...claims,
        tokenType: 'refresh'
      },
      this.config.refreshSecret,
      {
        expiresIn: this.config.refreshTtlSeconds,
        issuer: this.config.issuer,
        audience: this.config.audience
      }
    );
  }

  verifyAccessToken(token: string): AuthClaims {
    return jwt.verify(token, this.config.accessSecret, {
      issuer: this.config.issuer,
      audience: this.config.audience
    }) as AuthClaims;
  }

  verifyRefreshToken(token: string): AuthClaims {
    return jwt.verify(token, this.config.refreshSecret, {
      issuer: this.config.issuer,
      audience: this.config.audience
    }) as AuthClaims;
  }
}
