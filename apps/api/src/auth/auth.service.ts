import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtTokenService } from '@myhorrorstory/auth';
import {
  legalAcceptanceSchema,
  legalAcceptanceStatusSchema,
  planTierSchema,
  signInSchema,
  signUpSchema,
  userSchema,
  type LegalAcceptanceStatus,
  type PlanTier,
  type Role
} from '@myhorrorstory/contracts';
import { randomUUID } from 'node:crypto';
import { UserStore } from './user.store.js';

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
  tier: PlanTier;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class AuthService {
  private readonly users = new Map<string, InMemoryUser>();
  private readonly userStore = new UserStore();
  private readonly tokenService = new JwtTokenService({
    issuer: process.env.JWT_ISSUER ?? 'myhorrorstory',
    audience: process.env.JWT_AUDIENCE ?? 'myhorrorstory-clients',
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret_change_me',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret_change_me',
    accessTtlSeconds: 900,
    refreshTtlSeconds: 60 * 60 * 24 * 14
  });

  constructor() {
    for (const user of this.userStore.load()) {
      this.users.set(user.email, {
        ...user
      });
    }
  }

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
      privacyVersion: parsed.privacyVersion,
      tier: 'FREE',
      createdAt: acceptedAt,
      updatedAt: acceptedAt
    };

    this.users.set(user.email, user);
    this.persistUsers();
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
    user.updatedAt = acceptedAt;
    this.persistUsers();

    return legalAcceptanceStatusSchema.parse({
      acceptedTermsAt: user.acceptedTermsAt,
      acceptedPrivacyAt: user.acceptedPrivacyAt,
      ageGateConfirmedAt: user.ageGateConfirmedAt,
      termsVersion: user.termsVersion,
      privacyVersion: user.privacyVersion
    });
  }

  listUsers(): Array<ReturnType<typeof userSchema.parse>> {
    return [...this.users.values()]
      .map((user) => this.toPublicUser(user))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  createUserByAdmin(input: {
    email: string;
    displayName: string;
    password: string;
    roles: Role[];
    tier: PlanTier;
  }): ReturnType<typeof userSchema.parse> {
    if (this.users.has(input.email)) {
      throw new UnauthorizedException('Email already registered');
    }

    const now = new Date().toISOString();
    const user: InMemoryUser = {
      id: randomUUID(),
      email: input.email,
      displayName: input.displayName,
      password: input.password,
      roles: input.roles,
      acceptedTermsAt: now,
      acceptedPrivacyAt: now,
      ageGateConfirmedAt: now,
      termsVersion: '2026-03-09',
      privacyVersion: '2026-03-09',
      tier: planTierSchema.parse(input.tier),
      createdAt: now,
      updatedAt: now
    };
    this.users.set(user.email, user);
    this.persistUsers();
    return this.toPublicUser(user);
  }

  updateUserByAdmin(
    userId: string,
    input: {
      displayName?: string;
      password?: string;
      roles?: Role[];
      tier?: PlanTier;
    }
  ): ReturnType<typeof userSchema.parse> {
    const user = [...this.users.values()].find((candidate) => candidate.id === userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (typeof input.displayName === 'string') {
      user.displayName = input.displayName;
    }
    if (typeof input.password === 'string') {
      user.password = input.password;
    }
    if (Array.isArray(input.roles) && input.roles.length > 0) {
      user.roles = input.roles;
    }
    if (input.tier) {
      user.tier = planTierSchema.parse(input.tier);
    }
    user.updatedAt = new Date().toISOString();
    this.persistUsers();
    return this.toPublicUser(user);
  }

  deleteUserByAdmin(userId: string): { deleted: true; userId: string } {
    const found = [...this.users.values()].find((candidate) => candidate.id === userId);
    if (!found) {
      throw new UnauthorizedException('User not found');
    }
    this.users.delete(found.email);
    this.persistUsers();
    return { deleted: true, userId };
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

  private toPublicUser(user: InMemoryUser): ReturnType<typeof userSchema.parse> {
    return userSchema.parse({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles,
      tier: user.tier,
      acceptedTermsAt: user.acceptedTermsAt,
      acceptedPrivacyAt: user.acceptedPrivacyAt,
      ageGateConfirmedAt: user.ageGateConfirmedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  }

  private persistUsers(): void {
    this.userStore.save(
      [...this.users.values()].map((user) => ({
        ...user
      }))
    );
  }
}
