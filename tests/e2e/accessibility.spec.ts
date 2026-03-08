import { expect, type Page, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ADMIN_BASE_URL, WEB_BASE_URL } from './urls';

async function expectNoCriticalOrSeriousViolations(url: string, page: Page): Promise<void> {
  await page.goto(url);
  const results = await new AxeBuilder({ page }).analyze();
  const criticalOrSerious = results.violations.filter((violation) => {
    return violation.impact === 'critical' || violation.impact === 'serious';
  });

  expect(criticalOrSerious).toEqual([]);
}

test.describe('Accessibility checks', () => {
  test('web home passes critical/serious a11y checks', async ({ page }) => {
    await expectNoCriticalOrSeriousViolations(`${WEB_BASE_URL}/`, page);
  });

  test('web play passes critical/serious a11y checks', async ({ page }) => {
    await expectNoCriticalOrSeriousViolations(`${WEB_BASE_URL}/play`, page);
  });

  test('admin home passes critical/serious a11y checks', async ({ page }) => {
    await expectNoCriticalOrSeriousViolations(`${ADMIN_BASE_URL}/`, page);
  });
});
