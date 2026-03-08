import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtTokenService } from '@myhorrorstory/auth';
import { signInSchema, signUpSchema, type Role } from '@myhorrorstory/contracts';
import { randomUUID } from 'node:crypto';

interface InMemoryUser {
  id: string;
  email: string;
  displayName: string;
  password: string;
  roles: Role[];
}

@Injectable()
export class AuthService {
  private readonly users = new Map<string, InMemoryUser>();
  private readonly tokenService = new JwtTokenService({
    issuer: process.env.JWT_ISSUER ?? 'myhorrorstory',
    audience: process.env.JWT_AUDIENCE ?? 'myhorrorstory-clients',
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret_change_me',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret_change_me',
    accessTtlSeconds: 900,
    refreshTtlSeconds: 60 * 60 * 24 * 14
  });

  signUp(input: unknown): { userId: string; accessToken: string; refreshToken: string } {
    const parsed = signUpSchema.parse(input);

    if (this.users.has(parsed.email)) {
      throw new UnauthorizedException('Email already registered');
    }

    const user: InMemoryUser = {
      id: randomUUID(),
      email: parsed.email,
      displayName: parsed.displayName,
      password: parsed.password,
      roles: ['PLAYER']
    };

    this.users.set(user.email, user);
    return this.issueTokenPair(user);
  }

  signIn(input: unknown): { userId: string; accessToken: string; refreshToken: string } {
    const parsed = signInSchema.parse(input);
    const user = this.users.get(parsed.email);

    if (!user || user.password !== parsed.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokenPair(user);
  }

  private issueTokenPair(user: InMemoryUser): { userId: string; accessToken: string; refreshToken: string } {
    return {
      userId: user.id,
      accessToken: this.tokenService.issueAccessToken({
        sub: user.id,
        email: user.email,
        roles: user.roles
      }),
      refreshToken: this.tokenService.issueRefreshToken({
        sub: user.id,
        email: user.email,
        roles: user.roles
      })
    };
  }
}
