import {
  buildLinearAuthorizationUrl,
  createLinearClientCredentialsToken,
  exchangeLinearAuthorizationCode,
  refreshLinearAccessToken,
  revokeLinearToken
} from './lib/oauth-client.mjs';
import { existsSync, readFileSync } from 'node:fs';

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, equalsIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

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

function getCommand() {
  const [, , command] = process.argv;
  return command;
}

function requireValue(value, name) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function readClientConfig() {
  const clientId = parseArg('--client-id') ?? process.env.LINEAR_OAUTH_CLIENT_ID;
  const clientSecret = parseArg('--client-secret') ?? process.env.LINEAR_OAUTH_CLIENT_SECRET;
  const redirectUri = parseArg('--redirect-uri') ?? process.env.LINEAR_OAUTH_REDIRECT_URI;
  const scope = parseArg('--scope') ?? process.env.LINEAR_OAUTH_SCOPE ?? 'read,write';
  return {
    clientId,
    clientSecret,
    redirectUri,
    scope
  };
}

async function run() {
  const command = getCommand();
  const pretty = hasFlag('--pretty');
  const state = parseArg('--state') ?? process.env.LINEAR_OAUTH_STATE;
  const actor = parseArg('--actor') ?? process.env.LINEAR_OAUTH_ACTOR;
  const config = readClientConfig();

  if (!command || command === 'help' || command === '--help') {
    console.log('Usage: node scripts/linear-bots/oauth.mjs <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  authorize-url       Print browser authorization URL');
    console.log('  exchange-code       Exchange authorization code for tokens');
    console.log('  refresh-token       Refresh access token');
    console.log('  client-credentials  Request machine-to-machine token');
    console.log('  revoke-token        Revoke access or refresh token');
    console.log('');
    console.log('Common env vars:');
    console.log('  LINEAR_OAUTH_CLIENT_ID');
    console.log('  LINEAR_OAUTH_CLIENT_SECRET');
    console.log('  LINEAR_OAUTH_REDIRECT_URI');
    console.log('  LINEAR_OAUTH_SCOPE');
    return;
  }

  if (command === 'authorize-url') {
    const url = buildLinearAuthorizationUrl({
      clientId: requireValue(config.clientId, 'client id'),
      redirectUri: requireValue(config.redirectUri, 'redirect uri'),
      scope: config.scope,
      state,
      actor
    });
    console.log(url);
    return;
  }

  if (command === 'exchange-code') {
    const code = parseArg('--code') ?? process.env.LINEAR_OAUTH_CODE;
    const response = await exchangeLinearAuthorizationCode({
      clientId: requireValue(config.clientId, 'client id'),
      clientSecret: requireValue(config.clientSecret, 'client secret'),
      redirectUri: requireValue(config.redirectUri, 'redirect uri'),
      code: requireValue(code, 'authorization code'),
      codeVerifier: parseArg('--code-verifier') ?? process.env.LINEAR_OAUTH_CODE_VERIFIER
    });
    console.log(pretty ? JSON.stringify(response, null, 2) : JSON.stringify(response));
    return;
  }

  if (command === 'refresh-token') {
    const refreshToken = parseArg('--refresh-token') ?? process.env.LINEAR_OAUTH_REFRESH_TOKEN;
    const response = await refreshLinearAccessToken({
      clientId: requireValue(config.clientId, 'client id'),
      clientSecret: requireValue(config.clientSecret, 'client secret'),
      refreshToken: requireValue(refreshToken, 'refresh token')
    });
    console.log(pretty ? JSON.stringify(response, null, 2) : JSON.stringify(response));
    return;
  }

  if (command === 'client-credentials') {
    const response = await createLinearClientCredentialsToken({
      clientId: requireValue(config.clientId, 'client id'),
      clientSecret: requireValue(config.clientSecret, 'client secret'),
      scope: config.scope
    });
    console.log(pretty ? JSON.stringify(response, null, 2) : JSON.stringify(response));
    return;
  }

  if (command === 'revoke-token') {
    const token = parseArg('--token') ?? process.env.LINEAR_OAUTH_TOKEN;
    const response = await revokeLinearToken({
      token: requireValue(token, 'token')
    });
    console.log(pretty ? JSON.stringify(response, null, 2) : JSON.stringify(response));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

run().catch((error) => {
  console.error('[linear-oauth] Failed:', error.message);
  process.exit(1);
});
