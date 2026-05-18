import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Entities page @proxy', () => {
  test('subordinates list is visible with correct heading', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/entities`);
    await expect(page).toHaveURL(/\/entities$/);
    await expect(page.getByRole('heading', { level: 1, name: /subordinates/i })).toBeVisible();
    await expect(page.getByText(/manage registered subordinates in the federation/i)).toBeVisible();
  });

  test('can navigate to register subordinate form', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/entities`);
    const registerButton = page.locator('main').getByRole('link', { name: /register subordinate/i });
    await registerButton.click();
    await expect(page).toHaveURL(/\/entities\/register/);
    await expect(page.getByRole('heading', { name: /register subordinate/i })).toBeVisible();
  });

  test('register form shows federation_entity type option', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/entities/register`);
    await expect(page.getByRole('heading', { name: /register subordinate/i })).toBeVisible();
    // Advance past step 0 to the config review step where type selection is shown.
    // Fill required fields first.
    await page.getByLabel(/subordinate id/i).fill('https://intermediate-test.example.com');
    await page.getByLabel('Trust Anchor').click();
    await page.getByRole('option', { name: /lighthouse/i }).click();
    await page.getByRole('button', { name: /fetch subordinate configuration/i }).click();
    await expect(
      page.getByText(/configuration not available|configuration retrieved/i)
    ).toBeVisible({ timeout: 15_000 });
    // federation_entity checkbox should be visible in the type selector
    await expect(page.getByLabel(/federation entity/i)).toBeVisible();
  });

  test('can register a new subordinate with pending status', async ({ instancePage: page }) => {
    // Navigate to register form
    await page.goto(`${APP_URL}/entities`);
    await page.locator('main').getByRole('link', { name: /register subordinate/i }).click();
    await expect(page).toHaveURL(/\/entities\/register/);

    // Step 1: Enter subordinate ID
    const subordinateId = `https://e2e-test-entity-${Date.now()}.example.com`;
    await page.getByLabel(/subordinate id/i).fill(subordinateId);

    // Select the LightHouse trust anchor
    await page.getByLabel('Trust Anchor').click();
    await page.getByRole('option', { name: /lighthouse/i }).click();

    // Entity type defaults to openid_provider, so continue
    // Click "Fetch Subordinate Configuration" button
    const fetchButton = page.getByRole('button', { name: /fetch subordinate configuration/i });
    await fetchButton.click();

    // Wait for config review step (step 1) to render — fetch may succeed or fail
    await expect(
      page.getByText(/configuration not available|configuration retrieved/i)
    ).toBeVisible({ timeout: 15_000 });

    // Advance to Additional Details step
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2: Enter additional details
    await expect(page.getByLabel(/display name/i)).toBeVisible({ timeout: 5_000 });
    const displayName = `E2E Test Entity ${Date.now()}`;
    await page.getByLabel(/display name/i).fill(displayName);
    await page.getByLabel(/technical contact email/i).fill('test@example.com');

    // Advance to Review & Submit step
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 4: Review & Submit - confirm checkbox and submit
    await expect(page.getByRole('heading', { name: /registration summary/i })).toBeVisible({ timeout: 5_000 });
    
    // Check the confirmation checkbox
    const confirmCheckbox = page.getByRole('checkbox');
    await confirmCheckbox.check();

    // Click submit button
    const submitButton = page.getByRole('button', { name: /submit|register/i }).first();
    await submitButton.click();

    // Should redirect to /entities after successful submission
    await expect(page).toHaveURL(/\/entities$/, { timeout: 10_000 });
    
    // Verify the new entity appears in the list
    await expect(page.getByText(new RegExp(displayName, 'i'))).toBeVisible({ timeout: 10_000 });
  });

  test('can view subordinate detail by clicking on subordinate row', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/entities`);
    
    // Wait for entities to load
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });

    // Check if there are any entity rows (not the empty-state row)
    const entityRows = page.locator('table tbody tr:not(:has(td[colspan]))');
    const count = await entityRows.count();
    if (count === 0) return; // DB has no entities — nothing to test

    // Click the first entity row to navigate to detail
    const firstEntityLink = entityRows.first().locator('a[href*="/entities/"]');
    await expect(firstEntityLink).toBeVisible({ timeout: 10_000 });
    const href = await firstEntityLink.getAttribute('href');
    expect(href).toBeTruthy();
    await page.goto(`${APP_URL}${href!}`);
    await expect(page).toHaveURL(/\/entities\//);
  });

  test('can filter subordinates by status', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/entities`);
    
    // Open status filter dropdown
    const filterButton = page.locator('button').filter({ hasText: /status/i }).first();
    await filterButton.click();

    // Select "Pending" status
    const pendingOption = page.getByRole('option', { name: /pending/i });
    await pendingOption.click();

    // The table should still be visible (may be empty or filtered)
    await expect(page.locator('table')).toBeVisible();
  });

  test('can search subordinates by ID', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/entities`);
    
    // Wait for table to load
    await expect(page.locator('table tbody')).toBeVisible({ timeout: 10_000 });

    // Fill search input
    const searchInput = page.getByPlaceholder(/search by subordinate id/i);
    await searchInput.fill('example');

    // Table should still be visible
    await expect(page.locator('table')).toBeVisible();
  });

  test('register page shows expanded entity-type multi-select for non-intermediate flow', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/entities/register`);

    // All 6 entity types should be shown as checkboxes
    await expect(page.getByLabel(/openid provider/i)).toBeVisible();
    await expect(page.getByLabel(/relying party/i)).toBeVisible();
    await expect(page.getByLabel(/federation entity/i)).toBeVisible();
    await expect(page.getByLabel(/oauth authorization server/i)).toBeVisible();
    await expect(page.getByLabel(/oauth client/i)).toBeVisible();
    await expect(page.getByLabel(/oauth resource/i)).toBeVisible();

    // Multiple types can be selected simultaneously
    await page.getByLabel(/openid provider/i).check();
    await page.getByLabel(/oauth client/i).check();
    await expect(page.getByLabel(/openid provider/i)).toBeChecked();
    await expect(page.getByLabel(/oauth client/i)).toBeChecked();
  });

  test('registration review shows friendly entity-type labels', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/entities/register`);

    // Fill in required fields on step 0
    const subordinateId = `https://e2e-type-label-test-${Date.now()}.example.com`;
    await page.getByLabel(/subordinate id/i).fill(subordinateId);
    await page.getByLabel('Trust Anchor').click();
    await page.getByRole('option', { name: /lighthouse/i }).click();

    // Select oauth_client in addition to openid_provider
    await page.getByLabel(/openid provider/i).check();
    await page.getByLabel(/oauth client/i).check();

    // Fetch config (will likely fail for fake URL, that's fine)
    await page.getByRole('button', { name: /fetch subordinate configuration/i }).click();
    await expect(
      page.getByText(/configuration not available|configuration retrieved/i)
    ).toBeVisible({ timeout: 15_000 });

    // Review step (config): friendly labels should appear scoped to the Subordinate Type container
    const configTypeRow = page.locator('[data-testid="entity-type-display"]');
    await expect(configTypeRow.getByText(/openid provider/i)).toBeVisible();
    await expect(configTypeRow.getByText(/oauth client/i)).toBeVisible();

    // Advance to Additional Details
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByLabel(/display name/i)).toBeVisible({ timeout: 5_000 });
    await page.getByLabel(/display name/i).fill('Type Label Test Entity');
    await page.getByLabel(/technical contact email/i).fill('test@example.com');

    // Advance to Review & Submit
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: /registration summary/i })).toBeVisible({ timeout: 5_000 });

    // Summary should show friendly labels, not raw type keys
    const summarySection = page.locator('dl');
    await expect(summarySection.getByText(/openid provider/i)).toBeVisible();
    await expect(summarySection.getByText(/oauth client/i)).toBeVisible();
    // Should NOT show raw machine keys as labels
    await expect(page.getByText(/^OP$|^RP$/)).not.toBeVisible();
  });
});

