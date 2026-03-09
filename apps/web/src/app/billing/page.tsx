export default function BillingPage(): JSX.Element {
  return (
    <main className="container page-stack">
      <section className="panel section-shell">
        <span className="surface-tag">Commercial</span>
        <h1 className="section-title">Billing & Subscriptions</h1>
        <p className="section-copy">
          Manage plans, premium case access, payment history, and entitlement visibility.
        </p>
      </section>

      <section className="pricing-grid">
        <article className="pricing-card">
          <h2>Free Trial</h2>
          <p className="price-tag">$0</p>
          <p>Teaser chapter access and onboarding previews.</p>
          <ul className="legal-list">
            <li>Limited story depth</li>
            <li>No premium endings</li>
            <li>Email lifecycle enabled</li>
          </ul>
        </article>
        <article className="pricing-card premium">
          <h2>Standard</h2>
          <p className="price-tag">$14/mo</p>
          <p>Full case library, replay paths, and party orchestration.</p>
          <ul className="legal-list">
            <li>All launch stories</li>
            <li>Cross-platform save/resume</li>
            <li>Referral rewards</li>
          </ul>
        </article>
        <article className="pricing-card">
          <h2>Premium</h2>
          <p className="price-tag">$24/mo</p>
          <p>Director commentary, bonus arcs, and advanced operations tooling.</p>
          <ul className="legal-list">
            <li>Premium epilogues</li>
            <li>Launch priority windows</li>
            <li>Expanded support SLA</li>
          </ul>
        </article>
      </section>
    </main>
  );
}

