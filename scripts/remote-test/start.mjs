import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ensureDir,
  killChild,
  runCommand,
  spawnLoggedProcess,
  waitForHttp
} from './lib/process-utils.mjs';
import { createTunnelProvider } from './lib/providers/index.mjs';

const thisDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(thisDir, '../..');
const logDir = resolve(repoRoot, '.run-logs', 'remote-test');
const sessionFile = resolve(logDir, 'session.json');

const config = {
  provider: process.env.REMOTE_TEST_PROVIDER ?? 'cloudflared',
  webPort: Number(process.env.REMOTE_TEST_WEB_PORT ?? 3100),
  adminPort: Number(process.env.REMOTE_TEST_ADMIN_PORT ?? 3101),
  apiPort: Number(process.env.REMOTE_TEST_API_PORT ?? 8787),
  skipInfra: process.env.REMOTE_TEST_SKIP_INFRA === 'true',
  keepInfraOnExit: process.env.REMOTE_TEST_KEEP_INFRA === 'true',
  dryRun: process.env.REMOTE_TEST_DRY_RUN === 'true'
};

const serviceChildren = [];
const tunnelChildren = [];
let cleanupStarted = false;

function assertValidPort(port, name) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid ${name} port: ${port}`);
  }
}

async function startInfraIfNeeded() {
  if (config.skipInfra) {
    console.log('[remote-test] Skipping infra startup due to REMOTE_TEST_SKIP_INFRA=true');
    return;
  }

  console.log('[remote-test] Starting Docker infrastructure (postgres/redis/minio)...');
  await runCommand('docker', ['compose', '-f', 'infra/docker/compose.yaml', 'up', '-d'], { cwd: repoRoot });
}

function buildServices() {
  return [
    {
      name: 'api',
      localUrl: `http://127.0.0.1:${config.apiPort}`,
      healthUrl: `http://127.0.0.1:${config.apiPort}/api/v1/health`,
      command: 'corepack',
      args: ['pnpm', '--filter', '@myhorrorstory/api', 'dev'],
      env: {
        ...process.env,
        PORT: String(config.apiPort)
      }
    },
    {
      name: 'web',
      localUrl: `http://127.0.0.1:${config.webPort}`,
      healthUrl: `http://127.0.0.1:${config.webPort}`,
      command: 'corepack',
      args: ['pnpm', '--filter', '@myhorrorstory/web', 'exec', 'next', 'dev', '-p', String(config.webPort), '-H', '127.0.0.1'],
      env: {
        ...process.env
      }
    },
    {
      name: 'admin',
      localUrl: `http://127.0.0.1:${config.adminPort}`,
      healthUrl: `http://127.0.0.1:${config.adminPort}`,
      command: 'corepack',
      args: [
        'pnpm',
        '--filter',
        '@myhorrorstory/admin',
        'exec',
        'next',
        'dev',
        '-p',
        String(config.adminPort),
        '-H',
        '127.0.0.1'
      ],
      env: {
        ...process.env
      }
    }
  ];
}

function spawnServices(services) {
  for (const service of services) {
    const child = spawnLoggedProcess(
      service.name,
      service.command,
      service.args,
      {
        cwd: repoRoot,
        env: service.env,
        logFile: resolve(logDir, `${service.name}.log`)
      }
    );
    serviceChildren.push(child);
  }
}

async function waitForServices(services) {
  for (const service of services) {
    console.log(`[remote-test] Waiting for ${service.name} at ${service.healthUrl} ...`);
    await waitForHttp(service.healthUrl);
  }
}

async function openTunnels(services) {
  const provider = createTunnelProvider({
    providerName: config.provider,
    cwd: repoRoot,
    logDir
  });
  const entries = [];

  for (const service of services) {
    console.log(`[remote-test] Opening ${provider.name} tunnel for ${service.name} ...`);
    const tunnel = await provider.openTunnel(service.name, service.localUrl);
    if (tunnel.child) {
      tunnelChildren.push(tunnel.child);
    }

    entries.push({
      name: service.name,
      localUrl: service.localUrl,
      publicUrl: tunnel.publicUrl
    });
  }

  return entries;
}

async function cleanup() {
  if (cleanupStarted) {
    return;
  }
  cleanupStarted = true;

  console.log('[remote-test] Stopping tunnel and app processes...');
  for (const child of [...tunnelChildren, ...serviceChildren]) {
    killChild(child);
  }

  if (!config.skipInfra && !config.keepInfraOnExit) {
    console.log('[remote-test] Stopping Docker infrastructure...');
    try {
      await runCommand('docker', ['compose', '-f', 'infra/docker/compose.yaml', 'down'], { cwd: repoRoot });
    } catch (error) {
      console.error('[remote-test] Failed to stop docker infra cleanly:', error);
    }
  }

  console.log('[remote-test] Cleanup complete.');
}

async function main() {
  assertValidPort(config.webPort, 'web');
  assertValidPort(config.adminPort, 'admin');
  assertValidPort(config.apiPort, 'api');
  ensureDir(logDir);

  if (existsSync(sessionFile)) {
    rmSync(sessionFile, { force: true });
  }

  if (config.dryRun) {
    const services = buildServices().map((service) => ({
      name: service.name,
      localUrl: service.localUrl,
      healthUrl: service.healthUrl
    }));
    console.log('[remote-test] Dry run config:');
    console.log(
      JSON.stringify(
        {
          ...config,
          services
        },
        null,
        2
      )
    );
    return;
  }

  await startInfraIfNeeded();
  const services = buildServices();
  spawnServices(services);
  await waitForServices(services);

  const exposed = await openTunnels(services);
  const session = {
    startedAt: new Date().toISOString(),
    provider: config.provider,
    keepInfraOnExit: config.keepInfraOnExit,
    skipInfra: config.skipInfra,
    services: exposed,
    processIds: {
      services: serviceChildren.map((child) => child.pid).filter(Boolean),
      tunnels: tunnelChildren.map((child) => child.pid).filter(Boolean)
    }
  };

  writeFileSync(sessionFile, JSON.stringify(session, null, 2), 'utf8');

  console.log('\n[remote-test] Remote test session is live:');
  for (const service of exposed) {
    console.log(`  - ${service.name}: ${service.publicUrl} (local ${service.localUrl})`);
  }
  console.log(`\n[remote-test] Session metadata: ${sessionFile}`);
  console.log('[remote-test] Keep this process running. Press Ctrl+C to stop.');

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });
}

main().catch(async (error) => {
  console.error('[remote-test] Failed to start remote test session:', error);
  await cleanup();
  process.exit(1);
});
