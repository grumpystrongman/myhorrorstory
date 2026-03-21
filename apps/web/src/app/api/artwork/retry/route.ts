import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveRepoRoot(): Promise<string> {
  const cwd = process.cwd();
  const candidates = [cwd, join(cwd, '..'), join(cwd, '..', '..')];

  for (const candidate of candidates) {
    if (await exists(join(candidate, 'scripts', 'creative', 'materialize-agent-army-assets.mjs'))) {
      return candidate;
    }
  }

  throw new Error('Could not resolve repository root for artwork retry route.');
}

async function runGeneration(repoRoot: string, storyId: string | null, assetId: string | null): Promise<void> {
  const args = ['scripts/creative/materialize-agent-army-assets.mjs', '--regenerate'];
  if (storyId) {
    args.push('--story', storyId);
  }
  if (assetId) {
    args.push('--asset-id', assetId);
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr || `generation command failed with exit code ${code}`));
    });
  });
}

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const storyId = String(form.get('storyId') ?? '').trim() || null;
  const assetId = String(form.get('assetId') ?? '').trim() || null;
  const repoRoot = await resolveRepoRoot();

  try {
    await runGeneration(repoRoot, storyId, assetId);
    return NextResponse.redirect(new URL('/artwork', request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: message,
        storyId,
        assetId
      },
      { status: 500 }
    );
  }
}
