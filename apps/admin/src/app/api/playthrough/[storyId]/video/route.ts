import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { resolveRepoRoot } from '../../../../../lib/repo-root';

export const runtime = 'nodejs';

function playthroughVideoPath(storyId: string): string | null {
  const repoRoot = resolveRepoRoot();
  const known: Record<string, string> = {
    'static-between-stations': path.join(
      repoRoot,
      'assets',
      'production',
      'playthrough-capture',
      'final',
      'static-between-stations-readiness-walkthrough-v2.mp4'
    )
  };
  return known[storyId] ?? null;
}

function parseRange(rangeHeader: string, totalSize: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) {
    return null;
  }

  const startRaw = match[1];
  const endRaw = match[2];
  const start = startRaw ? Number.parseInt(startRaw, 10) : 0;
  const end = endRaw ? Number.parseInt(endRaw, 10) : totalSize - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || end < start) {
    return null;
  }

  return {
    start: Math.min(start, totalSize - 1),
    end: Math.min(end, totalSize - 1)
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ storyId: string }> }
): Promise<NextResponse> {
  const { storyId } = await context.params;
  const filePath = playthroughVideoPath(storyId);

  if (!filePath || !existsSync(filePath)) {
    return NextResponse.json(
      {
        error: 'Playthrough video not available for this story.'
      },
      { status: 404 }
    );
  }

  const stats = statSync(filePath);
  const totalSize = stats.size;
  const rangeHeader = request.headers.get('range');

  if (!rangeHeader) {
    const stream = createReadStream(filePath);
    const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;
    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': totalSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store'
      }
    });
  }

  const parsedRange = parseRange(rangeHeader, totalSize);
  if (!parsedRange) {
    return new NextResponse('Invalid Range header', { status: 416 });
  }

  const chunkSize = parsedRange.end - parsedRange.start + 1;
  const stream = createReadStream(filePath, { start: parsedRange.start, end: parsedRange.end });
  const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

  return new NextResponse(webStream, {
    status: 206,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': chunkSize.toString(),
      'Content-Range': `bytes ${parsedRange.start}-${parsedRange.end}/${totalSize}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store'
    }
  });
}
