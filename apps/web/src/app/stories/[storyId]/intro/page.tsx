import { notFound } from 'next/navigation';
import { getTrackById } from '@myhorrorstory/music';
import { getLaunchCaseById } from '../../../lib/launch-catalog';

interface StoryIntroPageProps {
  params: Promise<{
    storyId: string;
  }>;
}

export default async function StoryIntroPage({ params }: StoryIntroPageProps): Promise<JSX.Element> {
  const { storyId } = await params;
  const story = getLaunchCaseById(storyId);

  if (!story) {
    notFound();
  }

  const globalTrack = getTrackById('platform-overture');

  return (
    <main className="container page-stack">
      <section className="panel intro-hero">
        <img src={story.heroImagePath} alt={`${story.storyTitle} story key art`} />
        <div>
          <p className="kicker">Story Intro</p>
          <h1 className="section-title">{story.storyTitle}</h1>
          <p className="section-copy">{story.hook}</p>
          <p className="muted">{story.spotlight}</p>
          <div className="inline-links">
            <a href={`/play?storyId=${story.storyId}`} data-testid="intro-start-session">
              Start Investigation Session
            </a>
            <a href="/library">Back to Library</a>
          </div>
        </div>
      </section>

      <section className="panel section-shell dual-grid">
        <div>
          <h2 className="section-title">Case Profile</h2>
          <p className="muted">Subgenre: {story.subgenre}</p>
          <p className="muted">Tone: {story.toneLabel}</p>
          <p className="muted">Session: {story.timelineLabel}</p>
          <p className="warning-line">Warnings: {story.warnings.join(', ')}</p>
        </div>
        <div>
          <h2 className="section-title">Score Profile</h2>
          <p className="muted">Track: {story.track.title}</p>
          <p className="muted">Mood: {story.track.mood}</p>
          <p className="muted">BPM: {story.track.bpm}</p>
          <p className="muted">Global Theme: {globalTrack?.title ?? 'MHS Platform Overture'}</p>
        </div>
      </section>

      <section className="panel section-shell">
        <span className="surface-tag">Evidence Preview</span>
        <h2 className="section-title">Case Materials</h2>
        <div className="evidence-thumb-grid">
          <img src={story.portraitImagePath} alt={`${story.storyTitle} character portrait`} loading="lazy" />
          <img src={story.evidenceImagePath} alt={`${story.storyTitle} evidence image`} loading="lazy" />
          <img src={story.coverImagePath} alt={`${story.storyTitle} promo image`} loading="lazy" />
          <img src={story.heroImagePath} alt={`${story.storyTitle} scene image`} loading="lazy" />
        </div>
      </section>
    </main>
  );
}

