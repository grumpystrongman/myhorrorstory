import { spawnLoggedProcess } from '../process-utils.mjs';

const NGROK_HTTPS_URL = /https:\/\/[a-z0-9-]+\.ngrok(-free)?\.app/i;

export function createNgrokProvider({ cwd, logDir, command = 'ngrok' }) {
  return {
    name: 'ngrok',
    async openTunnel(serviceName, targetUrl) {
      const logFile = `${logDir}/tunnel-${serviceName}.log`;
      const child = spawnLoggedProcess(
        `tunnel-${serviceName}`,
        command,
        ['http', targetUrl, '--log=stdout', '--log-format=json'],
        {
          cwd,
          logFile,
          env: process.env
        }
      );

      const publicUrl = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timed out waiting for ngrok URL for ${serviceName}`));
        }, 120_000);

        const handleChunk = (chunk) => {
          const text = String(chunk);
          const match = text.match(NGROK_HTTPS_URL);
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
          reject(new Error(`ngrok exited early for ${serviceName} with code ${code ?? -1}`));
        });
      });

      return {
        child,
        publicUrl
      };
    }
  };
}
