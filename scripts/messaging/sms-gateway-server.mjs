#!/usr/bin/env node

import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..', '..');

function loadEnvFile(relativePath) {
  const absolutePath = resolve(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    return;
  }

  for (const line of readFileSync(absolutePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
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
  return !(
    normalized.startsWith('replace') ||
    normalized.startsWith('your_') ||
    normalized.includes('replace') ||
    normalized.includes('changeme') ||
    normalized.includes('example') ||
    normalized.includes('placeholder')
  );
}

function jsonResponse(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
}

function normalizeTransportName(raw) {
  const normalized = (raw || '').trim().toLowerCase();
  if (normalized === 'twilio') {
    return 'twilio';
  }
  if (normalized === 'webhook') {
    return 'webhook';
  }
  return 'disabled';
}

async function sendViaTwilio(payload) {
  const accountSid = env.TWILIO_ACCOUNT_SID?.trim() || '';
  const authToken = env.TWILIO_AUTH_TOKEN?.trim() || '';
  const from = env.TWILIO_SMS_FROM?.trim() || '';
  if (!isConfigured(accountSid) || !isConfigured(authToken) || !isConfigured(from)) {
    throw new Error('twilio_not_configured');
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const form = new URLSearchParams();
  form.set('To', payload.to);
  form.set('From', from);
  form.set('Body', payload.text);
  for (const mediaUrl of payload.mediaUrls || []) {
    form.append('MediaUrl', mediaUrl);
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form.toString()
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`twilio_http_${response.status}:${body}`);
  }

  const data = await response.json();
  return {
    messageId: data.sid || `twilio-${Date.now()}`,
    acceptedAt: new Date().toISOString(),
    provider: 'twilio'
  };
}

async function sendViaWebhook(payload) {
  const target = env.SMS_GATEWAY_FORWARD_URL?.trim();
  if (!isConfigured(target)) {
    throw new Error('sms_gateway_forward_url_not_configured');
  }

  const headers = {
    'content-type': 'application/json'
  };
  const bearer = env.SMS_GATEWAY_FORWARD_BEARER_TOKEN?.trim();
  const apiKey = env.SMS_GATEWAY_FORWARD_API_KEY?.trim();
  if (isConfigured(bearer)) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  if (isConfigured(apiKey)) {
    headers['x-api-key'] = apiKey;
  }

  const response = await fetch(target, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`webhook_http_${response.status}:${body}`);
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  return {
    messageId: data.messageId || data.id || `webhook-${Date.now()}`,
    acceptedAt: data.acceptedAt || new Date().toISOString(),
    provider: 'webhook'
  };
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('invalid_json');
  }
}

loadDefaultEnv();

const bindHost = env.SMS_GATEWAY_BIND?.trim() || '127.0.0.1';
const bindPort = Number(env.SMS_GATEWAY_PORT?.trim() || '3010');
const transport = normalizeTransportName(env.SMS_GATEWAY_TRANSPORT);
const requiredApiKey = env.SMS_GATEWAY_API_KEY?.trim() || '';

const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url || '/', `http://${bindHost}:${bindPort}`).pathname;
    if (request.method === 'GET' && path === '/health') {
      const transportReady =
        (transport === 'twilio' &&
          isConfigured(env.TWILIO_ACCOUNT_SID) &&
          isConfigured(env.TWILIO_AUTH_TOKEN) &&
          isConfigured(env.TWILIO_SMS_FROM)) ||
        (transport === 'webhook' && isConfigured(env.SMS_GATEWAY_FORWARD_URL));
      jsonResponse(response, 200, {
        ok: true,
        service: 'myhorrorstory-sms-gateway',
        transport,
        transportReady
      });
      return;
    }

    if (request.method === 'POST' && path === '/send') {
      if (isConfigured(requiredApiKey)) {
        const provided = request.headers['x-api-key'];
        if (provided !== requiredApiKey) {
          jsonResponse(response, 401, {
            ok: false,
            error: 'invalid_api_key'
          });
          return;
        }
      }

      const payload = await readJsonBody(request);
      if (!payload?.to || !payload?.text) {
        jsonResponse(response, 400, {
          ok: false,
          error: 'to_and_text_are_required'
        });
        return;
      }

      if (transport === 'disabled') {
        jsonResponse(response, 503, {
          ok: false,
          error: 'sms_transport_disabled',
          hint: 'Set SMS_GATEWAY_TRANSPORT=twilio or webhook in .secrets/communications.env'
        });
        return;
      }

      let result;
      if (transport === 'twilio') {
        result = await sendViaTwilio(payload);
      } else {
        result = await sendViaWebhook(payload);
      }

      jsonResponse(response, 202, {
        ok: true,
        ...result
      });
      return;
    }

    jsonResponse(response, 404, {
      ok: false,
      error: 'not_found'
    });
  } catch (error) {
    jsonResponse(response, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'internal_error'
    });
  }
});

server.listen(bindPort, bindHost, () => {
  console.log(
    `[sms-gateway] listening on http://${bindHost}:${bindPort} (transport=${transport})`
  );
});
