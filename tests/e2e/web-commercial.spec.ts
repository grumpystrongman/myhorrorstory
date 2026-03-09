import { expect, test } from '@playwright/test';
import { WEB_BASE_URL } from './urls';

test.describe('Web consumer interactions', () => {
  test('validates all core navigation clicks', async ({ page }) => {
    await page.goto(`${WEB_BASE_URL}/`);
    await expect(page.getByRole('heading', { name: 'Remote Horror Mystery Platform' })).toBeVisible();

    await Promise.all([
      page.waitForURL('**/onboarding'),
      page.getByRole('link', { name: 'Onboarding Funnel' }).first().click()
    ]);
    await expect(page.getByRole('heading', { name: 'Onboarding Funnel' })).toBeVisible();

    await page.goto(`${WEB_BASE_URL}/`);
    await Promise.all([
      page.waitForURL('**/library'),
      page.getByRole('link', { name: 'Case Library' }).first().click()
    ]);
    await expect(page.getByRole('heading', { name: 'Case Library' })).toBeVisible();

    await page.goto(`${WEB_BASE_URL}/`);
    await Promise.all([
      page.waitForURL('**/play'),
      page.getByRole('link', { name: 'Play Session UI' }).first().click()
    ]);
    await expect(page.getByRole('heading', { name: 'Play Session' })).toBeVisible();

    await page.goto(`${WEB_BASE_URL}/`);
    await Promise.all([
      page.waitForURL('**/dashboard'),
      page.getByRole('link', { name: 'User Dashboard' }).first().click()
    ]);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.goto(`${WEB_BASE_URL}/`);
    await Promise.all([
      page.waitForURL('**/codex'),
      page.getByRole('link', { name: 'Codex Control Room' }).first().click()
    ]);
    await expect(page.getByRole('heading', { name: 'Codex Local Control Room' })).toBeVisible();
    await expect(page.getByTestId('codex-console')).toBeVisible();
  });

  test('switches soundtrack from global overture to story-specific score', async ({ page }) => {
    await page.goto(`${WEB_BASE_URL}/`);
    await expect(page.getByTestId('soundtrack-track')).toHaveText('MHS Platform Overture');

    await page.goto(`${WEB_BASE_URL}/stories/static-between-stations/intro`);
    await expect(page.getByRole('heading', { name: 'Static Between Stations' })).toBeVisible();
    await expect(page.getByTestId('soundtrack-track')).toHaveText('Signal in the Static');

    await Promise.all([
      page.waitForURL('**/play?storyId=static-between-stations'),
      page.getByTestId('intro-start-session').click()
    ]);
    await expect(page.getByTestId('active-story')).toContainText('Static Between Stations');
    await expect(page.getByTestId('active-score')).toContainText('Signal in the Static');
  });

  test('supports short mode story flow for 1-2 day QA playthroughs', async ({ page }) => {
    await page.goto(`${WEB_BASE_URL}/library`);

    const shortModeCard = page.locator('article').filter({ hasText: 'Midnight Lockbox (Short Mode)' });
    await expect(shortModeCard).toBeVisible();
    await expect(shortModeCard).toContainText('1-2 days');

    await Promise.all([
      page.waitForURL('**/stories/midnight-lockbox/intro'),
      shortModeCard.getByRole('link', { name: 'Open Intro' }).click()
    ]);

    await expect(page.getByRole('heading', { name: 'Midnight Lockbox' })).toBeVisible();
    await expect(page.getByTestId('soundtrack-track')).toHaveText('Afterhours Unit 331');

    await Promise.all([
      page.waitForURL('**/play?storyId=midnight-lockbox'),
      page.getByTestId('intro-start-session').click()
    ]);
    await expect(page.getByTestId('active-story')).toContainText('Midnight Lockbox');
    await expect(page.getByTestId('active-score')).toContainText('Afterhours Unit 331');
  });

  test('submits email join and onboarding signup flows', async ({ page }) => {
    await page.goto(`${WEB_BASE_URL}/`);

    await page.getByLabel('First name').first().fill('Riley');
    await page.getByLabel('Email').first().fill(`lead+${Date.now()}@example.com`);
    await page.getByRole('button', { name: 'Join By Email' }).first().click();
    await expect(page.getByText('Email joined. Launch briefings and case drops will arrive shortly.')).toBeVisible();

    await page.goto(`${WEB_BASE_URL}/onboarding`);
    await expect(page.getByRole('heading', { name: 'Onboarding Funnel' })).toBeVisible();

    await page.getByLabel('Display name').fill('Riley Noir');
    await page.getByLabel('Email').first().fill(`player+${Date.now()}@example.com`);
    await page.getByLabel('Password (12+ characters)').fill('n0cturne_case_001');
    await page.getByLabel('I accept the Terms and Conditions.').check();
    await page.getByLabel('I accept the Privacy Notice.').check();
    await page.getByLabel('I confirm I am 18+ (or legal age in my jurisdiction).').check();
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(
      page.getByText('Account created. Your legal acceptance is recorded and your first case is ready.')
    ).toBeVisible();
  });

  test('exercises zoom, pan, and audio controls end-to-end', async ({ page }) => {
    await page.goto(`${WEB_BASE_URL}/play`);

    const popupAcknowledge = page.getByTestId('popup-acknowledge');
    if (await popupAcknowledge.isVisible().catch(() => false)) {
      await popupAcknowledge.click();
    }

    const zoomStatus = page.getByTestId('zoom-status');
    const panStatus = page.getByTestId('pan-status');
    const audioStatus = page.getByTestId('audio-status');
    const mutedStatus = page.getByTestId('audio-muted-status');
    const volumeStatus = page.getByTestId('audio-volume-status');
    const subtitleStatus = page.getByTestId('subtitle-status');
    const directorBand = page.getByTestId('director-band');
    const soundtrackStatus = page.getByTestId('soundtrack-status');
    const soundtrackDirectorTension = page.getByTestId('soundtrack-director-tension');

    const setRangeValue = async (testId: string, value: string) => {
      await page.getByTestId(testId).evaluate(
        (node, nextValue) => {
          const input = node as HTMLInputElement;
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
          if (!setter) {
            throw new Error('Expected HTMLInputElement value setter to exist');
          }
          setter.call(input, nextValue);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        },
        value
      );
    };

    await setRangeValue('director-time', '12');
    await setRangeValue('director-progress', '0');
    await setRangeValue('director-villain-proximity', '0');
    await setRangeValue('director-danger', '0');
    await expect(directorBand).toContainText('Calm Ambience');
    await expect(soundtrackStatus).toContainText('Calm Ambience');

    await setRangeValue('director-time', '21');
    await setRangeValue('director-progress', '50');
    await setRangeValue('director-villain-proximity', '50');
    await setRangeValue('director-danger', '50');
    await expect(directorBand).toContainText('Suspense Drones');
    await expect(soundtrackStatus).toContainText('Suspense Drones');

    await setRangeValue('director-time', '1');
    await setRangeValue('director-progress', '95');
    await setRangeValue('director-villain-proximity', '95');
    await setRangeValue('director-danger', '95');
    await expect(directorBand).toContainText('Rapid Heartbeat Percussion');
    await expect(soundtrackStatus).toContainText('Rapid Heartbeat Percussion');
    await expect(soundtrackDirectorTension).toContainText('Tension:');

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

    await page.getByTestId('evidence-board-viewport').scrollIntoViewIfNeeded();
    await page.getByTestId('evidence-board-viewport').hover();
    await page.mouse.wheel(0, -200);
    const zoomAfterWheel = (await zoomStatus.textContent())?.trim() ?? '';
    expect(['Zoom: 110%', 'Zoom: 120%']).toContain(zoomAfterWheel);

    const viewport = page.getByTestId('evidence-board-viewport');
    const box = await viewport.boundingBox();
    if (!box) {
      throw new Error('Expected evidence board viewport to be visible');
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20);
    await page.mouse.up();
    const panAfterDrag = (await panStatus.textContent())?.trim() ?? '';
    expect(panAfterDrag.startsWith('Pan: x')).toBe(true);

    await page.getByTestId('reset-view').click();
    await expect(zoomStatus).toHaveText('Zoom: 100%');
    await expect(panStatus).toHaveText('Pan: x 0, y 0');

    await page.getByTestId('audio-play').scrollIntoViewIfNeeded();
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

  test('simulates messaging popup and branching progression', async ({ page }) => {
    await page.goto(`${WEB_BASE_URL}/play?storyId=midnight-lockbox`);

    await expect(page.getByTestId('current-beat')).toBeVisible();
    await expect(page.getByTestId('message-feed')).toBeVisible();

    const popup = page.getByTestId('message-popup');
    await expect(popup).toBeVisible({ timeout: 7000 });
    await page.getByTestId('popup-play-voice').click();
    await page.getByTestId('popup-acknowledge').click();

    const responseButtons = page.locator('.play-response-list button');
    await expect(responseButtons.first()).toBeVisible();
    const initialBeat = await page.getByTestId('current-beat').textContent();
    await responseButtons.first().click();
    await expect(page.getByTestId('current-beat')).not.toHaveText(initialBeat ?? '');
  });
});
