const LINEAR_OAUTH_AUTHORIZE_URL = 'https://linear.app/oauth/authorize';
const LINEAR_OAUTH_TOKEN_URL = 'https://api.linear.app/oauth/token';
const LINEAR_OAUTH_REVOKE_URL = 'https://api.linear.app/oauth/revoke';

function formBody(parameters) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    body.set(key, value);
  }
  return body;
}

function parseScope(scope) {
  return scope
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(' ');
}

async function requestToken({
  grantType,
  clientId,
  clientSecret,
  code,
  redirectUri,
  codeVerifier,
  refreshToken,
  scope
}) {
  const body = formBody({
    grant_type: grantType,
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    refresh_token: refreshToken,
    scope: scope ? parseScope(scope) : undefined
  });

  const response = await fetch(LINEAR_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Linear OAuth token request failed (${response.status}): ${text}`);
  }

  return response.json();
}

export function buildLinearAuthorizationUrl({
  clientId,
  redirectUri,
  scope = 'read,write',
  state,
  actor
}) {
  if (!clientId) {
    throw new Error('clientId is required');
  }
  if (!redirectUri) {
    throw new Error('redirectUri is required');
  }

  const query = formBody({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: parseScope(scope),
    state,
    actor
  });

  return `${LINEAR_OAUTH_AUTHORIZE_URL}?${query.toString()}`;
}

export async function exchangeLinearAuthorizationCode(input) {
  return requestToken({
    grantType: 'authorization_code',
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    code: input.code,
    redirectUri: input.redirectUri,
    codeVerifier: input.codeVerifier
  });
}

export async function refreshLinearAccessToken(input) {
  return requestToken({
    grantType: 'refresh_token',
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    refreshToken: input.refreshToken
  });
}

export async function createLinearClientCredentialsToken(input) {
  return requestToken({
    grantType: 'client_credentials',
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    scope: input.scope ?? 'read,write'
  });
}

export async function revokeLinearToken({ token }) {
  const body = formBody({
    token
  });

  const response = await fetch(LINEAR_OAUTH_REVOKE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Linear OAuth revoke request failed (${response.status}): ${text}`);
  }

  return {
    revoked: true
  };
}
