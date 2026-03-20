import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dramaDir = join(repoRoot, 'apps', 'web', 'public', 'content', 'drama');
const storiesDir = join(repoRoot, 'docs', 'stories');
const simulationsDir = join(repoRoot, 'apps', 'web', 'public', 'simulations');
const reportsDir = join(repoRoot, 'docs', 'simulations');

mkdirSync(simulationsDir, { recursive: true });
mkdirSync(reportsDir, { recursive: true });

const dramaIndex = JSON.parse(readFileSync(join(dramaDir, 'index.json'), 'utf8'));

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toChoiceLabel(choice) {
  return `${choice.label} [intent: ${choice.intent}]`;
}

function findStoryPackage(storyId) {
  const path = join(storiesDir, `${storyId}.story.json`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function buildDefaultRun(drama) {
  const beatsById = new Map(drama.beats.map((beat) => [beat.id, beat]));
  const run = [];
  let cursor = drama.beats[0]?.id ?? null;
  const visited = new Set();

  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    const beat = beatsById.get(cursor);
    if (!beat) {
      break;
    }

    const selected = beat.responseOptions?.[0] ?? null;
    run.push({
      beatId: beat.id,
      beatTitle: beat.title,
      selectedChoiceId: selected?.id ?? null,
      selectedChoiceLabel: selected ? toChoiceLabel(selected) : 'No branching choice',
      clueReveals: beat.revealClueIds ?? [],
      channelTouches: (beat.incomingMessages ?? []).map((message) => message.channel)
    });

    cursor = selected?.nextBeatId ?? beat.defaultNextBeatId ?? null;
  }

  return run;
}

function renderStoryPage(drama, story, defaultRun) {
  const heroVisual = drama.beats?.[0]?.backgroundVisual ?? '/visuals/surfaces/landing-hero.svg';
  const scorePath = `/audio/scores/${drama.id}.wav`;
  const simulationData = {
    title: drama.title,
    beats: drama.beats,
    endings: drama.endings,
    defaultRun
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(drama.title)} | Full Playthrough Simulation</title>
  <style>
    :root {
      --ink: #f5efe2;
      --muted: #c8bdab;
      --bg: #05070a;
      --panel: rgba(13, 19, 27, 0.9);
      --line: #2a3a4f;
      --accent: #e3a05d;
      --accent-2: #6cd0da;
      --danger: #d46a6a;
      --heading: "Cormorant Garamond", "Times New Roman", serif;
      --body: "IBM Plex Sans", "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background:
        radial-gradient(circle at 14% 0%, rgba(227, 160, 93, 0.24), transparent 42%),
        radial-gradient(circle at 86% 16%, rgba(108, 208, 218, 0.18), transparent 38%),
        linear-gradient(165deg, #040609 0%, #080d13 58%, #040608 100%);
      color: var(--ink);
      font-family: var(--body);
      min-height: 100vh;
      padding: 24px;
      line-height: 1.45;
    }
    a { color: var(--accent-2); text-decoration: none; }
    .container { max-width: 1240px; margin: 0 auto; display: grid; gap: 16px; }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 18px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(6px);
    }
    .hero {
      display: grid;
      gap: 12px;
    }
    .hero-image {
      border-radius: 12px;
      border: 1px solid var(--line);
      width: 100%;
      height: 320px;
      object-fit: cover;
      background: #09101a;
    }
    h1, h2, h3 {
      margin: 0;
      font-family: var(--heading);
      letter-spacing: 0.02em;
    }
    h1 { font-size: clamp(2rem, 5vw, 3.4rem); }
    h2 { font-size: clamp(1.4rem, 3vw, 2rem); }
    h3 { font-size: 1.2rem; }
    .meta-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    .meta-card {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: rgba(6, 10, 15, 0.75);
      padding: 10px 12px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--line);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
      margin-right: 6px;
    }
    .layout {
      display: grid;
      gap: 16px;
      grid-template-columns: 1.4fr 1fr;
      align-items: start;
    }
    .timeline {
      display: grid;
      gap: 10px;
      max-height: 360px;
      overflow: auto;
      padding-right: 4px;
    }
    .timeline-item {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: rgba(6, 12, 20, 0.86);
      padding: 10px;
    }
    .timeline-item p {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 14px;
    }
    .grid-2 {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }
    .npc {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 10px;
      background: rgba(7, 12, 18, 0.88);
    }
    .npc ul {
      margin: 8px 0 0;
      padding-left: 18px;
      color: var(--muted);
      font-size: 14px;
    }
    .sim-controls {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    button {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 8px 12px;
      background: #101825;
      color: var(--ink);
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
    }
    button:hover { border-color: var(--accent); }
    .choice {
      width: 100%;
      border-radius: 10px;
      text-align: left;
      margin: 6px 0;
      padding: 10px;
    }
    .transcript-item {
      border-left: 2px solid var(--accent);
      padding-left: 10px;
      margin: 8px 0;
      color: var(--muted);
      font-size: 14px;
    }
    .ending {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 10px;
      background: rgba(21, 10, 10, 0.5);
      margin-top: 8px;
    }
    .warning {
      color: var(--danger);
      font-size: 13px;
    }
    @media (max-width: 980px) {
      .layout { grid-template-columns: 1fr; }
      body { padding: 14px; }
      .hero-image { height: 240px; }
    }
  </style>
</head>
<body>
  <main class="container">
    <section class="panel hero">
      <a href="/simulations/index.html">← Back to simulation index</a>
      <img class="hero-image" src="${escapeHtml(heroVisual)}" alt="${escapeHtml(drama.title)} key art" />
      <h1>${escapeHtml(drama.title)}</h1>
      <p>${escapeHtml(drama.hook)}</p>
      <div>
        ${(drama.channels ?? []).map((channel) => `<span class="badge">${escapeHtml(channel)}</span>`).join('')}
      </div>
      <div class="meta-grid">
        <div class="meta-card"><strong>Subgenre:</strong> ${escapeHtml(drama.subgenre)}</div>
        <div class="meta-card"><strong>Tone:</strong> ${escapeHtml(drama.tone)}</div>
        <div class="meta-card"><strong>Location:</strong> ${escapeHtml(drama.location)}</div>
      </div>
      <audio controls preload="metadata">
        <source src="${escapeHtml(scorePath)}" type="audio/wav" />
      </audio>
      <p class="warning">Playback uses generated score loops; connect final mastered stems before release.</p>
    </section>

    <section class="panel layout">
      <div>
        <h2>Message Timeline</h2>
        <div class="timeline" id="timeline">
          ${drama.beats
            .map(
              (beat) => `<article class="timeline-item">
                <h3>${escapeHtml(beat.title)}</h3>
                <p>${escapeHtml(beat.narrative)}</p>
                ${(beat.incomingMessages ?? [])
                  .map(
                    (msg) =>
                      `<p><span class="badge">${escapeHtml(msg.channel)}</span><strong>${escapeHtml(msg.senderName)}:</strong> ${escapeHtml(msg.text)}</p>`
                  )
                  .join('')}
              </article>`
            )
            .join('')}
        </div>
      </div>
      <div>
        <h2>Simulation Console</h2>
        <div class="sim-controls">
          <button id="start-sim">Start</button>
          <button id="next-choice">Auto Next Choice</button>
          <button id="run-default">Run Default Path</button>
          <button id="reset-sim">Reset</button>
        </div>
        <div id="sim-beat" class="timeline-item">Press <strong>Start</strong> to begin.</div>
        <div id="sim-choices"></div>
        <h3 style="margin-top:12px;">Transcript</h3>
        <div id="sim-transcript"></div>
        <div id="sim-endings"></div>
      </div>
    </section>

    <section class="panel">
      <h2>NPC + Villain Dossiers</h2>
      <div class="grid-2">
        <article class="npc">
          <h3>${escapeHtml(story.villain.displayName)} (Villain)</h3>
          <ul>
            <li>Archetype: ${escapeHtml(story.villain.archetype)}</li>
            <li>Worldview: ${escapeHtml(story.villain.worldview)}</li>
            <li>Motive: ${escapeHtml(story.villain.motive)}</li>
            <li>Tactics: ${escapeHtml(story.villain.manipulationTactics.join(', '))}</li>
            <li>Motifs: ${escapeHtml(story.villain.symbolicMotifs.join(', '))}</li>
          </ul>
        </article>
        ${story.npcProfiles
          .map(
            (npc) => `<article class="npc">
              <h3>${escapeHtml(npc.displayName)}</h3>
              <ul>
                <li>Role: ${escapeHtml(npc.role)}</li>
                <li>Traits: ${escapeHtml(npc.personalityTraits.join(', '))}</li>
                <li>Motivations: ${escapeHtml(npc.motivations.join('; '))}</li>
                <li>Trust: ${npc.trustBaseline} - ${npc.trustCeiling}</li>
                <li>Secret: ${escapeHtml(npc.secrets[0]?.summary ?? 'n/a')}</li>
              </ul>
            </article>`
          )
          .join('')}
      </div>
    </section>
  </main>
  <script>
    const data = ${JSON.stringify(simulationData)};
    const beatById = new Map(data.beats.map((beat) => [beat.id, beat]));
    const transcript = [];
    let cursor = data.beats[0] ? data.beats[0].id : null;
    let started = false;

    function setHtml(id, html) {
      document.getElementById(id).innerHTML = html;
    }

    function renderTranscript() {
      if (transcript.length === 0) {
        setHtml('sim-transcript', '<p class="warning">No choices logged yet.</p>');
        return;
      }
      setHtml(
        'sim-transcript',
        transcript
          .map((entry) => '<div class="transcript-item"><strong>' + entry.beat + '</strong><br />' + entry.choice + '</div>')
          .join('')
      );
    }

    function renderBeat() {
      if (!cursor) {
        setHtml(
          'sim-beat',
          '<p>Simulation complete. Review ending options below and replay with alternate branch choices.</p>'
        );
        setHtml(
          'sim-endings',
          data.endings
            .map((ending) =>
              '<article class="ending"><h3>' +
              ending.title +
              ' (' + ending.type + ')</h3><p>' + ending.summary + '</p><p><em>' + ending.epilogue + '</em></p></article>'
            )
            .join('')
        );
        setHtml('sim-choices', '');
        return;
      }

      const beat = beatById.get(cursor);
      if (!beat) {
        cursor = null;
        renderBeat();
        return;
      }

      setHtml(
        'sim-beat',
        '<h3>' + beat.title + '</h3><p>' + beat.narrative + '</p>' +
        (beat.incomingMessages || [])
          .map((msg) => '<p><span class="badge">' + msg.channel + '</span><strong>' + msg.senderName + ':</strong> ' + msg.text + '</p>')
          .join('')
      );

      const choices = beat.responseOptions || [];
      if (choices.length === 0) {
        setHtml('sim-choices', '<p class="warning">No explicit choice. Use Auto Next Choice to continue.</p>');
        return;
      }

      setHtml(
        'sim-choices',
        choices
          .map(
            (choice, index) =>
              '<button class="choice" data-index="' + index + '">' +
              choice.label + ' [intent: ' + choice.intent + ']' +
              '</button>'
          )
          .join('')
      );

      document.querySelectorAll('.choice').forEach((node) => {
        node.addEventListener('click', () => {
          const index = Number(node.getAttribute('data-index'));
          applyChoice(index);
        });
      });
    }

    function applyChoice(choiceIndex) {
      const beat = beatById.get(cursor);
      if (!beat) {
        return;
      }
      const selected = (beat.responseOptions || [])[choiceIndex] || null;
      transcript.push({
        beat: beat.title,
        choice: selected ? selected.label + ' [intent: ' + selected.intent + ']' : 'Auto progression'
      });
      renderTranscript();
      cursor = selected && selected.nextBeatId ? selected.nextBeatId : (beat.defaultNextBeatId || null);
      renderBeat();
    }

    function runDefaultPath() {
      if (!started) {
        started = true;
      }
      while (cursor) {
        const beat = beatById.get(cursor);
        if (!beat) {
          cursor = null;
          break;
        }
        if ((beat.responseOptions || []).length > 0) {
          applyChoice(0);
        } else {
          transcript.push({ beat: beat.title, choice: 'Auto progression' });
          cursor = beat.defaultNextBeatId || null;
          renderTranscript();
          renderBeat();
        }
      }
    }

    document.getElementById('start-sim').addEventListener('click', () => {
      started = true;
      cursor = data.beats[0] ? data.beats[0].id : null;
      transcript.length = 0;
      setHtml('sim-endings', '');
      renderTranscript();
      renderBeat();
    });

    document.getElementById('next-choice').addEventListener('click', () => {
      if (!started) {
        document.getElementById('start-sim').click();
        return;
      }
      applyChoice(0);
    });

    document.getElementById('run-default').addEventListener('click', runDefaultPath);

    document.getElementById('reset-sim').addEventListener('click', () => {
      started = false;
      cursor = data.beats[0] ? data.beats[0].id : null;
      transcript.length = 0;
      setHtml('sim-endings', '');
      setHtml('sim-beat', 'Press <strong>Start</strong> to begin.');
      setHtml('sim-choices', '');
      renderTranscript();
    });

    renderTranscript();
  </script>
</body>
</html>`;
}

function buildIndexPage(rows) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MyHorrorStory | Full Playthrough Simulations</title>
  <style>
    :root {
      --bg: #06090e;
      --panel: #0f1722;
      --line: #27384d;
      --ink: #f3eee4;
      --muted: #c4b9a8;
      --accent: #d98f56;
      --accent-2: #6bcfdd;
      --heading: "Cormorant Garamond", "Times New Roman", serif;
      --body: "IBM Plex Sans", "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      color: var(--ink);
      font-family: var(--body);
      background:
        radial-gradient(circle at 15% 0%, rgba(217, 143, 86, 0.21), transparent 40%),
        radial-gradient(circle at 88% 14%, rgba(107, 207, 221, 0.17), transparent 35%),
        linear-gradient(170deg, #05080e 0%, #070d16 60%, #04070b 100%);
      min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; display: grid; gap: 16px; }
    .panel {
      border: 1px solid var(--line);
      background: rgba(15, 23, 34, 0.92);
      border-radius: 16px;
      padding: 16px;
    }
    h1, h2 { margin: 0; font-family: var(--heading); }
    .card-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px;
      background: rgba(8, 13, 21, 0.86);
    }
    .card a {
      display: inline-block;
      margin-top: 8px;
      color: var(--accent-2);
      text-decoration: none;
    }
    .metric {
      font-size: 30px;
      color: var(--accent);
      line-height: 1;
    }
    .muted { color: var(--muted); }
  </style>
</head>
<body>
  <main class="container">
    <section class="panel">
      <h1>Full Playthrough Simulations</h1>
      <p class="muted">Generated cross-story simulation pages with visuals, score playback, branch interactions, villain/NPC dossiers, and default-run transcripts.</p>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(140px,1fr));gap:12px;">
        <div class="panel"><div class="metric">${rows.length}</div><div class="muted">Stories</div></div>
        <div class="panel"><div class="metric">${rows.reduce((sum, row) => sum + row.beatCount, 0)}</div><div class="muted">Playable Beats</div></div>
        <div class="panel"><div class="metric">${rows.reduce((sum, row) => sum + row.endingCount, 0)}</div><div class="muted">Endings</div></div>
      </div>
    </section>
    <section class="panel card-grid">
      ${rows
        .map(
          (row) => `<article class="card">
            <h2>${escapeHtml(row.title)}</h2>
            <p class="muted">${escapeHtml(row.hook)}</p>
            <p>Beats: ${row.beatCount} | Endings: ${row.endingCount} | Default Run Steps: ${row.defaultRunSteps}</p>
            <a href="/simulations/${row.storyId}.html">Open simulation</a>
          </article>`
        )
        .join('')}
    </section>
  </main>
</body>
</html>`;
}

function main() {
  const reportRows = [];

  for (const entry of dramaIndex) {
    const drama = JSON.parse(readFileSync(join(dramaDir, `${entry.storyId}.json`), 'utf8'));
    const story = findStoryPackage(entry.storyId);
    const defaultRun = buildDefaultRun(drama);

    const pageHtml = renderStoryPage(drama, story, defaultRun);
    writeFileSync(join(simulationsDir, `${entry.storyId}.html`), pageHtml, 'utf8');

    reportRows.push({
      storyId: entry.storyId,
      title: drama.title,
      hook: drama.hook,
      beatCount: drama.beats.length,
      endingCount: drama.endings.length,
      defaultRunSteps: defaultRun.length,
      defaultRun
    });
  }

  const indexHtml = buildIndexPage(reportRows);
  writeFileSync(join(simulationsDir, 'index.html'), indexHtml, 'utf8');

  const reportJsonPath = join(reportsDir, 'full-playthrough-report.json');
  writeFileSync(
    reportJsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        storyCount: reportRows.length,
        stories: reportRows
      },
      null,
      2
    ),
    'utf8'
  );

  const reportMarkdown = [
    '# Full Playthrough Simulation Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `- Story count: ${reportRows.length}`,
    `- Playable beats total: ${reportRows.reduce((sum, row) => sum + row.beatCount, 0)}`,
    `- Ending variants total: ${reportRows.reduce((sum, row) => sum + row.endingCount, 0)}`,
    '',
    '## Story Runs',
    '',
    ...reportRows.flatMap((row) => [
      `### ${row.title} (\`${row.storyId}\`)`,
      `- Hook: ${row.hook}`,
      `- Beats: ${row.beatCount}`,
      `- Endings: ${row.endingCount}`,
      `- Default path steps: ${row.defaultRunSteps}`,
      ...row.defaultRun.map(
        (step, index) =>
          `  - ${index + 1}. ${step.beatTitle} -> ${step.selectedChoiceLabel} [channels: ${
            step.channelTouches.length > 0 ? step.channelTouches.join(', ') : 'none'
          }]`
      ),
      ''
    ])
  ].join('\n');

  const reportMarkdownPath = join(reportsDir, 'full-playthrough-report.md');
  writeFileSync(reportMarkdownPath, `${reportMarkdown}\n`, 'utf8');

  process.stdout.write(`[simulations] Generated ${reportRows.length} story pages in ${simulationsDir}\n`);
  process.stdout.write(`[simulations] Report: ${reportMarkdownPath}\n`);
}

main();
