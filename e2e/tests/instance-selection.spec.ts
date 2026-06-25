import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Instance selection @proxy', () => {
  test('dashboard starts with no active instance selected @proxy', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/dashboard`);
    await expect(page.getByRole('button', { name: /select instance/i })).toBeVisible();
  });

  test('selected instance persists after hard navigation to settings @proxy', async ({ instancePage: page }) => {
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('selected_instance_id'))).not.toBeNull();
    const selectedInstanceId = await page.evaluate(() => localStorage.getItem('selected_instance_id'));

    await page.goto(`${APP_URL}/settings`);

    await expect.poll(async () => page.evaluate(() => localStorage.getItem('selected_instance_id'))).toBe(selectedInstanceId);
    await expect(page.getByRole('button', { name: /active instance/i })).not.toContainText(/select instance/i);
    await expect(page.getByText(/choose a configured instance from the sidebar/i)).not.toBeVisible();
  });

  test('instance switcher only offers deployment-managed configured instances @proxy', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/dashboard`);
    await page.getByRole('button', { name: /select instance/i }).click();

    await expect(page.getByRole('menuitem', { name: /LightHouse/i })).toHaveCount(2);
    await expect(page.getByRole('menuitem', { name: /manual trust anchor/i })).toHaveCount(0);
  });
});
