import { LeadCaptureForm } from '../components/lead-capture-form';
import { SupportAssistant } from '../components/support-assistant';

export default function SupportPage(): JSX.Element {
  return (
    <main className="container page-stack">
      <section className="panel section-shell">
        <span className="surface-tag">Operations</span>
        <h1 className="section-title">Support Portal</h1>
        <p className="section-copy">
          File support requests, moderation concerns, billing cases, and urgent safety escalations.
        </p>
      </section>

      <section className="panel section-shell dual-grid">
        <div>
          <h2 className="section-title">Support Channels</h2>
          <ul className="legal-list">
            <li>Priority account support for active subscribers</li>
            <li>Safety moderation escalation in under 24 hours</li>
            <li>Refund and billing review workflows</li>
          </ul>
          <p className="muted">Direct contact: support@myhorrorstory.com</p>
        </div>
        <LeadCaptureForm source="support_follow_up" title="Support Follow-up Email" compact />
      </section>

      <SupportAssistant />
    </main>
  );
}
