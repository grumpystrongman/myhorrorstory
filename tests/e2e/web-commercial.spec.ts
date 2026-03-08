import { expect, test } from '@playwright/test';
import { WEB_BASE_URL } from './urls';

test.describe('Web consumer interactions', () => {
  test('validates all core navigation clicks', async ({ page }) => {
    await page.goto(`${WEB_BASE_URL}/`);
    await expect(page.getByRole('heading', { name: 'Remote Horror Mystery Platform' })).toBeVisible();

    await Promise.all([
      page.waitForURL('**/onboarding'),
      page.getByRole('link', { name: 'Onboarding Funnel' }).click()
    ]);
    await expect(page.getByRole('heading', { name: 'Onboarding Funnel' })).toBeVisible();

    await page.goto(`${WEB_BASE_URL}/`);
    await Promise.all([
      page.waitForURL('**/library'),
      page.getByRole('link', { name: 'Case Library' }).click()
    ]);
    await expect(page.getByRole('heading', { name: 'Case Library' })).toBeVisible();

    await page.goto(`${WEB_BASE_URL}/`);
    await Promise.all([
      page.waitForURL('**/play'),
      page.getByRole('link', { name: 'Play Session UI' }).click()
    ]);
    await expect(page.getByRole('heading', { name: 'Play Session' })).toBeVisible();

    await page.goto(`${WEB_BASE_URL}/`);
    await Promise.all([
      page.waitForURL('**/dashboard'),
      page.getByRole('link', { name: 'User Dashboard' }).click()
    ]);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('exercises zoom, pan, and audio controls end-to-end', async ({ page }) => {
    await page.goto(`${WEB_BASE_URL}/play`);

    const zoomStatus = page.getByTestId('zoom-status');
    const panStatus = page.getByTestId('pan-status');
    const audioStatus = page.getByTestId('audio-status');
    const mutedStatus = page.getByTestId('audio-muted-status');
    const volumeStatus = page.getByTestId('audio-volume-status');
    const subtitleStatus = page.getByTestId('subtitle-status');

    await expect(zoomStatus).toHaveText('Zoom: 100%');
    await expect(panStatus).toHaveText('Pan: x 0, y 0');

    await page.getByTestId('zoom-in').click();
    await page.getByTestId('zoom-in').click();
    await expect(zoomStatus).toHaveText('Zoom: 120%');

    await page.getByTestId('zoom-out').click();
    await expect(zoomStatus).toHaveText('Zoom: 110%');

    await page.getByTestId('pan-right').click();
    await page.getByTestId('pan-down').click();
    await expect(panStatus).toHaveText('Pan: x 24, y 24');

    await page.getByTestId('evidence-board-viewport').hover();
    await page.mouse.wheel(0, -200);
    await expect(zoomStatus).toHaveText('Zoom: 120%');

    const viewport = page.getByTestId('evidence-board-viewport');
    const box = await viewport.boundingBox();
    if (!box) {
      throw new Error('Expected evidence board viewport to be visible');
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20);
    await page.mouse.up();
    await expect(panStatus).not.toHaveText('Pan: x 24, y 24');

    await page.getByTestId('reset-view').click();
    await expect(zoomStatus).toHaveText('Zoom: 100%');
    await expect(panStatus).toHaveText('Pan: x 0, y 0');

    await page.getByTestId('audio-play').click();
    await expect(audioStatus).toHaveText('Audio: Playing');

    await page.getByTestId('audio-mute-toggle').click();
    await expect(mutedStatus).toHaveText('Muted: Yes');

    await page.getByTestId('audio-volume').evaluate((node) => {
      const input = node as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (!setter) {
        throw new Error('Expected HTMLInputElement value setter to exist');
      }
      setter.call(input, '25');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(volumeStatus).toHaveText('Volume: 25%');

    await page.getByTestId('subtitle-toggle').click();
    await expect(subtitleStatus).toHaveText('Subtitles: Disabled');

    await page.getByTestId('audio-pause').click();
    await expect(audioStatus).toHaveText('Audio: Paused');
  });
});
