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
    expect(signUp.body.legal.acceptedTermsAt).toBeDefined();
    expect(signUp.body.legal.termsVersion).toBe('2026-03-09');

    await request(app.getHttpServer()).post('/api/v1/auth/signup').send(testUser).expect(401);

    const signIn = await request(app.getHttpServer())
      .post('/api/v1/auth/signin')
      .send({ email: testUser.email, password: testUser.password })
      .expect(201);

    expect(signIn.body.userId).toBeDefined();
    expect(signIn.body.accessToken.length).toBeGreaterThan(20);
    expect(signIn.body.refreshToken.length).toBeGreaterThan(20);
    expect(signIn.body.legal.acceptedPrivacyAt).toBeDefined();
    expect(signIn.body.legal.privacyVersion).toBe('2026-03-09');

    const legal = await request(app.getHttpServer())
      .post('/api/v1/auth/legal/accept')
      .send({
        userId: signIn.body.userId,
        acceptedTerms: true,
        acceptedPrivacy: true,
        ageGateConfirmed: true,
        termsVersion: '2026-03-09',
        privacyVersion: '2026-03-09'
      })
      .expect(201);

    expect(legal.body.acceptedTermsAt).toBeDefined();
    expect(legal.body.termsVersion).toBe('2026-03-09');
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
        source: 'landing_hero',
        firstName: 'Lead',
        marketingConsent: true,
        tags: ['launch_interest']
      })
      .expect(201);

    expect(lead.body.accepted).toBe(true);
    expect(lead.body.segment).toBe('new_lead');
    expect(lead.body.leadId).toBeDefined();
    expect(lead.body.lifecycleEmailQueued).toBe(true);

    const lifecycle = await request(app.getHttpServer())
      .post('/api/v1/growth/lifecycle-event')
      .send({
        email: 'lead@example.com',
        eventType: 'abandoned_case',
        storyId: 'static-between-stations',
        metadata: {
          playerName: 'Lead',
          sessionUrl: 'https://example.com/play'
        }
      })
      .expect(201);

    expect(lifecycle.body.accepted).toBe(true);
    expect(lifecycle.body.eventType).toBe('abandoned_case');
    expect(lifecycle.body.emailQueued).toBe(true);

    const campaigns = await request(app.getHttpServer()).get('/api/v1/growth/campaigns').expect(200);
    expect(Array.isArray(campaigns.body)).toBe(true);
    expect(campaigns.body.length).toBeGreaterThanOrEqual(5);

    const leads = await request(app.getHttpServer()).get('/api/v1/growth/leads').expect(200);
    expect(Array.isArray(leads.body)).toBe(true);
    expect(leads.body.find((entry: { email: string }) => entry.email === 'lead@example.com')).toBeDefined();
  });

  it('sets up user messaging channels and validates webhook ingress', async () => {
    const stories = await request(app.getHttpServer()).get('/api/v1/stories').expect(200);
    const storyId = stories.body[0].id as string;
    const playerId = 'integration-channel-player';

    const setupStatus = await request(app.getHttpServer()).get('/api/v1/channels/setup').expect(200);
    expect(Array.isArray(setupStatus.body.channels)).toBe(true);
    expect(setupStatus.body.channels.length).toBe(3);

    const registered = await request(app.getHttpServer())
      .post('/api/v1/channels/setup/user')
      .send({
        caseId: storyId,
        playerId,
        contacts: [
          { channel: 'SMS', address: '+15550001111', optIn: true },
          { channel: 'WHATSAPP', address: 'whatsapp:+15550002222', optIn: true },
          { channel: 'TELEGRAM', address: '987654321', optIn: true }
        ]
      })
      .expect(201);

    expect(registered.body.updated).toBe(true);
    expect(registered.body.activeRouteCount).toBe(3);

    const mappedChannels = await request(app.getHttpServer())
      .get(`/api/v1/channels/setup/user?caseId=${encodeURIComponent(storyId)}&playerId=${encodeURIComponent(playerId)}`)
      .expect(200);

    expect(mappedChannels.body.caseId).toBe(storyId);
    expect(mappedChannels.body.playerId).toBe(playerId);
    expect(Array.isArray(mappedChannels.body.contacts)).toBe(true);
    expect(mappedChannels.body.contacts.length).toBe(3);

    const testSend = await request(app.getHttpServer())
      .post('/api/v1/channels/setup/test')
      .send({
        caseId: storyId,
        playerId,
        message: 'Integration test ping from setup flow.'
      })
      .expect(201);

    expect(testSend.body.sentCount).toBe(3);
    expect(Array.isArray(testSend.body.receipts)).toBe(true);
    expect(testSend.body.receipts.length).toBe(3);

    const liveSend = await request(app.getHttpServer())
      .post('/api/v1/channels/send')
      .send({
        caseId: storyId,
        playerId,
        channels: ['SMS', 'TELEGRAM'],
        message: 'Live investigation dispatch: secure channel verification complete.'
      })
      .expect(201);

    expect(liveSend.body.sentCount).toBe(2);
    expect(Array.isArray(liveSend.body.receipts)).toBe(true);
    expect(liveSend.body.receipts.length).toBe(2);
    expect(liveSend.body.receipts[0].channel).toMatch(/SMS|TELEGRAM/);

    const twilioInbound = await request(app.getHttpServer())
      .post('/api/v1/webhooks/twilio')
      .type('form')
      .send({
        From: '+15550001111',
        To: '+15550009999',
        Body: 'I accuse the broker.',
        MessageSid: 'SM-integration-1'
      })
      .expect(200);

    expect(twilioInbound.body.accepted).toBe(true);
    expect(twilioInbound.body.channel).toBe('SMS');
    expect(twilioInbound.body.recognizedIntent).toBe('ACCUSATION');
    expect(twilioInbound.body.caseId).toBe(storyId);
    expect(twilioInbound.body.playerId).toBe(playerId);

    const telegramInbound = await request(app.getHttpServer())
      .post('/api/v1/webhooks/telegram')
      .send({
        update_id: 9001,
        message: {
          message_id: 22,
          date: 1710000000,
          text: 'Threat acknowledged, or else.',
          chat: { id: 987654321 },
          from: { id: 987654321 }
        }
      })
      .expect(200);

    expect(telegramInbound.body.accepted).toBe(true);
    expect(telegramInbound.body.channel).toBe('TELEGRAM');
    expect(telegramInbound.body.recognizedIntent).toBe('THREAT');
    expect(telegramInbound.body.caseId).toBe(storyId);
    expect(telegramInbound.body.playerId).toBe(playerId);
  });

  it('processes inbound channel messages, evaluates rules, and saves investigation boards', async () => {
    const stories = await request(app.getHttpServer()).get('/api/v1/stories').expect(200);
    const storyId = stories.body[0].id as string;
    const storyBoard = stories.body[0].investigationBoard;

    const inbound = await request(app.getHttpServer())
      .post('/api/v1/channels/inbound')
      .send({
        event: {
          caseId: storyId,
          playerId: 'integration-player',
          channel: 'SMS',
          message: 'I accuse the broker.',
          sentAt: new Date().toISOString()
        },
        runtimeFlags: {}
      })
      .expect(201);

    expect(inbound.body.accepted).toBe(true);
    expect(inbound.body.recognizedIntent).toBe('ACCUSATION');

    const evaluated = await request(app.getHttpServer())
      .post('/api/v1/story-rules/evaluate')
      .send({
        caseId: storyId,
        eventType: 'CLUE_DISCOVERED',
        eventKey: 'integration-rule-check',
        state: {
          flags: {},
          reputation: {
            trustworthiness: 0,
            aggression: 0,
            curiosity: 0,
            deception: 0,
            morality: 0
          },
          npcTrust: {},
          clues: [`${storyId}-clue-origin`],
          events: [],
          investigationProgress: 10,
          villainStage: 1,
          silenceSeconds: 0,
          elapsedSeconds: 120,
          lastIntent: null
        }
      })
      .expect(200);

    expect(evaluated.body.triggeredRuleIds).toContain(`${storyId}-rule-first-contact`);
    expect(Array.isArray(evaluated.body.actions)).toBe(true);
    expect(evaluated.body.actions.length).toBeGreaterThan(0);

    const board = await request(app.getHttpServer())
      .put('/api/v1/investigation/board')
      .send({
        caseId: storyId,
        playerId: 'integration-player',
        board: storyBoard
      })
      .expect(200);

    expect(board.body.updated).toBe(true);
    expect(board.body.revisionKey).toContain(storyId);

    const narrative = await request(app.getHttpServer())
      .post('/api/v1/narrative/events/next')
      .send({
        caseId: storyId,
        playerId: 'integration-player',
        nowAt: new Date().toISOString(),
        behavior: {
          cluesDiscovered: [`${storyId}-clue-origin`],
          suspectsAccused: ['Primary Suspect'],
          alliances: ['Trusted Witness'],
          communicationTone: 'SKEPTICAL',
          moralDecisionTrend: 5,
          responseDelaySeconds: 120,
          investigativeSkill: 70,
          curiosity: 80,
          riskTaking: 45
        },
        runtime: {
          villainStage: 2,
          investigationProgress: 64,
          reputation: {
            trustworthiness: 6,
            aggression: 4,
            curiosity: 20,
            deception: 1,
            morality: 12
          },
          npcTrust: {},
          unresolvedClues: [`${storyId}-clue-ledger`],
          flags: {}
        },
        context: {
          storyMood: 'EERIE',
          sceneType: 'SURVEILLANCE_REVIEW',
          villainPresence: 68,
          playerTensionLevel: 63,
          dangerLevel: 58,
          location: 'Relay control annex',
          timeOfNightHour: 23,
          enabledChannels: ['SMS', 'WHATSAPP', 'TELEGRAM', 'EMAIL', 'WEB_PORTAL']
        },
        safety: {
          intensityLevel: 3,
          threatTone: 'MODERATE',
          realismLevel: 'IMMERSIVE',
          allowLateNightMessaging: true,
          maxTouchesPerHour: 3
        }
      })
      .expect(200);

    expect(narrative.body.caseId).toBe(storyId);
    expect(narrative.body.event.mediaType).toBeDefined();
    expect(narrative.body.event.hiddenClues.length).toBeGreaterThan(0);
    expect(narrative.body.event.possiblePlayerResponses.length).toBeGreaterThanOrEqual(2);
    expect(narrative.body.event.storyConsequences.length).toBeGreaterThanOrEqual(2);
  });
});

