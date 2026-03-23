import { notFound } from 'next/navigation';
import {
  loadQualityStoryReport,
  resolveOwnerGate,
  type QualityScenarioDecision
} from '../../../lib/quality-reports.server';

interface QualityStoryPageProps {
  params: Promise<{
    storyId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function renderDecision(decision: QualityScenarioDecision): JSX.Element {
  return (
    <article key={`${decision.beatId}-${decision.step}`} className="panel" style={{ padding: 12 }}>
      <h4 style={{ margin: '0 0 6px' }}>
        Step {decision.step} - {decision.beatTitle}
      </h4>
      <p className="muted" style={{ margin: '0 0 8px' }}>
        {decision.narrativeExcerpt}
      </p>
      <p style={{ margin: '0 0 8px' }}>
        <strong>Agent Thinking:</strong> {decision.agentThinking}
      </p>
      {decision.selectedOption ? (
        <p style={{ margin: '0 0 8px' }}>
          <strong>Selected:</strong> {decision.selectedOption.label} [{decision.selectedOption.intent}]
        </p>
      ) : (
        <p className="muted" style={{ margin: '0 0 8px' }}>
          Auto-advance (no explicit branch option)
        </p>
      )}
      <p className="muted" style={{ margin: '0 0 8px' }}>
        Output - Progress {decision.output.investigationProgress}% - Clues {decision.output.totalRevealedClues} - Next{' '}
        {decision.output.nextBeatId ?? 'END'}
      </p>
      <div style={{ display: 'grid', gap: 6 }}>
        {decision.incomingOutputs.map((message, index) => (
          <p key={`${decision.beatId}-msg-${index}`} className="muted" style={{ margin: 0 }}>
            [{message.channel}] {message.sender} - {message.text}
          </p>
        ))}
      </div>
    </article>
  );
}

export default async function QualityStoryPage({
  params,
  searchParams
}: QualityStoryPageProps): Promise<JSX.Element> {
  const { storyId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const ownerGate = resolveOwnerGate(resolvedSearchParams);

  if (!ownerGate.enabled || !ownerGate.authorized) {
    notFound();
  }

  const report = await loadQualityStoryReport(storyId);
  if (!report) {
    notFound();
  }

  return (
    <main className="container page-stack">
      <section className="panel section-shell">
        <span className="surface-tag">Owner QA</span>
        <h1 className="section-title">{report.title} - Quality Agent Report</h1>
        <p className="section-copy">
          Production readiness: {report.scores.productionReadiness}/100 - Difficulty {report.difficulty.level} ({report.difficulty.label})
        </p>
        <p className="muted" style={{ margin: 0 }}>
          Coverage - Beats {report.coverage.beatCoveragePercent}% - Choices {report.coverage.choiceCoveragePercent}% - Endings{' '}
          {report.coverage.endingCoveragePercent}%
        </p>
        <div className="inline-links" style={{ marginTop: 10 }}>
          <a href={`/dashboard?ownerKey=${encodeURIComponent(ownerGate.key)}`}>Back to Dashboard</a>
          <a href={`/dashboard/quality?ownerKey=${encodeURIComponent(ownerGate.key)}`}>All QA Reports</a>
        </div>
      </section>

      <section className="panel section-shell dual-grid">
        <div>
          <h2 className="section-title">Score Breakdown</h2>
          <p className="muted">Structural: {report.scores.structuralScore}</p>
          <p className="muted">Narrative: {report.scores.narrativeScore}</p>
          <p className="muted">Interaction: {report.scores.interactionScore}</p>
          <p className="muted">Novice Clarity: {report.scores.noviceClarityScore}</p>
          <p className="muted">Media Production: {report.scores.mediaProductionScore ?? 'N/A'}</p>
          <p className="muted" style={{ marginBottom: 0 }}>
            Reliability: {report.scores.reliabilityScore}
          </p>
        </div>
        <div>
          <h2 className="section-title">Key Issues</h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {report.issues.map((issue) => (
              <li key={issue} className="muted">
                {issue}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {report.mediaQuality ? (
        <section className="panel section-shell dual-grid">
          <div>
            <h2 className="section-title">Media QA Coverage</h2>
            <p className="muted">Media score: {report.mediaQuality.score}/100</p>
            <p className="muted">
              Voices: {report.mediaQuality.metrics.voiceProfilesMapped}/{report.mediaQuality.metrics.expectedCharacterVoiceProfiles}
            </p>
            <p className="muted">
              Video duration compliant: {report.mediaQuality.metrics.videoDurationCompliant}/
              {report.mediaQuality.metrics.totalVideoAssets}
            </p>
            <p className="muted" style={{ marginBottom: 0 }}>
              Video voiceover compliant: {report.mediaQuality.metrics.videoVoiceoverCompliant}/
              {report.mediaQuality.metrics.totalVideoAssets}
            </p>
          </div>
          <div>
            <h2 className="section-title">Media QA Actions</h2>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {report.mediaQuality.recommendations.map((item) => (
                <li key={item} className="muted">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="panel section-shell">
        <h2 className="section-title">Scenario Runs</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {report.scenarios.map((scenario) => (
            <details key={scenario.id} className="panel" style={{ padding: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                {scenario.strategyLabel} - Ending {scenario.ending?.type ?? 'N/A'} - Steps {scenario.totalSteps}
              </summary>
              <p className="muted" style={{ margin: '8px 0 10px' }}>
                {scenario.strategyGoal}
              </p>
              <p className="muted" style={{ margin: '0 0 10px' }}>
                Final state - Progress {scenario.finalState.investigationProgress}% - Reputation T:
                {scenario.finalState.reputation.trustworthiness} A:{scenario.finalState.reputation.aggression} C:
                {scenario.finalState.reputation.curiosity} D:{scenario.finalState.reputation.deception} M:
                {scenario.finalState.reputation.morality}
              </p>
              <div style={{ display: 'grid', gap: 8 }}>{scenario.decisions.map(renderDecision)}</div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
