'use client';

import { useState, type FormEvent } from 'react';

interface LeadCaptureFormProps {
  source: string;
  title?: string;
  compact?: boolean;
}

export function LeadCaptureForm({ source, title, compact = false }: LeadCaptureFormProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setStatus('idle');
    setMessage('');

    try {
      const response = await fetch('/api/marketing/lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          firstName,
          source,
          marketingConsent,
          tags: ['email_join']
        })
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const payload = (await response.json()) as {
        accepted?: boolean;
      };

      if (!payload.accepted) {
        throw new Error('Lead capture was not accepted');
      }

      setStatus('success');
      setMessage('Email joined. Launch briefings and case drops will arrive shortly.');
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Could not save signup right now. Please retry in a few minutes.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={`lead-form${compact ? ' lead-form-compact' : ''}`} onSubmit={onSubmit}>
      {title ? <h3>{title}</h3> : null}
      <div className="field-grid">
        <label htmlFor={`lead-first-name-${source}`}>
          First name
          <input
            id={`lead-first-name-${source}`}
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Mara"
          />
        </label>
        <label htmlFor={`lead-email-${source}`}>
          Email
          <input
            id={`lead-email-${source}`}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
      </div>
      <label className="checkline" htmlFor={`lead-consent-${source}`}>
        <input
          id={`lead-consent-${source}`}
          name="marketingConsent"
          type="checkbox"
          checked={marketingConsent}
          onChange={(event) => setMarketingConsent(event.target.checked)}
        />
        I want launch updates, case drops, and promotional offers.
      </label>
      <button type="submit" className="cta-primary" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Join By Email'}
      </button>
      {status !== 'idle' ? (
        <p className={`form-status ${status === 'success' ? 'form-success' : 'form-error'}`}>{message}</p>
      ) : null}
    </form>
  );
}
