import CodexConsole from '../components/codex-console';

export default function CodexConsolePage(): JSX.Element {
  return (
    <main className="container codex-room">
      <header className="panel codex-room-header">
        <p className="codex-room-kicker">MYHORRORSTORY CONTROL</p>
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '2.2rem', margin: 0 }}>Codex Local Control Room</h1>
        <p className="muted" style={{ margin: 0 }}>
          Drive Codex from this in-world console: launch work threads, monitor streamed events, and inject
          follow-up guidance without leaving the operator surface.
        </p>
        <p className="codex-room-status">Status: bridge relay online. Authentication and stream replay enabled.</p>
      </header>

      <CodexConsole />
    </main>
  );
}
