import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Trust Anchors page @bff', () => {
  test('admin can navigate to /trust-anchors', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    await expect(page).toHaveURL(/\/trust-anchors/);
    await expect(page.getByRole('heading', { name: /authority hints and trust anchors/i })).toBeVisible();
    await expect(
      page.getByText(/manage upstream authorities, authority hints, and local trust anchors/i),
    ).toBeVisible();
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

  test('opens the LightHouse trust anchor configure flow', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);

    await expect(page.getByRole('heading', { name: 'LightHouse' })).toBeVisible();
    await page.getByRole('button', { name: /trust anchor options/i }).first().click();
    await page.getByRole('menuitem', { name: /configure/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('heading', { name: /configure trust anchor/i })).toBeVisible();
    await expect(dialog).toContainText(/editing lighthouse/i);
  });

  test('add trust anchor dialog no longer exposes intermediate creation', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    await page.getByRole('button', { name: /add ta instance/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /create local trust anchor/i })).toBeVisible();
    await expect(dialog.getByText(/register a new local trust anchor instance managed by this operator\./i)).toBeVisible();
    await expect(dialog.getByRole('button', { name: /^create$/i })).toBeVisible();
    await expect(dialog.getByText(/intermediate/i)).toHaveCount(0);
  });

  test('shows the seeded LightHouse trust anchor card', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    // LightHouse should appear as a card title
    await expect(page.getByRole('heading', { name: 'LightHouse' })).toBeVisible();
  });

  test('shows guidance to register intermediates in the empty state', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);

    const emptyState = page.getByText(/no intermediates registered/i);
    const guidance = page.getByText(/register new intermediates from the Subordinates navigation\./i);

    if (await emptyState.count()) {
      await expect(emptyState).toBeVisible();
      await expect(guidance).toBeVisible();
    } else {
      await expect(guidance).toHaveCount(0);
    }
  });
});
