#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..', '..');
const rootEnvPath = resolve(repoRoot, '.env');

function parseArg(flag) {
  const index = process.argv.findIndex((item) => item === flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, '');
}

function loadEnvFile(filePath, options = {}) {
  if (!existsSync(filePath)) {
    return {};
  }

  const loaded = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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

    loaded[key] = value;

    if (!options.overrideExisting && env[key]) {
      continue;
    }

    env[key] = value;
  }

  return loaded;
}

function isConfigured(value) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return !(
    normalized.startsWith('replace') ||
    normalized.startsWith('your_') ||
    normalized.includes('replace') ||
    normalized.includes('changeme') ||
    normalized.includes('example') ||
    normalized.includes('placeholder')
  );
}

function formatE164Phone(value) {
  const digits = value.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    return digits;
  }

  const onlyDigits = digits.replace(/[^\d]/g, '');
  if (onlyDigits.length === 10) {
    return `+1${onlyDigits}`;
  }
  if (onlyDigits.length === 11 && onlyDigits.startsWith('1')) {
    return `+${onlyDigits}`;
  }

  throw new Error(`Could not normalize phone number "${value}" to E.164 format.`);
}

function maskToken(value) {
  if (!value) {
    return '<missing>';
  }
  if (value.length <= 8) {
    return `${value[0] ?? ''}***(${value.length})`;
  }
  return `${value.slice(0, 4)}...${value.slice(-4)} (${value.length})`;
}

function printSection(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {})
    }
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const reason =
      (payload && typeof payload === 'object' && (payload.message || payload.error)) ||
      `Request failed (${response.status})`;
    throw new Error(typeof reason === 'string' ? reason : JSON.stringify(reason));
  }

  return payload;
}

function upsertEnvValue(content, key, value) {
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(content)) {
    return content.replace(pattern, `${key}=${value}`);
  }

  const separator = content.endsWith('\n') ? '' : '\n';
  return `${content}${separator}${key}=${value}\n`;
}

function writeEnvUpdates(updates) {
  if (Object.keys(updates).length === 0) {
    return;
  }

  const source = existsSync(rootEnvPath) ? readFileSync(rootEnvPath, 'utf8') : '';
  let next = source;
  for (const [key, value] of Object.entries(updates)) {
    next = upsertEnvValue(next, key, value);
  }
  writeFileSync(rootEnvPath, next, 'utf8');
}

async function setTelegramWebhook(publicBaseUrl) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!isConfigured(token)) {
    return { configured: false, reason: 'TELEGRAM_BOT_TOKEN missing' };
  }

  if (!publicBaseUrl.startsWith('https://')) {
    return { configured: false, reason: 'Public URL must be HTTPS for Telegram webhooks' };
  }

  if (!isConfigured(env.TELEGRAM_WEBHOOK_SECRET)) {
    env.TELEGRAM_WEBHOOK_SECRET = `mhs_${randomBytes(16).toString('hex')}`;
  }

  const endpoint = `https://api.telegram.org/bot${token}/setWebhook`;
  const payload = {
    url: `${normalizeBaseUrl(publicBaseUrl)}/api/v1/webhooks/telegram`,
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ['message', 'edited_message', 'channel_post']
  };

  const response = await requestJson(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return {
    configured: true,
    response
  };
}

async function sendDirectTelegramTest(chatId, text) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!isConfigured(token)) {
    throw new Error('TELEGRAM_BOT_TOKEN missing');
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
  return requestJson(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: env.TELEGRAM_PARSE_MODE || 'HTML',
      disable_notification: env.TELEGRAM_DISABLE_NOTIFICATION === 'true'
    })
  });
}

async function discoverTelegramChatId() {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!isConfigured(token)) {
    return null;
  }

  const endpoint = `https://api.telegram.org/bot${token}/getUpdates?limit=20`;
  const payload = await requestJson(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  const updates = Array.isArray(payload?.result) ? payload.result : [];
  for (const update of [...updates].reverse()) {
    const candidate =
      update?.message?.chat?.id ??
      update?.edited_message?.chat?.id ??
      update?.channel_post?.chat?.id;
    if (candidate !== undefined && candidate !== null) {
      return String(candidate);
    }
  }

  return null;
}

function loadDefaultEnv() {
  loadEnvFile(resolve(repoRoot, '.env.local'));
  loadEnvFile(resolve(repoRoot, '.env'));
}

