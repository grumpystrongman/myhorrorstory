import { exec } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { URL } from 'node:url';
import { exchangeLinearAuthorizationCode, buildLinearAuthorizationUrl } from './lib/oauth-client.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    port: Number(process.env.LINEAR_OAUTH_LOCAL_PORT ?? 8788),
    host: '127.0.0.1',
    open: args.includes('--open')
  };

  const portIndex = args.findIndex((value) => value === '--port');
  if (portIndex >= 0 && args[portIndex + 1]) {
    options.port = Number(args[portIndex + 1]);
  }

  return options;
}

function htmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderPage({ title, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${htmlEscape(title)}</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0d1017;
        --panel: #1a1f2c;
        --text: #f5f1e8;
        --muted: #b6ada0;
        --accent: #bf8b30;
        --line: #31394f;
      }
      body {
        margin: 0;
        font-family: 'Segoe UI', Arial, sans-serif;
        background: radial-gradient(1200px 400px at 20% 0%, #1b2335 0%, transparent 70%), var(--bg);
        color: var(--text);
      }
      main {
        width: min(900px, 92vw);
        margin: 32px auto;
      }
      .panel {
        border: 1px solid var(--line);
        background: linear-gradient(150deg, #1a1f2c, #1f2535);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 16px;
      }
      h1 {
        margin: 0 0 8px 0;
        font-size: 1.8rem;
      }
      p {
        color: var(--muted);
      }
      label {
        display: grid;
        gap: 6px;
        margin-bottom: 12px;
        font-size: 0.9rem;
      }
      input {
        min-height: 38px;
        border-radius: 8px;
        border: 1px solid var(--line);
        background: #0f1420;
        color: var(--text);
        padding: 0 10px;
      }
      button, .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 40px;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--accent) 70%, black 30%);
        background: linear-gradient(145deg, #c6963f, #a3772d);
        color: #130f0a;
        font-weight: 700;
        text-decoration: none;
        padding: 0 16px;
      }
      code, pre {
        font-family: Consolas, 'Cascadia Mono', monospace;
      }
      pre {
        background: #101621;
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 12px;
        overflow: auto;
      }
      .muted {
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <main>
      ${body}
    </main>
  </body>
</html>`;
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    exec(`start "" "${url}"`);
    return;
  }

  if (process.platform === 'darwin') {
    exec(`open "${url}"`);
    return;
  }

  exec(`xdg-open "${url}"`);
}

function decodeState(state) {
  if (!state) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function sendHtml(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8'
  });
  response.end(body);
}

async function upsertEnvValue(filePath, key, value) {
  let content = '';
  try {
    content = await readFile(filePath, 'utf8');
  } catch {
    content = '';
  }

  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');

  const next = pattern.test(content)
    ? content.replace(pattern, line)
    : `${content}${content.endsWith('\n') || content.length === 0 ? '' : '\n'}${line}\n`;

  await writeFile(filePath, next, 'utf8');
}

async function main() {
  const options = parseArgs();
  const defaultRedirectUri =
    process.env.LINEAR_OAUTH_REDIRECT_URI?.trim() || `http://${options.host}:${options.port}/callback`;
  const defaultScope = process.env.LINEAR_OAUTH_SCOPE?.trim() || 'read,write';
  const defaultActor = process.env.LINEAR_OAUTH_ACTOR?.trim() || '';
  const envClientId = process.env.LINEAR_OAUTH_CLIENT_ID?.trim() || '';
  const clientSecret = process.env.LINEAR_OAUTH_CLIENT_SECRET?.trim() || '';
  const autoExchange = process.env.LINEAR_OAUTH_AUTO_EXCHANGE === 'true';
  const autoPersistToken = process.env.LINEAR_OAUTH_AUTO_SAVE_TOKEN !== 'false';
  const envOutputFile = process.env.LINEAR_OAUTH_ENV_OUTPUT?.trim() || '.env';

  const server = createServer(async (request, response) => {
    if (!request.url) {
      sendHtml(
        response,
        400,
        renderPage({
          title: 'Linear OAuth Connect',
          body: '<section class="panel"><h1>Invalid request</h1></section>'
        })
      );
      return;
    }

    const url = new URL(request.url, `http://${options.host}:${options.port}`);
    const pathname = url.pathname;

    if (pathname === '/') {
      const body = `
        <section class="panel">
          <h1>Connect Linear OAuth</h1>
          <p>Click authorize to open Linear consent and grant access for this workspace.</p>
          <form method="GET" action="/authorize">
            <label>
              Client ID
              <input name="client_id" value="${htmlEscape(envClientId)}" placeholder="lin_oauth_client_xxx" required />
            </label>
            <label>
              Redirect URI
              <input name="redirect_uri" value="${htmlEscape(defaultRedirectUri)}" required />
            </label>
            <label>
              Scope
              <input name="scope" value="${htmlEscape(defaultScope)}" />
            </label>
            <label>
              Actor (optional)
              <input name="actor" value="${htmlEscape(defaultActor)}" />
            </label>
            <button type="submit">Authorize with Linear</button>
          </form>
        </section>
        <section class="panel">
          <p class="muted">Server callback endpoint: <code>${htmlEscape(defaultRedirectUri)}</code></p>
          <p class="muted">Auto token exchange is ${autoExchange ? 'enabled' : 'disabled'}.</p>
        </section>
      `;
      sendHtml(
        response,
        200,
        renderPage({
          title: 'Connect Linear OAuth',
          body
        })
      );
      return;
    }

    if (pathname === '/authorize') {
      const clientId = url.searchParams.get('client_id')?.trim() || '';
      const redirectUri = url.searchParams.get('redirect_uri')?.trim() || defaultRedirectUri;
      const scope = url.searchParams.get('scope')?.trim() || defaultScope;
      const actor = url.searchParams.get('actor')?.trim() || undefined;

      if (!clientId) {
        sendHtml(
          response,
          400,
          renderPage({
            title: 'Linear OAuth Error',
            body:
              '<section class="panel"><h1>Missing client ID</h1><p>Go back and provide LINEAR_OAUTH_CLIENT_ID.</p><a class="button" href="/">Back</a></section>'
          })
        );
        return;
      }

      const state = Buffer.from(
        JSON.stringify({
          nonce: randomUUID(),
          clientId,
          redirectUri,
          scope
        }),
        'utf8'
      ).toString('base64url');

      const authUrl = buildLinearAuthorizationUrl({
        clientId,
        redirectUri,
        scope,
        state,
        actor
      });

      response.writeHead(302, {
        Location: authUrl
      });
      response.end();
      return;
    }

    if (pathname === '/callback') {
      const code = url.searchParams.get('code') ?? '';
      const error = url.searchParams.get('error') ?? '';
      const errorDescription = url.searchParams.get('error_description') ?? '';
      const stateRaw = url.searchParams.get('state') ?? '';
      const parsedState = decodeState(stateRaw);

      if (error) {
        sendHtml(
          response,
          200,
          renderPage({
            title: 'Linear OAuth Declined',
            body: `
              <section class="panel">
                <h1>Authorization not completed</h1>
                <p>Error: <code>${htmlEscape(error)}</code></p>
                <p>${htmlEscape(errorDescription || 'No additional error description.')}</p>
                <a class="button" href="/">Back</a>
              </section>
            `
          })
        );
        return;
      }

      if (!code) {
        sendHtml(
          response,
          400,
          renderPage({
            title: 'Linear OAuth Callback',
            body: `
              <section class="panel">
                <h1>Missing authorization code</h1>
                <p>No code was returned by Linear.</p>
                <a class="button" href="/">Back</a>
              </section>
            `
          })
        );
        return;
      }

      const stateClientId =
        typeof parsedState?.clientId === 'string' ? parsedState.clientId : envClientId;
      const stateRedirectUri =
        typeof parsedState?.redirectUri === 'string' ? parsedState.redirectUri : defaultRedirectUri;

      let tokenBlock = '<p class="muted">Auto token exchange disabled.</p>';
      if (autoExchange && clientSecret && stateClientId) {
        try {
          const tokenResponse = await exchangeLinearAuthorizationCode({
            clientId: stateClientId,
            clientSecret,
            redirectUri: stateRedirectUri,
            code
          });

          let persistenceNote = '';
          if (autoPersistToken && tokenResponse.access_token) {
            await upsertEnvValue(envOutputFile, 'LINEAR_ACCESS_TOKEN', tokenResponse.access_token);
            persistenceNote = `<p class="muted">Saved <code>LINEAR_ACCESS_TOKEN</code> to <code>${htmlEscape(
              envOutputFile
            )}</code>.</p>`;
          }

          tokenBlock = `
            <h2>Token Response</h2>
            <pre>${htmlEscape(JSON.stringify(tokenResponse, null, 2))}</pre>
            <p class="muted">Store <code>access_token</code> as <code>LINEAR_ACCESS_TOKEN</code>.</p>
            ${persistenceNote}
          `;
        } catch (exchangeError) {
          const message =
            exchangeError instanceof Error ? exchangeError.message : 'Unknown token exchange error.';
          tokenBlock = `<p>Token exchange failed: <code>${htmlEscape(message)}</code></p>`;
        }
      } else {
        tokenBlock = `
          <h2>Next Step</h2>
          <pre>${htmlEscape(
            `corepack pnpm linear:oauth:exchange -- --code ${code} --client-id ${stateClientId} --redirect-uri ${stateRedirectUri}`
          )}</pre>
        `;
      }

      sendHtml(
        response,
        200,
        renderPage({
          title: 'Linear OAuth Connected',
          body: `
            <section class="panel">
              <h1>Authorization granted</h1>
              <p>Code captured successfully.</p>
              <pre>${htmlEscape(code)}</pre>
              ${tokenBlock}
              <a class="button" href="/">Back</a>
            </section>
          `
        })
      );
      return;
    }

    sendHtml(
      response,
      404,
      renderPage({
        title: 'Not Found',
        body: '<section class="panel"><h1>Not Found</h1><a class="button" href="/">Back</a></section>'
      })
    );
  });

  server.listen(options.port, options.host, () => {
    const baseUrl = `http://${options.host}:${options.port}`;
    console.log(`[linear-connect] Running at ${baseUrl}`);
    console.log(`[linear-connect] Callback URI: ${defaultRedirectUri}`);
    if (options.open) {
      openBrowser(baseUrl);
      console.log('[linear-connect] Opened browser.');
    }
  });
}

main().catch((error) => {
  console.error('[linear-connect] Failed:', error);
  process.exit(1);
});
