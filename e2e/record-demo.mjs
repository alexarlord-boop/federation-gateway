#!/usr/bin/env node
/**
 * Automated handover demo recording.
 *
 * Drives the real app in a headless-but-recorded browser and produces an
 * MP4 walkthrough of the major feature areas, with on-screen captions
 * standing in for narration (no human/voiceover needed). Re-runnable any
 * time against a running stack — captures whatever real data is currently
 * seeded, so re-recording after UI changes is a single command, not a
 * manual screen-recording session.
 *
 * Prerequisites: the app stack must already be running and reachable at
 * APP_URL (default http://localhost:8080) — see README.md's Quick Start.
 * ffmpeg must be on PATH (only used for the final webm -> mp4 convert).
 *
 * Usage:
 *   cd e2e && node record-demo.mjs
 *   APP_URL=http://localhost:8080 OUT=../demo.mp4 node record-demo.mjs
 */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8080';
const ADMIN_EMAIL = 'admin@oidfed.org';
const ADMIN_PASSWORD = 'admin123';
const OUT = process.env.OUT ?? path.resolve('demo.mp4');
const VIEWPORT = { width: 1440, height: 900 };

const videoDir = mkdtempSync(path.join(tmpdir(), 'fedgw-demo-'));

// ── Caption overlay ─────────────────────────────────────────────────────
// A real DOM element baked into the recorded frames — this is how the
// video is self-explanatory without a human narrating over it.
const OVERLAY_ID = '__demo_caption_overlay';

async function setCaption(page, text) {
  await page.evaluate(({ id, text }) => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      Object.assign(el.style, {
        position: 'fixed',
        left: '50%',
        bottom: '28px',
        transform: 'translateX(-50%)',
        maxWidth: '86%',
        padding: '14px 24px',
        borderRadius: '10px',
        background: 'rgba(15, 23, 42, 0.92)',
        color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '17px',
        fontWeight: '600',
        lineHeight: '1.4',
        textAlign: 'center',
        zIndex: '2147483647',
        pointerEvents: 'none',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        transition: 'opacity 200ms ease',
      });
      document.body.appendChild(el);
    }
    el.style.opacity = '1';
    el.textContent = text;
  }, { id: OVERLAY_ID, text });
}

async function hideCaption(page) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (el) el.style.opacity = '0';
  }, OVERLAY_ID);
}

async function step(page, caption, action, dwellMs = 2600) {
  if (caption) await setCaption(page, caption);
  await page.waitForTimeout(500);
  if (action) await action();
  await page.waitForTimeout(dwellMs);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: videoDir, size: VIEWPORT },
  });
  const page = await context.newPage();

  console.log('Recording to', videoDir);

  // 1. Login
  await page.goto(`${APP_URL}/login`);
  await step(
    page,
    'Federation Gateway — a backend-agnostic admin UI for OpenID Federation',
    null,
    2200,
  );
  await setCaption(page, 'Signing in as a federation admin…');
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'));
  await page.waitForTimeout(1200);

  // 2. Select instance (multi-instance deployment — LightHouse has the
  // richest demo data of the seven registered here)
  await setCaption(page, 'Managing multiple federation instances from one place');
  try {
    await page.getByRole('button', { name: /select instance/i }).click({ timeout: 4000 });
    await page.getByRole('menuitem', { name: /^LightHouse\b/i }).first().click();
  } catch {
    // Already auto-selected (single-instance deployments skip this click entirely)
  }
  await page.waitForTimeout(1200);
  const activeLabel = await page.locator('aside').getByText(/active instance/i).locator('..').innerText().catch(() => '');
  console.log('Active instance after selection:', JSON.stringify(activeLabel));

  // 3. Dashboard
  await page.goto(`${APP_URL}/dashboard`);
  await step(page, 'Dashboard — federation health at a glance', null, 3200);

  // 4. Subordinates
  await page.goto(`${APP_URL}/entities`);
  await step(page, 'Subordinates — search, filter, and manage every registered entity', null, 2800);

  // 5. Entity detail — Overview
  await setCaption(page, 'Drilling into one entity’s full lifecycle');
  const detailLink = page.locator('table tbody tr').first().getByRole('link').first();
  try {
    await page.locator('table tbody tr').first().locator('button').last().click({ timeout: 5000 });
    await page.getByRole('menuitem', { name: /view details/i }).click();
  } catch {
    await detailLink.click({ timeout: 5000 }).catch(() => {});
  }
  await page.waitForTimeout(1800);

  // 6. Constraints tab — general-policy reference panel
  try {
    await setCaption(page, 'Constraints now show the federation’s general policy right where it’s referenced');
    await page.getByRole('tab', { name: /constraints/i }).click({ timeout: 4000 });
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /View General Constraints/i }).click({ timeout: 4000 });
    await page.waitForTimeout(2400);
  } catch { /* entity may not have this tab enabled — continue */ }

  // 7. Trust Marks
  await hideCaption(page);
  await page.goto(`${APP_URL}/trust-marks`);
  await step(page, 'Trust Marks — issue, verify, and track trust mark lifecycles', null, 3000);

  // 8. Chain Inspector
  await page.goto(`${APP_URL}/chain-inspector`);
  await step(page, 'Chain Inspector — verify any entity’s trust chain, even outside your own federation', null, 3000);

  // 9. Stats — 90d range + per-endpoint detail
  await page.goto(`${APP_URL}/stats`);
  await step(page, 'Stats — full traffic visibility, now with 90-day history', null, 1400);
  try {
    await page.getByRole('button', { name: '90d' }).click({ timeout: 4000 });
    await page.waitForTimeout(1800);
  } catch {}
  await setCaption(page, 'Drill into any endpoint for its own status breakdown and query parameters');
  try {
    const endpointsTable = page.locator('table', { has: page.locator('th', { hasText: 'Share' }) });
    await endpointsTable.locator('tbody tr').first().click({ timeout: 4000 });
    await page.waitForTimeout(3000);
  } catch {}

  // 10. Settings
  await hideCaption(page);
  await page.goto(`${APP_URL}/settings`);
  await step(page, 'Settings — entity configuration, keys, constraints, and general metadata policies', null, 2600);

  // 11. Sidebar theme switcher
  await setCaption(page, 'Appearance now lives in the sidebar too — no more hunting through Settings');
  try {
    await page.getByRole('button', { name: 'Theme' }).click({ timeout: 4000 });
    await page.getByRole('menuitem', { name: 'Indigo' }).click();
    await page.waitForTimeout(1600);
    await page.getByRole('button', { name: 'Theme' }).click();
    await page.getByRole('menuitem', { name: /Default/i }).click();
    await page.waitForTimeout(1200);
  } catch {}

  // 12. Audit Log
  await hideCaption(page);
  await page.goto(`${APP_URL}/audit-log`);
  await step(page, 'Audit Log — every mutating action, who did it, and what changed', null, 3000);

  // 13. Closing frame
  await page.goto(`${APP_URL}/dashboard`);
  await step(page, 'Full documentation in docs/ — start with docs/GETTING-STARTED.md', null, 3200);
  await hideCaption(page);
  await page.waitForTimeout(600);

  await context.close();
  await browser.close();

  // Playwright names the file after an internal id — find it and convert.
  const [webm] = readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
  if (!webm) throw new Error('No video was recorded — check the run above for errors.');
  const webmPath = path.join(videoDir, webm);

  console.log('Converting to mp4 with ffmpeg…');
  execFileSync('ffmpeg', ['-y', '-i', webmPath, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], {
    stdio: 'inherit',
  });

  rmSync(videoDir, { recursive: true, force: true });
  console.log('\nDone:', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
