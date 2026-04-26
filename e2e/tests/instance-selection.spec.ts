import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Instance selection @proxy', () => {
  test('dashboard starts with no active instance selected @proxy', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/dashboard`);
    await expect(page.getByRole('button', { name: /select instance/i })).toBeVisible();
  });
});
