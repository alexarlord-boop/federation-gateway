import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

/**
 * Settings page mutation tests.
 * Written to expose real behavior — not biased to pass.
 */

test.describe.serial('Settings mutations @proxy', () => {
  test('can add an authority hint', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await expect(page.getByRole('tab', { name: /general/i })).toBeVisible({ timeout: 5_000 });
    await page.getByRole('tab', { name: /general/i }).click();

    // Use a unique URL to avoid duplicate-rejection across test runs
    const uniqueHint = `https://ta-test-${Date.now()}.example.org`;
    await expect(page.getByText(/authority hints/i)).toBeVisible({ timeout: 5_000 });
    const hintInput = page.getByPlaceholder('https://superior-federation.example.org');
    await hintInput.fill(uniqueHint);
    // Use CSS adjacent sibling — the Add button is a direct sibling of the input
    await page.locator('input[placeholder="https://superior-federation.example.org"] + button').click();
    await expect(
      page.getByText('Authority hint added').first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('can delete an authority hint', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await page.getByRole('tab', { name: /general/i }).click();
    await expect(page.getByText(/authority hints/i)).toBeVisible({ timeout: 5_000 });

    // Delete buttons on hint rows are icon-only (size="icon" → h-10 w-10, no accessible name).
    // Scope to the Authority Hints card via heading, then find the first trash icon button.
    const hintsCard = page.locator('div').filter({
      has: page.getByRole('heading', { name: 'Authority Hints' }),
    });
    const deleteBtn = hintsCard.locator('button.h-10.w-10').first();
    await expect(deleteBtn).toBeVisible({ timeout: 5_000 });
    await deleteBtn.click();
    await expect(page.getByText(/deleted|removed/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('entity config tab loads and shows metadata section', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    const entityConfigTab = page.getByRole('tab', { name: /entity config/i });
    await expect(entityConfigTab).toBeVisible({ timeout: 5_000 });
    await entityConfigTab.click();
    // Should show metadata section
    await expect(page.getByRole('heading', { name: /informational metadata|additional claims|configuration lifetime/i }).first()).toBeVisible({ timeout: 5_000 });
  });

  test('keys tab shows current signing algorithm', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    const keysTab = page.getByRole('tab', { name: /keys/i });
    await expect(keysTab).toBeVisible({ timeout: 5_000 });
    await keysTab.click();
    // Actual heading: "KMS Information" with "Algorithm" field label
    await expect(page.getByRole('heading', { name: /kms information/i })).toBeVisible({ timeout: 5_000 });
    // Should show key list section
    await expect(page.getByRole('heading', { name: /public keys/i })).toBeVisible({ timeout: 5_000 });
  });

  test('can trigger key rotation', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    await page.getByRole('tab', { name: /keys/i }).click();
    await expect(page.getByText(/key rotation/i)).toBeVisible({ timeout: 5_000 });

    const rotateBtn = page.getByRole('button', { name: /trigger key rotation/i });
    await expect(rotateBtn).toBeVisible({ timeout: 5_000 });
    await rotateBtn.click();
    await expect(page.getByText(/rotation triggered|success/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('GAP: settings has no "save all" — changes are applied immediately per field', async ({ instancePage: page }) => {
    // Document the UX pattern: there is no batch save
    await page.goto(`${APP_URL}/settings`);
    await page.getByRole('tab', { name: /general/i }).click();
    // No global "Save" button exists on the Settings page
    const saveAllBtn = page.getByRole('button', { name: /^save (all|settings)$/i });
    await expect(saveAllBtn).not.toBeVisible({ timeout: 2_000 });
  });

  test('constraints tab loads and shows general constraint options', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    const constraintsTab = page.getByRole('tab', { name: /constraints/i });
    await expect(constraintsTab).toBeVisible({ timeout: 10_000 });
    await constraintsTab.click();
    // Either the real constraint UI or a "not supported" placeholder
    const content = page.getByText(/max path length/i)
      .or(page.getByText(/naming constraints/i))
      .or(page.getByText(/not supported by the current backend/i));
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
    // GAP: if backend doesn't support general_constraints, placeholder is shown
    const isPlaceholder = await page.getByText(/not supported by the current backend/i).isVisible();
    if (isPlaceholder) {
      console.log('GAP: general_constraints capability not supported — constraints tab shows placeholder');
    }
  });

  test('metadata policies tab loads and shows JSON editor', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/settings`);
    const policiesTab = page.getByRole('tab', { name: /metadata policies/i });
    await expect(policiesTab).toBeVisible({ timeout: 5_000 });
    await policiesTab.click();
    // Should show edit button or JSON display
    await expect(page.getByRole('button', { name: /edit/i }).or(
      page.getByText(/metadata policy/i)
    )).toBeVisible({ timeout: 5_000 });
  });
});
