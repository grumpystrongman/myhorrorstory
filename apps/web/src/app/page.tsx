import { LeadCaptureForm } from './components/lead-capture-form';
import { getLaunchCases } from './lib/launch-catalog';

const launchCases = getLaunchCases();
const featuredCases = launchCases.slice(0, 3);

export default function HomePage(): JSX.Element {
  return (
    <main className="container page-stack">
      <header className="hero-shell">
        <div className="hero-backdrop" aria-hidden="true" />
        <div className="hero-content">
          <p className="kicker">MyHorrorStory</p>
          <h1 className="hero-title">Remote Horror Mystery Platform</h1>
          <p className="hero-copy">
            Premium cinematic investigations for solo and remote party play. Each case combines story
            chat, voice drops, evidence boards, adaptive score, and branching endings.
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
              <strong>{launchCases.length} Story Frameworks</strong>
              <span>10 launch arcs plus 1 short-mode QA case.</span>
            </article>
            <article className="metric">
              <strong>Async + Live Party Play</strong>
              <span>Invite links, host/hostless, and synchronized chapter events.</span>
            </article>
            <article className="metric">
              <strong>Commercial Lifecycle Ops</strong>
              <span>Email automation, analytics, referrals, billing, and support coverage.</span>
            </article>
          </div>
        </div>
      </header>

      <section className="panel section-shell">
        <span className="surface-tag">Featured Cases</span>
        <h2 className="section-title">Launch Spotlight</h2>
        <div className="featured-grid">
          {featuredCases.map((story) => (
            <article key={story.storyId} className="featured-card">
              <img src={story.coverImagePath} alt={`${story.storyTitle} key art`} loading="lazy" />
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
          <h2 className="section-title">Get New Cases and Launch Drops</h2>
          <p className="section-copy">
            Join lifecycle briefings, abandoned-case reminders, win-back campaigns, and premium upsell
            drops through our growth automation stack.
          </p>
          <LeadCaptureForm source="landing_primary" title="Email Join" />
        </div>
        <div className="feature-column">
          <article className="feature-card">
            <h3>Commercial Website Design</h3>
            <p>Bespoke story art surfaces, premium copy hierarchy, and conversion-led onboarding.</p>
          </article>
          <article className="feature-card">
            <h3>Adaptive Audio Direction</h3>
            <p>Global theme and story score switch dynamically with scene tension and villain pressure.</p>
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

