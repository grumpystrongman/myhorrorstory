#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const required = [
  'package.json',
  'pnpm-workspace.yaml',
  'turbo.json',
  'docs/architecture/overview.md',
  'docs/status/phase-01.md'
];

const missing = required.filter((file) => !existsSync(file));

if (missing.length > 0) {
  console.error('Missing required files:', missing.join(', '));
  process.exit(1);
}

const readme = readFileSync('README.md', 'utf8');
if (!readme.includes('MyHorrorStory')) {
  console.error('README branding check failed');
  process.exit(1);
}

console.log('Baseline validation passed');
