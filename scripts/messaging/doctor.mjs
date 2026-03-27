#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env, exit, platform } from 'node:process';
import { fileURLToPath } from 'node:url';
import { Socket } from 'node:net';
import { spawn } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..', '..');

function parseArg(flag) {
  const index = process.argv.findIndex((entry) => entry === flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

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

function cleanUrl(url) {
  return url.replace(/\/$/, '');
}

function inferSmsHealthUrl(smsGatewayUrl) {
  const normalized = cleanUrl(smsGatewayUrl);
  if (normalized.endsWith('/send')) {
    return `${normalized.slice(0, -5)}/health`;
  }
  return `${normalized}/health`;
}

async function probeTcpPort(host, port, timeoutMs = 2_500) {
  return await new Promise((resolveProbe) => {
    const socket = new Socket();
    let settled = false;
    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      try {
        socket.destroy();
      } catch {
        // no-op
      }
      resolveProbe(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish({ ok: true }));
    socket.once('timeout', () => finish({ ok: false, reason: 'timeout' }));
    socket.once('error', (error) => finish({ ok: false, reason: error.message }));
    socket.connect(port, host);
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

async function fetchBinary(url, options = {}) {
  const response = await fetch(url, options);
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    ok: response.ok,
    status: response.status,
    buffer
  };
}

function openFile(targetPath) {
  if (platform !== 'win32') {
    return;
  }

  spawn('cmd', ['/c', 'start', '', targetPath], {
    detached: true,
    stdio: 'ignore'
  }).unref();
}

function printStatusLine(label, detail) {
  console.log(`${label.padEnd(22)} ${detail}`);
}

async function run() {
  loadDefaultEnv();

  const apiBaseUrl = cleanUrl(
    parseArg('--api-base-url') ||
      env.PUBLIC_API_BASE_URL ||
      env.NEXT_PUBLIC_API_BASE_URL ||
      'http://127.0.0.1:8787/api/v1'
  );

  const runWahaQr = hasFlag('--waha-qr');
  const openQr = hasFlag('--open-qr');

  console.log('MyHorrorStory Messaging Doctor');
  console.log('------------------------------');

  const smtpHost = env.SMTP_HOST?.trim();
  const smtpPort = Number(env.SMTP_PORT?.trim() || '0');
  if (isConfigured(smtpHost) && Number.isFinite(smtpPort) && smtpPort > 0) {
    const smtpProbe = await probeTcpPort(smtpHost, smtpPort);
    printStatusLine('SMTP', smtpProbe.ok ? `OK (${smtpHost}:${smtpPort})` : `FAIL (${smtpProbe.reason})`);
  } else {
    printStatusLine('SMTP', 'NOT CONFIGURED');
  }

  const mailpitProbe = await fetchJson('http://127.0.0.1:8025/api/v1/info').catch(() => null);
  printStatusLine('Mailpit UI', mailpitProbe?.ok ? 'OK (http://127.0.0.1:8025)' : 'UNREACHABLE');

  const wahaUrl = env.WHATSAPP_WAHA_URL?.trim();
  const wahaApiKey = env.WHATSAPP_WAHA_API_KEY?.trim();
  let wahaNeedsQr = false;
  if (isConfigured(wahaUrl)) {
    const headers = {};
    if (isConfigured(wahaApiKey)) {
      headers['x-api-key'] = wahaApiKey;
    }
    const sessionsRes = await fetchJson(`${cleanUrl(wahaUrl)}/api/sessions`, { headers }).catch(
      () => null
    );
    if (!sessionsRes?.ok) {
      printStatusLine(
        'WhatsApp WAHA',
        `FAIL (${sessionsRes ? `HTTP ${sessionsRes.status}` : 'connection error'})`
      );
    } else {
      const sessions = Array.isArray(sessionsRes.payload) ? sessionsRes.payload : sessionsRes.payload?.value;
      if (!Array.isArray(sessions) || sessions.length === 0) {
        printStatusLine('WhatsApp WAHA', 'NO SESSION');
      } else {
        const primary = sessions[0];
        const status = String(primary?.status ?? 'UNKNOWN');
        printStatusLine('WhatsApp WAHA', `OK (${status})`);
        wahaNeedsQr = status === 'SCAN_QR_CODE';

        if (wahaNeedsQr || runWahaQr) {
          const sessionName = String(primary?.name ?? env.WHATSAPP_WAHA_SESSION ?? 'default');
          const qrRes = await fetchBinary(`${cleanUrl(wahaUrl)}/api/${sessionName}/auth/qr`, {
            headers
          }).catch(() => null);
          if (!qrRes?.ok || !qrRes.buffer?.length) {
            printStatusLine('WAHA QR', `FAIL (${qrRes ? `HTTP ${qrRes.status}` : 'connection error'})`);
          } else {
            const outputDir = resolve(repoRoot, '.runtime', 'waha');
            mkdirSync(outputDir, { recursive: true });
            const outputPath = resolve(outputDir, `${sessionName}-qr.png`);
            writeFileSync(outputPath, qrRes.buffer);
            printStatusLine('WAHA QR', `SAVED (${outputPath})`);
            if (openQr) {
              openFile(outputPath);
              printStatusLine('WAHA QR Open', 'OPENED');
            }
          }
        }
      }
    }
  } else {
    printStatusLine('WhatsApp WAHA', 'NOT CONFIGURED');
  }

  const smsGatewayUrl = env.SMS_GATEWAY_URL?.trim();
  if (isConfigured(smsGatewayUrl)) {
    const healthUrl = inferSmsHealthUrl(smsGatewayUrl);
    const healthHeaders = {};
    if (isConfigured(env.SMS_GATEWAY_API_KEY?.trim())) {
      healthHeaders['x-api-key'] = env.SMS_GATEWAY_API_KEY.trim();
    }
    if (isConfigured(env.SMS_GATEWAY_BEARER_TOKEN?.trim())) {
      healthHeaders.Authorization = `Bearer ${env.SMS_GATEWAY_BEARER_TOKEN.trim()}`;
    }
    const smsHealth = await fetchJson(healthUrl, { headers: healthHeaders }).catch(() => null);
    if (smsHealth?.ok) {
      const transport = smsHealth.payload?.transport || 'unknown';
      const ready = smsHealth.payload?.transportReady === true;
      if (ready) {
        printStatusLine('SMS Gateway', `OK (${transport})`);
      } else {
        printStatusLine('SMS Gateway', `BLOCKED (${transport}, configure transport)`);
      }
    } else {
      printStatusLine(
        'SMS Gateway',
        `UNREACHABLE (${smsHealth ? `HTTP ${smsHealth.status}` : 'connection error'})`
      );
    }
  } else {
    printStatusLine('SMS Gateway', 'NOT CONFIGURED');
  }

  const setupStatus = await fetchJson(`${apiBaseUrl}/channels/setup`).catch(() => null);
  if (setupStatus?.ok) {
    printStatusLine('Channels API', 'OK');
    const channels = setupStatus.payload?.channels;
    if (Array.isArray(channels)) {
      for (const channel of channels) {
        const configured = channel.configured ? 'configured' : 'not configured';
        const liveProvider = channel.liveProvider || 'none';
        console.log(`  - ${channel.channel}: ${configured}, provider=${liveProvider}`);
      }
    }
  } else {
    printStatusLine('Channels API', 'UNREACHABLE');
  }

  console.log('');
  console.log('Notes:');
  console.log('- WhatsApp delivery requires WAHA session status WORKING.');
  console.log('- SMS delivery requires a live SMS gateway endpoint at SMS_GATEWAY_URL.');
  console.log('- Use `corepack pnpm messaging:waha:qr` to regenerate and open the WAHA QR.');
}

run().catch((error) => {
  console.error('[messaging:doctor] failed:', error instanceof Error ? error.message : String(error));
  exit(1);
});
