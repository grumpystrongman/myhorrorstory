#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..', '..');

function loadEnvFile(relativePath) {
  const filePath = resolve(repoRoot, relativePath);
  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!key || env[key]) {
      continue;
    }

    env[key] = value;
  }
}

function loadDefaultEnv() {
  loadEnvFile('.secrets/communications.env');
  loadEnvFile('.env.local');
  loadEnvFile('.env');
}

function isConfigured(value) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (
    normalized.startsWith('replace') ||
    normalized.startsWith('your_') ||
    normalized.includes('replace') ||
    normalized.includes('changeme') ||
    normalized.includes('example') ||
    normalized.includes('placeholder')
  ) {
    return false;
  }

  return true;
}

loadDefaultEnv();

function parseArg(flag) {
  const index = process.argv.findIndex((item) => item === flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function bool(value) {
  return value === 'true';
}

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, '');
}

function printChannelStatus(channel, configured, missingEnv, webhookUrl) {
  console.log(`\n[${channel}]`);
  console.log(`configured: ${configured ? 'yes' : 'no'}`);
  console.log(`webhook:    ${webhookUrl}`);
  if (missingEnv.length > 0) {
    console.log(`missing:    ${missingEnv.join(', ')}`);
  }
}

const publicBaseUrl =
  parseArg('--public-url') ??
  env.MESSAGING_PUBLIC_BASE_URL ??
  `http://localhost:${env.REMOTE_TEST_API_PORT ?? env.PORT ?? '8787'}`;

const apiBaseUrl = `${normalizeBaseUrl(publicBaseUrl)}/api/v1`;

const hasTwilioBase = isConfigured(env.TWILIO_ACCOUNT_SID) && isConfigured(env.TWILIO_AUTH_TOKEN);
const hasSmsGateway = isConfigured(env.SMS_GATEWAY_URL);
const hasWaha = isConfigured(env.WHATSAPP_WAHA_URL);
const smsConfigured = (hasTwilioBase && isConfigured(env.TWILIO_SMS_FROM)) || hasSmsGateway;
const whatsappConfigured = (hasTwilioBase && isConfigured(env.TWILIO_WHATSAPP_FROM)) || hasWaha;
const telegramConfigured = isConfigured(env.TELEGRAM_BOT_TOKEN);
const signalConfigured = isConfigured(env.SIGNAL_GATEWAY_URL) && isConfigured(env.SIGNAL_ACCOUNT);

const smsMissing = [];
if (!hasSmsGateway && !isConfigured(env.TWILIO_ACCOUNT_SID)) {
  smsMissing.push('TWILIO_ACCOUNT_SID');
}
if (!hasSmsGateway && !isConfigured(env.TWILIO_AUTH_TOKEN)) {
  smsMissing.push('TWILIO_AUTH_TOKEN');
}
if (!hasSmsGateway && !isConfigured(env.TWILIO_SMS_FROM)) {
  smsMissing.push('TWILIO_SMS_FROM');
}
if (!isConfigured(env.SMS_GATEWAY_URL) && !hasTwilioBase) {
  smsMissing.push('SMS_GATEWAY_URL');
}

const whatsappMissing = [];
if (!hasWaha && !isConfigured(env.TWILIO_ACCOUNT_SID)) {
  whatsappMissing.push('TWILIO_ACCOUNT_SID');
}
if (!hasWaha && !isConfigured(env.TWILIO_AUTH_TOKEN)) {
  whatsappMissing.push('TWILIO_AUTH_TOKEN');
}
if (!hasWaha && !isConfigured(env.TWILIO_WHATSAPP_FROM)) {
  whatsappMissing.push('TWILIO_WHATSAPP_FROM');
}
if (!isConfigured(env.WHATSAPP_WAHA_URL) && !hasTwilioBase) {
  whatsappMissing.push('WHATSAPP_WAHA_URL');
}
if (isConfigured(env.WHATSAPP_WAHA_URL) && !isConfigured(env.WHATSAPP_WAHA_WEBHOOK_SECRET)) {
  whatsappMissing.push('WHATSAPP_WAHA_WEBHOOK_SECRET');
}

const telegramMissing = [];
if (!isConfigured(env.TELEGRAM_BOT_TOKEN)) {
  telegramMissing.push('TELEGRAM_BOT_TOKEN');
}
if (!isConfigured(env.TELEGRAM_WEBHOOK_SECRET)) {
  telegramMissing.push('TELEGRAM_WEBHOOK_SECRET');
}

const signalMissing = [];
if (!isConfigured(env.SIGNAL_GATEWAY_URL)) {
  signalMissing.push('SIGNAL_GATEWAY_URL');
}
if (!isConfigured(env.SIGNAL_ACCOUNT)) {
  signalMissing.push('SIGNAL_ACCOUNT');
}
if (!isConfigured(env.SIGNAL_WEBHOOK_SECRET)) {
  signalMissing.push('SIGNAL_WEBHOOK_SECRET');
}

console.log('MyHorrorStory Messaging Setup Helper');
console.log('------------------------------------');
console.log(`API base URL: ${apiBaseUrl}`);
console.log(`Twilio signature validation: ${bool(env.TWILIO_VALIDATE_SIGNATURES) ? 'enabled' : 'disabled'}`);

printChannelStatus('SMS', smsConfigured, smsMissing, `${apiBaseUrl}/webhooks/twilio`);
printChannelStatus(
  'WHATSAPP',
  whatsappConfigured,
  whatsappMissing,
  hasWaha ? `${apiBaseUrl}/webhooks/whatsapp/waha` : `${apiBaseUrl}/webhooks/twilio`
);
printChannelStatus('TELEGRAM', telegramConfigured, telegramMissing, `${apiBaseUrl}/webhooks/telegram`);
printChannelStatus('SIGNAL', signalConfigured, signalMissing, `${apiBaseUrl}/webhooks/signal`);

console.log('\nNext steps');
console.log('1. Configure provider dashboards with the webhook URLs shown above.');
console.log('2. Register a player contact map:');
console.log(
  `   curl -X POST "${apiBaseUrl}/channels/setup/user" -H "content-type: application/json" -d "{\\"caseId\\":\\"midnight-lockbox\\",\\"playerId\\":\\"player-1\\",\\"contacts\\":[{\\"channel\\":\\"SMS\\",\\"address\\":\\"+15550001111\\",\\"optIn\\":true},{\\"channel\\":\\"WHATSAPP\\",\\"address\\":\\"whatsapp:+15550002222\\",\\"optIn\\":true},{\\"channel\\":\\"TELEGRAM\\",\\"address\\":\\"123456789\\",\\"optIn\\":true},{\\"channel\\":\\"SIGNAL\\",\\"address\\":\\"+15550003333\\",\\"optIn\\":true}]}"` 
);
console.log('3. Send setup test messages:');
console.log(
  `   curl -X POST "${apiBaseUrl}/channels/setup/test" -H "content-type: application/json" -d "{\\"caseId\\":\\"midnight-lockbox\\",\\"playerId\\":\\"player-1\\"}"`
);
console.log('4. Confirm inbound webhook delivery in API logs and runtime responses.');
console.log('5. For one-command local onboarding, run:');
console.log(
  `   corepack pnpm messaging:connect -- --case-id static-between-stations --player-id owner-local --phone 8127810028 --public-url ${publicBaseUrl}`
);
console.log('6. For self-hosted comm stack (Mailpit + WAHA), run:');
console.log('   corepack pnpm comm:selfhosted:init');
console.log('   corepack pnpm comm:selfhosted:up');
