#!/usr/bin/env node

import { env } from 'node:process';

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

const hasTwilioBase = Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN);
const smsConfigured = hasTwilioBase && Boolean(env.TWILIO_SMS_FROM);
const whatsappConfigured = hasTwilioBase && Boolean(env.TWILIO_WHATSAPP_FROM);
const telegramConfigured = Boolean(env.TELEGRAM_BOT_TOKEN);

const smsMissing = [];
if (!env.TWILIO_ACCOUNT_SID) {
  smsMissing.push('TWILIO_ACCOUNT_SID');
}
if (!env.TWILIO_AUTH_TOKEN) {
  smsMissing.push('TWILIO_AUTH_TOKEN');
}
if (!env.TWILIO_SMS_FROM) {
  smsMissing.push('TWILIO_SMS_FROM');
}

const whatsappMissing = [];
if (!env.TWILIO_ACCOUNT_SID) {
  whatsappMissing.push('TWILIO_ACCOUNT_SID');
}
if (!env.TWILIO_AUTH_TOKEN) {
  whatsappMissing.push('TWILIO_AUTH_TOKEN');
}
if (!env.TWILIO_WHATSAPP_FROM) {
  whatsappMissing.push('TWILIO_WHATSAPP_FROM');
}

const telegramMissing = [];
if (!env.TELEGRAM_BOT_TOKEN) {
  telegramMissing.push('TELEGRAM_BOT_TOKEN');
}
if (!env.TELEGRAM_WEBHOOK_SECRET) {
  telegramMissing.push('TELEGRAM_WEBHOOK_SECRET');
}

console.log('MyHorrorStory Messaging Setup Helper');
console.log('------------------------------------');
console.log(`API base URL: ${apiBaseUrl}`);
console.log(`Twilio signature validation: ${bool(env.TWILIO_VALIDATE_SIGNATURES) ? 'enabled' : 'disabled'}`);

printChannelStatus('SMS', smsConfigured, smsMissing, `${apiBaseUrl}/webhooks/twilio`);
printChannelStatus('WHATSAPP', whatsappConfigured, whatsappMissing, `${apiBaseUrl}/webhooks/twilio`);
printChannelStatus('TELEGRAM', telegramConfigured, telegramMissing, `${apiBaseUrl}/webhooks/telegram`);

console.log('\nNext steps');
console.log('1. Configure provider dashboards with the webhook URLs shown above.');
console.log('2. Register a player contact map:');
console.log(
  `   curl -X POST "${apiBaseUrl}/channels/setup/user" -H "content-type: application/json" -d "{\\"caseId\\":\\"midnight-lockbox\\",\\"playerId\\":\\"player-1\\",\\"contacts\\":[{\\"channel\\":\\"SMS\\",\\"address\\":\\"+15550001111\\",\\"optIn\\":true},{\\"channel\\":\\"WHATSAPP\\",\\"address\\":\\"whatsapp:+15550002222\\",\\"optIn\\":true},{\\"channel\\":\\"TELEGRAM\\",\\"address\\":\\"123456789\\",\\"optIn\\":true}]}"` 
);
console.log('3. Send setup test messages:');
console.log(
  `   curl -X POST "${apiBaseUrl}/channels/setup/test" -H "content-type: application/json" -d "{\\"caseId\\":\\"midnight-lockbox\\",\\"playerId\\":\\"player-1\\"}"`
);
console.log('4. Confirm inbound webhook delivery in API logs and runtime responses.');
