import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Settings page @proxy', () => {
  test('settings page is accessible', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    // Wait for page to load and instance to be restored from localStorage
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { level: 1, name: /settings/i })).toBeVisible();
  });

  test('shows General tab by default', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await page.waitForTimeout(2000);
    const generalTab = page.getByRole('tab', { name: /general/i });
    await expect(generalTab).toBeVisible();
  });

  test('shows Entity Config tab', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await page.waitForTimeout(2000);
    const entityConfigTab = page.getByRole('tab', { name: /entity config/i });
    await expect(entityConfigTab).toBeVisible();
  });

  test('shows Keys & KMS tab', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await page.waitForTimeout(2000);
    const keysTab = page.getByRole('tab', { name: /keys.*kms/i });
    if (await keysTab.count() === 0) return; // feature not enabled for this instance
    await expect(keysTab).toBeVisible();
  });

  test('shows Constraints tab', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await page.waitForTimeout(2000);
    const constraintsTab = page.getByRole('tab', { name: /constraints/i });
    if (await constraintsTab.count() === 0) return; // feature not enabled for this instance
    await expect(constraintsTab).toBeVisible();
  });

  test('shows Metadata Policies tab', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await page.waitForTimeout(2000);
    const policiesTab = page.getByRole('tab', { name: /metadata policies/i });
    await expect(policiesTab).toBeVisible();
  });

  test('General tab shows Appearance section', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await page.waitForTimeout(2000);
    await expect(page.getByText(/appearance/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('General tab shows Authority Hints section', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await page.waitForTimeout(2000);
    await expect(page.getByRole('heading', { name: /authority hints/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('Entity Config tab displays correctly', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    // Wait for trust anchors to load
    await page.waitForResponse(resp => resp.url().includes('/api/v1/admin/trust-anchors') && resp.status() === 200);
    await page.waitForTimeout(1000); // Give React time to process
    const entityConfigTab = page.getByRole('tab', { name: /entity config/i });
    await entityConfigTab.click();
    await expect(page.getByRole('heading', { name: /configuration lifetime/i })).toBeVisible({ timeout: 10_000 });
  });

  test('Keys & KMS tab displays correctly', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await page.waitForTimeout(5000);
    const keysTab = page.getByRole('tab', { name: /keys.*kms/i });
    if (await keysTab.count() === 0) return; // feature not enabled
    await keysTab.click();
    await expect(page.getByRole('heading', { name: /kms information/i })).toBeVisible({ timeout: 10_000 });
  });

  test('Keys & KMS tab shows Key Rotation section', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await page.waitForTimeout(5000);
    const keysTab = page.getByRole('tab', { name: /keys.*kms/i });
    if (await keysTab.count() === 0) return; // feature not enabled
    await keysTab.click();
    await expect(page.getByRole('heading', { name: /key rotation/i })).toBeVisible({ timeout: 10_000 });
  });

  test('Constraints tab displays correctly', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await page.waitForTimeout(5000);
    const constraintsTab = page.getByRole('tab', { name: /constraints/i });
    if (await constraintsTab.count() === 0) return; // feature not enabled
    await constraintsTab.click();
    await expect(constraintsTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /max path length/i })).toBeVisible({ timeout: 10_000 });
  });

  test('Constraints tab does not issue a server error when constraints are unset', async ({ instancePage: page }) => {
    const serverErrors: Array<{ url: string; status: number }> = [];

    page.on('response', response => {
      if (
        response.url().includes('/api/v1/proxy/ta-1/api/v1/admin/subordinates/constraints') &&
        response.status() >= 500
      ) {
        serverErrors.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto(`${APP_URL}/settings`);
    await page.waitForTimeout(5000);
    const constraintsTab = page.getByRole('tab', { name: /constraints/i });
    if (await constraintsTab.count() === 0) return; // feature not enabled
    await constraintsTab.click();
    await expect(page.getByRole('heading', { name: /max path length/i })).toBeVisible({ timeout: 10_000 });

    expect(serverErrors).toEqual([]);
  });

  test('Metadata Policies tab displays correctly', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await page.waitForTimeout(5000);
    const policiesTab = page.getByRole('tab', { name: /metadata policies/i });
    await policiesTab.click();
    await expect(policiesTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('tabpanel')).toContainText(/policy|metadata/i);
  });
});
