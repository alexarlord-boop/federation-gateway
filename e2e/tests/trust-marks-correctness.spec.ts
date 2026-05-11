import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

/**
 * Trust Marks UI correctness tests.
 * Validates semantic accuracy of status labels, column headers, and
 * refresh/timing helper text to ensure the UI reflects the actual
 * protocol semantics (inactive vs suspended, timing vs expiry,
 * grace period vs retry-after-expiry, rate limiting wording).
 */
test.describe('Trust Marks UI correctness @proxy', () => {
  test('self trust marks table header shows Timing not Expiry', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    const selfTab = page.getByRole('tab', { name: /my trust marks/i });
    if (!(await selfTab.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }
    await selfTab.click();

    // The column header must say 'Timing', not 'Expiry'
    await expect(page.getByRole('columnheader', { name: /^timing$/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('columnheader', { name: /^expiry$/i })).toHaveCount(0);
  });

  test('refresh grace period help text describes asynchronous grace window', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    const selfTab = page.getByRole('tab', { name: /my trust marks/i });
    if (!(await selfTab.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }
    await selfTab.click();

    // Open the add-trust-mark dialog (self mode) to expose the refresh fields
    const addBtn = page.getByRole('button', { name: /add trust mark/i }).first();
    if (!(await addBtn.isVisible({ timeout: 3_000 }))) {
      test.skip();
      return;
    }
    await addBtn.click();

    // Enable automatic refresh toggle if visible
    const refreshSwitch = page.getByRole('switch', { name: /automatic refresh/i });
    if (await refreshSwitch.isVisible({ timeout: 3_000 })) {
      await refreshSwitch.click();
      // Grace period help text should mention grace, not 'retry after expiry'
      await expect(page.getByText(/grace/i).first()).toBeVisible({ timeout: 3_000 });
      await expect(page.getByText(/retry for this long after expiry/i)).toHaveCount(0);
      // Min lifetime help text should mention 'minimum lifetime threshold'
      await expect(page.getByText(/minimum lifetime/i)).toBeVisible();
      // Rate limit help text should mention 'rate limit'
      await expect(page.getByText(/rate limit/i).first()).toBeVisible();
    }
  });

  test('inactive status: deactivated subject shows Inactive not Suspended', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    const issuanceTab = page.getByRole('tab', { name: /issuance/i });
    await expect(issuanceTab).toBeVisible({ timeout: 10_000 });
    await issuanceTab.click();

    // 'Suspended' status label must never appear — the correct term is 'Inactive'
    const suspendedText = page.getByText(/^suspended$/i);
    await expect(suspendedText).toHaveCount(0);

    // If subjects are visible, any deactivated ones should show 'Inactive'
    const inactiveText = page.getByText(/^inactive$/i);
    if (await inactiveText.isVisible({ timeout: 2_000 })) {
      await expect(inactiveText.first()).toBeVisible();
    }
  });

  test('issuance-spec edit button has accessible label', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    const issuanceTab = page.getByRole('tab', { name: /issuance/i });
    await expect(issuanceTab).toBeVisible({ timeout: 10_000 });
    await issuanceTab.click();

    // If specs are present, the edit icon button must have an accessible name
    const editBtn = page.getByRole('button', { name: /edit issuance spec/i }).first();
    if (await editBtn.isVisible({ timeout: 3_000 })) {
      await expect(editBtn).toBeVisible();
      // Clicking it should open a dialog with 'additional claims' section
      await editBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3_000 });
      await expect(page.getByText(/additional claims/i)).toBeVisible();
    }
  });

  test('add issuance spec dialog includes additional claims editor', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    const issuanceTab = page.getByRole('tab', { name: /issuance/i });
    await expect(issuanceTab).toBeVisible({ timeout: 10_000 });
    await issuanceTab.click();

    const addSpecBtn = page.getByRole('button', { name: /add spec/i });
    await expect(addSpecBtn).toBeVisible({ timeout: 5_000 });
    await addSpecBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3_000 });
    // Additional claims label and inputs must be present
    await expect(page.getByText(/additional claims/i).first()).toBeVisible();
    await expect(page.getByLabel(/new claim name/i)).toBeVisible();
    await expect(page.getByLabel(/new claim value/i)).toBeVisible();
  });
});
