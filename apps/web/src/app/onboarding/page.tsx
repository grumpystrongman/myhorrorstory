import { LeadCaptureForm } from '../components/lead-capture-form';
import { SignupForm } from '../components/signup-form';

export default function OnboardingPage(): JSX.Element {
  return (
    <main className="container page-stack">
      <section className="panel section-shell onboarding-hero">
        <span className="surface-tag">Onboarding Funnel</span>
        <h1 className="section-title">Onboarding Funnel</h1>
        <p className="section-copy">
          Create your investigator profile, record legal acceptance, pass age gate confirmation, and opt
          into lifecycle briefings.
        </p>
      </section>

      <section className="onboarding-grid">
        <div className="panel section-shell">
          <SignupForm />
        </div>
        <div className="panel section-shell">
          <h3>Need updates before signup?</h3>
          <p className="section-copy">
            Join by email first. You will still receive new case launch drops, win-back prompts, and
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

