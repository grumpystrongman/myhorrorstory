const sections = [
  'Users',
  'Entitlements',
  'Stories',
  'Chapters',
  'Clues',
  'Media Assets',
  'Voice Assets',
  'Invites',
  'Support Tickets',
  'Refunds/Coupons',
  'Announcements',
  'Campaigns',
  'Segments',
  'Feature Flags',
  'Audit Logs',
  'System Health'
];

export default function AdminHomePage(): JSX.Element {
  return (
    <main className="shell">
      <aside className="nav">
        <h2>Operations</h2>
        <ul>
          {sections.map((section) => (
            <li key={section}>{section}</li>
          ))}
        </ul>
      </aside>
      <section className="main">
        <h1>Admin Console</h1>
        <p>RBAC-protected moderation, content, growth, and support operations hub.</p>
      </section>
    </main>
  );
}
