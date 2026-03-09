import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { SoundtrackPlayer } from './components/soundtrack-player';
import './globals.css';

export const metadata: Metadata = {
  title: 'MyHorrorStory | Remote Horror Mystery Platform',
  description:
    'Cinematic remote horror mystery gameplay with solo and party investigations across web and mobile.'
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <div className="container site-header-inner">
              <a className="brand-mark" href="/">
                MyHorrorStory
              </a>
              <nav className="site-nav" aria-label="Primary">
                <a href="/onboarding">Onboarding Funnel</a>
                <a href="/library">Case Library</a>
                <a href="/play">Play Session UI</a>
                <a href="/dashboard">User Dashboard</a>
                <a href="/codex">Codex Control Room</a>
              </nav>
            </div>
          </header>

          {children}

          <footer className="site-footer">
            <div className="container site-footer-inner">
              <p>MyHorrorStory · Cinematic remote investigation platform</p>
              <div className="inline-links">
                <a href="/legal/terms">Terms</a>
                <a href="/legal/privacy">Privacy</a>
                <a href="/legal/content-safety">Content Safety</a>
                <a href="/support">Support</a>
              </div>
            </div>
          </footer>
        </div>
        <Suspense fallback={null}>
          <SoundtrackPlayer />
        </Suspense>
      </body>
    </html>
  );
}

