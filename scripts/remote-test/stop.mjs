import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand } from './lib/process-utils.mjs';

const thisDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(thisDir, '../..');
const sessionFile = resolve(repoRoot, '.run-logs', 'remote-test', 'session.json');
const skipInfra = process.env.REMOTE_TEST_SKIP_INFRA === 'true';

function killPid(pid) {
  if (!pid) {
    return;
  }

  try {
    process.kill(Number(pid), 'SIGTERM');
  } catch {
    // Ignore stale process IDs.
  }
}

async function main() {
  if (existsSync(sessionFile)) {
    const session = JSON.parse(readFileSync(sessionFile, 'utf8'));
    const servicePids = Array.isArray(session?.processIds?.services) ? session.processIds.services : [];
    const tunnelPids = Array.isArray(session?.processIds?.tunnels) ? session.processIds.tunnels : [];

    for (const pid of [...tunnelPids, ...servicePids]) {
      killPid(pid);
    }
    rmSync(sessionFile, { force: true });
    console.log(`[remote-test] Stopped recorded processes and removed ${sessionFile}`);
  } else {
    console.log('[remote-test] No session file found. Continuing with infra cleanup.');
  }

  if (!skipInfra) {
    try {
      await runCommand('docker', ['compose', '-f', 'infra/docker/compose.yaml', 'down'], {
        cwd: repoRoot,
        stdio: 'ignore'
      });
      console.log('[remote-test] Docker infrastructure stopped.');
    } catch (error) {
      console.warn('[remote-test] Docker infrastructure was not reachable; skipping compose shutdown.');
      if (error instanceof Error) {
        console.warn(`[remote-test] Detail: ${error.message}`);
      }
    }
  }
}

main().catch((error) => {
  console.error('[remote-test] Failed to stop cleanly:', error);
  process.exit(1);
});
