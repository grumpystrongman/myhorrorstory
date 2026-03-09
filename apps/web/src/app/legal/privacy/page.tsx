const privacyVersion = '2026-03-09';

export default function PrivacyPage(): JSX.Element {
  return (
    <main className="container page-stack">
      <section className="panel section-shell">
        <span className="surface-tag">Legal</span>
        <h1 className="section-title">Privacy Notice</h1>
        <p className="muted">Version {privacyVersion} · Effective March 9, 2026</p>
        <p className="section-copy">
          This notice explains what personal data we collect, why it is processed, and how consent,
          retention, and deletion workflows are handled.
        </p>
      </section>

      <section className="panel section-shell legal-article">
        <h2>Data We Collect</h2>
        <p>
          Account data (email, display name), legal acceptance records, messaging channel mappings,
          gameplay progress, support communications, billing references, and analytics events.
        </p>

        <h2>How Data Is Used</h2>
        <p>
          We process data to operate gameplay, deliver synchronized story events, manage purchases,
          provide support, prevent abuse, and run lifecycle communications where consent exists.
        </p>

        <h2>Communication and Marketing</h2>
        <p>
          Marketing email is opt-in and can be changed at any time. Transactional notifications and
          security alerts may still be sent when required for account operations.
        </p>

        <h2>Sharing and Processors</h2>
        <p>
          We use vetted processors for messaging, payments, analytics, and support tooling. Data sharing
          is limited to operational purposes under contractual safeguards.
        </p>

        <h2>Retention</h2>
        <p>
          Data is retained only as long as necessary for service delivery, legal obligations, abuse
          prevention, and dispute handling. Regional deletion rights are honored.
        </p>

        <h2>Your Rights</h2>
        <p>
          You may request access, correction, export, deletion, and consent withdrawal, subject to
          applicable law and security constraints.
        </p>

        <h2>Contact</h2>
        <p>
          Privacy requests: <a href="mailto:privacy@myhorrorstory.com">privacy@myhorrorstory.com</a>
        </p>
      </section>
    </main>
  );
}

