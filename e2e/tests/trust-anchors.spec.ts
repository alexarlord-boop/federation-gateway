import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Trust Anchors page @bff', () => {
  test('admin can navigate to /trust-anchors', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    await expect(page).toHaveURL(/\/trust-anchors/);
    await expect(page.getByRole('heading', { name: /instances/i }).first()).toBeVisible();
    await expect(
      page.getByText(/manage your federation instances.*authority hints/i),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: /registered intermediates/i })).toHaveCount(0);
  });

  test('Trust Anchors page has no Registered Intermediates section', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    await expect(page.getByRole('heading', { name: /registered intermediates/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /my instances/i })).toBeVisible();
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
      .filter({ has: page.getByRole('heading', { name: 'LightHouse', exact: true }) })
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
      .filter({ has: page.getByRole('heading', { name: 'LightHouse', exact: true }) })
      .first();

    await expect(lightHouseCard).toBeVisible();
    await expect(lightHouseCard.getByText(/deployment managed/i)).toBeVisible();
    await expect(lightHouseCard.getByRole('button', { name: /trust anchor options/i })).toHaveCount(0);
    await expect(lightHouseCard.getByText(/subordinates/i)).toBeVisible();
  });

  test('shows the seeded LightHouse trust anchor card', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    await expect(page.getByRole('heading', { name: 'LightHouse', exact: true })).toBeVisible();
  });



  test('My Instances card shows subordinate count from LightHouse', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    const lightHouseCard = page.locator('div.rounded-lg.border.bg-card').filter({
      has: page.getByRole('heading', { name: 'LightHouse', exact: true }),
    }).first();
    await expect(lightHouseCard.getByText(/subordinates/i)).toBeVisible();
    // Count is fetched live from LightHouse — just verify it renders a number.
    const countEl = lightHouseCard.locator('p.text-2xl').first();
    await expect(countEl).toBeVisible();
    const text = await countEl.textContent();
    expect(Number.isFinite(parseInt(text?.trim() ?? '', 10))).toBe(true);
  });
});
