import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Audit log page @proxy', () => {
  test('renders heading and filter controls', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/audit-log`);

    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible({ timeout: 10_000 });

    // Filter dropdowns
    await expect(page.getByRole('combobox').first()).toBeVisible();

    // User search input
    await expect(page.getByPlaceholder(/filter by user/i)).toBeVisible();
  });

  test('shows table or empty state depending on data', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/audit-log`);

    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible({ timeout: 10_000 });

    // Either a table header row or the empty-state message should appear
    const hasTable = await page.getByRole('columnheader', { name: /time/i }).isVisible({ timeout: 5_000 }).catch(() => false);
    const hasEmpty = await page.getByText(/no audit entries/i).isVisible({ timeout: 5_000 }).catch(() => false);
    expect(hasTable || hasEmpty).toBe(true);
  });

  test('resource type filter updates the view', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/audit-log`);
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible({ timeout: 10_000 });

    // Open resource type combobox and pick "subordinate"
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /subordinate/i }).first().click();

    // Page should still render without error
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible();
  });

  test('audit log page is reachable via sidebar link', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/dashboard`);
    await page.getByRole('link', { name: /^audit log$/i }).click();
    await expect(page).toHaveURL(/\/audit-log/);
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible({ timeout: 10_000 });
  });
});
