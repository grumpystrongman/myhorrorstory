import { ChannelSetupConsole } from '../../components/channel-setup-console';

export default function DashboardChannelsPage(): JSX.Element {
  return (
    <main className="container page-stack">
      <section className="panel section-shell">
        <span className="surface-tag">Operator Channels</span>
        <h1 className="section-title">Messaging Channel Setup</h1>
        <p className="section-copy">
          Configure SMS, WhatsApp, and Telegram routing for any player profile, then run live setup tests before
          launching a session.
        </p>
      </section>
      <ChannelSetupConsole />
    </main>
  );
}
