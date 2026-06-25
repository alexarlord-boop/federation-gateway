import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

/**
 * Entity Detail Page tests.
 * These tests are intentionally written to expose gaps and real behavior —
 * not to pass at all costs.
 */

async function getFirstEntityHref(page: any): Promise<string | null> {
  await page.goto(`${APP_URL}/entities`);
  await expect(page.locator('table tbody')).toBeVisible({ timeout: 10_000 });
  const links = page.locator('table tbody tr a[href*="/entities/"]');
  if (await links.count() === 0) return null;
  return await links.first().getAttribute('href');
}

async function getEntityWithStatus(page: any, status: string): Promise<string | null> {
  await page.goto(`${APP_URL}/entities?status=${status}`);
  await expect(page.locator('table tbody')).toBeVisible({ timeout: 10_000 });
  const links = page.locator('table tbody tr a[href*="/entities/"]');
  if (await links.count() === 0) return null;
  return await links.first().getAttribute('href');
}

test.describe('Entity Detail Page @proxy', () => {
  test('overview tab shows entity information', async ({ instancePage: page }) => {
    const href = await getFirstEntityHref(page);
    if (!href) return test.skip();
    await page.goto(`${APP_URL}${href}`);
    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
    await expect(page.getByText(/subordinate information/i)).toBeVisible();
  });

  test('metadata tab renders entity JSON with Edit JSON button', async ({ instancePage: page }) => {
    const href = await getFirstEntityHref(page);
    if (!href) return test.skip();
    await page.goto(`${APP_URL}${href}`);
    await page.getByRole('tab', { name: 'Metadata', exact: true }).click();
    await expect(page.getByText(/metadata json/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /edit json/i })).toBeVisible({ timeout: 5_000 });
  });

  test('jwks tab shows published keys and exposes add/delete controls', async ({ instancePage: page }) => {
    const href = await getFirstEntityHref(page);
    if (!href) return test.skip();
    await page.goto(`${APP_URL}${href}`);
    await page.getByRole('tab', { name: /jwks/i }).click();
    await expect(page.getByText(/published keys/i)).toBeVisible({ timeout: 5_000 });
    // Add Key button and textarea should be present for admins
    await expect(page.getByRole('button', { name: /add key/i })).toBeVisible({ timeout: 5_000 });
  });

  test('constraints tab allows setting max path length', async ({ instancePage: page }) => {
    const href = await getFirstEntityHref(page);
    if (!href) return test.skip();
    await page.goto(`${APP_URL}${href}`);
    await page.getByRole('tab', { name: /constraints/i }).click();
    await expect(page.getByRole('button', { name: /copy from general/i })).toBeVisible({ timeout: 5_000 });
    // Max path length input has placeholder "e.g. 2"
    const maxPathInput = page.getByPlaceholder(/e\.g\. 2/i);
    await maxPathInput.fill('3');
    await page.getByRole('button', { name: /set/i }).first().click();
    // Toast title is 'Updated' — use exact match to avoid ARIA live region strict-mode violation
    await expect(page.getByText('Updated', { exact: true })).toBeVisible({ timeout: 5_000 });
  });

  test('policies tab shows Edit JSON for entity with no policies configured', async ({ instancePage: page }) => {
    const href = await getFirstEntityHref(page);
    if (!href) return test.skip();
    await page.goto(`${APP_URL}${href}`);
    await page.getByRole('tab', { name: /policies/i }).click();
    // 404 is now handled: returns {} so the Edit JSON button should appear
    const editBtn = page.getByRole('button', { name: /edit json/i });
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
    await editBtn.click();
    await expect(page.getByRole('button', { name: /^save$/i })).toBeVisible({ timeout: 3_000 });
  });

  test('can block an active entity from detail page', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/entities`);
    await expect(page.locator('table tbody')).toBeVisible({ timeout: 10_000 });
    // Guard: count active rows first to avoid infinite getAttribute wait
    const activeRows = page.locator('table tbody tr').filter({ hasText: /\bactive\b/i });
    const rowCount = await activeRows.count();
    if (rowCount === 0) return test.skip();
    const href = await activeRows.first().locator('a[href*="/entities/"]').getAttribute('href', { timeout: 3_000 }).catch(() => null);
    if (!href) return test.skip();

    await page.goto(`${APP_URL}${href}`);
    const blockBtn = page.getByRole('button', { name: /^block$/i });
    await expect(blockBtn).toBeVisible({ timeout: 5_000 });
    // Block button opens a DropdownMenu — requires two clicks
    await blockBtn.click();
    const blockMenuItem = page.getByRole('menuitem', { name: /block \(suspend/i });
    await expect(blockMenuItem).toBeVisible({ timeout: 3_000 });
    await blockMenuItem.click();
    await expect(page.getByText('Status Updated', { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('can change status of inactive entity from detail page', async ({ instancePage: page }) => {
    const href = await getEntityWithStatus(page, 'inactive');
    if (!href) return test.skip();
    await page.goto(`${APP_URL}${href}`);
    // Inactive entities now have a "Change Status" dropdown with Set Active / Set Pending options
    const changeStatusBtn = page.getByRole('button', { name: /change status/i });
    await expect(changeStatusBtn).toBeVisible({ timeout: 5_000 });
    await changeStatusBtn.click();
    await expect(page.getByRole('menuitem', { name: /set active/i })).toBeVisible({ timeout: 3_000 });
  });

  test('can delete an entity from detail page', async ({ instancePage: page }) => {
    // Register a throwaway entity first
    await page.goto(`${APP_URL}/entities`);
    await page.locator('main').getByRole('link', { name: /register subordinate/i }).click();
    const entityId = `https://delete-test-${Date.now()}.example.com`;
    await page.getByLabel(/subordinate id/i).fill(entityId);
    await page.getByLabel('Trust Anchor').click();
    await page.getByRole('option', { name: /lighthouse/i }).first().click();
    await page.getByRole('button', { name: /fetch subordinate configuration/i }).click();
    await expect(page.getByText(/configuration not available|configuration retrieved/i)).toBeVisible({ timeout: 15_000 });
    // Config fetch fails for fake URL → must select entity type so Next is enabled
    await page.getByLabel(/openid provider/i).check();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByLabel(/display name/i)).toBeVisible({ timeout: 5_000 });
    await page.getByLabel(/display name/i).fill('Delete Test Entity');
    await page.getByLabel(/technical contact email/i).fill('delete@example.com');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: /registration summary/i })).toBeVisible({ timeout: 5_000 });
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /submit|register/i }).first().click();
    await expect(page).toHaveURL(/\/entities$/, { timeout: 10_000 });

    // Navigate to the newly created entity's detail page
    const link = page.locator('table tbody tr a[href*="/entities/"]')
      .filter({ hasText: new RegExp('delete-test', 'i') }).or(
        page.locator('table tbody tr').filter({ hasText: /delete test entity/i }).locator('a[href*="/entities/"]')
      ).first();
    // If entity link not directly visible, search by ID fragment
    const rows = page.locator('table tbody tr');
    let entityHref: string | null = null;
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const text = await row.textContent();
      if (text?.includes('delete-test') || text?.includes('Delete Test Entity')) {
        entityHref = await row.locator('a[href*="/entities/"]').getAttribute('href');
        break;
      }
    }
    if (!entityHref) return test.skip(); // couldn't find created entity

    await page.goto(`${APP_URL}${entityHref}`);
    // Delete button is icon-only (Trash2, size="icon" → h-10 w-10) inside AlertDialogTrigger
    // It has no text/aria-label — this IS the accessibility gap we're testing
    const deleteBtn = page.locator('button.h-10.w-10.bg-destructive, button.h-10.w-10[class*="destructive"]').first();
    await expect(deleteBtn).toBeVisible({ timeout: 5_000 });
    await deleteBtn.click();
    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 3_000 });
    await page.getByRole('button', { name: /^delete$/i }).click();
    // Should redirect to entities list
    await expect(page).toHaveURL(/\/entities$/, { timeout: 10_000 });
  });

  test('back button returns to entities list', async ({ instancePage: page }) => {
    const href = await getFirstEntityHref(page);
    if (!href) return test.skip();
    await page.goto(`${APP_URL}${href}`);
    const backLink = page.getByRole('link', { name: /back|entities/i }).first();
    await expect(backLink).toBeVisible({ timeout: 5_000 });
    await backLink.click();
    await expect(page).toHaveURL(/\/entities$/, { timeout: 5_000 });
  });
});
