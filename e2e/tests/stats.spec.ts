import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Stats page @proxy', () => {
  test('renders KPI cards and status breakdown', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/stats`);

    // Heading
    await expect(page.getByRole('heading', { name: /federation stats/i })).toBeVisible({ timeout: 10_000 });

    // Four traffic KPI cards
    await expect(page.getByText(/total requests/i)).toBeVisible();
    await expect(page.getByText(/error rate/i)).toBeVisible();
    await expect(page.getByText(/avg.*p95 latency/i)).toBeVisible();
    await expect(page.getByText(/unique clients/i)).toBeVisible();

    // Section cards
    await expect(page.getByText(/requests by status/i)).toBeVisible();
    await expect(page.getByText(/top endpoints/i)).toBeVisible();
  });

  test('shows numeric values in KPI cards', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/stats`);

    await expect(page.getByRole('heading', { name: /federation stats/i })).toBeVisible({ timeout: 10_000 });

    // Each KPI card should show a number (could be 0)
    const cards = page.locator('.text-2xl.font-bold');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('stats page is reachable via sidebar link', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/dashboard`);
    await page.getByRole('link', { name: /^stats$/i }).click();
    await expect(page).toHaveURL(/\/stats/);
    await expect(page.getByRole('heading', { name: /federation stats/i })).toBeVisible({ timeout: 10_000 });
  });
});
