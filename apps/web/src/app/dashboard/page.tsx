export default function DashboardPage(): JSX.Element {
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
          <p className="muted">Static Between Stations · 64% complete · stage 2 villain contact</p>
          <p className="muted">Midnight Lockbox · 42% complete · short-mode QA route</p>
          <p className="muted">Ward 1908 · not started · premium ending available</p>
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
    </main>
  );
}

