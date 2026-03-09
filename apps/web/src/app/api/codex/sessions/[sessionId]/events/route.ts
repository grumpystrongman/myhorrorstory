import { NextResponse, type NextRequest } from 'next/server';
import { assertCodexBridgeAuthorization } from '../../../../../../server/codex-auth';
import {
  getCodexSession,
  subscribeToCodexSession,
  type CodexBridgeEvent,
  type CodexSessionSummary
} from '../../../../../../server/codex-bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

function formatSseData(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  try {
    assertCodexBridgeAuthorization(request);
    const { sessionId } = await context.params;
    const detail = getCodexSession(sessionId);
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let stopped = false;
        const send = (payload: unknown) => {
          if (stopped) {
            return;
          }
          controller.enqueue(encoder.encode(formatSseData(payload)));
        };

        send({
          type: 'snapshot',
          session: detail.session,
          events: detail.events
        });

        const unsubscribe = subscribeToCodexSession(
          sessionId,
          (event: CodexBridgeEvent, summary: CodexSessionSummary) => {
          send({
            type: 'update',
            session: summary,
            event
          });
          }
        );

        const heartbeat = setInterval(() => {
          if (stopped) {
            return;
          }
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        }, 15_000);

        const stop = () => {
          if (stopped) {
            return;
          }
          stopped = true;
          clearInterval(heartbeat);
          unsubscribe();
          controller.close();
        };

        request.signal.addEventListener('abort', stop);
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
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

    return NextResponse.json(
      {
        error: 'Failed to open session stream'
      },
      { status: 500 }
    );
  }
}