test.describe.serial('Approvals page @proxy', () => {
  const testSubordinateId = `https://approval-test-${Date.now()}.example.com`;
  const testSubordinateId2 = `https://approval-test2-${Date.now()}.example.com`;
  let createdDisplayName1: string | null = null;
  let createdDisplayName2: string | null = null;

  test('approvals page is accessible and shows heading', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/approvals`);
    await expect(page).toHaveURL(/\/approvals/);
    await expect(page.getByRole('heading', { level: 1, name: /approvals/i })).toBeVisible();
    await expect(page.getByText(/review and manage entity registration requests/i)).toBeVisible();
  });

  test('can register a subordinate with pending status for approval', async ({ instancePage: page }) => {
    // Register subordinate 1
    await page.goto(`${APP_URL}/entities`);
    await page.locator('main').getByRole('link', { name: /register subordinate/i }).click();
    await expect(page).toHaveURL(/\/entities\/register/);

    await page.getByLabel(/subordinate id/i).fill(testSubordinateId);

    await page.getByLabel('Trust Anchor').click();
    await page.getByRole('option', { name: /lighthouse/i }).click();

    await page.getByRole('button', { name: /fetch subordinate configuration/i }).click();

    await expect(
      page.getByText(/configuration not available|configuration retrieved/i)
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Next' }).click();

    const displayName1 = `Approval Test Entity ${Date.now()}`;
    await expect(page.getByLabel(/display name/i)).toBeVisible({ timeout: 5_000 });
    await page.getByLabel(/display name/i).fill(displayName1);
    await page.getByLabel(/technical contact email/i).fill('approval@example.com');

    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByRole('heading', { name: /registration summary/i })).toBeVisible({ timeout: 5_000 });
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /submit|register/i }).first().click();

    await expect(page).toHaveURL(/\/entities$/, { timeout: 10_000 });
    await expect(page.getByText(new RegExp(displayName1, 'i'))).toBeVisible({ timeout: 10_000 });
    createdDisplayName1 = displayName1;

    // Register subordinate 2
    await page.locator('main').getByRole('link', { name: /register subordinate/i }).click();
    await expect(page).toHaveURL(/\/entities\/register/);

    await page.getByLabel(/subordinate id/i).fill(testSubordinateId2);

    await page.getByLabel('Trust Anchor').click();
    await page.getByRole('option', { name: /lighthouse/i }).click();

    await page.getByRole('button', { name: /fetch subordinate configuration/i }).click();

    await expect(
      page.getByText(/configuration not available|configuration retrieved/i)
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Next' }).click();

    const displayName2 = `Approval Test Entity2 ${Date.now()}`;
    await expect(page.getByLabel(/display name/i)).toBeVisible({ timeout: 5_000 });
    await page.getByLabel(/display name/i).fill(displayName2);
    await page.getByLabel(/technical contact email/i).fill('approval2@example.com');

    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByRole('heading', { name: /registration summary/i })).toBeVisible({ timeout: 5_000 });
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /submit|register/i }).first().click();

    await expect(page).toHaveURL(/\/entities$/, { timeout: 10_000 });
    await expect(page.getByText(new RegExp(displayName2, 'i'))).toBeVisible({ timeout: 10_000 });
    createdDisplayName2 = displayName2;
  });

  test('pending subordinate appears in approvals page pending tab', async ({ instancePage: page }) => {
    // Navigate to approvals page
    await page.goto(`${APP_URL}/approvals`);
    await expect(page).toHaveURL(/\/approvals/);

    // Verify pending tab is shown
    const pendingTab = page.getByRole('tab', { name: /pending/i });
    await expect(pendingTab).toBeVisible();
    
    // Click pending tab if not already selected
    await pendingTab.click();

    // The newly created entities should appear in pending list
    await expect(page.getByText(new RegExp(createdDisplayName1!, 'i'))).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(new RegExp(createdDisplayName2!, 'i'))).toBeVisible({ timeout: 10_000 });
  });

  test('can approve a pending subordinate from approvals page', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/approvals`);

    // Make sure we're on the pending tab
    const pendingTab = page.getByRole('tab', { name: /pending/i });
    await pendingTab.click();
    await expect(pendingTab).toHaveAttribute('aria-selected', 'true');

    // Locate the card for subordinate 1 by its display name
    const approveCard = page.locator('article, [data-testid], .card, li')
      .filter({ hasText: createdDisplayName1! })
      .filter({ has: page.getByRole('button', { name: /approve/i }) });
    await expect(approveCard).toBeVisible({ timeout: 10_000 });

    // Click the Approve button on that card
    await approveCard.getByRole('button', { name: /approve/i }).click();

    // Confirmation dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/are you sure you want to approve/i)).toBeVisible();

    // Click confirm approval in dialog
    const confirmButton = page.getByRole('button', { name: /confirm approval/i });
    await confirmButton.click();

    // Dialog should dismiss on success
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
    const pendingPanel1 = page.getByRole('tabpanel');
    await expect(pendingPanel1).toBeVisible({ timeout: 5_000 });
    // Entity should be removed from the pending list
    await expect(
      pendingPanel1.getByText(new RegExp(createdDisplayName1!, 'i'))
    ).not.toBeAttached({ timeout: 10_000 });
  });

  test('can reject a pending subordinate from approvals page', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/approvals`);

    // Make sure we're on the pending tab
    const pendingTab = page.getByRole('tab', { name: /pending/i });
    await pendingTab.click();
    await expect(pendingTab).toHaveAttribute('aria-selected', 'true');

    // Locate the card for subordinate 2 by its display name
    const rejectCard = page.locator('article, [data-testid], .card, li')
      .filter({ hasText: createdDisplayName2! })
      .filter({ has: page.getByRole('button', { name: /reject/i }) });
    await expect(rejectCard).toBeVisible({ timeout: 10_000 });

    // Click the Reject button on that card
    await rejectCard.getByRole('button', { name: /reject/i }).click();

    // Confirmation dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/are you sure you want to reject/i)).toBeVisible();

    // Click confirm rejection in dialog
    const confirmButton = page.getByRole('button', { name: /confirm rejection/i });
    await confirmButton.click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
    const pendingPanel2 = page.getByRole('tabpanel');
    await expect(pendingPanel2).toBeVisible({ timeout: 5_000 });
    // Entity should be removed from the pending list
    await expect(
      pendingPanel2.getByText(new RegExp(createdDisplayName2!, 'i'))
    ).not.toBeAttached({ timeout: 10_000 });
  });

  test('approved subordinates appear in approved tab', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/approvals`);

    // Click approved tab
    const approvedTab = page.getByRole('tab', { name: /approved/i });
    await approvedTab.click();
    await expect(approvedTab).toHaveAttribute('aria-selected', 'true');

    const panel = page.getByRole('tabpanel');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await expect(panel.getByText(new RegExp(createdDisplayName1!, 'i'))).toBeVisible({ timeout: 10_000 });
  });

  test('rejected subordinates appear in rejected tab', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/approvals`);

    // Click rejected tab
    const rejectedTab = page.getByRole('tab', { name: /rejected/i });
    await rejectedTab.click();
    await expect(rejectedTab).toHaveAttribute('aria-selected', 'true');

    const panel = page.getByRole('tabpanel');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await expect(panel.getByText(new RegExp(createdDisplayName2!, 'i'))).toBeVisible({ timeout: 10_000 });
  });
});
