import { NextResponse } from 'next/server';
import { isCodexBridgeTokenRequired } from '../../../../server/codex-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  return NextResponse.json({
    tokenRequired: isCodexBridgeTokenRequired()
  });
}
