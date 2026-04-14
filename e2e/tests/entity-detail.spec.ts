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
  const link = page.locator('table tbody tr a[href*="/entities/"]').first();
  return await link.getAttribute('href').catch(() => null);
}

async function getEntityWithStatus(page: any, status: string): Promise<string | null> {
  await page.goto(`${APP_URL}/entities?status=${status}`);
  await expect(page.locator('table tbody')).toBeVisible({ timeout: 10_000 });
  const link = page.locator('table tbody tr a[href*="/entities/"]').first();
  return await link.getAttribute('href').catch(() => null);
}

test.describe('Entity Detail Page @proxy', () => {
  test('overview tab shows entity information', async ({ instancePage: page }) => {
    const href = await getFirstEntityHref(page);
    if (!href) return test.skip();
    await page.goto(`${APP_URL}${href}`);
    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
    await expect(page.getByText(/entity information/i)).toBeVisible();
  });

  test('metadata tab renders entity JSON (read-only — no edit button)', async ({ instancePage: page }) => {
    const href = await getFirstEntityHref(page);
    if (!href) return test.skip();
    await page.goto(`${APP_URL}${href}`);
    await page.getByRole('tab', { name: 'Metadata', exact: true }).click();
    // Metadata tab shows read-only JSON — no edit button
    await expect(page.getByText(/metadata json/i)).toBeVisible({ timeout: 5_000 });
    // GAP: metadata is read-only, there is no way to edit it from the entity detail UI
    await expect(page.getByRole('button', { name: /edit/i })).not.toBeVisible();
  });

  test('jwks tab shows keys but has no add-key button', async ({ instancePage: page }) => {
    const href = await getFirstEntityHref(page);
    if (!href) return test.skip();
    await page.goto(`${APP_URL}${href}`);
    await page.getByRole('tab', { name: /jwks/i }).click();
    await expect(page.getByText(/public keys/i)).toBeVisible({ timeout: 5_000 });
    // GAP: useSubordinateKeys hook has addJwk/deleteJwk mutations,
    // but the UI only shows a read-only <pre> — no way to add or delete keys
    await expect(page.getByRole('button', { name: /add key/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /delete key/i })).not.toBeVisible();
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

  test('GAP: policies tab may not show Edit JSON for entity with no policies configured', async ({ instancePage: page }) => {
    test.fail(); // Expected failure — bug exists: error state shown instead of Edit JSON
    const href = await getFirstEntityHref(page);
    if (!href) return test.skip();
    await page.goto(`${APP_URL}${href}`);
    await page.getByRole('tab', { name: /policies/i }).click();
    // Allow more time — the component may be stuck in loading state (spinner) when
    // the API returns 404 for entities with no policies, instead of empty object.
    // GAP: component never leaves loading state → Edit JSON button never appears.
    const editBtn = page.getByRole('button', { name: /edit json/i });
    const errorText = page.getByText(/failed to load/i);
    await expect(editBtn.or(errorText)).toBeVisible({ timeout: 10_000 });
    // This assertion confirms the gap: Edit JSON must be available even with no policies
    await expect(editBtn).toBeVisible({ timeout: 1_000 });
    await editBtn.click();
    await expect(page.getByRole('button', { name: /^save$/i })).toBeVisible({ timeout: 3_000 });
  });

  test('can lock an active entity from detail page', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/entities`);
    await expect(page.locator('table tbody')).toBeVisible({ timeout: 10_000 });
    // Guard: count active rows first to avoid infinite getAttribute wait
    const activeRows = page.locator('table tbody tr').filter({ hasText: /\bactive\b/i });
    const rowCount = await activeRows.count();
    if (rowCount === 0) return test.skip();
    const href = await activeRows.first().locator('a[href*="/entities/"]').getAttribute('href', { timeout: 3_000 }).catch(() => null);
    if (!href) return test.skip();

    await page.goto(`${APP_URL}${href}`);
    const lockBtn = page.getByRole('button', { name: /^lock$/i });
    await expect(lockBtn).toBeVisible({ timeout: 5_000 });
    // Lock button opens a DropdownMenu — requires two clicks
    await lockBtn.click();
    const lockMenuItem = page.getByRole('menuitem', { name: /lock \(suspend/i });
    await expect(lockMenuItem).toBeVisible({ timeout: 3_000 });
    await lockMenuItem.click();
    // GAP: if LightHouse rejects 'locked' status (valid: active/blocked/pending/inactive)
    // then "Update Failed" appears instead of "Status Updated" — real product bug.
    await expect(page.getByText('Status Updated', { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('GAP: cannot change status of inactive entity from detail page', async ({ instancePage: page }) => {
    // Find an inactive/rejected entity
    const href = await getEntityWithStatus(page, 'inactive');
    if (!href) return test.skip();
    await page.goto(`${APP_URL}${href}`);
    // The lock/unlock button is only shown for active/locked statuses
    // An inactive entity has no status change UI — this is a gap
    const lockBtn = page.getByRole('button', { name: /lock|unlock|activate/i });
    await expect(lockBtn).not.toBeVisible({ timeout: 3_000 });
    // There is no way to reactivate an inactive entity from the UI
  });

  test('can delete an entity from detail page', async ({ instancePage: page }) => {
    // Register a throwaway entity first
    await page.goto(`${APP_URL}/entities`);
    await page.getByRole('link', { name: /register entity/i }).click();
    const entityId = `https://delete-test-${Date.now()}.example.com`;
    await page.getByLabel(/entity id/i).fill(entityId);
    await page.getByLabel('Trust Anchor').click();
    await page.getByRole('option', { name: /lighthouse/i }).click();
    await page.getByRole('button', { name: /fetch entity configuration/i }).click();
    await expect(page.getByText(/configuration not available|configuration retrieved/i)).toBeVisible({ timeout: 15_000 });
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
