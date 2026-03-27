'use client';

import { useEffect, useMemo, useState } from 'react';

type Role =
  | 'PLAYER'
  | 'HOST'
  | 'MODERATOR'
  | 'CONTENT_EDITOR'
  | 'SUPPORT_AGENT'
  | 'MARKETING_MANAGER'
  | 'ANALYST'
  | 'ADMIN'
  | 'SUPER_ADMIN';
type PlanTier = 'FREE' | 'TRIAL' | 'STANDARD' | 'PREMIUM' | 'LIFETIME';
type LifecycleEventType =
  | 'welcome'
  | 'abandoned_signup'
  | 'abandoned_case'
  | 'win_back'
  | 'upsell'
  | 'referral_invite'
  | 'launch_announcement';
type MessagingChannel = 'SMS' | 'WHATSAPP' | 'TELEGRAM' | 'SIGNAL';

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  roles: Role[];
  tier: PlanTier;
  createdAt: string;
  updatedAt: string;
}

interface AdminSettingRecord {
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
}

interface GrowthCampaignSummary {
  id: string;
  label: string;
  triggerEvent: LifecycleEventType;
  segment: string;
  sendDelayMinutes: number;
}

interface BroadcastReceipt {
  provider: string;
  channel: MessagingChannel;
  to: string;
  externalMessageId: string;
  acceptedAt: string;
}

const ALL_ROLES: Role[] = [
  'PLAYER',
  'HOST',
  'MODERATOR',
  'CONTENT_EDITOR',
  'SUPPORT_AGENT',
  'MARKETING_MANAGER',
  'ANALYST',
  'ADMIN',
  'SUPER_ADMIN'
];
const PLAN_TIERS: PlanTier[] = ['FREE', 'TRIAL', 'STANDARD', 'PREMIUM', 'LIFETIME'];
const EVENT_TYPES: LifecycleEventType[] = [
  'welcome',
  'abandoned_signup',
  'abandoned_case',
  'win_back',
  'upsell',
  'referral_invite',
  'launch_announcement'
];
const CHANNELS: MessagingChannel[] = ['SMS', 'WHATSAPP', 'TELEGRAM', 'SIGNAL'];

function toJsonDisplay(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parseSettingValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    if (trimmed === 'true') {
      return true;
    }
    if (trimmed === 'false') {
      return false;
    }
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber)) {
      return asNumber;
    }
    return trimmed;
  }
}

function parseRoles(raw: string): Role[] {
  const tokens = raw
    .split(',')
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);
  const roles = tokens.filter((token): token is Role => ALL_ROLES.includes(token as Role));
  return roles.length > 0 ? roles : ['PLAYER'];
}

