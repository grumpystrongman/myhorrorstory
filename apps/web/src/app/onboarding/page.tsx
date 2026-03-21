import { LeadCaptureForm } from '../components/lead-capture-form';
import { SignupForm } from '../components/signup-form';

export default function OnboardingPage(): JSX.Element {
  return (
    <main className="container page-stack">
      <section className="panel section-shell onboarding-hero">
        <span className="surface-tag">Operator Intake</span>
        <h1 className="section-title">Onboarding Funnel</h1>
        <p className="section-copy">
          Pair your investigator identity, record legal acceptance, pass age gate confirmation, and enable
          signal updates before first case access.
        </p>
      </section>

      <section className="panel section-shell onboarding-protocol-shell">
        <span className="surface-tag">Access Sequence</span>
        <h2 className="section-title">Pairing Checklist</h2>
        <div className="onboarding-protocol-grid">
          <article className="onboarding-protocol-card">
            <h3>Identity Pairing</h3>
            <p>Create your investigator record and attach contact channels for live transmissions.</p>
          </article>
          <article className="onboarding-protocol-card">
            <h3>Consent Record</h3>
            <p>Capture terms, privacy, and age-gate acceptance before activating mature story content.</p>
          </article>
          <article className="onboarding-protocol-card">
            <h3>Signal Sync</h3>
            <p>Enable lifecycle updates so dormant investigations and chapter drops are never missed.</p>
          </article>
        </div>
      </section>

      <section className="onboarding-grid">
        <div className="panel section-shell">
          <SignupForm />
        </div>
        <div className="panel section-shell">
          <h3>Need updates before signup?</h3>
          <p className="section-copy">
            Join by email first. You will still receive new case launch drops, recovery prompts, and
            referral campaigns.
          </p>
          <LeadCaptureForm source="onboarding_secondary" />
          <hr className="divider" />
          <h4>Required Legal Agreements</h4>
          <ul className="legal-list">
            <li>
              <a href="/legal/terms">Terms and Conditions</a> (digital acceptance required)
            </li>
            <li>
              <a href="/legal/privacy">Privacy Notice</a> (consent and processing disclosure)
            </li>
            <li>
              <a href="/legal/content-safety">Content Safety + Age Gate</a> (intensity and boundary controls)
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
