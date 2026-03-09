'use client';

import { useMemo, useState, type FormEvent } from 'react';

const CURRENT_TERMS_VERSION = '2026-03-09';
const CURRENT_PRIVACY_VERSION = '2026-03-09';

export function SignupForm(): JSX.Element {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [ageGateConfirmed, setAgeGateConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const canSubmit = useMemo(
    () => acceptedTerms && acceptedPrivacy && ageGateConfirmed && password.length >= 12,
    [acceptedPrivacy, acceptedTerms, ageGateConfirmed, password.length]
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) {
      setStatus('error');
      setMessage('Accept legal terms, confirm age gate, and provide a 12+ character password.');
      return;
    }

    setSubmitting(true);
    setStatus('idle');
    setMessage('');

    try {
      const response = await fetch('/api/marketing/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          displayName,
          marketingConsent,
          acceptedTerms: true,
          acceptedPrivacy: true,
          ageGateConfirmed: true,
          termsVersion: CURRENT_TERMS_VERSION,
          privacyVersion: CURRENT_PRIVACY_VERSION
        })
      });

      const payload = (await response.json()) as {
        userId?: string;
        legal?: {
          acceptedTermsAt?: string;
        };
        error?: string;
      };

      if (!response.ok || !payload.userId) {
        throw new Error(payload.error ?? `Request failed (${response.status})`);
      }

      setStatus('success');
      setMessage('Account created. Your legal acceptance is recorded and your first case is ready.');
      setPassword('');
    } catch {
      setStatus('error');
      setMessage('Signup failed. Verify details and retry.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="signup-form" onSubmit={onSubmit}>
      <h3>Create Investigator Account</h3>
      <div className="field-grid">
        <label htmlFor="signup-display-name">
          Display name
          <input
            id="signup-display-name"
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Mara Quinn"
            required
          />
        </label>
        <label htmlFor="signup-email">
          Email
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="detective@example.com"
            required
          />
        </label>
      </div>
      <label htmlFor="signup-password">
        Password (12+ characters)
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={12}
        />
      </label>
      <label className="checkline" htmlFor="signup-marketing-consent">
        <input
          id="signup-marketing-consent"
          type="checkbox"
          checked={marketingConsent}
          onChange={(event) => setMarketingConsent(event.target.checked)}
        />
        Send launch drops, referral offers, and case release updates.
      </label>
      <label className="checkline" htmlFor="signup-accepted-terms">
        <input
          id="signup-accepted-terms"
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
        />
        I accept the <a href="/legal/terms">Terms and Conditions</a>.
      </label>
      <label className="checkline" htmlFor="signup-accepted-privacy">
        <input
          id="signup-accepted-privacy"
          type="checkbox"
          checked={acceptedPrivacy}
          onChange={(event) => setAcceptedPrivacy(event.target.checked)}
        />
        I accept the <a href="/legal/privacy">Privacy Notice</a>.
      </label>
      <label className="checkline" htmlFor="signup-age-gate">
        <input
          id="signup-age-gate"
          type="checkbox"
          checked={ageGateConfirmed}
          onChange={(event) => setAgeGateConfirmed(event.target.checked)}
        />
        I confirm I am 18+ (or legal age in my jurisdiction).
      </label>
      <button type="submit" className="cta-primary" disabled={submitting || !canSubmit}>
        {submitting ? 'Creating Account...' : 'Create Account'}
      </button>
      {status !== 'idle' ? (
        <p className={`form-status ${status === 'success' ? 'form-success' : 'form-error'}`}>{message}</p>
      ) : null}
    </form>
  );
}
