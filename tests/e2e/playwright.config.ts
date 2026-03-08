import { defineConfig, devices } from '@playwright/test';

const webPort = Number(process.env.PLAYWRIGHT_WEB_PORT ?? 3100);
const adminPort = Number(process.env.PLAYWRIGHT_ADMIN_PORT ?? 3101);
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const adminBaseUrl = `http://127.0.0.1:${adminPort}`;

export default defineConfig({
  testDir: '.',
  outputDir: './artifacts',
  fullyParallel: true,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02
    }
  },
  reporter: [['list']],
  use: {
    baseURL: webBaseUrl,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: [
    {
      command: `corepack pnpm --filter @myhorrorstory/web exec next dev -p ${webPort} -H 127.0.0.1`,
      url: webBaseUrl,
      reuseExistingServer: false,
      timeout: 180_000
    },
    {
      command: `corepack pnpm --filter @myhorrorstory/admin exec next dev -p ${adminPort} -H 127.0.0.1`,
      url: adminBaseUrl,
      reuseExistingServer: false,
      timeout: 180_000
    }
  ]
});
