import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Trust Marks page @proxy', () => {
  test('trust marks page is accessible', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    await expect(page).toHaveURL(/\/trust-marks/);
    await expect(page.getByRole('heading', { level: 1, name: /trust marks/i })).toBeVisible();
  });

  test('shows role legend explaining Owner/Issuer/Subject/Relying Party mapping', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    // Role legend cards should be visible, mapping each OIDFed role to its tab
    await expect(page.getByText('Owner', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Issuer', { exact: true })).toBeVisible();
    await expect(page.getByText('Subject', { exact: true })).toBeVisible();
    await expect(page.getByText('Relying Party', { exact: true })).toBeVisible();
    await expect(page.getByText(/my trust marks/i).first()).toBeVisible();
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
    await expect(page.getByRole('tabpanel').first()).toBeVisible();
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

  test('subject status toggle uses inactive (not suspended) when deactivating', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    const issuanceTab = page.getByRole('tab', { name: /issuance/i });
    await expect(issuanceTab).toBeVisible({ timeout: 10_000 });
    await issuanceTab.click();
    // If there are any expanded spec subjects, check deactivated label
    const inactiveLabel = page.getByText(/inactive/i);
    const suspendedLabel = page.getByText(/suspended/i);
    // 'Inactive' may or may not be visible (depends on data), but 'Suspended' must never appear
    await expect(suspendedLabel).toHaveCount(0);
    // The deactivated status badge/label uses 'Inactive', not 'Suspended'
    if (await inactiveLabel.isVisible({ timeout: 2_000 })) {
      await expect(inactiveLabel.first()).toBeVisible();
    }
  });
});
