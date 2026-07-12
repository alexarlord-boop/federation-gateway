import { test, expect } from '../fixtures/index';

/**
 * Validates the Chain Inspector's "Any Entity" mode and trust mark
 * verification against the live eduGAIN OIDFed testbed
 * (testbed.oidf.lab.surf.nl) — not just our own instance's subordinates.
 *
 * SWAMID (se.swamid.oidf.lab.surf.nl) is a known real testbed member that
 * embeds a real trust mark issued by the eduGAIN root, verifiable live via
 * the root's own federation_trust_mark_status_endpoint (OIDF §8.3).
 *
 * Skipped by default (opt in with RUN_TESTBED_TESTS=1) since it depends on
 * the external testbed being reachable.
 */
const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';
const RUN = process.env.RUN_TESTBED_TESTS === '1';

test.describe('Chain Inspector vs. real testbed @proxy', () => {
  test.skip(!RUN, 'opt-in: set RUN_TESTBED_TESTS=1 (requires network access to testbed.oidf.lab.surf.nl)');

  test('inspects a real entity directly and verifies its embedded trust mark live', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/chain-inspector`);
    await expect(page.getByRole('heading', { name: /trust chain inspector/i })).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder(/se.swamid.oidf.lab.surf.nl/i).fill('https://se.swamid.oidf.lab.surf.nl');
    await page.getByRole('button', { name: /^inspect$/i }).click();

    // Real entity configuration fetched directly, not via any Trust Anchor we control.
    await expect(page.getByText('fetched live')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('SWAMID (Sweden)')).toBeVisible();

    // Authority hint chip lets the operator walk up the real chain.
    await expect(page.getByRole('button', { name: 'https://edugain.oidf.lab.surf.nl' })).toBeVisible();

    // The entity's real embedded trust mark is listed and independently verifiable.
    await expect(page.getByText('https://edugain.org/member')).toBeVisible();
    const verifyBtn = page.getByRole('button', { name: /verify live status/i });
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.click();

    // Live round-trip: fetch eduGAIN's own entity config for its status endpoint,
    // then ask that endpoint whether the mark is still active.
    await expect(page.getByText(/active — confirmed by issuer|revoked/i)).toBeVisible({ timeout: 15_000 });
  });

  test('authority hint navigation walks up to the real trust anchor', async ({ instancePage: page }) => {
    await page.goto(`${APP_URL}/chain-inspector`);
    await page.getByRole('button', { name: /SURFconext/i }).click();
    await expect(page.getByText('fetched live')).toBeVisible({ timeout: 15_000 });

    const hintButton = page.getByRole('button', { name: 'https://edugain.oidf.lab.surf.nl' });
    await expect(hintButton).toBeVisible();
    await hintButton.click();

    // Re-inspected the hint target — now showing eduGAIN's own configuration.
    await expect(page.getByText('eduGAIN')).toBeVisible({ timeout: 15_000 });
  });
});
