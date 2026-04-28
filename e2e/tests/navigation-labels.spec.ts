import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Navigation labels @proxy', () => {
  test('sidebar shows subordinate terminology and intermediate registration entry', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/dashboard`);

    await expect(page.getByRole('button', { name: 'Subordinates', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /all subordinates/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /register subordinate/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /register intermediate/i })).toBeVisible();
    await expect(page.getByText(/leaf entities/i)).toHaveCount(0);
  });
});
