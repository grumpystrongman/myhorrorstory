import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { notFound } from 'next/navigation';
import { getTrackById } from '@myhorrorstory/music';
import type { DramaPackage } from '../../../lib/play-session';
import { getLaunchCaseById } from '../../../lib/launch-catalog';

interface StoryIntroPageProps {
  params: Promise<{
    storyId: string;
  }>;
}

async function loadDramaPackage(storyId: string): Promise<DramaPackage | null> {
  const candidates = [
    join(process.cwd(), 'public', 'content', 'drama', `${storyId}.json`),
    join(process.cwd(), 'apps', 'web', 'public', 'content', 'drama', `${storyId}.json`)
  ];

  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, 'utf8');
      return JSON.parse(raw) as DramaPackage;
    } catch {
      continue;
    }
  }

  return null;
}

export default async function StoryIntroPage({ params }: StoryIntroPageProps): Promise<JSX.Element> {
  const { storyId } = await params;
  const story = getLaunchCaseById(storyId);

  if (!story) {
    notFound();
  }

  const dramaPackage = await loadDramaPackage(storyId);
  const globalTrack = getTrackById('platform-overture');
  const briefing = dramaPackage?.playerBriefing;
  const campaignWeeks = dramaPackage?.campaignPlan?.weeks ?? [];
  const npcDossiers = dramaPackage?.npcDossiers ?? [];
  const visualDeck = dramaPackage?.visualDeck?.assets ?? [];

  return (
    <main className="container page-stack">
      <section className="panel intro-hero">
        <img src={story.heroImagePath} alt={`${story.storyTitle} story key art`} />
        <div>
          <p className="kicker">Story Intro</p>
          <h1 className="section-title">{story.storyTitle}</h1>
          <p className="section-copy">{briefing?.recruitmentReason ?? story.hook}</p>
          <p className="muted">{story.spotlight}</p>
          <p className="muted" style={{ marginBottom: 4 }}>
            {briefing ? `${briefing.callSign} - ${briefing.roleTitle}` : 'Operator track pending assignment'}
          </p>
          <p className="muted" style={{ marginTop: 0 }}>
            {briefing?.firstDirective ??
              'Document every contact, preserve chain-of-custody, and avoid exposing witnesses in open channels.'}
          </p>
          <div className="inline-links">
            <a href={`/play?storyId=${story.storyId}`} data-testid="intro-start-session">
              Start Investigation Session
            </a>
            <a href="/library">Back to Library</a>
          </div>
        </div>
      </section>

      <section className="panel section-shell dual-grid">
        <div>
          <h2 className="section-title">Why You Were Recruited</h2>
          <p className="muted">Subgenre: {story.subgenre}</p>
          <p className="muted">Tone: {story.toneLabel}</p>
          <p className="muted">Session: {story.timelineLabel}</p>
          <p className="warning-line">Warnings: {story.warnings.join(', ')}</p>
          <p className="muted" style={{ marginBottom: 0 }}>
            {briefing?.personalStakes ??
              'You are entering as a specialist investigator because prior teams failed to hold narrative control.'}
          </p>
        </div>
        <div>
          <h2 className="section-title">Score Profile</h2>
          <p className="muted">Track: {story.track.title}</p>
          <p className="muted">Mood: {story.track.mood}</p>
          <p className="muted">BPM: {story.track.bpm}</p>
          <p className="muted">Global Theme: {globalTrack?.title ?? 'MHS Platform Overture'}</p>
          <p className="muted" style={{ marginBottom: 0 }}>
            Opening Incident: {briefing?.openingIncident ?? story.hook}
          </p>
        </div>
      </section>

      <section className="panel section-shell">
        <span className="surface-tag">28-Day Progression</span>
        <h2 className="section-title">Month-Long Campaign Arc</h2>
        <div className="campaign-week-list">
          {(campaignWeeks.length > 0
            ? campaignWeeks
            : [
                {
                  week: 1,
                  label: 'Week 1 - Intake',
                  objective: 'Validate first clue chain and establish response rhythm.',
                  keyMoments: ['Initial channel lock']
                },
                {
                  week: 2,
                  label: 'Week 2 - Contradictions',
                  objective: 'Map inconsistencies and pressure test witness accounts.',
                  keyMoments: ['First trust fracture']
                },
                {
                  week: 3,
                  label: 'Week 3 - Escalation',
                  objective: 'Handle direct antagonist contact and timed decisions.',
                  keyMoments: ['High-risk branch']
                },
                {
                  week: 4,
                  label: 'Week 4 - Endgame',
                  objective: 'Resolve final branch and protect season continuity.',
                  keyMoments: ['Debrief + sequel hook']
                }
              ]
          ).map((week) => (
            <article key={week.label} className="campaign-week-card">
              <p className="kicker" style={{ marginBottom: 6 }}>
                Week {week.week}
              </p>
              <h3 style={{ margin: '0 0 6px' }}>{week.label}</h3>
              <p className="muted" style={{ margin: 0 }}>{week.objective}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel section-shell">
        <span className="surface-tag">Character Dossiers</span>
        <h2 className="section-title">Who You Will Deal With</h2>
        <div className="arg-protocol-grid">
          {(npcDossiers.length > 0
            ? npcDossiers.slice(0, 6)
            : [
                {
                  id: 'fallback-handler',
                  displayName: 'Case Handler',
                  role: 'HANDLER',
                  baselineEmotion: 'CALM',
                  notableSecret: 'Profile details load when runtime package is available.'
                }
              ]
          ).map((npc) => (
            <article key={npc.id} className="arg-protocol-card">
              <h3>{npc.displayName}</h3>
              <p className="muted" style={{ marginBottom: 4 }}>
                Role: {npc.role} · Baseline: {npc.baselineEmotion}
              </p>
              <p className="muted" style={{ margin: 0 }}>{npc.notableSecret}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel section-shell">
        <span className="surface-tag">Visual Dossier</span>
        <h2 className="section-title">Scene And Evidence Frames</h2>
        <div className="visual-gallery-grid">
          {(visualDeck.length > 0
            ? visualDeck.slice(0, 9)
            : [
                {
                  id: 'fallback-visual',
                  path: story.coverImagePath,
                  title: `${story.storyTitle} key art`,
                  promptHint: 'Primary visual preview'
                }
              ]
          ).map((asset) => (
            <figure key={asset.id} className="visual-gallery-item">
              <img src={asset.path} alt={asset.title} loading="lazy" />
              <figcaption>
                <strong>{asset.title}</strong>
                <span>{asset.promptHint}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="panel section-shell">
        <span className="surface-tag">Dossier Preview</span>
        <h2 className="section-title">Case Materials</h2>
        <div className="feature-column">
          <article className="feature-card">
            <h3>Character Voice Cast</h3>
            <p>Distinct cadence per suspect with escalation-aware tone shifts during villain contact.</p>
          </article>
          <article className="feature-card">
            <h3>Evidence Chain</h3>
            <p>Cross-linked clues across messages, board reconstruction, and timed unlock events.</p>
          </article>
          <article className="feature-card">
            <h3>Branching Endings</h3>
            <p>Outcomes depend on trust, aggression, response timing, and clue integrity.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
