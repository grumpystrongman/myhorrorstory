import type { NextRequest } from 'next/server';

export function isCodexBridgeTokenRequired(): boolean {
  return Boolean(process.env.CODEX_BRIDGE_TOKEN);
}

export function assertCodexBridgeAuthorization(request: NextRequest): void {
  const expectedToken = process.env.CODEX_BRIDGE_TOKEN;
  if (!expectedToken) {
    return;
  }

  const headerToken = request.headers.get('x-codex-bridge-token');
  const queryToken = request.nextUrl.searchParams.get('token');
  const providedToken = headerToken ?? queryToken;
  if (providedToken !== expectedToken) {
    throw new Error('unauthorized');
  }
}
