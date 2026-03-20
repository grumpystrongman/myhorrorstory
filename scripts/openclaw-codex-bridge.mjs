#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

function usageAndExit(message) {
  if (message) {
    process.stderr.write(`${message}\n`);
  }
  process.stderr.write('Usage: openclaw-codex-bridge exec --json <prompt>\n');
  process.stderr.write('   or: openclaw-codex-bridge exec resume --json <threadId> <prompt>\n');
  process.exit(2);
}

function parseCliArgs(argv) {
  if (argv.length >= 3 && argv[0] === 'exec' && argv[1] === '--json') {
    const prompt = argv.slice(2).join(' ').trim();
    if (!prompt) {
      usageAndExit('Prompt cannot be empty.');
    }

    return {
      sessionId: randomUUID(),
      prompt
    };
  }

  if (argv.length >= 5 && argv[0] === 'exec' && argv[1] === 'resume' && argv[2] === '--json') {
    const sessionId = argv[3].trim();
    const prompt = argv.slice(4).join(' ').trim();
    if (!sessionId) {
      usageAndExit('Thread/session id cannot be empty.');
    }
    if (!prompt) {
      usageAndExit('Prompt cannot be empty.');
    }

    return {
      sessionId,
      prompt
    };
  }

  usageAndExit('Unsupported arguments for OpenClaw bridge.');
}

function shellSingleQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function extractAssistantText(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const result = payload.result;
  if (!result || typeof result !== 'object') {
    return null;
  }

  const payloads = result.payloads;
  if (!Array.isArray(payloads)) {
    return null;
  }

  const chunks = payloads
    .map((item) => (item && typeof item === 'object' ? item.text : null))
    .filter((text) => typeof text === 'string' && text.trim().length > 0);

  if (chunks.length === 0) {
    return null;
  }

  return chunks.join('\n\n');
}

function extractJsonBlock(rawText) {
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start < 0 || end < start) {
    return null;
  }
  return rawText.slice(start, end + 1);
}

function main() {
  const { sessionId, prompt } = parseCliArgs(process.argv.slice(2));

  process.stdout.write(`${JSON.stringify({ type: 'thread.started', thread_id: sessionId })}\n`);

  const distro = (process.env.OPENCLAW_BRIDGE_WSL_DISTRO ?? 'Ubuntu').trim();
  const gatewayName = (process.env.OPENCLAW_BRIDGE_GATEWAY ?? 'nemoclaw').trim();
  const sandboxName = (process.env.OPENCLAW_BRIDGE_SANDBOX ?? 'my-assistant').trim();
  const agentId = (process.env.OPENCLAW_BRIDGE_AGENT ?? 'myhorrorstory').trim();

  const promptB64 = Buffer.from(prompt, 'utf8').toString('base64');

  const bridgeScript = [
    'set -euo pipefail',
    `gateway_name=${shellSingleQuote(gatewayName)}`,
    `sandbox_name=${shellSingleQuote(sandboxName)}`,
    "proxy=\"/home/grump/.local/bin/openshell ssh-proxy --gateway-name ${gateway_name} --name ${sandbox_name}\"",
    "ssh -o \"ProxyCommand=${proxy}\" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o GlobalKnownHostsFile=/dev/null -o LogLevel=ERROR sandbox \"python3 - <<'PY'",
    'import base64',
    'import os',
    'import subprocess',
    'import sys',
    '',
    `agent_id = '${agentId}'`,
    `session_id = '${sessionId}'`,
    `prompt = base64.b64decode('${promptB64}').decode('utf-8')`,
    "cmd = ['/usr/local/bin/openclaw', 'agent']",
    "if agent_id:",
    "    cmd.extend(['--agent', agent_id])",
    "cmd.extend(['--session-id', session_id, '--message', prompt, '--json'])",
    "env = dict(os.environ)",
    "env['NODE_NO_WARNINGS'] = '1'",
    "proc = subprocess.run(cmd, capture_output=True, text=True, env=env)",
    'sys.stdout.write(proc.stdout)',
    'sys.stderr.write(proc.stderr)',
    'raise SystemExit(proc.returncode)',
    'PY\"'
  ].join('\n');

  const child = spawn(
    'wsl.exe',
    ['-d', distro, '--', 'bash', '-s'],
    {
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe']
    }
  );
  child.stdin.end(`${bridgeScript}\n`);

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString('utf8');
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString('utf8');
  });

  child.on('error', (error) => {
    process.stderr.write(`Failed to execute WSL/OpenClaw bridge: ${error.message}\n`);
    process.exit(1);
  });

  child.on('close', (code) => {
    if (code !== 0) {
      if (stdout.trim().length > 0) {
        process.stderr.write(stdout);
        if (!stdout.endsWith('\n')) {
          process.stderr.write('\n');
        }
      }

      if (stderr.trim().length > 0) {
        process.stderr.write(stderr);
        if (!stderr.endsWith('\n')) {
          process.stderr.write('\n');
        }
      }

      process.exit(code ?? 1);
      return;
    }

    const jsonBlock = extractJsonBlock(stdout.trim());
    if (!jsonBlock) {
      process.stderr.write('OpenClaw bridge: expected JSON response from openclaw agent.\n');
      if (stdout.trim().length > 0) {
        process.stderr.write(`${stdout.trim()}\n`);
      }
      if (stderr.trim().length > 0) {
        process.stderr.write(stderr);
      }
      process.exit(1);
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonBlock);
    } catch (error) {
      process.stderr.write(`OpenClaw bridge: failed to parse JSON output (${error.message}).\n`);
      process.stderr.write(`${jsonBlock}\n`);
      if (stderr.trim().length > 0) {
        process.stderr.write(stderr);
      }
      process.exit(1);
      return;
    }

    const assistantText = extractAssistantText(parsed) ?? JSON.stringify(parsed, null, 2);
    process.stdout.write(
      `${JSON.stringify({
        type: 'item.completed',
        item: {
          type: 'agent_message',
          text: assistantText
        }
      })}\n`
    );

    if (stderr.trim().length > 0) {
      process.stderr.write(stderr);
      if (!stderr.endsWith('\n')) {
        process.stderr.write('\n');
      }
    }

    process.exit(0);
  });
}

main();
