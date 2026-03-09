import { LeadCaptureForm } from '../components/lead-capture-form';
import { getLaunchCases } from '../lib/launch-catalog';

const stories = getLaunchCases();

export default function LibraryPage(): JSX.Element {
  return (
    <main className="container page-stack">
      <section className="panel section-shell library-hero">
        <span className="surface-tag">Case Catalog</span>
        <h1 className="section-title">Case Library</h1>
        <p className="section-copy">
          Browse by subgenre, session window, replay profile, and score direction. Every case supports
          solo and remote party progression with synchronized chapter events.
        </p>
      </section>

      <section className="library-grid">
        {stories.map((story) => (
          <article key={story.storyId} className="library-card">
            <img src={story.visualPath} alt={`${story.storyTitle} card art`} loading="lazy" />
            <div>
              <p className="story-subgenre">
                {story.subgenre}
                {story.mode === 'short-test' ? ' · Short Mode' : ''}
              </p>
              <h2>
                {story.storyTitle}
                {story.mode === 'short-test' ? ' (Short Mode)' : ''}
              </h2>
              <p>{story.hook}</p>
              <p className="muted">
                {story.timelineLabel} · Target Session: {story.targetSessionMinutes} min
              </p>
              <p className="muted">Score: {story.track.title}</p>
              <p className="warning-line">Warnings: {story.warnings.join(', ')}</p>
              <div className="inline-links">
                <a href={story.introPath}>Open Intro</a>
                <a href={story.playPath}>Start Play Session</a>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="panel section-shell dual-grid">
        <div>
          <span className="surface-tag">Release Loop</span>
          <h2 className="section-title">Keep Your Case Queue Active</h2>
          <p className="section-copy">
            Join lifecycle messaging to get launch alerts, abandoned-case recovery prompts, and referral
            reward drops.
          </p>
        </div>
        <LeadCaptureForm source="library_footer" compact />
      </section>
    </main>
  );
}

