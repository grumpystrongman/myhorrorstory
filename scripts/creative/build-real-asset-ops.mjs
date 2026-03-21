import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const repoRoot = process.cwd();
const catalogPath = join(repoRoot, 'apps', 'web', 'public', 'agent-army', 'catalog.json');
const linearBacklogPath = join(repoRoot, 'docs', 'operations', 'linear-real-asset-backlog.json');
const openClawJobsPath = join(repoRoot, 'docs', 'operations', 'openclaw-real-asset-jobs.json');

const BOT_BY_MODALITY = {
  image: 'AI-Media-Pipeline-Agent',
  video: 'AI-Media-Pipeline-Agent',
  audio: 'AI-Voice-Audio-Agent',
  artifact: 'AI-Story-Engine-Agent',
  web: 'AI-Web-App-Agent'
};

function issueTaskForFailure(failure) {
  const botId = BOT_BY_MODALITY[failure.modality] ?? 'AI-Executive-Orchestrator';
  return {
    title: `Real Asset Repair - ${failure.story_id} - ${failure.asset_id}`,
    botId,
    priority: failure.generation_status === 'failed' ? 1 : 2,
    description: `Generate the real ${failure.modality} asset for ${failure.story_id}/${failure.asset_id}, save the file to the planned path, rebuild the verified catalog, and clear the visible gallery failure state.`,
    deliverables: [
      `Real file written to ${failure.planned_output_path}`,
      'Metadata sidecar updated with generatedProxy=false and a real checksum',
      'Verified catalog entry present or failure updated with the exact blocker'
    ],
    signoffCriteria: [
      'Output file exists and file size > 0',
      'Validation passes for the modality before the catalog marks it complete',
      'The /artwork gallery reflects the new state without placeholder cards'
    ]
  };
}

function jobForFailure(failure) {
  const botId = BOT_BY_MODALITY[failure.modality] ?? 'AI-Executive-Orchestrator';
  const command = [
    'node',
    'scripts/creative/materialize-agent-army-assets.mjs',
    '--story',
    failure.story_id,
    '--asset-id',
    failure.asset_id,
    '--regenerate'
  ].join(' ');

  return {
    id: `real-asset-${failure.asset_id}`,
    taskTitle: `Real Asset Generation - ${failure.story_id} - ${failure.asset_id}`,
    botId,
    prompt: [
      `Run this command from the repository root and do not claim success unless the real file exists: ${command}`,
      'After running it, verify the file exists on disk, has non-zero size, and is present in apps/web/public/agent-army/catalog.json.',
      'If the command fails, report the exact stderr and the blocker. If the modality is video and generation is unavailable, report unavailable rather than success.'
    ].join('\n\n')
  };
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const failures = catalog.stories.flatMap((story) => story.failures);

  const linearBacklog = {
    packageId: `real-asset-repair-${new Date().toISOString().slice(0, 10)}`,
    packageTitle: 'Real Asset Repair Backlog',
    sourceReferences: ['apps/web/public/agent-army/catalog.json', 'assets/manifests/commercial-agent-army-plan.json'],
    tasks: failures.map(issueTaskForFailure)
  };

  const openClawJobs = {
    packageId: linearBacklog.packageId,
    generatedAt: new Date().toISOString(),
    jobs: failures.map(jobForFailure)
  };

  await mkdir(join(repoRoot, 'docs', 'operations'), { recursive: true });
  await Promise.all([
    writeFile(linearBacklogPath, JSON.stringify(linearBacklog, null, 2), 'utf8'),
    writeFile(openClawJobsPath, JSON.stringify(openClawJobs, null, 2), 'utf8')
  ]);

  console.log(`[real-asset-ops] failures=${failures.length}`);
  console.log(`[real-asset-ops] ${linearBacklogPath}`);
  console.log(`[real-asset-ops] ${openClawJobsPath}`);
}

main().catch((error) => {
  console.error('[real-asset-ops] Failed:', error);
  process.exit(1);
});
