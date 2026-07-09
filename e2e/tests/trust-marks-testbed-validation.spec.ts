import { test, expect } from '../fixtures/index';

/**
 * Validates trust mark issuance against the live eduGAIN OIDFed testbed
 * (testbed.oidf.lab.surf.nl) instead of only synthetic fixtures:
 *  - issues a mark to a real, testbed-shaped subject entity_id
 *  - fetches it back through our own instance's PUBLIC federation_trust_mark_endpoint
 *    (not the admin API), proving standard-protocol interop
 *  - asserts the JWT claim names match what LightHouse actually emits
 *
 * Skipped by default (opt in with RUN_TESTBED_TESTS=1) since it depends on
 * the external testbed being reachable.
 */
const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';
// The instance's own public OIDFed endpoint (federation_fetch/list/resolve/trust_mark) —
// distinct from APP_URL, which is the gateway UI's origin.
const INSTANCE_PUBLIC_URL = process.env.INSTANCE_PUBLIC_URL ?? 'http://localhost:8081';
const RUN = process.env.RUN_TESTBED_TESTS === '1';

const TESTBED_TRUST_ANCHOR = 'https://at.aconet.oidf.lab.surf.nl';

async function getRealSubjectEntityId(): Promise<string | null> {
  try {
    const res = await fetch(`${TESTBED_TRUST_ANCHOR}/list`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const ids: string[] = await res.json();
    return ids[0] ?? null;
  } catch {
    return null;
  }
}

test.describe('Trust mark issuance vs. real testbed @proxy', () => {
  test.skip(!RUN, 'opt-in: set RUN_TESTBED_TESTS=1 (requires network access to testbed.oidf.lab.surf.nl)');

  test('issued mark round-trips through the public federation_trust_mark_endpoint for a real subject', async ({ instancePage: page, request }) => {
    const subject = await getRealSubjectEntityId();
    test.skip(!subject, 'testbed unreachable — skipping live validation');

    const trustMarkType = `${INSTANCE_PUBLIC_URL}/tm/testbed-validation-${Date.now()}`;

    // Create type + issuance spec via the admin UI so this exercises the real flow,
    // not just the raw API.
    await page.goto(`${APP_URL}/trust-marks`);
    await page.getByRole('tab', { name: /federation trust marks/i }).click();
    await page.getByRole('button', { name: /add type/i }).click();
    await page.getByLabel(/trust mark type identifier/i).fill(trustMarkType);
    await page.getByRole('button', { name: /^create$/i }).click();

    await page.getByRole('tab', { name: /issuance/i }).click();
    await page.getByRole('button', { name: /add spec/i }).click();
    await page.getByLabel(/^trust mark type/i).fill(trustMarkType);
    await page.getByRole('button', { name: /^create$/i }).click();

    await page.getByText(trustMarkType).first().click();
    await page.getByPlaceholder(/entity\.example\.org/i).fill(subject!);
    await page.getByRole('button', { name: /^add$/i }).click();
    await expect(page.getByText(subject!)).toBeVisible();

    // Fetch the issued mark through our instance's PUBLIC endpoint — the same
    // surface a real relying party would use — not the admin API.
    const publicRes = await request.get(`${INSTANCE_PUBLIC_URL}/trust_mark`, {
      params: { sub: subject!, trust_mark_type: trustMarkType },
    });
    expect(publicRes.ok()).toBeTruthy();
    const jwt = await publicRes.text();
    const parts = jwt.split('.');
    expect(parts).toHaveLength(3);

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    expect(payload.sub).toBe(subject);
    expect(payload.trust_mark_type).toBe(trustMarkType);
    expect(payload.iss).toBeTruthy();
    expect(payload.iat).toBeTruthy();
    // Regression guard: LightHouse emits `trust_mark_type`, not `id` — a prior
    // UI bug decoded the wrong claim and silently showed a blank type.
    expect(payload.id).toBeUndefined();
  });
});
