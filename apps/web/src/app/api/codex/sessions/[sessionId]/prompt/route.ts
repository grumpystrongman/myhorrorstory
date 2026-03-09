import { NextResponse, type NextRequest } from 'next/server';
import { assertCodexBridgeAuthorization } from '../../../../../../server/codex-auth';
import { sendCodexGuidance } from '../../../../../../server/codex-bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

interface PromptBody {
  prompt?: unknown;
}

export async function POST(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  try {
    assertCodexBridgeAuthorization(request);
    const body = (await request.json()) as PromptBody;
    if (typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'prompt is required'
        },
        { status: 400 }
      );
    }

    const { sessionId } = await context.params;
    const session = sendCodexGuidance(sessionId, body.prompt);
    return NextResponse.json({
      session
    });
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

    if (error instanceof Error && error.message === 'session_busy') {
      return NextResponse.json(
        {
          error: 'Session is currently running'
        },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === 'empty_prompt') {
      return NextResponse.json(
        {
          error: 'prompt is required'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to send guidance'
      },
      { status: 500 }
    );
  }
}
