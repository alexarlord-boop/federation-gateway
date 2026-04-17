import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

/**
 * Trust Marks CRUD tests.
 * Written to expose real behavior and gaps — not biased to pass.
 */
test.describe.serial('Trust Marks management @proxy', () => {
  const trustMarkType = `https://tm-test-${Date.now()}.example.org`;

  test('trust marks page loads federation tab', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    await expect(page.getByRole('tab', { name: /federation|trust mark types/i })).toBeVisible({ timeout: 5_000 });
  });

  test('can open add trust mark type form', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    // Navigate to Federation tab
    const fedTab = page.getByRole('tab', { name: /federation/i });
    await fedTab.click();
    // Navigate to Types section if needed
    const typesLink = page.getByRole('button', { name: /trust mark types/i })
      .or(page.getByRole('link', { name: /trust mark types/i })).first();
    if (await typesLink.isVisible({ timeout: 2_000 })) {
      await typesLink.click();
    }
    const addBtn = page.getByRole('button', { name: /add type/i });
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
    await addBtn.click();
    // Form should appear — the dialog is labeled "Add Trust Mark Type", input has specific placeholder
    await expect(
      page.getByRole('dialog', { name: /add trust mark type/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test('can create a trust mark type', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    const fedTab = page.getByRole('tab', { name: /federation/i });
    await fedTab.click();
    const typesLink = page.getByRole('button', { name: /trust mark types/i })
      .or(page.getByRole('link', { name: /trust mark types/i })).first();
    if (await typesLink.isVisible({ timeout: 2_000 })) await typesLink.click();

    const addBtn = page.getByRole('button', { name: /add type/i });
    await addBtn.click();

    // Fill in trust mark type URI — use specific accessible name from the dialog
    const typeInput = page.getByRole('textbox', { name: /trust mark type identifier/i });
    await typeInput.fill(trustMarkType);

    // Submit
    await page.getByRole('button', { name: /save|create|add/i }).last().click();

    // Should show in list or show success
    await expect(
      page.getByText(new RegExp(trustMarkType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
        .or(page.getByText(/created|success/i)).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('can issue a trust mark to an entity via dialog', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    const issuanceTab = page.getByRole('tab', { name: /issuance/i });
    await expect(issuanceTab).toBeVisible({ timeout: 5_000 });
    await issuanceTab.click();

    // "Issue to Entity" button should be immediately visible
    const issueBtn = page.getByRole('button', { name: /issue to entity/i });
    await expect(issueBtn).toBeVisible({ timeout: 5_000 });
    await issueBtn.click();

    // Dialog opens with spec selector and entity ID input
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3_000 });
    await expect(page.getByLabel(/trust mark spec/i)).toBeVisible();
    await expect(page.getByLabel(/entity id/i)).toBeVisible();
  });

  test('trust mark types list shows created type', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    const fedTab = page.getByRole('tab', { name: /federation/i });
    await fedTab.click();
    // Should show the previously created type URI
    await expect(
      page.getByText(new RegExp(trustMarkType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
    ).toBeVisible({ timeout: 10_000 });
  });

  test('trust mark type has detail/delete action', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/trust-marks`);
    const fedTab = page.getByRole('tab', { name: /federation/i });
    await fedTab.click();
    // Each trust mark type row/card should have a delete or manage action
    const deleteOrManageBtn = page.getByRole('button', { name: /delete|manage|view/i }).first();
    await expect(deleteOrManageBtn).toBeVisible({ timeout: 5_000 });
  });
});
