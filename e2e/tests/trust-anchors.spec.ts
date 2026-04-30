import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Trust Anchors page @bff', () => {
  test('admin can navigate to /trust-anchors', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    await expect(page).toHaveURL(/\/trust-anchors/);
    await expect(page.getByRole('button', { name: /add authority hint/i })).toBeVisible();
  });

  test('authority hint dialog uses consistent wording', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    await page.getByRole('button', { name: /add authority hint/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/link authority hint/i)).toBeVisible();
    await expect(page.getByLabel(/authority hint entity id/i)).toBeVisible();
    await expect(page.getByText(/superior ta/i)).toHaveCount(0);
  });

  test('add trust anchor dialog no longer exposes intermediate creation', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    await page.getByRole('button', { name: /add ta instance/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/intermediate/i)).toHaveCount(0);
  });

  test('shows the seeded LightHouse trust anchor card', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    // LightHouse should appear as a card title
    await expect(page.getByRole('heading', { name: 'LightHouse' })).toBeVisible();
  });

  test('deployment-managed LightHouse trust anchor does not expose edit actions', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    
    const card = page.locator('div.rounded-lg.border').filter({ hasText: 'LightHouse' }).first();

    await expect(card.getByText(/deployment managed/i)).toBeVisible();
    await expect(card.getByRole('button', { name: /trust anchor options/i })).toHaveCount(0);
  });
});
