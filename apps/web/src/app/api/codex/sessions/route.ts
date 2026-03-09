import { NextResponse, type NextRequest } from 'next/server';
import { assertCodexBridgeAuthorization, isCodexBridgeTokenRequired } from '../../../../server/codex-auth';
import { createCodexSession, listCodexSessions } from '../../../../server/codex-bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateSessionBody {
  prompt?: unknown;
}

export function GET(request: NextRequest): NextResponse {
  try {
    assertCodexBridgeAuthorization(request);
    return NextResponse.json({
      tokenRequired: isCodexBridgeTokenRequired(),
      sessions: listCodexSessions()
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
    return NextResponse.json(
      {
        error: 'Failed to list Codex sessions'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    assertCodexBridgeAuthorization(request);
    const body = (await request.json()) as CreateSessionBody;
    if (typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'prompt is required'
        },
        { status: 400 }
      );
    }

    const session = createCodexSession(body.prompt);
    return NextResponse.json(
      {
        session
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized'
        },
        { status: 401 }
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
        error: 'Failed to create Codex session'
      },
      { status: 500 }
    );
  }
}
