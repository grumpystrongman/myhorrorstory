import { getStoryTitle, getTrackById, getStoryTrack } from '@myhorrorstory/music';
import { notFound } from 'next/navigation';

interface StoryIntroPageProps {
  params: Promise<{
    storyId: string;
  }>;
}

export default async function StoryIntroPage({ params }: StoryIntroPageProps): Promise<JSX.Element> {
  const { storyId } = await params;
  const track = getStoryTrack(storyId);

  if (!track) {
    notFound();
  }

  const globalTrack = getTrackById('platform-overture');

  return (
    <main className="container" style={{ padding: '32px 0' }}>
      <div className="panel" style={{ marginBottom: 16 }}>
        <p style={{ letterSpacing: '0.18em', margin: 0, color: 'var(--muted)' }}>STORY INTRO</p>
        <h1 style={{ fontFamily: 'Cinzel, serif', marginTop: 12 }}>{getStoryTitle(storyId)}</h1>
        <p>
          Intro sequence loaded. The global platform overture yields to this case score to set the
          tone before your first chapter event.
        </p>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Score Profile</h2>
        <p style={{ marginBottom: 6 }}>Track: {track.title}</p>
        <p style={{ marginBottom: 6 }}>Mood: {track.mood}</p>
        <p style={{ marginBottom: 6 }}>BPM: {track.bpm}</p>
        <p style={{ margin: 0 }}>
          Global Theme: {globalTrack ? globalTrack.title : 'MHS Platform Overture'}
        </p>
      </div>

      <div className="panel" style={{ display: 'flex', gap: 12 }}>
        <a href={`/play?storyId=${storyId}`} data-testid="intro-start-session">
          Start Investigation Session
        </a>
        <a href="/library">Back to Library</a>
      </div>
    </main>
  );
}
