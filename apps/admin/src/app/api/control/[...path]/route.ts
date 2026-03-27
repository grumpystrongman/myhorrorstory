import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function resolveApiBaseUrl(): string {
  return (
    process.env.PUBLIC_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    'http://127.0.0.1:8787/api/v1'
  ).replace(/\/$/, '');
}

function buildTargetUrl(request: NextRequest, path: string[]): string {
  const apiPath = path.length > 0 ? path.join('/') : '';
  return `${resolveApiBaseUrl()}/${apiPath}${request.nextUrl.search}`;
}

async function forward(
  request: NextRequest,
  path: string[],
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
): Promise<NextResponse> {
  const targetUrl = buildTargetUrl(request, path);
  const init: RequestInit = {
    method,
    headers: {
      Accept: 'application/json'
    },
    cache: 'no-store'
  };

  if (method !== 'GET' && method !== 'DELETE') {
    const body = await request.text();
    init.body = body;
    init.headers = {
      ...init.headers,
      'Content-Type': 'application/json'
    };
  }

  try {
    const response = await fetch(targetUrl, init);
    const payload = await response.text();
    const contentType = response.headers.get('content-type') ?? 'application/json; charset=utf-8';
    return new NextResponse(payload, {
      status: response.status,
      headers: {
        'content-type': contentType
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Admin control proxy is unavailable.',
        detail: error instanceof Error ? error.message : String(error),
        targetUrl
      },
      { status: 503 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  return forward(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  return forward(request, path, 'POST');
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  return forward(request, path, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  return forward(request, path, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  return forward(request, path, 'DELETE');
}
