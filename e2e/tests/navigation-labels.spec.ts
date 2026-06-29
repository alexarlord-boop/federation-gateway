import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Navigation labels @proxy', () => {
  test('sidebar uses spec-aligned subordinate terminology', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/dashboard`);

    await expect(page.getByRole('button', { name: 'Subordinates', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /all subordinates/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /register subordinate/i })).toBeVisible();
    await expect(page.getByText(/leaf entities/i)).toHaveCount(0);
    await expect(page.getByText(/register intermediate/i)).toHaveCount(0);
  });

  test('sidebar contains Stats and Audit Log entries', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/dashboard`);

    await expect(page.getByRole('link', { name: /^stats$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^audit log$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^chain inspector$/i })).toBeVisible();
  });
});
