import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Audit log page @proxy', () => {
  test('renders heading and filter controls', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/audit-log`);

    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible({ timeout: 10_000 });

    // Filter dropdowns
    await expect(page.getByRole('combobox').first()).toBeVisible();

    // User search input
    await expect(page.getByPlaceholder(/filter by user/i)).toBeVisible();
  });

  test('shows table or empty state depending on data', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/audit-log`);

    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible({ timeout: 10_000 });

    // Either a table header row or the empty-state message should appear
    const hasTable = await page.getByRole('columnheader', { name: /time/i }).isVisible({ timeout: 5_000 }).catch(() => false);
    const hasEmpty = await page.getByText(/no audit entries/i).isVisible({ timeout: 5_000 }).catch(() => false);
    expect(hasTable || hasEmpty).toBe(true);
  });

  test('resource type filter updates the view', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/audit-log`);
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible({ timeout: 10_000 });

    // Open resource type combobox and pick "subordinate"
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /subordinate/i }).first().click();

    // Page should still render without error
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible();
  });

  test('audit log page is reachable via sidebar link', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/dashboard`);
    await page.getByRole('link', { name: /^audit log$/i }).click();
    await expect(page).toHaveURL(/\/audit-log/);
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible({ timeout: 10_000 });
  });

  test('View button opens the response body captured for a real action', async ({ instancePage: page }) => {
    // Issue a trust mark — a real, audited mutating action — so there's a
    // fresh row to inspect. Create our own type + issuance spec rather than
    // assuming one already exists: on a long-lived dev environment there's
    // always leftover data from prior manual testing, but a fresh CI
    // container starts with none, and this test runs (alphabetically)
    // before trust-marks-crud.spec.ts would ever create one. Previously
    // this test's "Issue to Entity" combobox stayed disabled (empty spec
    // list) and .click() hung for the full 30s timeout on a clean stack.
    const typeId = `https://audit-view-e2e-${Date.now()}.example.org`;

    await page.goto(`${APP_URL}/trust-marks?tab=federation`);
    await page.getByRole('button', { name: /add type/i }).click();
    await page.getByLabel(/trust mark type identifier/i).fill(typeId);
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/trust-marks/types') && r.request().method() === 'POST'),
      page.getByRole('button', { name: /^create$/i }).click(),
    ]);

    await page.goto(`${APP_URL}/trust-marks?tab=issuance`);
    await page.getByRole('button', { name: /add spec/i }).click();
    await page.getByRole('combobox').first().click();
    const typeOption = page.getByRole('option', { name: typeId, exact: true });
    await typeOption.scrollIntoViewIfNeeded({ timeout: 15_000 });
    await typeOption.click();
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/trust-marks/issuance-spec') && r.request().method() === 'POST'),
      page.getByRole('button', { name: /^create$/i }).click(),
    ]);

    await page.getByRole('button', { name: /issue to entity/i }).click();
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: typeId, exact: true }).click();
    const entityId = `https://audit-e2e-${Date.now()}.example.org`;
    await page.getByLabel(/entity id/i).fill(entityId);
    await page.getByRole('button', { name: /^issue$/i }).click();
    await expect(page.getByText(/^issued$/i)).toBeVisible({ timeout: 5_000 });

    await page.goto(`${APP_URL}/audit-log`);
    const viewBtn = page.getByRole('button', { name: /^view$/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 10_000 });
    await viewBtn.click();

    await expect(page.getByRole('heading', { name: /action details/i })).toBeVisible();
    // The captured response body is the real server state — should include
    // the entity_id we just issued to. The JSON viewer visually truncates
    // long string values, so match on a distinguishing prefix rather than
    // the full string.
    await expect(page.getByText(entityId.slice(0, 30), { exact: false })).toBeVisible();
  });

  test('redacts sensitive-shaped fields (e.g. delegation_jwt) from captured response bodies', async ({ instancePage: page }) => {
    const typeId = `https://audit-redact-e2e-${Date.now()}.example.org`;

    await page.goto(`${APP_URL}/trust-marks?tab=federation`);
    await page.getByRole('button', { name: /add type/i }).click();
    await page.getByLabel(/trust mark type identifier/i).fill(typeId);
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/trust-marks/types') && r.request().method() === 'POST'),
      page.getByRole('button', { name: /^create$/i }).click(),
    ]);

    await page.goto(`${APP_URL}/trust-marks?tab=issuance`);
    await page.getByRole('button', { name: /add spec/i }).click();
    await page.getByRole('combobox').first().click();
    const option = page.getByRole('option', { name: typeId, exact: true });
    await option.scrollIntoViewIfNeeded({ timeout: 15_000 });
    await option.click();
    await page.getByPlaceholder('eyJ...').first().fill('eyJhbGciOiJFUzUxMiJ9.eyJmYWtlIjoidHJ1ZX0.sig');
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/trust-marks/issuance-spec') && r.request().method() === 'POST'),
      page.getByRole('button', { name: /^create$/i }).click(),
    ]);

    await page.goto(`${APP_URL}/audit-log`);
    await page.getByRole('button', { name: /^view$/i }).first().click();
    await expect(page.getByRole('heading', { name: /action details/i })).toBeVisible();

    // The real delegation JWT we submitted must never appear verbatim —
    // only the redaction placeholder.
    await expect(page.getByText('[REDACTED]')).toBeVisible();
    await expect(page.getByText(/eyJhbGciOiJFUzUxMiJ9\.eyJmYWtlIjoidHJ1ZX0/)).not.toBeVisible();
  });
});
