import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AdminControlCenter } from './components/admin-control-center';
import { resolveRepoRoot } from '../lib/repo-root';

interface StoryRunSummary {
  storyId: string;
  title: string;
  hook: string;
  beatCount: number;
  endingCount: number;
  defaultRunSteps: number;
}

interface FullPlaythroughReport {
  generatedAt: string;
  storyCount: number;
  stories: StoryRunSummary[];
}

interface WalkthroughDecision {
  step: number;
  day: number;
  beat: string;
  choiceLabel: string;
}

interface WalkthroughReport {
  generatedAt: string;
  storyId: string;
  durationSeconds: number;
  output: {
    finalVideo: string;
    narratorTrack: string;
  };
  decisions: WalkthroughDecision[];
}

interface OpsModule {
  title: string;
  owner: string;
  status: 'Live' | 'In Progress' | 'Planned';
  detail: string;
}

const operationsModules: OpsModule[] = [
  {
    title: 'Users and Entitlements',
    owner: 'Support + Billing',
    status: 'Live',
    detail: 'Manage accounts, subscriptions, grants, refunds, and escalation notes.'
  },
  {
    title: 'Story and Asset Ops',
    owner: 'Narrative + Creative',
    status: 'Live',
    detail: 'Review campaign packages, evidence assets, voice bundles, and release states.'
  },
  {
    title: 'Messaging Channels',
    owner: 'Platform',
    status: 'Live',
    detail: 'Validate SMS, WhatsApp, and Telegram routing plus fallback behavior.'
  },
  {
    title: 'Growth and Lifecycle',
    owner: 'Growth',
    status: 'In Progress',
    detail: 'Run onboarding, abandoned-session, and win-back campaign experiments.'
  },
  {
    title: 'Moderation and Safety',
    owner: 'Trust and Safety',
    status: 'In Progress',
    detail: 'Queue abusive reports, consent violations, and age-gate compliance audits.'
  },
  {
    title: 'System Health and Audit',
    owner: 'DevOps',
    status: 'Live',
    detail: 'Track service uptime, queue drift, and immutable audit trails.'
  }
];

async function readJsonFile<T>(absolutePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(absolutePath, 'utf8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function formatGeneratedAt(value: string | null): string {
  if (!value) {
    return 'Not available';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) {
    return 'Unknown duration';
  }
  const minutes = Math.floor(seconds / 60);
  const rem = Math.round(seconds % 60);
  return `${minutes}m ${rem.toString().padStart(2, '0')}s`;
}

function statusClass(status: OpsModule['status']): string {
  if (status === 'Live') {
    return 'status-live';
  }
  if (status === 'In Progress') {
    return 'status-progress';
  }
  return 'status-planned';
}

export default async function AdminHomePage(): Promise<JSX.Element> {
  const repoRoot = resolveRepoRoot();
  const fullReportPath = path.join(repoRoot, 'docs', 'simulations', 'full-playthrough-report.json');
  const walkthroughPath = path.join(
    repoRoot,
    'docs',
    'simulations',
    'static-between-stations-readiness-walkthrough-v2.json'
  );

  const fullReport = await readJsonFile<FullPlaythroughReport>(fullReportPath);
  const walkthrough = await readJsonFile<WalkthroughReport>(walkthroughPath);
  const staticStory = fullReport?.stories.find((story) => story.storyId === 'static-between-stations') ?? null;

  const simulationBase = process.env.MYHORRORSTORY_WEB_BASE_URL ?? 'http://127.0.0.1:3200';
  const simulationUrl = `${simulationBase}/simulations/static-between-stations.html`;
  const playbackUrl = '/api/playthrough/static-between-stations/video';
  const decisions = walkthrough?.decisions ?? [];

  return (
    <main className="admin-root">
      <header className="admin-header">
        <div>
          <p className="kicker">MyHorrorStory Operations</p>
          <h1>Admin Control Center</h1>
          <p className="subtitle">
            Platform administration, story operations, and QA playback now live in one console.
          </p>
        </div>
        <div className="header-metrics">
          <article>
            <strong>{fullReport?.storyCount ?? 0}</strong>
            <span>Story Packages</span>
          </article>
          <article>
            <strong>{fullReport?.stories.reduce((sum, story) => sum + story.beatCount, 0) ?? 0}</strong>
            <span>Total Beats</span>
          </article>
          <article>
            <strong>{formatDuration(walkthrough?.durationSeconds ?? null)}</strong>
            <span>Walkthrough Runtime</span>
          </article>
        </div>
      </header>

      <section className="admin-grid">
        <article className="panel">
          <h2>Platform Administration</h2>
          <p className="muted">User and system controls expected by operations, support, and release management.</p>
          <div className="module-list">
            {operationsModules.map((module) => (
              <article key={module.title} className="module-card">
                <div className="module-header">
                  <h3>{module.title}</h3>
                  <span className={`status-chip ${statusClass(module.status)}`}>{module.status}</span>
                </div>
                <p>{module.detail}</p>
                <p className="muted">Owner: {module.owner}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Playthrough QA Video</h2>
          <p className="muted">
            Full narrated walkthrough used for readiness review. This is streamed from the captured production file.
          </p>
          <video className="playback-video" controls preload="metadata" src={playbackUrl}>
            Your browser does not support HTML5 video playback.
          </video>
          <div className="quick-links">
            <a href={simulationUrl} target="_blank" rel="noreferrer">
              Open Full Simulation Timeline
            </a>
            <a href={playbackUrl} target="_blank" rel="noreferrer">
              Open Video Stream Directly
            </a>
          </div>
          <p className="muted">
            Generated: {formatGeneratedAt(walkthrough?.generatedAt ?? null)}.
            Source story: {walkthrough?.storyId ?? 'N/A'}.
          </p>
        </article>
      </section>

      <section className="admin-grid">
        <article className="panel">
          <h2>Static Between Stations Quality Snapshot</h2>
          {staticStory ? (
            <div className="snapshot-grid">
              <div>
                <strong>{staticStory.beatCount}</strong>
                <span>Playable Beats</span>
              </div>
              <div>
                <strong>{staticStory.endingCount}</strong>
                <span>Ending Variants</span>
              </div>
              <div>
                <strong>{staticStory.defaultRunSteps}</strong>
                <span>Default Path Steps</span>
              </div>
            </div>
          ) : (
            <p className="muted">Story summary is unavailable.</p>
          )}
          <p>{staticStory?.hook ?? 'Story hook unavailable.'}</p>
        </article>

        <article className="panel">
          <h2>Decision Trace</h2>
          <p className="muted">Step-by-step choices from the recorded walkthrough run.</p>
          <div className="decision-log">
            {decisions.length === 0 ? (
              <p className="muted">No decision trace found.</p>
            ) : (
              decisions.map((decision) => (
                <article key={`${decision.step}-${decision.day}`} className="decision-item">
                  <strong>
                    Step {decision.step} · Day {decision.day}
                  </strong>
                  <span>{decision.beat}</span>
                  <p>{decision.choiceLabel}</p>
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      <AdminControlCenter />
    </main>
  );
}
