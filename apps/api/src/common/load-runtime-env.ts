import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }

  const parsed: Record<string, string> = {};
  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!key) {
      continue;
    }
    parsed[key] = value;
  }
  return parsed;
}

function findRepoRoots(startDir: string): string[] {
  const candidates = [
    startDir,
    resolve(startDir, '..'),
    resolve(startDir, '..', '..'),
    resolve(startDir, '..', '..', '..')
  ];
  return [...new Set(candidates)];
}

export function loadRuntimeEnv(): void {
  const roots = findRepoRoots(process.cwd());
  const files = ['.secrets/communications.env', '.env.local', '.env'];

  for (const root of roots) {
    for (const relative of files) {
      const absolute = resolve(root, relative);
      const parsed = parseEnvFile(absolute);
      for (const [key, value] of Object.entries(parsed)) {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

