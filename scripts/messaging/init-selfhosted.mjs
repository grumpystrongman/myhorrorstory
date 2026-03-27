#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..', '..');
const secretsDir = resolve(repoRoot, '.secrets');
const secretsFile = resolve(secretsDir, 'communications.env');

function parseEnv(content) {
  const output = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!key) {
      continue;
    }
    output[key] = value;
  }
  return output;
}

function upsert(content, key, value) {
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(content)) {
    return content.replace(pattern, `${key}=${value}`);
  }
  const prefix = content.endsWith('\n') || content.length === 0 ? '' : '\n';
  return `${content}${prefix}${key}=${value}\n`;
}

function token(prefix) {
  return `${prefix}_${randomBytes(18).toString('hex')}`;
}

mkdirSync(secretsDir, { recursive: true });

const current = existsSync(secretsFile) ? readFileSync(secretsFile, 'utf8') : '';
const parsed = parseEnv(current);

const defaults = {
  // Email (self-hosted SMTP; Mailpit defaults for local testing)
  SMTP_HOST: parsed.SMTP_HOST || '127.0.0.1',
  SMTP_PORT: parsed.SMTP_PORT || '1025',
  SMTP_SECURE: parsed.SMTP_SECURE || 'false',
  SMTP_FROM_EMAIL: parsed.SMTP_FROM_EMAIL || 'MyHorrorStory <briefing@localhost>',
  SMTP_TLS_REJECT_UNAUTHORIZED: parsed.SMTP_TLS_REJECT_UNAUTHORIZED || 'false',

  // WhatsApp WAHA bridge
  WHATSAPP_WAHA_URL: parsed.WHATSAPP_WAHA_URL || 'http://127.0.0.1:3005',
  WHATSAPP_WAHA_SESSION: parsed.WHATSAPP_WAHA_SESSION || 'default',
  WHATSAPP_WAHA_API_KEY: parsed.WHATSAPP_WAHA_API_KEY || token('waha'),
  WHATSAPP_WAHA_WEBHOOK_SECRET:
    parsed.WHATSAPP_WAHA_WEBHOOK_SECRET || token('waha_webhook'),

  // Generic SMS gateway adapter
  SMS_GATEWAY_BIND: parsed.SMS_GATEWAY_BIND || '127.0.0.1',
  SMS_GATEWAY_PORT: parsed.SMS_GATEWAY_PORT || '3010',
  SMS_GATEWAY_TRANSPORT: parsed.SMS_GATEWAY_TRANSPORT || 'disabled',
  SMS_GATEWAY_URL: parsed.SMS_GATEWAY_URL || 'http://127.0.0.1:3010/send',
  SMS_GATEWAY_API_KEY: parsed.SMS_GATEWAY_API_KEY || token('sms_gateway'),
  SMS_GATEWAY_FORWARD_URL: parsed.SMS_GATEWAY_FORWARD_URL || '',
  SMS_GATEWAY_FORWARD_BEARER_TOKEN: parsed.SMS_GATEWAY_FORWARD_BEARER_TOKEN || '',
  SMS_GATEWAY_FORWARD_API_KEY: parsed.SMS_GATEWAY_FORWARD_API_KEY || '',
  MESSAGING_ENABLE_CONSOLE_FALLBACK: parsed.MESSAGING_ENABLE_CONSOLE_FALLBACK || 'false'
};

let next = current;
for (const [key, value] of Object.entries(defaults)) {
  next = upsert(next, key, value);
}

if (!next.startsWith('# MyHorrorStory local communication secrets')) {
  next = `# MyHorrorStory local communication secrets\n# This file is gitignored. Do not commit.\n\n${next}`;
}

writeFileSync(secretsFile, next, 'utf8');

console.log(`Initialized ${secretsFile}`);
console.log('Generated/updated local communication credentials (gitignored).');
console.log('Next: docker compose -f infra/docker/docker-compose.communications.yml up -d');
