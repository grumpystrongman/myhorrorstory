export default function ReferralsPage(): JSX.Element {
  return (
    <main className="container page-stack">
      <section className="panel section-shell">
        <span className="surface-tag">Growth</span>
        <h1 className="section-title">Referral Hub</h1>
        <p className="section-copy">
          Invite remote friends and unlock referral rewards, bonus clue shards, and social campaign drops.
        </p>
      </section>

      <section className="panel section-shell dual-grid">
        <div>
          <h2 className="section-title">Your Referral Code</h2>
          <p className="price-tag">NIGHTCIRCLE</p>
          <p className="muted">Share this code during onboarding for both players to receive case perks.</p>
        </div>
        <div>
          <h2 className="section-title">Reward Ladder</h2>
          <ul className="legal-list">
            <li>1 referral: bonus evidence-board theme</li>
            <li>3 referrals: premium epilogue unlock token</li>
            <li>5 referrals: one-month standard plan credit</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