function maybeImportMyaikaEnv(importEnabled, explicitPath) {
  if (!importEnabled) {
    return {};
  }

  const candidatePaths = [
    explicitPath,
    'C:/Users/grump/OneDrive/Documents/GitHub/MyAika/apps/server/.env',
    'C:/Users/grump/MyAika/apps/server/.env'
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    const absolute = resolve(candidatePath);
    if (!existsSync(absolute)) {
      continue;
    }

    return loadEnvFile(absolute, { overrideExisting: false });
  }

  return {};
}

function ensureTelegramFromImportedEnv(imported) {
  const updates = {};
  const importedToken = imported.TELEGRAM_BOT_TOKEN;
  const importedChatId =
    imported.ASSISTANT_TASK_TELEGRAM_CHAT_ID || imported.TELEGRAM_CHAT_ID;

  if (!isConfigured(env.TELEGRAM_BOT_TOKEN) && isConfigured(importedToken)) {
    env.TELEGRAM_BOT_TOKEN = importedToken;
    updates.TELEGRAM_BOT_TOKEN = importedToken;
  }

  if (!isConfigured(env.TELEGRAM_CHAT_ID) && isConfigured(importedChatId)) {
    env.TELEGRAM_CHAT_ID = importedChatId;
    updates.TELEGRAM_CHAT_ID = importedChatId;
  }

  if (!isConfigured(env.TELEGRAM_WEBHOOK_SECRET)) {
    const generatedSecret = `mhs_${randomBytes(16).toString('hex')}`;
    env.TELEGRAM_WEBHOOK_SECRET = generatedSecret;
    updates.TELEGRAM_WEBHOOK_SECRET = generatedSecret;
  }

  return updates;
}

