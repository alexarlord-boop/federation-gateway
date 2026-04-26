import { test as base, expect, type Page } from '@playwright/test';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';
const ADMIN_EMAIL = 'admin@oidfed.org';
const ADMIN_PASSWORD = 'admin123';

async function loginAsAdmin(page: Page) {
  await page.goto(`${APP_URL}/login`);
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  // Wait until redirected away from /login
  await expect(page).not.toHaveURL(/\/login/);
}

async function selectInstance(page: Page, name = 'LightHouse') {
  await page.goto(`${APP_URL}/dashboard`);
  await page.getByRole('button', { name: /select instance|lighthouse/i }).click();
  await page.getByRole('menuitem', { name: new RegExp(name, 'i') }).click();
  await expect(page.getByRole('button', { name: new RegExp(name, 'i') })).toBeVisible();
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
    await selectInstance(page);
    await use(page);
  },
});

export { expect };
