import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Users page @bff', () => {
  test('admin can navigate to /users', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/users`);
    await expect(page).toHaveURL(/\/users/);
    await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();
  });

  test('users list shows seeded admin and tech user', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/users`);
    await expect(page.getByText('admin@oidfed.org')).toBeVisible();
    await expect(page.getByText('tech@example.org')).toBeVisible();
  });

  test('admin can create a new user', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/users`);
    // Click "Add User" button
    await page.getByRole('button', { name: /add user/i }).click();
    // Fill in form fields
    await page.getByLabel(/full name/i).fill('E2E Test User');
    await page.getByLabel(/email/i).fill('e2e-test@example.com');
    await page.getByLabel(/organization/i).fill('E2E Test Org');
    await page.getByLabel(/password \(optional\)/i).fill('testpassword123');
    // Select role (default is already 'user' / 'Technical Contact', but select explicitly)
    await page.getByLabel(/legacy role/i).click();
    await page.getByRole('option', { name: /technical contact/i }).click();
    // Click "Create User" button
    await page.getByRole('button', { name: /create user/i }).click();
    // Verify user appears in list
    await expect(page.getByText('e2e-test@example.com')).toBeVisible({ timeout: 5000 });
  });

  test('admin can delete the e2e test user', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/users`);
    // Find the row with the test user email
    const userRow = page.locator('tr').filter({ hasText: 'e2e-test@example.com' });
    // Open dropdown menu for that row (MoreHorizontal button)
    const moreButton = userRow.getByRole('button', { name: '' }).first();
    await moreButton.click();
    // Click "Delete User" in dropdown
    await page.getByRole('menuitem', { name: /delete user/i }).click();
    // Confirm deletion in AlertDialog (click "Delete" button)
    await page.getByRole('button', { name: /^delete$/i }).click();
    // Verify user is gone
    await expect(page.getByText('e2e-test@example.com')).not.toBeVisible({ timeout: 5000 });
  });
});