async function main() {
  loadDefaultEnv();

  const importMyaika = !hasFlag('--no-import-myaika');
  const importedEnv = maybeImportMyaikaEnv(importMyaika, parseArg('--myaika-env-path'));
  const importedUpdates = ensureTelegramFromImportedEnv(importedEnv);

  const apiBaseUrl =
    parseArg('--api-base-url') ||
    env.PUBLIC_API_BASE_URL ||
    env.NEXT_PUBLIC_API_BASE_URL ||
    'http://127.0.0.1:8787/api/v1';
  const normalizedApiBaseUrl = normalizeBaseUrl(apiBaseUrl);

  const publicBaseUrl =
    parseArg('--public-url') ||
    env.MESSAGING_PUBLIC_BASE_URL ||
    normalizedApiBaseUrl.replace(/\/api\/v1$/, '');
  const normalizedPublicBaseUrl = normalizeBaseUrl(publicBaseUrl);

  const caseId = parseArg('--case-id') || 'static-between-stations';
  const playerId = parseArg('--player-id') || 'owner-local';
  const rawPhone = parseArg('--phone') || env.TWILIO_SMS_TO || env.TWILIO_WHATSAPP_TO || '8127810028';
  const phone = formatE164Phone(rawPhone);
  let telegramChatId =
    parseArg('--telegram-chat-id') ||
    env.TELEGRAM_CHAT_ID ||
    env.ASSISTANT_TASK_TELEGRAM_CHAT_ID;

  if (!isConfigured(telegramChatId) && isConfigured(env.TELEGRAM_BOT_TOKEN)) {
    telegramChatId = await discoverTelegramChatId();
    if (isConfigured(telegramChatId)) {
      env.TELEGRAM_CHAT_ID = telegramChatId;
    }
  }

  const requestedChannelsRaw = parseArg('--channels') || 'SMS,WHATSAPP,TELEGRAM';
  const requestedChannels = requestedChannelsRaw
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter((item) => item === 'SMS' || item === 'WHATSAPP' || item === 'TELEGRAM');

  if (requestedChannels.length === 0) {
    throw new Error('No valid channels requested. Use --channels SMS,WHATSAPP,TELEGRAM');
  }

  const twilioReady =
    isConfigured(env.TWILIO_ACCOUNT_SID) &&
    isConfigured(env.TWILIO_AUTH_TOKEN) &&
    isConfigured(env.TWILIO_SMS_FROM) &&
    isConfigured(env.TWILIO_WHATSAPP_FROM);
  const telegramReady = isConfigured(env.TELEGRAM_BOT_TOKEN) && isConfigured(telegramChatId);

  printSection('MyHorrorStory Messaging Connect');
  console.log(`API base URL:         ${normalizedApiBaseUrl}`);
  console.log(`Public base URL:      ${normalizedPublicBaseUrl}`);
  console.log(`Case / Player:        ${caseId} / ${playerId}`);
  console.log(`Target phone:         ${phone}`);
  console.log(`Requested channels:   ${requestedChannels.join(', ')}`);
  console.log(`Twilio configured:    ${twilioReady ? 'yes' : 'no'}`);
  console.log(`Telegram configured:  ${telegramReady ? 'yes' : 'no'}`);
  console.log(`Telegram bot token:   ${maskToken(env.TELEGRAM_BOT_TOKEN)}`);
  console.log(`Telegram chat id:     ${telegramChatId ? telegramChatId : '<missing>'}`);

  const contacts = [];
  const skipped = [];

  for (const channel of requestedChannels) {
    if (channel === 'SMS') {
      if (!twilioReady) {
        skipped.push('SMS (Twilio env not configured)');
        continue;
      }
      contacts.push({ channel, address: phone, optIn: true });
      continue;
    }

    if (channel === 'WHATSAPP') {
      if (!twilioReady) {
        skipped.push('WHATSAPP (Twilio env not configured)');
        continue;
      }
      contacts.push({ channel, address: `whatsapp:${phone}`, optIn: true });
      continue;
    }

    if (channel === 'TELEGRAM') {
      if (!telegramReady) {
        skipped.push('TELEGRAM (bot token/chat id not configured)');
        continue;
      }
      contacts.push({ channel, address: String(telegramChatId), optIn: true });
    }
  }

  if (skipped.length > 0) {
    printSection('Skipped Channels');
    for (const line of skipped) {
      console.log(`- ${line}`);
    }
  }

  if (contacts.length === 0) {
    throw new Error('No channels are ready for setup. Configure Twilio and/or Telegram first.');
  }

  if (hasFlag('--write-env') && Object.keys(importedUpdates).length > 0) {
    writeEnvUpdates(importedUpdates);
    printSection('Environment Updated');
    console.log(`Wrote imported values to ${rootEnvPath}`);
    for (const key of Object.keys(importedUpdates)) {
      console.log(`- ${key}=<redacted>`);
    }
  }

  if (!hasFlag('--skip-telegram-webhook') && contacts.some((item) => item.channel === 'TELEGRAM')) {
    try {
      const webhookResult = await setTelegramWebhook(normalizedPublicBaseUrl);
      printSection('Telegram Webhook');
      if (!webhookResult.configured) {
        console.log(`Skipped: ${webhookResult.reason}`);
      } else {
        console.log('Webhook configured successfully.');
      }
    } catch (error) {
      printSection('Telegram Webhook');
      console.log(`Failed to configure webhook: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const setupBody = {
    caseId,
    playerId,
    contacts
  };

  printSection('Upsert Channel Mapping');
  const mapping = await requestJson(`${normalizedApiBaseUrl}/channels/setup/user`, {
    method: 'POST',
    body: JSON.stringify(setupBody)
  });
  console.log(JSON.stringify(mapping, null, 2));

  const message =
    parseArg('--test-message') ||
    `MyHorrorStory setup validation for ${caseId}. Reply to this thread to confirm inbound routing.`;
  printSection('Send Setup Test');
  const testResult = await requestJson(`${normalizedApiBaseUrl}/channels/setup/test`, {
    method: 'POST',
    body: JSON.stringify({
      caseId,
      playerId,
      channels: contacts.map((item) => item.channel),
      message
    })
  });
  console.log(JSON.stringify(testResult, null, 2));

  const telegramConsoleFallback = Array.isArray(testResult.receipts)
    ? testResult.receipts.find(
        (receipt) => receipt.channel === 'TELEGRAM' && receipt.provider === 'console'
      )
    : null;

  if (telegramConsoleFallback && contacts.some((item) => item.channel === 'TELEGRAM')) {
    printSection('Telegram Direct Check');
    try {
      const direct = await sendDirectTelegramTest(
        String(telegramChatId),
        `${message}\n\n[direct-check:${new Date().toISOString()}]`
      );
      console.log('Direct Telegram send succeeded.');
      if (direct?.result?.message_id) {
        console.log(`message_id: ${direct.result.message_id}`);
      }
      console.log(
        'API still used console fallback. Restart API after writing TELEGRAM_BOT_TOKEN to .env to use provider routing.'
      );
    } catch (error) {
      console.log(`Direct Telegram send failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  printSection('Done');
  console.log(`Mapped contacts: ${contacts.length}`);
  console.log(`Test receipts:   ${Array.isArray(testResult.receipts) ? testResult.receipts.length : 0}`);
}

main().catch((error) => {
  console.error('[messaging:connect] failed:', error instanceof Error ? error.message : String(error));
  exit(1);
});
