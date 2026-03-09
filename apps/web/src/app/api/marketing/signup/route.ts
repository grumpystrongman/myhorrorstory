import { NextResponse } from 'next/server';
import { signupFromWeb } from '../../../../server/marketing-api';

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    displayName?: string;
    marketingConsent?: boolean;
    acceptedTerms?: boolean;
    acceptedPrivacy?: boolean;
    ageGateConfirmed?: boolean;
    termsVersion?: string;
    privacyVersion?: string;
  };

  if (!body.email || !body.password || !body.displayName) {
    return NextResponse.json(
      {
        error: 'displayName, email, and password are required'
      },
      { status: 400 }
    );
  }

  if (body.password.length < 12) {
    return NextResponse.json(
      {
        error: 'password must be at least 12 characters'
      },
      { status: 400 }
    );
  }

  if (!body.acceptedTerms || !body.acceptedPrivacy || !body.ageGateConfirmed) {
    return NextResponse.json(
      {
        error: 'legal acceptance and age gate confirmation are required'
      },
      { status: 400 }
    );
  }

  const result = await signupFromWeb({
    email: body.email,
    password: body.password,
    displayName: body.displayName,
    marketingConsent: Boolean(body.marketingConsent),
    acceptedTerms: true,
    acceptedPrivacy: true,
    ageGateConfirmed: true,
    termsVersion: body.termsVersion ?? '2026-03-09',
    privacyVersion: body.privacyVersion ?? '2026-03-09'
  });

  return NextResponse.json(result);
}
