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

  test('issuance subjects show description inline when available', async ({ instancePage: page }) => {
    const trustMarkType = `https://tm-desc-${Date.now()}.example.org`;

    await page.goto(`${APP_URL}/trust-marks`);

    // Capture the auth token before navigating away so it is available for cleanup.
    const token = await page.evaluate(() => {
      const tokenKey = Object.keys(localStorage).find((key) => key.startsWith('auth_token:'));
      return tokenKey ? localStorage.getItem(tokenKey) : null;
    });
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    // Instance-scoped admin API routes only exist behind the gateway's proxy
    // hop, not as bare /api/v1/admin/* paths on the gateway itself.
    const adminApi = `${APP_URL}/api/v1/proxy/ta-1/api/v1/admin`;

    // The Add Spec dialog's type field only accepts already-registered types
    // (fixes a validation gap — an issuance spec for an unregistered type
    // silently 404s over the public protocol), so register one via the API
    // first, same as an operator would via Federation Trust Marks → Types.
    const typeResp = await page.request.post(`${adminApi}/trust-marks/types`, {
      headers: authHeaders,
      data: { trust_mark_type: trustMarkType },
    });
    const typeBody = await typeResp.json();
    const createdTypeId: number | null = typeBody?.id ?? null;

    await page.getByRole('tab', { name: /issuance/i }).click();
    await page.getByRole('button', { name: /add spec/i }).click();
    await page.getByRole('combobox').first().click();
    // Radix's typeahead only jumps to the first item *starting with* the
    // typed characters — with many similarly-prefixed test types in the
    // list it can land on the wrong one, so scroll to and click the exact
    // option instead (allow extra time for the just-created type to land
    // in the select's query cache).
    const specTypeOption = page.getByRole('option', { name: trustMarkType, exact: true });
    await specTypeOption.scrollIntoViewIfNeeded({ timeout: 15000 });
    await specTypeOption.click();

    // Capture the POST response so we can extract the new spec's ID for cleanup.
    const [createResp] = await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/v1/admin/trust-marks/issuance-spec') &&
          resp.request().method() === 'POST',
      ),
      page.getByRole('button', { name: /^create$/i }).click(),
    ]);

    let createdSpecId: number | null = null;
    if (createResp.ok()) {
      const body = await createResp.json().catch(() => null);
      createdSpecId = body?.id ?? null;
    }

    try {
      await page.route('**/api/v1/admin/trust-marks/issuance-spec/*/subjects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 999,
              entity_id: 'https://subject.example.org',
              status: 'active',
              description: 'Demo subject description',
            },
          ]),
        });
      });

      await page.getByRole('heading', { name: trustMarkType }).click();

      await expect(page.getByText('https://subject.example.org')).toBeVisible();
      await expect(page.getByText('Demo subject description')).toBeVisible();
    } finally {
      // Best-effort cleanup so repeated runs don't accumulate test data.
      // Tightly timed and swallowed — a slow/flaky cleanup call must never
      // fail a test whose actual assertions already passed above.
      if (createdSpecId !== null) {
        await page.request.delete(
          `${adminApi}/trust-marks/issuance-spec/${createdSpecId}`,
          { headers: authHeaders, timeout: 5000 },
        ).catch(() => {});
      }
      if (createdTypeId !== null) {
        await page.request.delete(
          `${adminApi}/trust-marks/types/${createdTypeId}`,
          { headers: authHeaders, timeout: 5000 },
        ).catch(() => {});
      }
    }
  });
});
