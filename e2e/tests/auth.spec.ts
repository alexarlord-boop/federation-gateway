import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Auth @bff', () => {
  test('redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto(`${APP_URL}/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows error with invalid credentials', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test('admin can login and is redirected to dashboard', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    await page.getByLabel(/email/i).fill('admin@oidfed.org');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('user can logout', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/dashboard`);
    await page.getByRole('button', { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
