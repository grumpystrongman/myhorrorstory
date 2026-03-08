import { expect, type Page, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ADMIN_BASE_URL, WEB_BASE_URL } from './urls';

async function captureAndAssert(page: Page, filename: string): Promise<void> {
  const outputDir = join(process.cwd(), 'tests', 'e2e', 'artifacts', 'visual');
  mkdirSync(outputDir, { recursive: true });
  const screenshot = await page.screenshot({
    fullPage: true,
    path: join(outputDir, filename)
  });

  expect(screenshot.byteLength).toBeGreaterThan(3_000);
}

test.describe('Visual certification', () => {
  test('captures visual baselines for web and admin at desktop and mobile', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto(`${WEB_BASE_URL}/`);
    await captureAndAssert(page, 'web-home-desktop.png');

    await page.goto(`${WEB_BASE_URL}/play`);
    await captureAndAssert(page, 'web-play-desktop.png');

    await page.goto(`${ADMIN_BASE_URL}/`);
    await captureAndAssert(page, 'admin-home-desktop.png');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${WEB_BASE_URL}/`);
    await captureAndAssert(page, 'web-home-mobile.png');

    await page.goto(`${WEB_BASE_URL}/play`);
    await captureAndAssert(page, 'web-play-mobile.png');
  });
});
