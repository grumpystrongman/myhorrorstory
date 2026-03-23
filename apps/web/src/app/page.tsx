import { LeadCaptureForm } from './components/lead-capture-form';
import { loadStoryArtworkSelection } from './lib/agent-army-artwork.server';
import { getLaunchCases } from './lib/launch-catalog';

const launchCases = getLaunchCases();
const featuredCases = launchCases.slice(0, 3);

export default async function HomePage(): Promise<JSX.Element> {
  const featuredStories = await Promise.all(
    featuredCases.map(async (story) => ({
      story,
      artwork: await loadStoryArtworkSelection(story.storyId)
    }))
  );

  return (
    <main className="container page-stack">
      <header className="hero-shell">
        <div className="hero-backdrop" aria-hidden="true" />
        <div className="hero-content">
          <p className="kicker">MyHorrorStory Signal Desk</p>
          <h1 className="hero-title">Remote Horror Mystery Platform</h1>
          <p className="hero-copy">
            Enter a live investigation portal built around phone-call anomalies, found-audio clues, and
            escalating transmissions. Each case blends story chat, voice drops, evidence boards, adaptive
            score, and branching endings.
          </p>
          <div className="hero-actions">
            <a className="cta-primary" href="/onboarding">
              Onboarding Funnel
            </a>
            <a className="cta-secondary" href="/library">
              Case Library
            </a>
            <a className="cta-secondary" href="/play">
              Play Session UI
            </a>
          </div>
          <div className="metric-strip">
            <article className="metric">
              <strong>{launchCases.length} Active Case Files</strong>
              <span>Cold opens, recorded anomalies, and multi-path outcomes.</span>
            </article>
            <article className="metric">
              <strong>Signal-First Runtime</strong>
              <span>SMS, WhatsApp, Telegram, Signal, and email channels in one feed.</span>
            </article>
            <article className="metric">
              <strong>Forensic Audio Loop</strong>
              <span>Evidence playback, clue cadence, and pressure-driven soundtrack cues.</span>
            </article>
          </div>
        </div>
      </header>

      <section className="panel section-shell arg-protocol-shell">
        <span className="surface-tag">Case Access Protocol</span>
        <h2 className="section-title">Follow The Signal Chain</h2>
        <p className="section-copy">
          The experience opens like an investigation dashboard, not a storefront. Players move through
          incoming-call logs, archived clips, and numeric audio ciphers before each major narrative turn.
        </p>
        <div className="arg-protocol-grid">
          <article className="arg-protocol-card">
            <p className="kicker">Phase 01</p>
            <h3>Incoming Call Capture</h3>
            <p>
              Launch each case with a timed contact event, caller metadata, and unexplained disconnect
              behavior.
            </p>
          </article>
          <article className="arg-protocol-card">
            <p className="kicker">Phase 02</p>
            <h3>Audio Trace Analysis</h3>
            <p>
              Surface short clips, tone fragments, and playback hints that reveal numeric or lexical access
              keys.
            </p>
          </article>
          <article className="arg-protocol-card">
            <p className="kicker">Phase 03</p>
            <h3>Portal Escalation</h3>
            <p>
              Unlock new suspect threads, hidden nodes, and antagonist contact once the clue chain resolves.
            </p>
          </article>
        </div>
      </section>

      <section className="panel section-shell">
        <span className="surface-tag">Featured Cases</span>
        <h2 className="section-title">Launch Spotlight</h2>
        <div className="featured-grid">
          {featuredStories.map(({ story, artwork }) => (
            <article key={story.storyId} className="featured-card">
              {artwork.cover?.public_path ? (
                <img src={artwork.cover.public_path} alt={`${story.storyTitle} key art`} loading="lazy" />
              ) : (
                <div
                  className="panel"
                  style={{
                    minHeight: 260,
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
              <div className="featured-copy">
                <p className="story-subgenre">
                  {story.subgenre}
                  {story.mode === 'short-test' ? ' · Short Mode' : ''}
                </p>
                <h3>{story.storyTitle}</h3>
                <p>{story.hook}</p>
                <p className="muted">
                  {story.timelineLabel} · {story.track.title}
                </p>
                <p className="muted">
                  Verified visuals: {artwork.verifiedImageCount}
                  {artwork.issueCount > 0 ? ` · Issues: ${artwork.issueCount}` : ''}
                </p>
                <div className="inline-links">
                  <a href={story.introPath}>Story Intro</a>
                  <a href={story.playPath}>Play Case</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel section-shell dual-grid">
        <div>
          <span className="surface-tag">Email Join</span>
          <h2 className="section-title">Get New Cases And Signal Drops</h2>
          <p className="section-copy">
            Join lifecycle briefings, dormant-case reactivation prompts, and release-night alerts with the
            same operator tone used inside the game runtime.
          </p>
          <LeadCaptureForm source="landing_primary" title="Email Join" />
        </div>
        <div className="feature-column">
          <article className="feature-card">
            <h3>Investigation Portal Interface</h3>
            <p>Evidence-forward layouts with analog signal texture and high-tension copy structure.</p>
          </article>
          <article className="feature-card">
            <h3>Adaptive Audio Direction</h3>
            <p>Global theme and case score switch with tension, silence windows, and villain proximity.</p>
          </article>
          <article className="feature-card">
            <h3>Operations Coverage</h3>
            <p>Admin controls, support routing, campaign orchestration, and legal consent gating.</p>
          </article>
          <div className="inline-links">
            <a href="/onboarding">Create Account</a>
            <a href="/codex">Codex Control Room</a>
            <a href="/billing">Billing + Plans</a>
          </div>
        </div>
      </section>
    </main>
  );
}
