import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module.js';

const testUser = {
  email: 'integration.player@example.com',
  password: '1234567890AB',
  displayName: 'Integration Player',
  marketingConsent: true,
  acceptedTerms: true,
  acceptedPrivacy: true,
  ageGateConfirmed: true
} as const;

describe('API integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: true
      })
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns service health', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.now).toBe('string');
  });

  it('signs up and signs in a user', async () => {
    const signUp = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send(testUser)
      .expect(201);

    expect(signUp.body.userId).toBeDefined();
    expect(signUp.body.accessToken.length).toBeGreaterThan(20);
    expect(signUp.body.refreshToken.length).toBeGreaterThan(20);

    await request(app.getHttpServer()).post('/api/v1/auth/signup').send(testUser).expect(401);

    const signIn = await request(app.getHttpServer())
      .post('/api/v1/auth/signin')
      .send({ email: testUser.email, password: testUser.password })
      .expect(201);

    expect(signIn.body.userId).toBeDefined();
    expect(signIn.body.accessToken.length).toBeGreaterThan(20);
    expect(signIn.body.refreshToken.length).toBeGreaterThan(20);
  });

  it('lists stories and returns a story by id', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/stories').expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBeGreaterThanOrEqual(10);

    const storyId = list.body[0].id;
    const single = await request(app.getHttpServer()).get(`/api/v1/stories/${storyId}`).expect(200);
    expect(single.body.id).toBe(storyId);

    await request(app.getHttpServer()).get('/api/v1/stories/non-existent-id').expect(404);
  });

  it('creates and lists party sessions', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/parties')
      .send({
        storyId: 'static-between-stations',
        mode: 'PARTY',
        hostless: false
      })
      .expect(201);

    expect(created.body.id).toBeDefined();
    expect(created.body.status).toBe('LOBBY');

    const list = await request(app.getHttpServer()).get('/api/v1/parties').expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBeGreaterThan(0);
  });

  it('creates and lists support tickets', async () => {
    const ticket = await request(app.getHttpServer())
      .post('/api/v1/support/tickets')
      .send({
        email: 'support.player@example.com',
        subject: 'Audio desync in chapter 2',
        message: 'Narration and subtitles were offset by 3 seconds.'
      })
      .expect(201);

    expect(ticket.body.id).toBeDefined();
    expect(ticket.body.status).toBe('OPEN');

    const list = await request(app.getHttpServer()).get('/api/v1/support/tickets').expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBeGreaterThan(0);
  });

  it('creates billing checkout sessions', async () => {
    const checkout = await request(app.getHttpServer())
      .post('/api/v1/billing/checkout')
      .send({
        userId: 'player-1',
        priceId: 'price_premium',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      })
      .expect(201);

    expect(checkout.body.checkoutUrl).toContain('https://example.com/success');
    expect(checkout.body.providerReference).toContain('mock_player-1_price_premium');
  });

  it('captures leads for growth orchestration', async () => {
    const lead = await request(app.getHttpServer())
      .post('/api/v1/growth/lead-capture')
      .send({
        email: 'lead@example.com',
        source: 'landing_hero'
      })
      .expect(201);

    expect(lead.body.accepted).toBe(true);
    expect(lead.body.segment).toBe('new_lead');
  });
});

