import {
  loadQualityIndexRows,
  resolveOwnerGate,
  type QualityIndexRow
} from '../lib/quality-reports.server';

interface DashboardPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function readinessBand(score: number): string {
  if (score >= 90) {
    return 'Launch Ready';
  }
  if (score >= 80) {
    return 'Release Candidate';
  }
  if (score >= 70) {
    return 'Needs Polish';
  }
  return 'Needs Rewrite';
}

function renderQualityRows(rows: QualityIndexRow[], ownerKey: string): JSX.Element {
  if (rows.length === 0) {
    return (
      <p className="muted" style={{ marginBottom: 0 }}>
        No quality reports found. Run <code>corepack pnpm qa:simulate-stories</code> to generate the owner QA pack.
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {rows.map((row) => (
        <article key={row.storyId} className="panel" style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: '0 0 4px' }}>{row.title}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {row.storyId} - {row.version} - {new Date(row.generatedAt).toLocaleString()}
              </p>
            </div>
            <div style={{ textAlign: 'right', minWidth: 220 }}>
              <strong style={{ fontSize: 22 }}>{row.productionReadiness}/100</strong>
              <p className="muted" style={{ margin: 0 }}>
                {readinessBand(row.productionReadiness)} - Difficulty {row.difficulty.level}
              </p>
            </div>
          </div>
          <p className="muted" style={{ margin: '10px 0 6px' }}>
            Coverage - Beats {row.coverage.beats}% - Choices {row.coverage.choices}% - Endings {row.coverage.endings}%
          </p>
          <div className="inline-links" style={{ marginTop: 4 }}>
            <a href={`/dashboard/quality/${row.storyId}?ownerKey=${encodeURIComponent(ownerKey)}`}>
              Open QA Decision Report
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps): Promise<JSX.Element> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const ownerGate = resolveOwnerGate(resolvedSearchParams);
  const qualityRows = ownerGate.authorized ? await loadQualityIndexRows() : [];

  return (
    <main className="container page-stack">
      <section className="panel section-shell">
        <span className="surface-tag">Player Ops</span>
        <h1 className="section-title">Dashboard</h1>
        <p className="section-copy">
          Resume active cases, review ending variants, manage messaging routes, and track loyalty status.
        </p>
      </section>

      <section className="panel section-shell dual-grid">
        <div>
          <h2 className="section-title">Session Queue</h2>
          <p className="muted">Static Between Stations - 64% complete - stage 2 villain contact</p>
          <p className="muted">Midnight Lockbox - 42% complete - short-mode QA route</p>
          <p className="muted">Ward 1908 - not started - premium ending available</p>
        </div>
        <div>
          <h2 className="section-title">Profile Controls</h2>
          <div className="inline-links">
            <a href="/support">Support Portal</a>
            <a href="/referrals">Referral Hub</a>
            <a href="/billing">Billing + Plans</a>
          </div>
        </div>
      </section>

      <section className="panel section-shell">
        <span className="surface-tag">Owner QA</span>
        <h2 className="section-title">Private Story Quality Agent</h2>
        {ownerGate.enabled ? (
          ownerGate.authorized ? (
            <>
              <p className="section-copy">
                Automated human-like simulation runs are active. Reports include branch decisions, decision rationale,
                outcomes, and production-readiness scoring.
              </p>
              {renderQualityRows(qualityRows, ownerGate.key)}
            </>
          ) : (
            <>
              <p className="section-copy">
                This tab is owner-gated. Add <code>?ownerKey=YOUR_OWNER_DASHBOARD_KEY</code> to the URL to unlock QA
                reports.
              </p>
              <p className="muted" style={{ marginBottom: 0 }}>
                Example: <code>/dashboard?ownerKey=YOUR_OWNER_DASHBOARD_KEY</code>
              </p>
            </>
          )
        ) : (
          <p className="section-copy" style={{ marginBottom: 0 }}>
            Owner QA gate is disabled. Set <code>OWNER_DASHBOARD_KEY</code> in your environment and regenerate the
            dashboard session.
          </p>
        )}
      </section>
    </main>
  );
}
