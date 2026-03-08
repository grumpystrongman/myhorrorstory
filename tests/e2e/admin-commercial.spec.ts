import { expect, test } from '@playwright/test';
import { ADMIN_BASE_URL } from './urls';

test.describe('Admin console interactions', () => {
  test('renders admin operations sections', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/`);

    await expect(page.getByRole('heading', { name: 'Admin Console' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Operations' })).toBeVisible();

    const items = page.locator('aside li');
    await expect(items).toHaveCount(16);
    await expect(items.filter({ hasText: 'Users' })).toHaveCount(1);
    await expect(items.filter({ hasText: 'Feature Flags' })).toHaveCount(1);
    await expect(items.filter({ hasText: 'System Health' })).toHaveCount(1);
  });
});
