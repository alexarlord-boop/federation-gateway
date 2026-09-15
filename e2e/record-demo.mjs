#!/usr/bin/env node
/**
 * Automated handover demo recording.
 *
 * Drives the real app in a headless-but-recorded browser and produces an
 * MP4 walkthrough of the major feature areas, with on-screen captions
 * standing in for narration (no human/voiceover needed), a visible fake
 * cursor that glides between clicks, and deliberate pauses so menus/
 * dropdowns are seen open before something gets selected. Re-runnable any
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
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
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
const CAPTION_ID = '__demo_caption_overlay';

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
        zIndex: '2147483646',
        pointerEvents: 'none',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        transition: 'opacity 200ms ease',
      });
      document.body.appendChild(el);
    }
    el.style.opacity = '1';
    el.textContent = text;
  }, { id: CAPTION_ID, text });
}

async function hideCaption(page) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (el) el.style.opacity = '0';
  }, CAPTION_ID);
}

// ── Fake cursor ──────────────────────────────────────────────────────────
// Headless Chromium never paints an OS cursor, so clicks otherwise look
// like instant teleports. This tracks a logical position in Node (surviving
// page navigations, which wipe the DOM) and re-injects + glides a visible
// dot to it on every page. Real page.mouse.move calls are interleaved so
// :hover CSS still genuinely applies along the way, not just at the endpoint.
const CURSOR_ID = '__demo_cursor';
let cursorPos = { x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 };

async function ensureCursor(page) {
  await page.evaluate(({ id, x, y }) => {
    if (document.getElementById(id)) return;
    const el = document.createElement('div');
    el.id = id;
    Object.assign(el.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      width: '20px',
      height: '20px',
      marginLeft: '-10px',
      marginTop: '-10px',
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.95)',
      border: '2.5px solid #1e293b',
      boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
      zIndex: '2147483647',
      pointerEvents: 'none',
      transition: 'transform 90ms ease',
    });
    document.body.appendChild(el);
  }, { id: CURSOR_ID, x: cursorPos.x, y: cursorPos.y });
}

/** Animated glide from the current logical position to (x, y). Real
 * page.mouse.move calls fire throughout (not just at the end) so hover
 * states along the path are genuine, and wall-clock waits between steps
 * are what actually makes the motion visible in the recorded video —
 * Playwright's own `steps` option dispatches events with no real delay
 * between them, which would just snap in the video. */
async function moveCursorTo(page, targetX, targetY, { steps = 22, stepDelayMs = 14 } = {}) {
  await ensureCursor(page);
  const start = { ...cursorPos };
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const eased = 1 - Math.pow(1 - t, 3); // ease-out — decelerates into the target, like a real hand
    const x = start.x + (targetX - start.x) * eased;
    const y = start.y + (targetY - start.y) * eased;
    await page.mouse.move(x, y);
    await page.evaluate(({ id, x, y }) => {
      const el = document.getElementById(id);
      if (el) { el.style.left = `${x}px`; el.style.top = `${y}px`; }
    }, { id: CURSOR_ID, x, y });
    await page.waitForTimeout(stepDelayMs);
  }
  cursorPos = { x: targetX, y: targetY };
}

/** Brief expanding-ring pulse at the cursor's current position — visible
 * feedback for exactly when a click fires, same idea as a real screen
 * recorder's click-highlight option. */
async function clickRipple(page) {
  await page.evaluate(({ x, y }) => {
    const ring = document.createElement('div');
    Object.assign(ring.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      width: '10px',
      height: '10px',
      marginLeft: '-5px',
      marginTop: '-5px',
      borderRadius: '50%',
      border: '2px solid #38bdf8',
      zIndex: '2147483647',
      pointerEvents: 'none',
      transition: 'transform 380ms ease-out, opacity 380ms ease-out',
    });
    document.body.appendChild(ring);
    requestAnimationFrame(() => {
      ring.style.transform = 'scale(4)';
      ring.style.opacity = '0';
    });
    setTimeout(() => ring.remove(), 420);
  }, cursorPos);
}

/** Move the fake cursor to a locator, pause on it (a real hover dwell —
 * long enough that :hover-triggered styling is visibly on screen before
 * anything happens), flash a click ripple, then perform the real click. */
async function clickCursor(page, locator, { hoverMs = 450, moveOpts } = {}) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element has no bounding box — not visible for a cursor click');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await moveCursorTo(page, x, y, moveOpts);
  await page.waitForTimeout(hoverMs);
  await clickRipple(page);
  await page.waitForTimeout(120);
  await locator.click();
}

async function gotoWithCursor(page, url) {
  await page.goto(url);
  await ensureCursor(page); // fresh document — re-inject at the last logical position
}

