import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Entities page @proxy', () => {
  test('entities list is visible with correct heading', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/entities`);
    await expect(page).toHaveURL(/\/entities$/);
    await expect(page.getByRole('heading', { level: 1, name: /leaf entities/i })).toBeVisible();
  });

  test('can navigate to register entity form', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/entities`);
    const registerButton = page.getByRole('link', { name: /register entity/i });
    await registerButton.click();
    await expect(page).toHaveURL(/\/entities\/register/);
    await expect(page.getByRole('heading', { name: /register new entity/i })).toBeVisible();
  });

  test('can register a new entity with pending status', async ({ instancePage: page }) => {
    // Navigate to register form
    await page.goto(`${APP_URL}/entities`);
    await page.getByRole('link', { name: /register entity/i }).click();
    await expect(page).toHaveURL(/\/entities\/register/);

    // Step 1: Enter entity ID
    const entityId = `https://e2e-test-entity-${Date.now()}.example.com`;
    await page.getByLabel(/entity id/i).fill(entityId);

    // Select the LightHouse trust anchor (first TA)
    const trustAnchorSelect = page.locator('[role="button"]').filter({ hasText: /select a trust anchor/i }).first();
    await trustAnchorSelect.click();
    const lightHouseOption = page.getByRole('option', { name: /lighthouse/i });
    await lightHouseOption.click();

    // Entity type defaults to openid_provider, so continue
    // Click "Fetch Entity Configuration" button
    const fetchButton = page.getByRole('button', { name: /fetch entity configuration/i });
    await fetchButton.click();

    // Wait for step 2 (config review)
    // The fetch will likely fail for fake entity, but we proceed anyway
    await expect(page.getByRole('button', { name: /next|continue/i }).or(page.getByRole('button', { name: /back/i }))).toBeVisible({ timeout: 10_000 });

    // Skip to next step by clicking Next/continue
    const nextBtn = page.getByRole('button', { name: /next|continue/i }).first();
    await expect(nextBtn).toBeVisible({ timeout: 5_000 });
    await nextBtn.click();

    // Step 3: Enter additional details
    await expect(page.getByLabel(/display name/i)).toBeVisible({ timeout: 5_000 });
    const displayName = `E2E Test Entity ${Date.now()}`;
    await page.getByLabel(/display name/i).fill(displayName);
    await page.getByLabel(/technical contact email/i).fill('test@example.com');

    // Click next to go to review step
    const nextBtn2 = page.getByRole('button', { name: /next|continue/i }).first();
    await expect(nextBtn2).toBeVisible({ timeout: 5_000 });
    await nextBtn2.click();

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

  test('can view entity detail by clicking on entity row', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/entities`);
    
    // Wait for entities to load
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });

    // Click the first entity row to navigate to detail
    const firstEntityLink = page.locator('table tbody tr').first().locator('a[href*="/entities/"]');
    await expect(firstEntityLink).toBeVisible({ timeout: 10_000 });
    const href = await firstEntityLink.getAttribute('href');
    expect(href).toBeTruthy();
    await page.goto(`${APP_URL}${href!}`);
    await expect(page).toHaveURL(/\/entities\//);
  });

  test('can filter entities by status', async ({ instancePage: page }) => {
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

  test('can search entities by ID', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/entities`);
    
    // Wait for table to load
    await expect(page.locator('table tbody')).toBeVisible({ timeout: 10_000 });

    // Fill search input
    const searchInput = page.getByPlaceholder(/search by entity id/i);
    await searchInput.fill('example');

    // Table should still be visible
    await expect(page.locator('table')).toBeVisible();
  });
});

