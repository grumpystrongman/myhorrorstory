import { NextResponse, type NextRequest } from 'next/server';
import { assertCodexBridgeAuthorization } from '../../../../../server/codex-auth';
import { getCodexSession } from '../../../../../server/codex-bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  try {
    assertCodexBridgeAuthorization(request);
    const { sessionId } = await context.params;
    return NextResponse.json(getCodexSession(sessionId));
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message === 'session_not_found') {
      return NextResponse.json(
        {
          error: 'Session not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch Codex session'
      },
      { status: 500 }
    );
  }
}