async function step(page, caption, action, dwellMs = 2800) {
  if (caption) await setCaption(page, caption);
  await page.waitForTimeout(650);
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
  await ensureCursor(page);
  await step(
    page,
    'Federation Gateway — a backend-agnostic admin UI for OpenID Federation',
    null,
    2400,
  );
  await setCaption(page, 'Signing in as a federation admin…');
  await clickCursor(page, page.getByLabel(/email/i), { hoverMs: 250 });
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.waitForTimeout(400);
  await clickCursor(page, page.getByLabel(/password/i), { hoverMs: 250 });
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.waitForTimeout(500);
  await clickCursor(page, page.getByRole('button', { name: 'Sign in', exact: true }));
  await page.waitForURL((url) => !url.pathname.includes('/login'));
  await page.waitForTimeout(1200);

  // 2. Select instance (multi-instance deployment — LightHouse has the
  // richest demo data of the seven registered here)
  await ensureCursor(page);
  await setCaption(page, 'Managing multiple federation instances from one place');
  try {
    await clickCursor(page, page.getByRole('button', { name: /select instance/i }), { moveOpts: { steps: 4, stepDelayMs: 8 } });
    // Deliberate pause with the menu open on screen before picking an item.
    await page.waitForTimeout(1300);
    await clickCursor(page, page.getByRole('menuitem', { name: /^LightHouse\b/i }).first());
  } catch {
    // Already auto-selected (single-instance deployments skip this click entirely)
  }
  await page.waitForTimeout(1200);
  const activeLabel = await page.locator('aside').getByText(/active instance/i).locator('..').innerText().catch(() => '');
  console.log('Active instance after selection:', JSON.stringify(activeLabel));

  // 3. Dashboard
  await gotoWithCursor(page, `${APP_URL}/dashboard`);
  await step(page, 'Dashboard — federation health at a glance', null, 3400);

  // 4. Subordinates
  await gotoWithCursor(page, `${APP_URL}/entities`);
  await step(page, 'Subordinates — search, filter, and manage every registered entity', null, 3000);

  // 5. Entity detail — Overview
  await setCaption(page, 'Drilling into one entity’s full lifecycle');
  const firstRow = page.locator('table tbody tr').first();
  try {
    await clickCursor(page, firstRow.locator('button').last(), { moveOpts: { steps: 16 } });
    await page.waitForTimeout(1000); // let the row-actions menu sit open on screen
    await clickCursor(page, page.getByRole('menuitem', { name: /view details/i }));
  } catch {
    await clickCursor(page, firstRow.getByRole('link').first(), { moveOpts: { steps: 16 } }).catch(() => {});
  }
  await page.waitForTimeout(2000);

  // 6. Constraints tab — general-policy reference panel
  try {
    await setCaption(page, 'Constraints now show the federation’s general policy right where it’s referenced');
    await clickCursor(page, page.getByRole('tab', { name: /constraints/i }));
    await page.waitForTimeout(1100);
    await clickCursor(page, page.getByRole('button', { name: /View General Constraints/i }));
    await page.waitForTimeout(2600);
  } catch { /* entity may not have this tab enabled — continue */ }

  // 7. Trust Marks
  await hideCaption(page);
  await gotoWithCursor(page, `${APP_URL}/trust-marks`);
  await step(page, 'Trust Marks — issue, verify, and track trust mark lifecycles', null, 3200);

  // 8. Chain Inspector
  await gotoWithCursor(page, `${APP_URL}/chain-inspector`);
  await step(page, 'Chain Inspector — verify any entity’s trust chain, even outside your own federation', null, 3200);

  // 9. Stats — 90d range + per-endpoint detail
  await gotoWithCursor(page, `${APP_URL}/stats`);
  await step(page, 'Stats — full traffic visibility, now with 90-day history', null, 1600);
  try {
    await clickCursor(page, page.getByRole('button', { name: '90d' }), { moveOpts: { steps: 14 } });
    await page.waitForTimeout(2000);
  } catch {}
  await setCaption(page, 'Drill into any endpoint for its own status breakdown and query parameters');
  try {
    const endpointsTable = page.locator('table', { has: page.locator('th', { hasText: 'Share' }) });
    await clickCursor(page, endpointsTable.locator('tbody tr').first(), { moveOpts: { steps: 18 } });
    await page.waitForTimeout(3200);
  } catch {}

  // 10. Settings
  await hideCaption(page);
  await gotoWithCursor(page, `${APP_URL}/settings`);
  await step(page, 'Settings — entity configuration, keys, constraints, and general metadata policies', null, 2800);

  // 11. Sidebar theme switcher
  await setCaption(page, 'Appearance now lives in the sidebar too — no more hunting through Settings');
  try {
    await clickCursor(page, page.getByRole('button', { name: 'Theme' }), { moveOpts: { steps: 16 } });
    await page.waitForTimeout(1200); // show the theme menu open before picking
    await clickCursor(page, page.getByRole('menuitem', { name: 'Indigo' }));
    await page.waitForTimeout(1800);
    await clickCursor(page, page.getByRole('button', { name: 'Theme' }), { moveOpts: { steps: 10 } });
    await page.waitForTimeout(1000);
    await clickCursor(page, page.getByRole('menuitem', { name: /Default/i }));
    await page.waitForTimeout(1200);
  } catch {}

  // 12. Audit Log
  await hideCaption(page);
  await gotoWithCursor(page, `${APP_URL}/audit-log`);
  await step(page, 'Audit Log — every mutating action, who did it, and what changed', null, 3200);

  // 13. Closing frame
  await gotoWithCursor(page, `${APP_URL}/dashboard`);
  await step(page, 'Full documentation in docs/ — start with docs/GETTING-STARTED.md', null, 3400);
  await hideCaption(page);
  await page.waitForTimeout(700);

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