test.describe.serial('Approvals page @proxy', () => {
  const testEntityId = `https://approval-test-${Date.now()}.example.com`;
  const testEntityId2 = `https://approval-test2-${Date.now()}.example.com`;
  let createdDisplayName1: string | null = null;
  let createdDisplayName2: string | null = null;

  test('approvals page is accessible and shows heading', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/approvals`);
    await expect(page).toHaveURL(/\/approvals/);
    await expect(page.getByRole('heading', { level: 1, name: /approvals/i })).toBeVisible();
    await expect(page.getByText(/review and manage entity registration requests/i)).toBeVisible();
  });

  test('can register an entity with pending status for approval', async ({ instancePage: page }) => {
    // Register entity 1
    await page.goto(`${APP_URL}/entities`);
    await page.getByRole('link', { name: /register entity/i }).click();
    await expect(page).toHaveURL(/\/entities\/register/);

    await page.getByLabel(/entity id/i).fill(testEntityId);

    const trustAnchorSelect = page.locator('[role="button"]').filter({ hasText: /select a trust anchor/i }).first();
    await trustAnchorSelect.click();
    const lightHouseOption = page.getByRole('option', { name: /lighthouse/i });
    await lightHouseOption.click();

    await page.getByRole('button', { name: /fetch entity configuration/i }).click();

    await expect(page.getByRole('button').filter({ hasText: /next|continue|back/i })).toBeVisible({ timeout: 10_000 });

    const nextBtn = page.getByRole('button', { name: /next|continue/i }).first();
    await expect(nextBtn).toBeVisible({ timeout: 5_000 });
    await nextBtn.click();

    const displayName1 = `Approval Test Entity ${Date.now()}`;
    await expect(page.getByLabel(/display name/i)).toBeVisible({ timeout: 5_000 });
    await page.getByLabel(/display name/i).fill(displayName1);
    await page.getByLabel(/technical contact email/i).fill('approval@example.com');

    const nextBtn2 = page.getByRole('button', { name: /next|continue/i }).first();
    await expect(nextBtn2).toBeVisible({ timeout: 5_000 });
    await nextBtn2.click();

    await expect(page.getByRole('heading', { name: /registration summary/i })).toBeVisible({ timeout: 5_000 });
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /submit|register/i }).first().click();

    await expect(page).toHaveURL(/\/entities$/, { timeout: 10_000 });
    await expect(page.getByText(new RegExp(displayName1, 'i'))).toBeVisible({ timeout: 10_000 });
    createdDisplayName1 = displayName1;

    // Register entity 2
    await page.getByRole('link', { name: /register entity/i }).click();
    await expect(page).toHaveURL(/\/entities\/register/);

    await page.getByLabel(/entity id/i).fill(testEntityId2);

    const trustAnchorSelect2 = page.locator('[role="button"]').filter({ hasText: /select a trust anchor/i }).first();
    await trustAnchorSelect2.click();
    const lightHouseOption2 = page.getByRole('option', { name: /lighthouse/i });
    await lightHouseOption2.click();

    await page.getByRole('button', { name: /fetch entity configuration/i }).click();

    await expect(page.getByRole('button').filter({ hasText: /next|continue|back/i })).toBeVisible({ timeout: 10_000 });

    const nextBtn3 = page.getByRole('button', { name: /next|continue/i }).first();
    await expect(nextBtn3).toBeVisible({ timeout: 5_000 });
    await nextBtn3.click();

    const displayName2 = `Approval Test Entity2 ${Date.now()}`;
    await expect(page.getByLabel(/display name/i)).toBeVisible({ timeout: 5_000 });
    await page.getByLabel(/display name/i).fill(displayName2);
    await page.getByLabel(/technical contact email/i).fill('approval2@example.com');

    const nextBtn4 = page.getByRole('button', { name: /next|continue/i }).first();
    await expect(nextBtn4).toBeVisible({ timeout: 5_000 });
    await nextBtn4.click();

    await expect(page.getByRole('heading', { name: /registration summary/i })).toBeVisible({ timeout: 5_000 });
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /submit|register/i }).first().click();

    await expect(page).toHaveURL(/\/entities$/, { timeout: 10_000 });
    await expect(page.getByText(new RegExp(displayName2, 'i'))).toBeVisible({ timeout: 10_000 });
    createdDisplayName2 = displayName2;
  });

  test('pending entity appears in approvals page pending tab', async ({ instancePage: page }) => {
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

  test('can approve a pending entity from approvals page', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/approvals`);

    // Make sure we're on the pending tab
    const pendingTab = page.getByRole('tab', { name: /pending/i });
    await pendingTab.click();
    await expect(pendingTab).toHaveAttribute('aria-selected', 'true');

    // Locate the card for entity 1 by its display name
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

  test('can reject a pending entity from approvals page', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/approvals`);

    // Make sure we're on the pending tab
    const pendingTab = page.getByRole('tab', { name: /pending/i });
    await pendingTab.click();
    await expect(pendingTab).toHaveAttribute('aria-selected', 'true');

    // Locate the card for entity 2 by its display name
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

  test('approved entities appear in approved tab', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/approvals`);

    // Click approved tab
    const approvedTab = page.getByRole('tab', { name: /approved/i });
    await approvedTab.click();
    await expect(approvedTab).toHaveAttribute('aria-selected', 'true');

    const panel = page.getByRole('tabpanel');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await expect(panel.getByText(new RegExp(createdDisplayName1!, 'i'))).toBeVisible({ timeout: 10_000 });
  });

  test('rejected entities appear in rejected tab', async ({ instancePage: page }) => {
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
