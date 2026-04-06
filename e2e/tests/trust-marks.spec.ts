import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Trust Marks page @proxy', () => {
  test('trust marks page is accessible', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    await expect(page).toHaveURL(/\/trust-marks/);
    await expect(page.getByRole('heading', { name: /trust marks/i })).toBeVisible();
  });

  test('shows trust mark management info section', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    // Info section should display Trust Mark Management title
    await expect(page.getByText(/trust mark management/i)).toBeVisible({ timeout: 10_000 });
    // Should also show description mentioning My Trust Marks and Federation Trust Marks
    await expect(page.getByText(/my trust marks/i)).toBeVisible();
  });

  test('shows Federation Trust Marks tab', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    const federationTab = page.getByRole('tab', { name: /federation trust marks/i });
    await expect(federationTab).toBeVisible({ timeout: 10_000 });
  });

  test('can navigate to Federation Trust Marks Types section', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    const federationTab = page.getByRole('tab', { name: /federation trust marks/i });
    await expect(federationTab).toBeVisible({ timeout: 10_000 });
    await federationTab.click();
    // Wait for the Types tab to appear in the sub-tabs
    await expect(page.getByRole('tab', { name: /types/i })).toBeVisible({ timeout: 10_000 });
    // Click Types tab
    const typesTab = page.getByRole('tab', { name: /types/i }).first();
    await typesTab.click();
    await expect(typesTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toBeVisible();
  });

  test('can open the add trust mark type form', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    // Click the Federation Trust Marks tab
    const federationTab = page.getByRole('tab', { name: /federation trust marks/i });
    await expect(federationTab).toBeVisible({ timeout: 10_000 });
    await federationTab.click();
    // Click the Types sub-tab
    const typesTab = page.getByRole('tab', { name: /types/i });
    await expect(typesTab.first()).toBeVisible({ timeout: 10_000 });
    await typesTab.first().click();
    // Find and click Add Type button
    const addButton = page.getByRole('button', { name: /add type/i });
    await expect(addButton).toBeVisible({ timeout: 10_000 });
    await addButton.click();
    // Verify dialog/form opens
    await expect(page.getByRole('heading', { name: /add trust mark type/i })).toBeVisible();
    // Verify form fields are visible
    await expect(page.getByLabel(/trust mark type identifier/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
  });

  test('shows Trust Mark Owners section in Federation tab', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    // Click the Federation Trust Marks tab
    const federationTab = page.getByRole('tab', { name: /federation trust marks/i });
    await expect(federationTab).toBeVisible({ timeout: 10_000 });
    await federationTab.click();
    // Look for Owners sub-tab
    const ownersTab = page.getByRole('tab', { name: /owners/i });
    await expect(ownersTab).toBeVisible({ timeout: 10_000 });
  });

  test('shows Trust Mark Issuers section in Federation tab', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    // Click the Federation Trust Marks tab
    const federationTab = page.getByRole('tab', { name: /federation trust marks/i });
    await expect(federationTab).toBeVisible({ timeout: 10_000 });
    await federationTab.click();
    // Look for Issuers sub-tab
    const issuersTab = page.getByRole('tab', { name: /issuers/i });
    await expect(issuersTab).toBeVisible({ timeout: 10_000 });
  });

  test('can navigate to Issuance tab', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    const issuanceTab = page.getByRole('tab', { name: /issuance/i });
    await expect(issuanceTab).toBeVisible({ timeout: 10_000 });
    await issuanceTab.click();
    // Issuance tab should be active
    await expect(issuanceTab).toHaveAttribute('aria-selected', 'true');
  });
});
