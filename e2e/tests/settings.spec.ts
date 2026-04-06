import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Settings page @proxy', () => {
  test('settings page is accessible', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { level: 1, name: /settings/i })).toBeVisible();
  });

  test('shows General tab by default', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    const generalTab = page.getByRole('tab', { name: /general/i });
    await expect(generalTab).toBeVisible();
  });

  test('shows Entity Config tab', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    const entityConfigTab = page.getByRole('tab', { name: /entity config/i });
    await expect(entityConfigTab).toBeVisible();
  });

  test('shows Keys & KMS tab', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    const keysTab = page.getByRole('tab', { name: /keys.*kms/i });
    await expect(keysTab).toBeVisible();
  });

  test('shows Constraints tab', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    const constraintsTab = page.getByRole('tab', { name: /constraints/i });
    await expect(constraintsTab).toBeVisible();
  });

  test('shows Metadata Policies tab', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    const policiesTab = page.getByRole('tab', { name: /metadata policies/i });
    await expect(policiesTab).toBeVisible();
  });

  test('General tab shows Appearance section', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await expect(page.getByText(/appearance/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('General tab shows Authority Hints section', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await expect(page.getByRole('heading', { name: /authority hints/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('Entity Config tab displays correctly', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    const entityConfigTab = page.getByRole('tab', { name: /entity config/i });
    await entityConfigTab.click();
    await expect(page.getByRole('heading', { name: /configuration lifetime/i })).toBeVisible({ timeout: 10_000 });
  });

  test('Keys & KMS tab displays correctly', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    const keysTab = page.getByRole('tab', { name: /keys.*kms/i });
    await keysTab.click();
    await expect(page.getByRole('heading', { name: /kms information/i })).toBeVisible({ timeout: 10_000 });
  });

  test('Keys & KMS tab shows Key Rotation section', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    const keysTab = page.getByRole('tab', { name: /keys.*kms/i });
    await keysTab.click();
    await expect(page.getByRole('heading', { name: /key rotation/i })).toBeVisible({ timeout: 10_000 });
  });

  test('Constraints tab displays correctly', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    const constraintsTab = page.getByRole('tab', { name: /constraints/i });
    await constraintsTab.click();
    // Wait for content to load
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 10_000 });
  });

  test('Metadata Policies tab displays correctly', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    const policiesTab = page.getByRole('tab', { name: /metadata policies/i });
    await policiesTab.click();
    // Wait for content to load
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 10_000 });
  });
});
