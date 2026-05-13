import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Trust Anchors page @bff', () => {
  test('admin can navigate to /trust-anchors', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    await expect(page).toHaveURL(/\/trust-anchors/);
    await expect(page.getByRole('heading', { name: /authority hints and trust anchors/i })).toBeVisible();
    await expect(
      page.getByText(/review deployment-managed instances and authority hints\./i),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: /registered intermediates/i })).toHaveCount(0);
  });

  test('Trust Anchors page points intermediate management to Subordinates', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    await expect(
      page.getByText(/manage intermediates from the Subordinates navigation\./i),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: /registered intermediates/i })).toHaveCount(0);
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

    const lightHouseCard = page
      .locator('div.rounded-lg.border.bg-card')
      .filter({ has: page.getByRole('heading', { name: 'LightHouse' }) })
      .first();

    await expect(lightHouseCard).toBeVisible();
    await expect(lightHouseCard.getByText(/deployment managed/i)).toBeVisible();
    await expect(lightHouseCard.getByRole('button', { name: /trust anchor options/i })).toHaveCount(0);
  });

  test('My Instances does not expose Add TA instance', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    await expect(page.getByRole('button', { name: /add ta instance/i })).toHaveCount(0);
  });

  test('deployment-managed LightHouse card is read-only', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);

    const lightHouseCard = page
      .locator('div.rounded-lg.border.bg-card')
      .filter({ has: page.getByRole('heading', { name: 'LightHouse' }) })
      .first();

    await expect(lightHouseCard).toBeVisible();
    await expect(lightHouseCard.getByText(/deployment managed/i)).toBeVisible();
    await expect(lightHouseCard.getByRole('button', { name: /trust anchor options/i })).toHaveCount(0);
    await expect(lightHouseCard.getByText(/subordinates/i)).toBeVisible();
  });

  test('shows the seeded LightHouse trust anchor card', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    // LightHouse should appear as a card title
    await expect(page.getByRole('heading', { name: 'LightHouse' })).toBeVisible();
  });



  test('My Instances shows the updated subordinate count after a registration', async ({ authenticatedPage: page }) => {
    const token = await page.evaluate(() => {
      const tokenKey = Object.keys(localStorage).find((key) => key.startsWith('auth_token:'));
      return tokenKey ? localStorage.getItem(tokenKey) : null;
    });

    // Capture baseline count before the test registration so the assertion is
    // relative (+1) rather than tied to a literal value that breaks on repeated runs.
    await page.goto(`${APP_URL}/trust-anchors`);
    const lightHouseCard = page.locator('div.rounded-lg.border.bg-card').filter({
      has: page.getByRole('heading', { name: 'LightHouse' }),
    }).first();
    await expect(lightHouseCard.getByText(/subordinates/i)).toBeVisible();
    const beforeText = await lightHouseCard.locator('p.text-2xl').textContent();
    const countBefore = parseInt(beforeText?.trim() ?? '0', 10);

    const regResp = await page.request.post(`${APP_URL}/api/v1/registrations`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      data: {
        tenant_id: 'tenant-1',
        entity_id: `https://count-e2e-${Date.now()}.example.org`,
        registered_entity_types: ['openid_relying_party'],
        display_name: 'Count E2E Entity',
      },
    });

    expect(regResp.ok()).toBeTruthy();
    const registration = await regResp.json();

    try {
      await page.goto(`${APP_URL}/trust-anchors`);
      await expect(lightHouseCard.getByText(/subordinates/i)).toBeVisible();
      await expect(lightHouseCard.locator('p.text-2xl')).toHaveText(String(countBefore + 1));
    } finally {
      // Reject the created registration to prevent pending entries accumulating
      // across repeated runs against the same stack.
      await page.request.post(`${APP_URL}/api/v1/registrations/${registration.id}/review`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        data: { status: 'rejected', notes: 'e2e cleanup' },
      });
    }
  });
});
