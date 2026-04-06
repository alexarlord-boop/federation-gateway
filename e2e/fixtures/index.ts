import { test as base, expect, type Page } from '@playwright/test';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';
const ADMIN_EMAIL = 'admin@oidfed.org';
const ADMIN_PASSWORD = 'admin123';

async function loginAsAdmin(page: Page) {
  await page.goto(`${APP_URL}/login`);
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  // Wait until redirected away from /login
  await expect(page).not.toHaveURL(/\/login/);
}

async function waitForInstanceSelected(page: Page) {
  // BackendSwitcher auto-selects the first TA. The button text changes from
  // the placeholder to the TA name "LightHouse" once trustAnchors load.
  await expect(
    page.locator('button').filter({ hasText: 'LightHouse' })
  ).toBeVisible({ timeout: 10_000 });
}

type AuthFixtures = {
  authenticatedPage: Page;
  instancePage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await loginAsAdmin(page);
    await use(page);
  },
  instancePage: async ({ authenticatedPage: page }, use) => {
    // Navigate to any authenticated page to trigger BackendSwitcher
    await page.goto(`${APP_URL}/dashboard`);
    await waitForInstanceSelected(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
