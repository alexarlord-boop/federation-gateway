import { test, expect } from '../fixtures/index';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';

test.describe('Instance selection @proxy', () => {
  test('dashboard starts with no active instance selected @proxy', async ({ authenticatedPage: page }) => {
    await page.goto(`${APP_URL}/dashboard`);
    await expect(page.getByRole('button', { name: /select instance/i })).toBeVisible();
  });

  test('selected instance persists after hard navigation to settings @proxy', async ({ instancePage: page }) => {
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('selected_instance_id'))).not.toBeNull();
    const selectedInstanceId = await page.evaluate(() => localStorage.getItem('selected_instance_id'));

    await page.goto(`${APP_URL}/settings`);

    await expect.poll(async () => page.evaluate(() => localStorage.getItem('selected_instance_id'))).toBe(selectedInstanceId);
    await expect(page.getByRole('button', { name: /active instance/i })).not.toContainText(/select instance/i);
    await expect(page.getByText(/choose a configured instance from the sidebar/i)).not.toBeVisible();
  });

  test('manual trust anchors are not offered as selectable instances @proxy', async ({ authenticatedPage: page }) => {
    const created = await page.evaluate(async () => {
      const tokenKey = Object.keys(localStorage).find((key) => key.startsWith('auth_token:'));
      const token = tokenKey ? localStorage.getItem(tokenKey) : null;
      const response = await fetch('/api/v1/admin/trust-anchors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: 'Manual Trust Anchor',
          entity_id: 'https://manual.example.org',
          description: 'Manually registered trust anchor',
          type: 'federation',
          status: 'active',
          admin_api_base_url: 'https://manual.example.org/admin',
        }),
      });

      return {
        ok: response.ok,
        status: response.status,
        body: await response.text(),
      };
    });

    expect(created.ok).toBeTruthy();
    const createdAnchor = JSON.parse(created.body);
    const token = await page.evaluate(() => {
      const tokenKey = Object.keys(localStorage).find((key) => key.startsWith('auth_token:'));
      return tokenKey ? localStorage.getItem(tokenKey) : null;
    });

    try {
      await page.goto(`${APP_URL}/dashboard`);
      await page.getByRole('button', { name: /select instance/i }).click();
      await expect(page.getByRole('menuitem', { name: /manual trust anchor/i })).toHaveCount(0);
    } finally {
      await page.request.delete(`${APP_URL}/api/v1/admin/trust-anchors/${createdAnchor.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    }
  });
});
