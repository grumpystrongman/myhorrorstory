import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtTokenService } from '@myhorrorstory/auth';
import {
  legalAcceptanceSchema,
  legalAcceptanceStatusSchema,
  signInSchema,
  signUpSchema,
  type LegalAcceptanceStatus,
  type Role
} from '@myhorrorstory/contracts';
import { randomUUID } from 'node:crypto';

interface InMemoryUser {
  id: string;
  email: string;
  displayName: string;
  password: string;
  roles: Role[];
  acceptedTermsAt: string;
  acceptedPrivacyAt: string;
  ageGateConfirmedAt: string;
  termsVersion: string;
  privacyVersion: string;
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

  signUp(input: unknown): {
    userId: string;
    accessToken: string;
    refreshToken: string;
    legal: LegalAcceptanceStatus;
  } {
    const parsed = signUpSchema.parse(input);

    if (this.users.has(parsed.email)) {
      throw new UnauthorizedException('Email already registered');
    }
    const acceptedAt = new Date().toISOString();

    const user: InMemoryUser = {
      id: randomUUID(),
      email: parsed.email,
      displayName: parsed.displayName,
      password: parsed.password,
      roles: ['PLAYER'],
      acceptedTermsAt: acceptedAt,
      acceptedPrivacyAt: acceptedAt,
      ageGateConfirmedAt: acceptedAt,
      termsVersion: parsed.termsVersion,
      privacyVersion: parsed.privacyVersion
    };

    this.users.set(user.email, user);
    return this.issueTokenPair(user);
  }

  signIn(input: unknown): {
    userId: string;
    accessToken: string;
    refreshToken: string;
    legal: LegalAcceptanceStatus;
  } {
    const parsed = signInSchema.parse(input);
    const user = this.users.get(parsed.email);

    if (!user || user.password !== parsed.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokenPair(user);
  }

  acceptLegal(input: unknown): LegalAcceptanceStatus {
    const parsed = legalAcceptanceSchema.parse(input);
    const user = [...this.users.values()].find((candidate) => candidate.id === parsed.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const acceptedAt = new Date().toISOString();
    user.acceptedTermsAt = acceptedAt;
    user.acceptedPrivacyAt = acceptedAt;
    user.ageGateConfirmedAt = acceptedAt;
    user.termsVersion = parsed.termsVersion;
    user.privacyVersion = parsed.privacyVersion;

    return legalAcceptanceStatusSchema.parse({
      acceptedTermsAt: user.acceptedTermsAt,
      acceptedPrivacyAt: user.acceptedPrivacyAt,
      ageGateConfirmedAt: user.ageGateConfirmedAt,
      termsVersion: user.termsVersion,
      privacyVersion: user.privacyVersion
    });
  }

  private issueTokenPair(user: InMemoryUser): {
    userId: string;
    accessToken: string;
    refreshToken: string;
    legal: LegalAcceptanceStatus;
  } {
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
      }),
      legal: legalAcceptanceStatusSchema.parse({
        acceptedTermsAt: user.acceptedTermsAt,
        acceptedPrivacyAt: user.acceptedPrivacyAt,
        ageGateConfirmedAt: user.ageGateConfirmedAt,
        termsVersion: user.termsVersion,
        privacyVersion: user.privacyVersion
      })
    };
  }
}
