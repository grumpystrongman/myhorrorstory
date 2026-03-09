import { listStoryScores } from '@myhorrorstory/music';

const stories = listStoryScores();

export default function LibraryPage(): JSX.Element {
  return (
    <main className="container" style={{ padding: '32px 0' }}>
      <div className="panel" style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'Cinzel, serif' }}>Case Library</h1>
        <p>Filter by subgenre, session length, party mode, and soundtrack profile.</p>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {stories.map((story) => (
          <article key={story.storyId} className="panel" style={{ display: 'grid', gap: 8 }}>
            <h2 style={{ margin: 0 }}>{story.storyTitle}</h2>
            <p style={{ margin: 0, color: 'var(--muted)' }}>Score: {story.track.title}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <a href={story.introPath}>Open Intro</a>
              <a href={story.playPath}>Start Play Session</a>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
