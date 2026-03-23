import { LeadCaptureForm } from '../components/lead-capture-form';
import { LibraryLivePreview } from '../components/library-live-preview';
import { loadStoryArtworkSelection } from '../lib/agent-army-artwork.server';
import { getLaunchCases } from '../lib/launch-catalog';

const stories = getLaunchCases();

export default async function LibraryPage(): Promise<JSX.Element> {
  const storyCards = await Promise.all(
    stories.map(async (story) => ({
      story,
      artwork: await loadStoryArtworkSelection(story.storyId)
    }))
  );

  return (
    <main className="container page-stack">
      <section className="panel section-shell library-hero">
        <span className="surface-tag">Case Archive</span>
        <h1 className="section-title">Case Library</h1>
        <p className="section-copy">
          Browse active files by transmission pattern, replay cadence, and evidence loadout. Every case
          supports solo and remote party progression with synchronized chapter events.
        </p>
      </section>

      <section className="panel section-shell library-signal-shell">
        <span className="surface-tag">Signal Index</span>
        <h2 className="section-title">Triage Before You Open A File</h2>
        <div className="library-signal-grid">
          <article className="library-signal-card">
            <h3>Call Pattern</h3>
            <p>Repeated short-duration contacts, unknown caller metadata, and silence-window anomalies.</p>
          </article>
          <article className="library-signal-card">
            <h3>Audio Complexity</h3>
            <p>Reverse-voice hints, speed-shift clues, and timeline-locked waveform fragments.</p>
          </article>
          <article className="library-signal-card">
            <h3>Escalation Risk</h3>
            <p>Antagonist contact pressure and branch collapse likelihood if clues are mishandled.</p>
          </article>
        </div>
      </section>

      <section className="library-grid">
        {storyCards.map(({ story, artwork }) => (
          <article key={story.storyId} className="library-card">
            {artwork.cover?.public_path ? (
              <img src={artwork.cover.public_path} alt={`${story.storyTitle} card art`} loading="lazy" />
            ) : (
              <div
                className="panel"
                style={{
                  minHeight: 320,
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center',
                  padding: 24,
                  background: 'rgba(36, 17, 17, 0.34)',
                  border: '1px solid rgba(188, 84, 84, 0.35)'
                }}
              >
                <div>
                  <strong>Verified artwork pending rerun</strong>
                  <p className="muted" style={{ marginBottom: 0 }}>
                    {artwork.issueCount > 0
                      ? `${artwork.issueCount} generation issues are queued for retry.`
                      : 'No real image asset is currently available for this story.'}
                  </p>
                </div>
              </div>
            )}
            <div>
              <p className="story-subgenre">
                {story.subgenre}
                {story.mode === 'short-test' ? ' - Short Mode' : ''}
              </p>
              <h2>
                {story.storyTitle}
                {story.mode === 'short-test' ? ' (Short Mode)' : ''}
              </h2>
              <p>{story.hook}</p>
              <p className="muted">
                {story.timelineLabel} - Target Session: {story.targetSessionMinutes} min
              </p>
              <p className="muted">Score: {story.track.title}</p>
              <p className="muted">
                Verified visuals: {artwork.verifiedImageCount}
                {artwork.issueCount > 0 ? ` / Issues: ${artwork.issueCount}` : ''}
              </p>
              <p className="warning-line">Warnings: {story.warnings.join(', ')}</p>
              <p className="muted">{story.spotlight}</p>
              <div className="inline-links">
                <a href={story.introPath}>Open Intro</a>
                <a href={story.playPath}>Start Play Session</a>
              </div>
            </div>
          </article>
        ))}
      </section>

      <LibraryLivePreview
        stories={storyCards.map(({ story, artwork }) => ({
          storyId: story.storyId,
          storyTitle: story.storyTitle,
          coverImagePath: artwork.cover?.public_path ?? null,
          playPath: story.playPath
        }))}
      />

      <section className="panel section-shell dual-grid">
        <div>
          <span className="surface-tag">Operator Updates</span>
          <h2 className="section-title">Keep Your Case Queue Active</h2>
          <p className="section-copy">
            Join lifecycle messaging to get launch alerts, dormant-case recovery prompts, and referral
            reward drops from the same operator voice used in-session.
          </p>
        </div>
        <LeadCaptureForm source="library_footer" compact />
      </section>
    </main>
  );
}
