import { commandExists } from '../process-utils.mjs';
import { createCloudflaredProvider } from './cloudflared-provider.mjs';
import { createNgrokProvider } from './ngrok-provider.mjs';
import { createLocalProvider } from './local-provider.mjs';

export function createTunnelProvider({ providerName, cwd, logDir }) {
  if (providerName === 'local') {
    return createLocalProvider();
  }

  if (providerName === 'cloudflared') {
    if (!commandExists('cloudflared')) {
      throw new Error(
        'cloudflared command not found. Install cloudflared or set REMOTE_TEST_PROVIDER=local/ngrok.'
      );
    }
    return createCloudflaredProvider({ cwd, logDir });
  }

  if (providerName === 'ngrok') {
    if (!commandExists('ngrok')) {
      throw new Error('ngrok command not found. Install ngrok or set REMOTE_TEST_PROVIDER=local/cloudflared.');
    }
    return createNgrokProvider({ cwd, logDir });
  }

  throw new Error(`Unsupported REMOTE_TEST_PROVIDER: ${providerName}`);
}
