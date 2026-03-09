interface ApiErrorShape {
  message?: string;
  error?: string;
}

function resolveApiBaseUrl(): string {
  return (
    process.env.PUBLIC_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    'http://127.0.0.1:8787/api/v1'
  );
}

async function postJson<T>(path: string, body: unknown, fallback: () => T): Promise<T> {
  const url = `${resolveApiBaseUrl()}${path}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    const payload = (await response.json()) as T & ApiErrorShape;

    if (!response.ok) {
      throw new Error(payload.message ?? payload.error ?? `Request failed (${response.status})`);
    }

    return payload;
  } catch {
    return fallback();
  }
}

export async function captureLeadFromWeb(input: {
  email: string;
  source: string;
  firstName?: string;
  marketingConsent?: boolean;
  tags?: string[];
}): Promise<{
  accepted: boolean;
  segment: string;
  lifecycleEmailQueued: boolean;
  leadId: string;
}> {
  return postJson('/growth/lead-capture', input, () => ({
    accepted: true,
    segment: 'new_lead',
    lifecycleEmailQueued: Boolean(input.marketingConsent),
    leadId: `demo-lead-${Date.now()}`
  }));
}

export async function signupFromWeb(input: {
  email: string;
  password: string;
  displayName: string;
  marketingConsent: boolean;
  acceptedTerms: true;
  acceptedPrivacy: true;
  ageGateConfirmed: true;
  termsVersion: string;
  privacyVersion: string;
}): Promise<{
  userId: string;
  accessToken: string;
  refreshToken: string;
  legal: {
    acceptedTermsAt: string;
    acceptedPrivacyAt: string;
    ageGateConfirmedAt: string;
    termsVersion: string;
    privacyVersion: string;
  };
}> {
  const signupResult = await postJson('/auth/signup', input, () => {
    const acceptedAt = new Date().toISOString();
    return {
      userId: `demo-user-${Date.now()}`,
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token',
      legal: {
        acceptedTermsAt: acceptedAt,
        acceptedPrivacyAt: acceptedAt,
        ageGateConfirmedAt: acceptedAt,
        termsVersion: input.termsVersion,
        privacyVersion: input.privacyVersion
      }
    };
  });

  await postJson(
    '/growth/lifecycle-event',
    {
      email: input.email,
      eventType: 'welcome',
      metadata: {
        playerName: input.displayName
      }
    },
    () => ({
      accepted: true,
      eventType: 'welcome',
      campaignId: 'campaign-welcome',
      emailQueued: true
    })
  );

  return signupResult;
}
