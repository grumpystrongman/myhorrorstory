'use client';

import { useEffect, useMemo, useState } from 'react';

type SetupChannel = 'SMS' | 'WHATSAPP' | 'TELEGRAM';

type SetupStatusChannel = {
  channel: SetupChannel | 'SIGNAL';
  configured: boolean;
  liveProvider: string | null;
  fallbackProvider: string;
  webhookUrl: string;
  missingEnv: string[];
};

type SetupStatus = {
  baseUrl: string;
  providers: string[];
  channels: SetupStatusChannel[];
  enrollmentStorePath: string | null;
};

type SetupContact = {
  channel: SetupChannel;
  address: string;
  normalizedAddress: string;
  optIn: boolean;
};

type SetupReceipt = {
  provider: string;
  channel: SetupChannel | 'SIGNAL';
  to: string;
  externalMessageId: string;
  acceptedAt: string;
};

function normalizePhone(value: string): string {
  const compact = value.replace(/[^\d+]/g, '');
  if (compact.startsWith('+')) {
    return compact;
  }

  const digits = compact.replace(/[^\d]/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return compact;
}

function statusBadge(configured: boolean): string {
  return configured ? 'Configured' : 'Missing Env';
}

export function ChannelSetupConsole(): JSX.Element {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [contacts, setContacts] = useState<SetupContact[]>([]);
  const [receipts, setReceipts] = useState<SetupReceipt[]>([]);

  const [caseId, setCaseId] = useState('static-between-stations');
  const [playerId, setPlayerId] = useState('owner-local');
  const [phone, setPhone] = useState('8127810028');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [enableSms, setEnableSms] = useState(true);
  const [enableWhatsapp, setEnableWhatsapp] = useState(true);
  const [enableTelegram, setEnableTelegram] = useState(true);

  const selectedChannels = useMemo(() => {
    const channels: SetupChannel[] = [];
    if (enableSms) {
      channels.push('SMS');
    }
    if (enableWhatsapp) {
      channels.push('WHATSAPP');
    }
    if (enableTelegram) {
      channels.push('TELEGRAM');
    }
    return channels;
  }, [enableSms, enableWhatsapp, enableTelegram]);

  async function fetchStatus(): Promise<void> {
    setLoadingStatus(true);
    try {
      const response = await fetch('/api/channels/setup', { cache: 'no-store' });
      const payload = (await response.json()) as SetupStatus & { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? `Failed to load channel status (${response.status})`);
      }
      setStatus(payload);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to load channel status');
    } finally {
      setLoadingStatus(false);
    }
  }

  async function fetchMappedChannels(nextCaseId: string, nextPlayerId: string): Promise<void> {
    const response = await fetch(
      `/api/channels/setup/user?caseId=${encodeURIComponent(nextCaseId)}&playerId=${encodeURIComponent(nextPlayerId)}`,
      { cache: 'no-store' }
    );
    const payload = (await response.json()) as { contacts?: SetupContact[]; message?: string };
    if (!response.ok) {
      throw new Error(payload.message ?? `Failed to load mapped channels (${response.status})`);
    }
    setContacts(Array.isArray(payload.contacts) ? payload.contacts : []);
  }

  useEffect(() => {
    void fetchStatus();
  }, []);

  async function onSave(): Promise<void> {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setReceipts([]);
    try {
      const normalizedPhone = normalizePhone(phone);
      const requestContacts: Array<{ channel: SetupChannel; address: string; optIn: boolean }> = [];

      if (enableSms) {
        requestContacts.push({ channel: 'SMS', address: normalizedPhone, optIn: true });
      }
      if (enableWhatsapp) {
        requestContacts.push({ channel: 'WHATSAPP', address: `whatsapp:${normalizedPhone}`, optIn: true });
      }
      if (enableTelegram) {
        if (!telegramChatId.trim()) {
          throw new Error('Telegram chat ID is required when Telegram is enabled.');
        }
        requestContacts.push({ channel: 'TELEGRAM', address: telegramChatId.trim(), optIn: true });
      }

      if (requestContacts.length === 0) {
        throw new Error('Enable at least one channel before saving.');
      }

      const response = await fetch('/api/channels/setup/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          playerId,
          contacts: requestContacts
        })
      });
      const payload = (await response.json()) as { message?: string; activeRouteCount?: number };
      if (!response.ok) {
        throw new Error(payload.message ?? `Failed to save channel mapping (${response.status})`);
      }

      await fetchMappedChannels(caseId, playerId);
      setSuccess(`Saved ${payload.activeRouteCount ?? requestContacts.length} active channel routes.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save channel mapping');
    } finally {
      setSaving(false);
    }
  }

  async function onSendTest(): Promise<void> {
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      if (selectedChannels.length === 0) {
        throw new Error('Enable at least one channel before sending a test.');
      }

      const response = await fetch('/api/channels/setup/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          playerId,
          channels: selectedChannels
        })
      });
      const payload = (await response.json()) as {
        message?: string;
        sentCount?: number;
        receipts?: SetupReceipt[];
      };
      if (!response.ok) {
        throw new Error(payload.message ?? `Failed to send setup test (${response.status})`);
      }

      setReceipts(Array.isArray(payload.receipts) ? payload.receipts : []);
      setSuccess(`Sent ${payload.sentCount ?? 0} setup test message(s).`);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : 'Failed to send setup test');
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="panel section-shell" style={{ display: 'grid', gap: 14 }}>
      <span className="surface-tag">Messaging Setup</span>
      <h2 className="section-title">SMS / WhatsApp / Telegram Onboarding</h2>
      <p className="section-copy">
        Register a player route, run live provider checks, and send real setup pings. Routes are persisted in the API
        enrollment store and used for inbound webhook routing.
      </p>

      <div className="panel" style={{ padding: 14 }}>
        <h3 style={{ marginTop: 0 }}>Provider Status</h3>
        {loadingStatus ? <p className="muted">Loading channel setup status...</p> : null}
        {status ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {status.channels.map((channel) => (
              <article
                key={channel.channel}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  background: 'rgba(9, 14, 22, 0.55)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <strong>{channel.channel}</strong>
                  <span className="muted">
                    {statusBadge(channel.configured)} · provider: {channel.liveProvider ?? channel.fallbackProvider}
                  </span>
                </div>
                <p className="muted" style={{ marginBottom: 0 }}>
                  webhook: {channel.webhookUrl}
                </p>
                {channel.missingEnv.length > 0 ? (
                  <p className="muted" style={{ marginBottom: 0 }}>
                    missing: {channel.missingEnv.join(', ')}
                  </p>
                ) : null}
              </article>
            ))}
            {status.enrollmentStorePath ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                Enrollment store: {status.enrollmentStorePath}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="panel" style={{ padding: 14, display: 'grid', gap: 10 }}>
        <h3 style={{ marginTop: 0 }}>Player Routing</h3>
        <label htmlFor="channel-case-id">Case ID</label>
        <input id="channel-case-id" value={caseId} onChange={(event) => setCaseId(event.target.value)} />
        <label htmlFor="channel-player-id">Player ID</label>
        <input id="channel-player-id" value={playerId} onChange={(event) => setPlayerId(event.target.value)} />
        <label htmlFor="channel-phone">Phone (SMS + WhatsApp)</label>
        <input id="channel-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <label htmlFor="channel-telegram-chat-id">Telegram Chat ID</label>
        <input
          id="channel-telegram-chat-id"
          value={telegramChatId}
          onChange={(event) => setTelegramChatId(event.target.value)}
          placeholder="e.g. 123456789"
        />

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={enableSms} onChange={(event) => setEnableSms(event.target.checked)} />
            SMS
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={enableWhatsapp}
              onChange={(event) => setEnableWhatsapp(event.target.checked)}
            />
            WhatsApp
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={enableTelegram}
              onChange={(event) => setEnableTelegram(event.target.checked)}
            />
            Telegram
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => void onSave()} disabled={saving}>
            {saving ? 'Saving...' : 'Save Player Channels'}
          </button>
          <button type="button" onClick={() => void onSendTest()} disabled={testing}>
            {testing ? 'Sending...' : 'Send Setup Test'}
          </button>
          <button type="button" onClick={() => void fetchMappedChannels(caseId, playerId)}>
            Refresh Mapping
          </button>
        </div>
      </div>

      {contacts.length > 0 ? (
        <div className="panel" style={{ padding: 14 }}>
          <h3 style={{ marginTop: 0 }}>Mapped Contacts</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {contacts.map((contact) => (
              <li key={`${contact.channel}:${contact.normalizedAddress}`}>
                {contact.channel} - {contact.normalizedAddress} {contact.optIn ? '(opt-in)' : '(opt-out)'}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {receipts.length > 0 ? (
        <div className="panel" style={{ padding: 14 }}>
          <h3 style={{ marginTop: 0 }}>Latest Delivery Receipts</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {receipts.map((receipt) => (
              <li key={`${receipt.channel}:${receipt.externalMessageId}`}>
                {receipt.channel} via {receipt.provider}
                {' -> '}
                {receipt.to} ({receipt.externalMessageId})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p style={{ margin: 0, color: '#ef9a9a' }}>{error}</p>
      ) : success ? (
        <p style={{ margin: 0, color: '#8ad3a3' }}>{success}</p>
      ) : null}
    </section>
  );
}
