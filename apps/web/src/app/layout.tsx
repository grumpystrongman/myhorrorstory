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
        {children}
        <Suspense fallback={null}>
          <SoundtrackPlayer />
        </Suspense>
      </body>
    </html>
  );
}
