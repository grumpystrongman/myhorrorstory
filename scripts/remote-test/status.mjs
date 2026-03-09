import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const thisDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(thisDir, '../..');
const sessionFile = resolve(repoRoot, '.run-logs', 'remote-test', 'session.json');

if (!existsSync(sessionFile)) {
  console.error('[remote-test] No active remote test session found.');
  process.exit(1);
}

const session = JSON.parse(readFileSync(sessionFile, 'utf8'));
console.log(`[remote-test] Provider: ${session.provider}`);
console.log(`[remote-test] Started: ${session.startedAt}`);
for (const service of session.services ?? []) {
  console.log(`- ${service.name}: ${service.publicUrl} (local ${service.localUrl})`);
}
console.log(`[remote-test] Session file: ${sessionFile}`);
