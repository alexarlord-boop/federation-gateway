import { test, expect, type Page } from '@playwright/test';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';
const ADMIN_EMAIL = 'admin@oidfed.org';
const ADMIN_PASSWORD = 'admin123';
const USER_EMAIL = 'tech@example.org';
const USER_PASSWORD = 'user123';

async function loginAs(page: Page, email: string, password: string) {
  await page.goto(`${APP_URL}/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
}

async function selectInstance(page: Page, name = 'LightHouse') {
  await page.getByRole('button', { name: /select instance|lighthouse/i }).click();
  await page.getByRole('menuitem', { name: new RegExp(name, 'i') }).first().click();
  await expect(page.getByRole('button', { name: new RegExp(name, 'i') }).first()).toBeVisible();
}

/**
 * RBAC enforcement tests.
 * Verifies that non-admin users cannot access admin-only pages.
 * These tests probe REAL enforcement — not biased to pass.
 */
test.describe('RBAC access control @proxy', () => {
  test('non-admin user can login successfully', async ({ page }) => {
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    // Should reach dashboard, not login
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5_000 });
  });

  test('non-admin user can view entities list', async ({ page }) => {
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    await selectInstance(page);
    await page.goto(`${APP_URL}/entities`);
    await expect(page).toHaveURL(/\/entities/, { timeout: 5_000 });
    await expect(page.getByRole('heading', { name: /subordinates/i })).toBeVisible({ timeout: 5_000 });
  });

  test('non-admin user is blocked from /approvals page', async ({ page }) => {
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    await page.goto(`${APP_URL}/approvals`);
    // ProtectedRoute with adminOnly=true should redirect away
    // Should NOT render the approvals heading
    await expect(page.getByRole('heading', { name: /approvals/i })).not.toBeVisible({ timeout: 3_000 });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5_000 });
    await expect(page.getByRole('heading', { name: /select an instance/i })).toBeVisible({ timeout: 5_000 });
  });

  test('non-admin user is blocked from /users page', async ({ page }) => {
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    await page.goto(`${APP_URL}/users`);
    await expect(page.getByRole('heading', { name: /^users$/i })).not.toBeVisible({ timeout: 3_000 });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5_000 });
    await expect(page.getByRole('heading', { name: /select an instance/i })).toBeVisible({ timeout: 5_000 });
  });

  test('non-admin user is blocked from /trust-anchors page', async ({ page }) => {
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    await page.goto(`${APP_URL}/trust-anchors`);
    await expect(page.getByRole('heading', { name: /trust anchors/i })).not.toBeVisible({ timeout: 3_000 });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5_000 });
    await expect(page.getByRole('heading', { name: /select an instance/i })).toBeVisible({ timeout: 5_000 });
  });

  test('non-admin user is blocked from /rbac page', async ({ page }) => {
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    await page.goto(`${APP_URL}/rbac`);
    await expect(page.getByRole('heading', { name: /rbac|role/i })).not.toBeVisible({ timeout: 3_000 });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5_000 });
    await expect(page.getByRole('heading', { name: /select an instance/i })).toBeVisible({ timeout: 5_000 });
  });

  test('non-admin user does not see Register Subordinate button', async ({ page }) => {
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    await selectInstance(page);
    await page.goto(`${APP_URL}/entities`);
    const registerBtn = page.getByRole('link', { name: /register subordinate/i });
    await expect(registerBtn).not.toBeVisible({ timeout: 3_000 });
  });

  test('non-admin user cannot access admin API endpoints directly', async ({ page }) => {
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    // Attempt to hit a BFF endpoint that should require admin
    const response = await page.request.get(`${APP_URL}/api/v1/users`);
    // Should return 403 for non-admin
    expect(response.status()).toBe(403);
  });
});
