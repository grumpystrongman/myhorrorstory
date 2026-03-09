import { listStoryScores } from '@myhorrorstory/music';

const launches = listStoryScores();

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
        <h2 style={{ marginTop: 0 }}>Launch Cases and Scores</h2>
        <ul style={{ display: 'grid', gap: 8, paddingLeft: 20 }}>
          {launches.map((story) => (
            <li key={story.storyId} style={{ display: 'grid', gap: 4 }}>
              <span>{story.storyTitle}</span>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>Score: {story.track.title}</span>
              <span style={{ display: 'flex', gap: 12 }}>
                <a href={story.introPath}>Story Intro</a>
                <a href={story.playPath}>Play Case</a>
              </span>
            </li>
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
