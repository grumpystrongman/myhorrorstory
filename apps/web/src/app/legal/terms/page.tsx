const termsVersion = '2026-03-09';

export default function TermsPage(): JSX.Element {
  return (
    <main className="container page-stack">
      <section className="panel section-shell">
        <span className="surface-tag">Legal</span>
        <h1 className="section-title">Terms and Conditions</h1>
        <p className="muted">Version {termsVersion} · Effective March 9, 2026</p>
        <p className="section-copy">
          These Terms govern access to MyHorrorStory on web, mobile, and messaging channels (SMS,
          WhatsApp, Telegram, email). Account creation requires explicit digital acceptance.
        </p>
      </section>

      <section className="panel section-shell legal-article">
        <h2>1. Eligibility and Account Responsibility</h2>
        <p>
          You must be at least 18 years old, or legal age in your jurisdiction, to use this service.
          You are responsible for safeguarding account credentials and activity under your account.
        </p>

        <h2>2. Content Nature and Safety</h2>
        <p>
          MyHorrorStory contains mature horror themes including coercive threats, unsettling audio, and
          psychological tension. You may configure intensity settings and communication boundaries in
          supported experiences.
        </p>

        <h2>3. Messaging and Contact Consent</h2>
        <p>
          By enabling SMS, WhatsApp, Telegram, or email delivery, you confirm authorization to receive
          interactive narrative communications and operational notices. Carrier and data charges may apply.
        </p>

        <h2>4. Purchases and Subscriptions</h2>
        <p>
          Paid features may include subscriptions, premium cases, and one-time expansions. Pricing,
          billing cadence, and cancellation policy are shown at checkout. Refunds are handled per regional
          law and platform policy.
        </p>

        <h2>5. User Conduct</h2>
        <p>
          You agree not to exploit, reverse engineer, abuse communication channels, impersonate others, or
          interfere with service integrity. We may suspend accounts for security abuse, fraud, or policy
          violations.
        </p>

        <h2>6. Intellectual Property and Generated Assets</h2>
        <p>
          The platform, story frameworks, visual assets, audio, and software are protected intellectual
          property. AI-assisted media remains governed by our licensing and provenance controls.
        </p>

        <h2>7. Availability and Service Changes</h2>
        <p>
          We may modify, pause, or retire features, stories, and integrations as required for safety,
          legal, operational, or commercial reasons.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          The service is provided on an "as available" basis. To the maximum extent permitted by law,
          MyHorrorStory is not liable for indirect, incidental, or consequential damages.
        </p>

        <h2>9. Governing Law</h2>
        <p>
          Unless otherwise required by local law, these Terms are governed by the laws stated in your
          commercial agreement and disputes are resolved in the designated venue.
        </p>

        <h2>10. Contact</h2>
        <p>
          Legal and compliance requests: <a href="mailto:legal@myhorrorstory.com">legal@myhorrorstory.com</a>
        </p>
      </section>
    </main>
  );
}

