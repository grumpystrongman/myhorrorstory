import CodexConsole from '../components/codex-console';

export default function CodexConsolePage(): JSX.Element {
  return (
    <main className="container" style={{ padding: '32px 0 64px 0', display: 'grid', gap: 16 }}>
      <header className="panel" style={{ display: 'grid', gap: 8 }}>
        <p style={{ letterSpacing: '0.2em', margin: 0, color: 'var(--muted)' }}>MYHORRORSTORY</p>
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '2.2rem', margin: 0 }}>Codex Local Control Room</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          Drive Codex directly from this browser: run prompts, stream updates, and steer follow-up guidance in
          the same thread.
        </p>
      </header>

      <CodexConsole />
    </main>
  );
}
