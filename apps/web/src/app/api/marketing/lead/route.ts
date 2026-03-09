import { NextResponse } from 'next/server';
import { captureLeadFromWeb } from '../../../../server/marketing-api';

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as {
    email?: string;
    source?: string;
    firstName?: string;
    marketingConsent?: boolean;
    tags?: string[];
  };

  if (!body.email || !body.source) {
    return NextResponse.json(
      {
        error: 'email and source are required'
      },
      { status: 400 }
    );
  }

  const result = await captureLeadFromWeb({
    email: body.email,
    source: body.source,
    firstName: body.firstName,
    marketingConsent: body.marketingConsent,
    tags: body.tags
  });

  return NextResponse.json(result);
}
