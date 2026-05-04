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
    await expect(page.locator('main').getByRole('link', { name: /register intermediate/i })).toHaveCount(0);
  });

  test('authority hint dialog uses consistent wording', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    await page.getByRole('button', { name: /add authority hint/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/link authority hint/i)).toBeVisible();
    await expect(page.getByLabel(/authority hint entity id/i)).toBeVisible();
    await expect(page.getByText(/superior ta/i)).toHaveCount(0);
  });

  test('deployment-managed LightHouse card does not expose local configure actions', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);

    await expect(page.getByRole('heading', { name: 'LightHouse' })).toBeVisible();
    await expect(page.getByText(/deployment managed/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /trust anchor options/i })).toHaveCount(0);
  });

  test('operator-created trust anchor still exposes configure flow', async ({ authenticatedPage: page }) => {
    const token = await page.evaluate(() => {
      const tokenKey = Object.keys(localStorage).find((key) => key.startsWith('auth_token:'));
      return tokenKey ? localStorage.getItem(tokenKey) : null;
    });

    const name = `E2E Local TA ${Date.now()}`;
    const created = await page.request.post(`${APP_URL}/api/v1/admin/trust-anchors`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      data: {
        name,
        entity_id: `https://local-ta-${Date.now()}.example.org`,
        description: 'E2E managed trust anchor',
        type: 'federation',
        status: 'active',
        admin_api_base_url: 'https://local-ta.example.org/admin',
      },
    });

    expect(created.ok()).toBeTruthy();
    const createdAnchor = await created.json();

    try {
      await page.goto(`${APP_URL}/trust-anchors`);
      await expect(page.getByRole('heading', { name })).toBeVisible();
      const optionsButton = page.getByRole('button', { name: /trust anchor options/i });
      await expect(optionsButton).toHaveCount(1);
      await optionsButton.click();
      await page.getByRole('menuitem', { name: /configure/i }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(page.getByRole('heading', { name: /configure trust anchor/i })).toBeVisible();
      await expect(dialog).toContainText(new RegExp(`editing ${name}`, 'i'));
      await expect(dialog.getByLabel(/admin api base url/i)).toBeVisible();
    } finally {
      await page.request.delete(`${APP_URL}/api/v1/admin/trust-anchors/${createdAnchor.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    }
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
    await expect(emptyState).toBeVisible();
    await expect(page.getByText(/register new intermediates from the Subordinates navigation\./i)).toBeVisible();
    await expect(page.locator('main').getByRole('link', { name: /register intermediate/i })).toHaveCount(0);
  });
});
