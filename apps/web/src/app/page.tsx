const launches = [
  'Static Between Stations',
  'Black Chapel Ledger',
  'The Harvest Men',
  'Signal From Kharon-9'
];

export default function HomePage(): JSX.Element {
  return (
    <main className="container" style={{ padding: '32px 0 64px 0' }}>
      <header className="panel" style={{ marginBottom: 24 }}>
        <p style={{ letterSpacing: '0.2em', margin: 0, color: 'var(--muted)' }}>MYHORRORSTORY</p>
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '3rem', margin: '12px 0' }}>
          Remote Horror Mystery Platform
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--muted)' }}>
          Play solo or with remote friends. Unlock chapters, map suspects, and decode evidence in
          synchronized real-time sessions.
        </p>
      </header>

      <section className="panel" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Launch Cases</h2>
        <ul>
          {launches.map((story) => (
            <li key={story}>{story}</li>
          ))}
        </ul>
      </section>

      <section className="panel" style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ marginTop: 0 }}>Core Flows</h2>
        <a href="/onboarding">Onboarding Funnel</a>
        <a href="/library">Case Library</a>
        <a href="/play">Play Session UI</a>
        <a href="/dashboard">User Dashboard</a>
      </section>
    </main>
  );
}
