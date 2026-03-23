import { notFound } from 'next/navigation';
import { loadQualityIndexRows, resolveOwnerGate } from '../../lib/quality-reports.server';

interface QualityDashboardPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function QualityDashboardPage({
  searchParams
}: QualityDashboardPageProps): Promise<JSX.Element> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const ownerGate = resolveOwnerGate(resolvedSearchParams);

  if (!ownerGate.enabled || !ownerGate.authorized) {
    notFound();
  }

  const rows = await loadQualityIndexRows();

  return (
    <main className="container page-stack">
      <section className="panel section-shell">
        <span className="surface-tag">Owner QA</span>
        <h1 className="section-title">Story Quality Reports</h1>
        <p className="section-copy">
          Human-style QA simulation runs with branch coverage, outcome analysis, and production-readiness scoring.
        </p>
        <div className="inline-links">
          <a href={`/dashboard?ownerKey=${encodeURIComponent(ownerGate.key)}`}>Back to Dashboard</a>
        </div>
      </section>

      <section className="panel section-shell">
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map((row) => (
            <article key={row.storyId} className="panel" style={{ padding: 14 }}>
              <h2 style={{ margin: '0 0 4px' }}>{row.title}</h2>
              <p className="muted" style={{ margin: '0 0 8px' }}>
                Score {row.productionReadiness}/100 - Difficulty {row.difficulty.level} - Coverage {row.coverage.beats}% /
                {` ${row.coverage.choices}% / ${row.coverage.endings}%`}
              </p>
              <a href={`/dashboard/quality/${row.storyId}?ownerKey=${encodeURIComponent(ownerGate.key)}`}>
                Open detailed decision trace
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
