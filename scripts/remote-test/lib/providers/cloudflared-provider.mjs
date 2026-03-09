import { spawnLoggedProcess } from '../process-utils.mjs';

const TRY_CLOUDFLARE_URL = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

export function createCloudflaredProvider({ cwd, logDir, command = 'cloudflared' }) {
  return {
    name: 'cloudflared',
    async openTunnel(serviceName, targetUrl) {
      const logFile = `${logDir}/tunnel-${serviceName}.log`;
      const child = spawnLoggedProcess(
        `tunnel-${serviceName}`,
        command,
        ['tunnel', '--url', targetUrl, '--no-autoupdate'],
        {
          cwd,
          logFile,
          env: process.env
        }
      );

      const publicUrl = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timed out waiting for cloudflared URL for ${serviceName}`));
        }, 120_000);

        const handleChunk = (chunk) => {
          const text = String(chunk);
          const match = text.match(TRY_CLOUDFLARE_URL);
          if (!match) {
            return;
          }
          clearTimeout(timeout);
          child.stdout?.off('data', handleChunk);
          child.stderr?.off('data', handleChunk);
          resolve(match[0]);
        };

        child.stdout?.on('data', handleChunk);
        child.stderr?.on('data', handleChunk);
        child.on('exit', (code) => {
          clearTimeout(timeout);
          reject(new Error(`cloudflared exited early for ${serviceName} with code ${code ?? -1}`));
        });
      });

      return {
        child,
        publicUrl
      };
    }
  };
}
