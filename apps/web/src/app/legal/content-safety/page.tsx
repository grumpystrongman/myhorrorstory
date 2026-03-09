export default function ContentSafetyPage(): JSX.Element {
  return (
    <main className="container page-stack">
      <section className="panel section-shell">
        <span className="surface-tag">Safety Controls</span>
        <h1 className="section-title">Content Safety and Age Gate</h1>
        <p className="section-copy">
          MyHorrorStory is designed to be immersive without becoming harmful. Every player can tune
          intensity, threat tone, and timing behavior while preserving narrative coherence.
        </p>
      </section>

      <section className="panel section-shell legal-article">
        <h2>Age Gate</h2>
        <p>
          Players must confirm age eligibility before account activation. Age gate acceptance is stored
          with timestamped legal records.
        </p>

        <h2>Intensity Controls</h2>
        <p>
          Supported stories provide configurable pressure level, threat tone, realism level, and late-night
          messaging behavior.
        </p>

        <h2>Late-Night Delivery Controls</h2>
        <p>
          Villain-contact pacing can be restricted to reduce nocturnal disruption while maintaining story
          tension through alternate scheduling.
        </p>

        <h2>Boundary Respect</h2>
        <p>
          Real-world self-harm encouragement, targeted harassment, and non-consensual sexual content are
          prohibited. Content violating policy is blocked or escalated for moderation review.
        </p>

        <h2>Reporting</h2>
        <p>
          Use the support portal for safety reports, moderation escalation, or urgent account boundary
          changes.
        </p>
      </section>
    </main>
  );
}

