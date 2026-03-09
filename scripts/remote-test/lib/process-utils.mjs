import { appendFileSync, createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

export function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function commandExists(command) {
  const probe = spawnSync(command, ['--version'], {
    stdio: 'ignore',
    shell: false
  });
  return probe.status === 0;
}

export function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: options.stdio ?? 'inherit',
      shell: false
    });

    child.on('error', (error) => reject(error));
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? -1}`));
    });
  });
}

export function spawnLoggedProcess(name, command, args, options = {}) {
  ensureDir(dirname(options.logFile));
  const stream = createWriteStream(options.logFile, { flags: 'a' });
  appendFileSync(options.logFile, `\n[${new Date().toISOString()}] START ${name}\n`);

  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    shell: false
  });

  child.stdout?.on('data', (chunk) => stream.write(chunk));
  child.stderr?.on('data', (chunk) => stream.write(chunk));
  child.on('error', (error) => {
    stream.write(`\n[${new Date().toISOString()}] ERROR ${String(error)}\n`);
  });
  child.on('exit', (code, signal) => {
    stream.write(`\n[${new Date().toISOString()}] EXIT code=${code ?? 'null'} signal=${signal ?? 'null'}\n`);
    stream.end();
  });

  return child;
}

export async function waitForHttp(url, timeoutMs = 240_000, intervalMs = 2_000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // Retry until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

export function killChild(child) {
  if (!child || child.killed) {
    return;
  }

  try {
    child.kill('SIGTERM');
  } catch {
    // Ignore process termination errors during cleanup.
  }
}