export function AdminControlCenter(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<AdminSettingRecord[]>([]);
  const [campaigns, setCampaigns] = useState<GrowthCampaignSummary[]>([]);
  const [broadcastReceipts, setBroadcastReceipts] = useState<BroadcastReceipt[]>([]);

  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    password: '',
    roles: 'PLAYER',
    tier: 'FREE' as PlanTier
  });
  const [newSetting, setNewSetting] = useState({ key: '', value: '"value"', description: '' });
  const [newCampaign, setNewCampaign] = useState({
    label: '',
    triggerEvent: 'launch_announcement' as LifecycleEventType,
    segment: 'all_marketing_subscribers',
    sendDelayMinutes: 0
  });
  const [emailBlast, setEmailBlast] = useState({
    eventType: 'launch_announcement' as LifecycleEventType,
    emails: '',
    storyId: 'static-between-stations',
    metadata: '{"source":"admin-ui"}'
  });
  const [customEmailBlast, setCustomEmailBlast] = useState({
    campaignLabel: 'Jeff Barnes Premium Horror Launch',
    subject: 'Your Casefile Arrives Tonight: Static Between Stations',
    html: `<p>Jeff, tonight we open <strong>Static Between Stations</strong> for first-wave investigators.</p><p>You will receive live transmissions, evidence drops, and antagonist contact across your configured channels.</p><p><a href="http://127.0.0.1:3200/play?storyId=static-between-stations">Enter your case room</a></p>`,
    text:
      'Jeff, tonight we open Static Between Stations for first-wave investigators. Enter your case room at http://127.0.0.1:3200/play?storyId=static-between-stations',
    emails: '',
    tags: 'launch,premium,story',
    metadata: '{"source":"admin-ui","segment":"first-wave"}'
  });
  const [broadcast, setBroadcast] = useState({
    caseId: 'static-between-stations',
    playerId: 'owner-local',
    message: 'Control broadcast from admin console.',
    mediaUrls: '',
    channels: {
      SMS: true,
      WHATSAPP: true,
      TELEGRAM: true,
      SIGNAL: true
    }
  });

  const [userDrafts, setUserDrafts] = useState<
    Record<string, { displayName: string; roles: string; tier: PlanTier; password: string }>
  >({});
  const [settingDrafts, setSettingDrafts] = useState<Record<string, { value: string; description: string }>>({});
  const [campaignDrafts, setCampaignDrafts] = useState<
    Record<string, { label: string; triggerEvent: LifecycleEventType; segment: string; sendDelayMinutes: number }>
  >({});

  async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`/api/control/${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
        ...(init?.method && init.method !== 'GET' ? { 'Content-Type': 'application/json' } : {})
      },
      cache: 'no-store'
    });
    const payload = (await response.json().catch(() => null)) as T & { message?: string };
    if (!response.ok) {
      throw new Error(payload?.message ?? `Request failed (${response.status})`);
    }
    return payload;
  }

  async function refreshAll(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const [usersResult, settingsResult, campaignsResult] = await Promise.all([
        apiRequest<AdminUser[]>('admin/users'),
        apiRequest<AdminSettingRecord[]>('admin/settings'),
        apiRequest<GrowthCampaignSummary[]>('admin/campaigns')
      ]);
      setUsers(usersResult);
      setSettings(settingsResult);
      setCampaigns(campaignsResult);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  useEffect(() => {
    const next: Record<string, { displayName: string; roles: string; tier: PlanTier; password: string }> = {};
    for (const user of users) {
      next[user.id] = {
        displayName: user.displayName,
        roles: user.roles.join(','),
        tier: user.tier,
        password: ''
      };
    }
    setUserDrafts(next);
  }, [users]);

  useEffect(() => {
    const next: Record<string, { value: string; description: string }> = {};
    for (const setting of settings) {
      next[setting.key] = {
        value: toJsonDisplay(setting.value),
        description: setting.description ?? ''
      };
    }
    setSettingDrafts(next);
  }, [settings]);

  useEffect(() => {
    const next: Record<
      string,
      { label: string; triggerEvent: LifecycleEventType; segment: string; sendDelayMinutes: number }
    > = {};
    for (const campaign of campaigns) {
      next[campaign.id] = {
        label: campaign.label,
        triggerEvent: campaign.triggerEvent,
        segment: campaign.segment,
        sendDelayMinutes: campaign.sendDelayMinutes
      };
    }
    setCampaignDrafts(next);
  }, [campaigns]);

  const selectedBroadcastChannels = useMemo(
    () => CHANNELS.filter((channel) => broadcast.channels[channel]),
    [broadcast.channels]
  );

  async function createUser(): Promise<void> {
    setError(null);
    setSuccess(null);
    try {
      await apiRequest('admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: newUser.email,
          displayName: newUser.displayName,
          password: newUser.password,
          roles: parseRoles(newUser.roles),
          tier: newUser.tier
        })
      });
      setSuccess('User created.');
      setNewUser({ email: '', displayName: '', password: '', roles: 'PLAYER', tier: 'FREE' });
      await refreshAll();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create user');
    }
  }

  async function updateUser(userId: string): Promise<void> {
    setError(null);
    setSuccess(null);
    const draft = userDrafts[userId];
    if (!draft) {
      return;
    }
    try {
      await apiRequest(`admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: draft.displayName,
          roles: parseRoles(draft.roles),
          tier: draft.tier,
          ...(draft.password.trim() ? { password: draft.password } : {})
        })
      });
      setSuccess('User updated.');
      await refreshAll();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update user');
    }
  }

  async function deleteUser(userId: string): Promise<void> {
    setError(null);
    setSuccess(null);
    try {
      await apiRequest(`admin/users/${userId}`, { method: 'DELETE' });
      setSuccess('User deleted.');
      await refreshAll();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete user');
    }
  }

  async function createSetting(): Promise<void> {
    setError(null);
    setSuccess(null);
    try {
      await apiRequest(`admin/settings/${encodeURIComponent(newSetting.key)}`, {
        method: 'PUT',
        body: JSON.stringify({
          value: parseSettingValue(newSetting.value),
          description: newSetting.description
        })
      });
      setSuccess('Setting saved.');
      setNewSetting({ key: '', value: '"value"', description: '' });
      await refreshAll();
    } catch (settingError) {
      setError(settingError instanceof Error ? settingError.message : 'Failed to save setting');
    }
  }

  async function updateSetting(key: string): Promise<void> {
    setError(null);
    setSuccess(null);
    const draft = settingDrafts[key];
    if (!draft) {
      return;
    }
    try {
      await apiRequest(`admin/settings/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({
          value: parseSettingValue(draft.value),
          description: draft.description
        })
      });
      setSuccess('Setting updated.');
      await refreshAll();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update setting');
    }
  }

  async function deleteSetting(key: string): Promise<void> {
    setError(null);
    setSuccess(null);
    try {
      await apiRequest(`admin/settings/${encodeURIComponent(key)}`, { method: 'DELETE' });
      setSuccess('Setting deleted.');
      await refreshAll();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete setting');
    }
  }

  async function createCampaign(): Promise<void> {
    setError(null);
    setSuccess(null);
    try {
      await apiRequest('admin/campaigns', {
        method: 'POST',
        body: JSON.stringify(newCampaign)
      });
      setSuccess('Campaign created.');
      setNewCampaign({
        label: '',
        triggerEvent: 'launch_announcement',
        segment: 'all_marketing_subscribers',
        sendDelayMinutes: 0
      });
      await refreshAll();
    } catch (campaignError) {
      setError(campaignError instanceof Error ? campaignError.message : 'Failed to create campaign');
    }
  }

  async function updateCampaign(campaignId: string): Promise<void> {
    setError(null);
    setSuccess(null);
    const draft = campaignDrafts[campaignId];
    if (!draft) {
      return;
    }
    try {
      await apiRequest(`admin/campaigns/${campaignId}`, {
        method: 'PATCH',
        body: JSON.stringify(draft)
      });
      setSuccess('Campaign updated.');
      await refreshAll();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update campaign');
    }
  }

  async function deleteCampaign(campaignId: string): Promise<void> {
    setError(null);
    setSuccess(null);
    try {
      await apiRequest(`admin/campaigns/${campaignId}`, { method: 'DELETE' });
      setSuccess('Campaign deleted.');
      await refreshAll();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete campaign');
    }
  }

  async function sendEmailCampaign(): Promise<void> {
    setError(null);
    setSuccess(null);
    try {
      const emails = emailBlast.emails
        .split(/[,\n]/)
        .map((value) => value.trim())
        .filter(Boolean);
      const metadata = parseSettingValue(emailBlast.metadata);
      const response = await apiRequest<{
        accepted: boolean;
        attempted: number;
        sent: number;
        failed: Array<{ email: string; reason: string }>;
      }>('admin/campaigns/send-email', {
        method: 'POST',
        body: JSON.stringify({
          eventType: emailBlast.eventType,
          emails,
          storyId: emailBlast.storyId,
          metadata: typeof metadata === 'object' && metadata ? metadata : {}
        })
      });
      setSuccess(`Email campaign sent ${response.sent}/${response.attempted}.`);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to send email campaign');
    }
  }

  async function sendBroadcast(): Promise<void> {
    setError(null);
    setSuccess(null);
    try {
      const mediaUrls = broadcast.mediaUrls
        .split(/[,\n]/)
        .map((value) => value.trim())
        .filter(Boolean);
      const response = await apiRequest<{ sentCount: number; receipts: BroadcastReceipt[] }>(
        'admin/broadcasts/channels',
        {
          method: 'POST',
          body: JSON.stringify({
            caseId: broadcast.caseId,
            playerId: broadcast.playerId,
            channels: selectedBroadcastChannels,
            message: broadcast.message,
            ...(mediaUrls.length > 0 ? { mediaUrls } : {})
          })
        }
      );
      setBroadcastReceipts(response.receipts);
      setSuccess(`Broadcast sent to ${response.sentCount} channel route(s).`);
    } catch (broadcastError) {
      setError(broadcastError instanceof Error ? broadcastError.message : 'Failed to send broadcast');
    }
  }

  async function sendCustomEmailCampaign(): Promise<void> {
    setError(null);
    setSuccess(null);
    try {
      const emails = customEmailBlast.emails
        .split(/[,\n]/)
        .map((value) => value.trim())
        .filter(Boolean);
      const metadata = parseSettingValue(customEmailBlast.metadata);
      const tags = customEmailBlast.tags
        .split(/[,\n]/)
        .map((value) => value.trim())
        .filter(Boolean);
      const response = await apiRequest<{
        attempted: number;
        sent: number;
        failed: Array<{ email: string; reason: string }>;
      }>('admin/campaigns/send-custom-email', {
        method: 'POST',
        body: JSON.stringify({
          campaignLabel: customEmailBlast.campaignLabel,
          subject: customEmailBlast.subject,
          html: customEmailBlast.html,
          text: customEmailBlast.text,
          emails,
          tags,
          metadata: typeof metadata === 'object' && metadata ? metadata : {}
        })
      });
      setSuccess(`Custom campaign sent ${response.sent}/${response.attempted}.`);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to send custom email campaign');
    }
  }

  return (
    <section className="admin-grid-single">
      <article className="panel">
        <h2>Control CRUD</h2>
        <p className="muted">Users, settings, campaigns, and channel broadcasts from one console.</p>
        <div className="quick-links">
          <button type="button" onClick={() => void refreshAll()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <a href="http://127.0.0.1:3200/dashboard/channels" target="_blank" rel="noreferrer">
            Open Player Channel Setup
          </a>
        </div>
        {error ? <p className="error-line">{error}</p> : null}
        {success ? <p className="success-line">{success}</p> : null}
      </article>

      <article className="panel">
        <h2>Users</h2>
        <div className="crud-create-row">
          <input
            value={newUser.email}
            onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
            placeholder="email"
          />
          <input
            value={newUser.displayName}
            onChange={(event) => setNewUser((current) => ({ ...current, displayName: event.target.value }))}
            placeholder="display name"
          />
          <input
            value={newUser.password}
            onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
            placeholder="password (12+)"
            type="password"
          />
          <input
            value={newUser.roles}
            onChange={(event) => setNewUser((current) => ({ ...current, roles: event.target.value }))}
            placeholder="roles csv"
          />
          <select
            value={newUser.tier}
            onChange={(event) => setNewUser((current) => ({ ...current, tier: event.target.value as PlanTier }))}
          >
            {PLAN_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void createUser()}>
            Add User
          </button>
        </div>
        <div className="crud-table">
          {users.map((user) => (
            <div key={user.id} className="crud-row">
              <div>
                <strong>{user.email}</strong>
                <p className="muted" style={{ margin: '4px 0 0' }}>
                  {new Date(user.updatedAt).toLocaleString()}
                </p>
              </div>
              <input
                value={userDrafts[user.id]?.displayName ?? user.displayName}
                onChange={(event) =>
                  setUserDrafts((current) => ({
                    ...current,
                    [user.id]: { ...(current[user.id] ?? { displayName: '', roles: '', tier: 'FREE', password: '' }), displayName: event.target.value }
                  }))
                }
                placeholder="display name"
              />
              <input
                value={userDrafts[user.id]?.roles ?? user.roles.join(',')}
                onChange={(event) =>
                  setUserDrafts((current) => ({
                    ...current,
                    [user.id]: { ...(current[user.id] ?? { displayName: '', roles: '', tier: 'FREE', password: '' }), roles: event.target.value }
                  }))
                }
                placeholder="roles csv"
              />
              <select
                value={userDrafts[user.id]?.tier ?? user.tier}
                onChange={(event) =>
                  setUserDrafts((current) => ({
                    ...current,
                    [user.id]: {
                      ...(current[user.id] ?? { displayName: '', roles: '', tier: 'FREE', password: '' }),
                      tier: event.target.value as PlanTier
                    }
                  }))
                }
              >
                {PLAN_TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
              <input
                value={userDrafts[user.id]?.password ?? ''}
                onChange={(event) =>
                  setUserDrafts((current) => ({
                    ...current,
                    [user.id]: {
                      ...(current[user.id] ?? { displayName: '', roles: '', tier: 'FREE', password: '' }),
                      password: event.target.value
                    }
                  }))
                }
                placeholder="new password (optional)"
                type="password"
              />
              <div className="row-actions">
                <button type="button" onClick={() => void updateUser(user.id)}>
                  Save
                </button>
                <button type="button" className="danger" onClick={() => void deleteUser(user.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2>Settings</h2>
        <div className="crud-create-row">
          <input
            value={newSetting.key}
            onChange={(event) => setNewSetting((current) => ({ ...current, key: event.target.value }))}
            placeholder="setting key"
          />
          <input
            value={newSetting.value}
            onChange={(event) => setNewSetting((current) => ({ ...current, value: event.target.value }))}
            placeholder='value (JSON, "text", true, 30)'
          />
          <input
            value={newSetting.description}
            onChange={(event) => setNewSetting((current) => ({ ...current, description: event.target.value }))}
            placeholder="description"
          />
          <button type="button" onClick={() => void createSetting()}>
            Save Setting
          </button>
        </div>
        <div className="crud-table">
          {settings.map((setting) => (
            <div key={setting.key} className="crud-row">
              <div>
                <strong>{setting.key}</strong>
                <p className="muted" style={{ margin: '4px 0 0' }}>
                  {new Date(setting.updatedAt).toLocaleString()}
                </p>
              </div>
              <input
                value={settingDrafts[setting.key]?.value ?? toJsonDisplay(setting.value)}
                onChange={(event) =>
                  setSettingDrafts((current) => ({
                    ...current,
                    [setting.key]: {
                      ...(current[setting.key] ?? { value: '', description: '' }),
                      value: event.target.value
                    }
                  }))
                }
                placeholder="value"
              />
              <input
                value={settingDrafts[setting.key]?.description ?? setting.description ?? ''}
                onChange={(event) =>
                  setSettingDrafts((current) => ({
                    ...current,
                    [setting.key]: {
                      ...(current[setting.key] ?? { value: '', description: '' }),
                      description: event.target.value
                    }
                  }))
                }
                placeholder="description"
              />
              <div className="row-actions">
                <button type="button" onClick={() => void updateSetting(setting.key)}>
                  Save
                </button>
                <button type="button" className="danger" onClick={() => void deleteSetting(setting.key)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2>Email Campaigns</h2>
        <div className="crud-create-row">
          <input
            value={newCampaign.label}
            onChange={(event) => setNewCampaign((current) => ({ ...current, label: event.target.value }))}
            placeholder="campaign label"
          />
          <select
            value={newCampaign.triggerEvent}
            onChange={(event) =>
              setNewCampaign((current) => ({ ...current, triggerEvent: event.target.value as LifecycleEventType }))
            }
          >
            {EVENT_TYPES.map((eventType) => (
              <option key={eventType} value={eventType}>
                {eventType}
              </option>
            ))}
          </select>
          <input
            value={newCampaign.segment}
            onChange={(event) => setNewCampaign((current) => ({ ...current, segment: event.target.value }))}
            placeholder="segment"
          />
          <input
            type="number"
            value={newCampaign.sendDelayMinutes}
            onChange={(event) =>
              setNewCampaign((current) => ({ ...current, sendDelayMinutes: Number(event.target.value) }))
            }
            placeholder="delay minutes"
          />
          <button type="button" onClick={() => void createCampaign()}>
            Add Campaign
          </button>
        </div>
        <div className="crud-table">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="crud-row">
              <div>
                <strong>{campaign.id}</strong>
              </div>
              <input
                value={campaignDrafts[campaign.id]?.label ?? campaign.label}
                onChange={(event) =>
                  setCampaignDrafts((current) => ({
                    ...current,
                    [campaign.id]: {
                      ...(current[campaign.id] ?? {
                        label: campaign.label,
                        triggerEvent: campaign.triggerEvent,
                        segment: campaign.segment,
                        sendDelayMinutes: campaign.sendDelayMinutes
                      }),
                      label: event.target.value
                    }
                  }))
                }
                placeholder="label"
              />
              <select
                value={campaignDrafts[campaign.id]?.triggerEvent ?? campaign.triggerEvent}
                onChange={(event) =>
                  setCampaignDrafts((current) => ({
                    ...current,
                    [campaign.id]: {
                      ...(current[campaign.id] ?? {
                        label: campaign.label,
                        triggerEvent: campaign.triggerEvent,
                        segment: campaign.segment,
                        sendDelayMinutes: campaign.sendDelayMinutes
                      }),
                      triggerEvent: event.target.value as LifecycleEventType
                    }
                  }))
                }
              >
                {EVENT_TYPES.map((eventType) => (
                  <option key={eventType} value={eventType}>
                    {eventType}
                  </option>
                ))}
              </select>
              <input
                value={campaignDrafts[campaign.id]?.segment ?? campaign.segment}
                onChange={(event) =>
                  setCampaignDrafts((current) => ({
                    ...current,
                    [campaign.id]: {
                      ...(current[campaign.id] ?? {
                        label: campaign.label,
                        triggerEvent: campaign.triggerEvent,
                        segment: campaign.segment,
                        sendDelayMinutes: campaign.sendDelayMinutes
                      }),
                      segment: event.target.value
                    }
                  }))
                }
                placeholder="segment"
              />
              <input
                type="number"
                value={campaignDrafts[campaign.id]?.sendDelayMinutes ?? campaign.sendDelayMinutes}
                onChange={(event) =>
                  setCampaignDrafts((current) => ({
                    ...current,
                    [campaign.id]: {
                      ...(current[campaign.id] ?? {
                        label: campaign.label,
                        triggerEvent: campaign.triggerEvent,
                        segment: campaign.segment,
                        sendDelayMinutes: campaign.sendDelayMinutes
                      }),
                      sendDelayMinutes: Number(event.target.value)
                    }
                  }))
                }
                placeholder="delay"
              />
              <div className="row-actions">
                <button type="button" onClick={() => void updateCampaign(campaign.id)}>
                  Save
                </button>
                <button type="button" className="danger" onClick={() => void deleteCampaign(campaign.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2>Send Email Campaign Now</h2>
        <div className="crud-create-row">
          <select
            value={emailBlast.eventType}
            onChange={(event) => setEmailBlast((current) => ({ ...current, eventType: event.target.value as LifecycleEventType }))}
          >
            {EVENT_TYPES.map((eventType) => (
              <option key={eventType} value={eventType}>
                {eventType}
              </option>
            ))}
          </select>
          <input
            value={emailBlast.storyId}
            onChange={(event) => setEmailBlast((current) => ({ ...current, storyId: event.target.value }))}
            placeholder="story id"
          />
          <textarea
            value={emailBlast.emails}
            onChange={(event) => setEmailBlast((current) => ({ ...current, emails: event.target.value }))}
            placeholder="emails (comma/newline separated)"
            rows={4}
          />
          <textarea
            value={emailBlast.metadata}
            onChange={(event) => setEmailBlast((current) => ({ ...current, metadata: event.target.value }))}
            placeholder='metadata json, e.g. {"source":"admin-ui"}'
            rows={4}
          />
          <button type="button" onClick={() => void sendEmailCampaign()}>
            Send Email Campaign
          </button>
        </div>
      </article>

      <article className="panel">
        <h2>Custom Marketing Campaign</h2>
        <div className="crud-create-row">
          <input
            value={customEmailBlast.campaignLabel}
            onChange={(event) =>
              setCustomEmailBlast((current) => ({ ...current, campaignLabel: event.target.value }))
            }
            placeholder="campaign label"
          />
          <input
            value={customEmailBlast.subject}
            onChange={(event) => setCustomEmailBlast((current) => ({ ...current, subject: event.target.value }))}
            placeholder="subject"
          />
          <textarea
            value={customEmailBlast.html}
            onChange={(event) => setCustomEmailBlast((current) => ({ ...current, html: event.target.value }))}
            placeholder="html content"
            rows={6}
          />
          <textarea
            value={customEmailBlast.text}
            onChange={(event) => setCustomEmailBlast((current) => ({ ...current, text: event.target.value }))}
            placeholder="plain text content"
            rows={4}
          />
          <textarea
            value={customEmailBlast.emails}
            onChange={(event) => setCustomEmailBlast((current) => ({ ...current, emails: event.target.value }))}
            placeholder="recipient emails (comma/newline)"
            rows={3}
          />
          <input
            value={customEmailBlast.tags}
            onChange={(event) => setCustomEmailBlast((current) => ({ ...current, tags: event.target.value }))}
            placeholder="tags csv"
          />
          <textarea
            value={customEmailBlast.metadata}
            onChange={(event) => setCustomEmailBlast((current) => ({ ...current, metadata: event.target.value }))}
            placeholder='metadata json, e.g. {"source":"admin-ui"}'
            rows={3}
          />
          <button type="button" onClick={() => void sendCustomEmailCampaign()}>
            Send Custom Marketing Email
          </button>
        </div>
      </article>

      <article className="panel">
        <h2>SMS/WhatsApp/Telegram/Signal Broadcast</h2>
        <div className="crud-create-row">
          <input
            value={broadcast.caseId}
            onChange={(event) => setBroadcast((current) => ({ ...current, caseId: event.target.value }))}
            placeholder="case id"
          />
          <input
            value={broadcast.playerId}
            onChange={(event) => setBroadcast((current) => ({ ...current, playerId: event.target.value }))}
            placeholder="player id"
          />
          <input
            value={broadcast.message}
            onChange={(event) => setBroadcast((current) => ({ ...current, message: event.target.value }))}
            placeholder="broadcast message"
          />
          <textarea
            value={broadcast.mediaUrls}
            onChange={(event) => setBroadcast((current) => ({ ...current, mediaUrls: event.target.value }))}
            placeholder="media urls (optional, comma/newline)"
            rows={3}
          />
          <div className="checkbox-row">
            {CHANNELS.map((channel) => (
              <label key={channel}>
                <input
                  type="checkbox"
                  checked={broadcast.channels[channel]}
                  onChange={(event) =>
                    setBroadcast((current) => ({
                      ...current,
                      channels: {
                        ...current.channels,
                        [channel]: event.target.checked
                      }
                    }))
                  }
                />
                {channel}
              </label>
            ))}
          </div>
          <button type="button" onClick={() => void sendBroadcast()}>
            Send Broadcast
          </button>
        </div>
        {broadcastReceipts.length > 0 ? (
          <div className="crud-table">
            {broadcastReceipts.map((receipt) => (
              <div key={`${receipt.channel}-${receipt.externalMessageId}`} className="crud-row">
                <div>
                  <strong>{receipt.channel}</strong>
                  <p className="muted" style={{ margin: '4px 0 0' }}>
                    {receipt.provider} · {receipt.to}
                  </p>
                </div>
                <code>{receipt.externalMessageId}</code>
              </div>
            ))}
          </div>
        ) : null}
      </article>
    </section>
  );
}
