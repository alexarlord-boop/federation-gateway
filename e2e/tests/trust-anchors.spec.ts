import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Trust Anchors page @bff', () => {
  test('admin can navigate to /trust-anchors', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    await expect(page).toHaveURL(/\/trust-anchors/);
    // The page heading is "TAs and IAs"
    await expect(page.getByRole('heading', { level: 1, name: /TAs and IAs/i })).toBeVisible();
  });

  test('shows the seeded LightHouse trust anchor card', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    // LightHouse should appear as a card title
    await expect(page.getByText('LightHouse')).toBeVisible();
  });

  test('can open the config panel for the LightHouse TA', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/trust-anchors`);
    
    // Find the LightHouse card (Card component renders as div with "card" class)
    const card = page.locator('div[class*="card"]').filter({ hasText: 'LightHouse' }).first();
    
    // Click the dropdown menu button (MoreHorizontal icon button)
    const dropdownButton = card.getByRole('button').first();
    await dropdownButton.click();
    
    // Click "Configure" from the dropdown menu
    const configureItem = page.getByRole('menuitem', { name: /configure/i });
    await expect(configureItem).toBeVisible();
    await configureItem.click();
    
    // Verify the config dialog opened
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/configure trust anchor/i)).toBeVisible();
    
    // Verify config form is displayed with Admin API Base URL field
    await expect(page.getByLabel(/admin api base url/i)).toBeVisible();
  });
});
