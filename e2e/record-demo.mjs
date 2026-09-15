#!/usr/bin/env node
/**
 * Automated handover demo recording.
 *
 * Drives the real app in a headless-but-recorded browser and produces an
 * MP4 walkthrough of the major feature areas, with on-screen captions
 * standing in for narration (no human/voiceover needed), a visible fake
 * cursor that glides slowly between clicks, real scrolling on pages with
 * more content below the fold, and deliberate pauses so menus/dropdowns
 * are seen open before something gets selected. Re-runnable any time
 * against a running stack — captures whatever real data is currently
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
        minWidth: '260px',
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
        transition: 'opacity 350ms ease',
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
// page navigations, which wipe the DOM) and re-injects a visible dot on
// every page.
//
// The glide itself is a CSS transition on left/top, set with ONE
// page.evaluate call and then just... waited out — the browser's own
// compositor interpolates every frame at full framerate. The first version
// instead stepped the position from Node in a loop (~20 separate
// page.evaluate round-trips per move); each round-trip has real IPC
// latency that varies, so the motion arrived in an uneven, flickery burst
// rather than a smooth glide. Real page.mouse.move calls still fire a few
// times across the same window so :hover CSS genuinely applies along the
// path, decoupled from the (now purely visual) DOM dot.
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
      width: '22px',
      height: '22px',
      marginLeft: '-11px',
      marginTop: '-11px',
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.95)',
      border: '3px solid #1e293b',
      boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
      zIndex: '2147483647',
      pointerEvents: 'none',
      transitionProperty: 'left, top',
      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    });
    document.body.appendChild(el);
  }, { id: CURSOR_ID, x: cursorPos.x, y: cursorPos.y });
}

/** Slow, smooth glide from the current logical position to (x, y), driven
 * by a browser-native CSS transition (not stepped from Node — see the
 * comment above). `durationMs` defaults to scaling with distance so a
 * short hop isn't glacial and a cross-screen move isn't a blink, then
 * clamps to a slow, deliberate range. */
async function moveCursorTo(page, targetX, targetY, { durationMs } = {}) {
  await ensureCursor(page);
  const start = { ...cursorPos };
  const dist = Math.hypot(targetX - start.x, targetY - start.y);
  const duration = durationMs ?? Math.min(2200, Math.max(900, dist * 1.6));

  await page.evaluate(({ id, x, y, duration }) => {
    const el = document.getElementById(id);
    el.style.transitionDuration = `${duration}ms`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }, { id: CURSOR_ID, x: targetX, y: targetY, duration });

  // A handful of real mouse moves spread across the same window, purely so
  // :hover CSS genuinely triggers along the path — not what drives the
  // visible glide, that's the CSS transition above.
  const hops = Math.max(5, Math.round(duration / 140));
  for (let i = 1; i <= hops; i++) {
    const t = i / hops;
    await page.mouse.move(start.x + (targetX - start.x) * t, start.y + (targetY - start.y) * t);
    await page.waitForTimeout(duration / hops);
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
      transition: 'transform 420ms ease-out, opacity 420ms ease-out',
    });
    document.body.appendChild(ring);
    requestAnimationFrame(() => {
      ring.style.transform = 'scale(4.5)';
      ring.style.opacity = '0';
    });
    setTimeout(() => ring.remove(), 460);
  }, cursorPos);
}

/** Move the fake cursor to a locator (slow glide), pause on it (a real
 * hover dwell — long enough that :hover-triggered styling is visibly on
 * screen before anything happens), flash a click ripple, then perform the
 * real click. */
async function clickCursor(page, locator, { hoverMs = 550, moveOpts } = {}) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element has no bounding box — not visible for a cursor click');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await moveCursorTo(page, x, y, moveOpts);
  await page.waitForTimeout(hoverMs);
  await clickRipple(page);
  await page.waitForTimeout(160);
  await locator.click();
}

/** Click into a text field (slow glide, same as clickCursor) then type real
 * example text one character at a time — pressSequentially dispatches a
 * genuine keydown/input per character with a real delay between them, so
 * the recording shows an actual example being typed, not text appearing
 * instantly. */
async function typeCursor(page, locator, text, { hoverMs = 450, charDelayMs = 70 } = {}) {
  await clickCursor(page, locator, { hoverMs });
  await locator.pressSequentially(text, { delay: charDelayMs });
}

/** Sidebar navigation, via a real cursor-driven click on the actual nav
 * link — not page.goto(). This is a client-side React Router route change
 * (the <aside> never unmounts), so the injected cursor/caption survive it
 * without re-injection, and it's what makes a page-to-page "transition"
 * mean something: the cursor visibly travels to the link and clicks it,
 * same as every other interaction, instead of teleporting via URL. */
function sidebar(page) {
  return page.locator('aside');
}

async function navClick(page, name) {
  await clickCursor(page, sidebar(page).getByRole('link', { name, exact: true }));
  await page.waitForTimeout(500); // let the route's fade-in settle
}

/** "Subordinates" is the one sidebar item that doesn't navigate on its own
 * click — it's a Collapsible trigger (a <button>, not a link) that only
 * expands a submenu. Reaching /entities takes two real clicks: expand,
 * then the "All Subordinates" child link that appears. */
async function navToSubordinates(page) {
  await clickCursor(page, sidebar(page).getByRole('button', { name: /subordinates/i }));
  await page.waitForTimeout(900); // hold with the submenu visibly open
  await clickCursor(page, sidebar(page).getByRole('link', { name: 'All Subordinates', exact: true }));
  await page.waitForTimeout(500);
}

/** Real, slow mouse-wheel scroll — genuine incremental wheel events spread
 * over real wall-clock time, so the captured video shows an actual scroll
 * pass over the page instead of a hard cut to content below the fold. */
async function scrollBy(page, deltaY, { steps = 26, stepDelayMs = 28 } = {}) {
  const per = deltaY / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, per);
    await page.waitForTimeout(stepDelayMs);
  }
}

/** Race `promise` against a hard deadline. Playwright's own action timeouts
 * (default 30s, retried per actionability check) don't bound a block of
 * *several* actions chained together — and a real outbound fetch to a
 * third-party host (see the Chain Inspector step) has, twice now, stalled
 * the whole script for 20+ minutes with no Playwright-level timeout ever
 * firing to rescue it. This gives such a block a firm ceiling. */
function withDeadline(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function step(page, caption, action, dwellMs = 3000) {
  if (caption) await setCaption(page, caption);
  await page.waitForTimeout(750);
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
    2600,
  );
  await setCaption(page, 'Signing in as a federation admin…');
  await clickCursor(page, page.getByLabel(/email/i), { hoverMs: 350 });
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.waitForTimeout(500);
  await clickCursor(page, page.getByLabel(/password/i), { hoverMs: 350 });
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.waitForTimeout(600);
  await clickCursor(page, page.getByRole('button', { name: 'Sign in', exact: true }));
  await page.waitForURL((url) => !url.pathname.includes('/login'));
  await page.waitForTimeout(1300);

  // 2. Select instance (multi-instance deployment — LightHouse has the
  // richest demo data of the seven registered here)
  await ensureCursor(page);
  await setCaption(page, 'Managing multiple federation instances from one place');
  try {
    await clickCursor(page, page.getByRole('button', { name: /select instance/i }));
    // Deliberate pause with the menu open on screen before picking an item.
    await page.waitForTimeout(1500);
    await clickCursor(page, page.getByRole('menuitem', { name: /^LightHouse\b/i }).first());
  } catch {
    // Already auto-selected (single-instance deployments skip this click entirely)
  }
  await page.waitForTimeout(1300);
  const activeLabel = await page.locator('aside').getByText(/active instance/i).locator('..').innerText().catch(() => '');
  console.log('Active instance after selection:', JSON.stringify(activeLabel));

  // 3. Dashboard
  await setCaption(page, 'Dashboard — federation health at a glance');
  await navClick(page, 'Dashboard');
  await page.waitForTimeout(1700);
  await scrollBy(page, 420);
  await page.waitForTimeout(1600);
  await scrollBy(page, -420);
  await page.waitForTimeout(800);

  // 4. Subordinates — search + status filter
  await setCaption(page, 'Subordinates — search, filter, and manage every registered entity');
  await navToSubordinates(page);
  await page.waitForTimeout(1200);
  await setCaption(page, 'Search narrows the list as you type — no submit needed');
  await typeCursor(page, page.getByPlaceholder(/search by subordinate/i), 'Helsinki');
  await page.waitForTimeout(2000);
  await page.getByPlaceholder(/search by subordinate/i).fill('');
  await page.waitForTimeout(700);
  try {
    await setCaption(page, 'Filter by status — Active, Inactive, Pending, Blocked');
    const statusFilter = page.getByRole('combobox').first();
    await clickCursor(page, statusFilter);
    await page.waitForTimeout(1100); // hold with the options open
    await clickCursor(page, page.getByRole('option', { name: 'Active', exact: true }));
    await page.waitForTimeout(1900);
    await clickCursor(page, statusFilter);
    await page.waitForTimeout(700);
    await clickCursor(page, page.getByRole('option', { name: 'All Status', exact: true }));
    await page.waitForTimeout(900);
  } catch { /* filter UI may differ — continue */ }

  // 5. Entity detail — every tab, not just Constraints
  await setCaption(page, 'Drilling into one entity’s full lifecycle');
  const firstRow = page.locator('table tbody tr').first();
  try {
    await clickCursor(page, firstRow.locator('button').last());
    await page.waitForTimeout(1200); // let the row-actions menu sit open on screen
    await clickCursor(page, page.getByRole('menuitem', { name: /view details/i }));
  } catch {
    await clickCursor(page, firstRow.getByRole('link').first()).catch(() => {});
  }
  await page.waitForTimeout(2000);

  try {
    await setCaption(page, 'Metadata — the full published claims for this entity');
    await clickCursor(page, page.getByRole('tab', { name: /^metadata$/i }));
    await page.waitForTimeout(2200);
  } catch {}

  try {
    await setCaption(page, 'JWKS — this entity’s own signing keys');
    await clickCursor(page, page.getByRole('tab', { name: /^jwks$/i }));
    await page.waitForTimeout(2200);
  } catch {}

  // 6. Constraints tab — general-policy reference panel
  try {
    await setCaption(page, 'Constraints now show the federation’s general policy right where it’s referenced');
    await clickCursor(page, page.getByRole('tab', { name: /constraints/i }));
    await page.waitForTimeout(1300);
    await clickCursor(page, page.getByRole('button', { name: /View General Constraints/i }));
    await page.waitForTimeout(2600);
  } catch { /* entity may not have this tab enabled — continue */ }

  try {
    await setCaption(page, 'Metadata Policies — same reference pattern for policies as for constraints');
    await clickCursor(page, page.getByRole('tab', { name: /metadata policies/i }));
    await page.waitForTimeout(2400);
  } catch {}

  // 7. Trust Marks — every role tab
  await hideCaption(page);
  await navClick(page, 'Trust Marks');
  await setCaption(page, 'Trust Marks — Owner: define the type federation-wide');
  await page.waitForTimeout(2000);
  await scrollBy(page, 500);
  await page.waitForTimeout(1500);
  await scrollBy(page, -500);
  await page.waitForTimeout(600);
  try {
    await setCaption(page, 'Issuer: issue this trust mark to a subject entity');
    await clickCursor(page, page.getByRole('tab', { name: /^issuance/i }));
    await page.waitForTimeout(2400);
  } catch {}
  try {
    await setCaption(page, 'Subject: trust marks this instance itself holds');
    await clickCursor(page, page.getByRole('tab', { name: /^my trust marks/i }));
    await page.waitForTimeout(2400);
  } catch {}

  // 8. Chain Inspector — a real inspection against a real external entity
  await navClick(page, 'Chain Inspector');
  await setCaption(page, 'Chain Inspector — verify any entity’s trust chain, even outside your own federation');
  await page.waitForTimeout(2000);
  try {
    await withDeadline((async () => {
      await clickCursor(page, page.getByRole('button', { name: /SWAMID/i }));
      await page.waitForTimeout(1000);
      await setCaption(page, 'A real external federation member — inspecting its live trust chain');
      await clickCursor(page, page.getByRole('button', { name: 'Inspect', exact: true }));
      await page.waitForTimeout(3200);
      await scrollBy(page, 500);
      await page.waitForTimeout(1800);
      await scrollBy(page, -500);
      await page.waitForTimeout(600);
    })(), 15000, 'Chain Inspector live SWAMID inspection');
  } catch { /* live external network call — tolerate failure/timeout and move on */ }

  // 9. Stats — 90d range, per-endpoint detail, export options
  await navClick(page, 'Stats');
  await setCaption(page, 'Stats — full traffic visibility, now with 90-day history');
  await page.waitForTimeout(1800);
  try {
    await clickCursor(page, page.getByRole('button', { name: '90d' }));
    await page.waitForTimeout(2200);
  } catch {}
  try {
    await setCaption(page, 'Export the raw data as CSV or JSON');
    await clickCursor(page, page.getByRole('button', { name: 'Export' }));
    await page.waitForTimeout(1600); // hold with the export menu open
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } catch {}
  await scrollBy(page, 500);
  await page.waitForTimeout(1400);
  await scrollBy(page, -500);
  await page.waitForTimeout(600);
  await setCaption(page, 'Drill into any endpoint for its own status breakdown and query parameters');
  try {
    const endpointsTable = page.locator('table', { has: page.locator('th', { hasText: 'Share' }) });
    const row = endpointsTable.locator('tbody tr').first();
    // A real animated scroll to the row's actual position, computed from its
    // live offset — not clickCursor's own scrollIntoViewIfNeeded(), which
    // jumps instantly with no frames in between and made this transition
    // look like it wasn't driven by the cursor at all.
    const targetY = await row.evaluate((el) => el.getBoundingClientRect().top + window.scrollY - 220);
    const currentY = await page.evaluate(() => window.scrollY);
    const delta = targetY - currentY;
    if (Math.abs(delta) > 20) {
      await scrollBy(page, delta, { steps: 34, stepDelayMs: 30 });
      await page.waitForTimeout(700);
    }
    await clickCursor(page, row, { hoverMs: 900 });
    await page.waitForTimeout(1800);
    await scrollBy(page, 500);
    await page.waitForTimeout(1800);
  } catch {}

  // 10. Settings — every tab
  await hideCaption(page);
  await navClick(page, 'Settings');
  await setCaption(page, 'Settings — entity configuration, keys, constraints, and general metadata policies');
  await page.waitForTimeout(2200);

  // 11. Sidebar theme switcher
  await setCaption(page, 'Appearance now lives in the sidebar too — no more hunting through Settings');
  try {
    await clickCursor(page, page.getByRole('button', { name: 'Theme' }));
    await page.waitForTimeout(1400); // show the theme menu open before picking
    await clickCursor(page, page.getByRole('menuitem', { name: 'Grayscale' }));
    await page.waitForTimeout(1800);
    // The dropdown can occasionally swallow that click without applying
    // anything (no exception — the menu just closes on the wrong target).
    // Verify it actually landed and retry once if not.
    const applied = await page.evaluate(() => document.documentElement.classList.contains('theme-grayscale'));
    if (!applied) {
      await clickCursor(page, page.getByRole('button', { name: 'Theme' }));
      await page.waitForTimeout(1000);
      await clickCursor(page, page.getByRole('menuitem', { name: 'Grayscale' }));
      await page.waitForTimeout(1200);
    }
  } catch {}

  try {
    await setCaption(page, 'Entity Config — additional claims, lifetime, and trust marks on your own statement');
    await clickCursor(page, page.getByRole('tab', { name: /entity config/i }));
    await page.waitForTimeout(2400);
    await scrollBy(page, 500);
    await page.waitForTimeout(1400);
    await scrollBy(page, -500);
    await page.waitForTimeout(500);
  } catch {}

  try {
    await setCaption(page, 'Keys & KMS — signing keys and rotation');
    await clickCursor(page, page.getByRole('tab', { name: /keys/i }));
    await page.waitForTimeout(2400);
  } catch {}

  try {
    await setCaption(page, 'General Constraints — the federation-wide defaults every subordinate inherits');
    await clickCursor(page, page.getByRole('tab', { name: /^constraints$/i }));
    await page.waitForTimeout(2400);
  } catch {}

  try {
    await setCaption(page, 'General Metadata Policies — same idea, for metadata');
    await clickCursor(page, page.getByRole('tab', { name: /^metadata policies$/i }));
    await page.waitForTimeout(2400);
  } catch {}

  // 12. Audit Log — filter by user
  await hideCaption(page);
  await navClick(page, 'Audit Log');
  await setCaption(page, 'Audit Log — every mutating action, who did it, and what changed');
  await page.waitForTimeout(1800);
  try {
    // Every entry here is the same demo admin, so filtering by user wouldn't
    // narrow anything — filter by Action instead, which has real variety.
    await setCaption(page, 'Filter by action — narrows the log to just that kind of change');
    const actionFilter = page.getByRole('combobox').nth(1); // Resource type, then Action
    await clickCursor(page, actionFilter);
    await page.waitForTimeout(1100); // hold with the options open
    await clickCursor(page, page.getByRole('option', { name: /^delete$/i }));
    await page.waitForTimeout(1900);
    await clickCursor(page, actionFilter);
    await page.waitForTimeout(700);
    await clickCursor(page, page.getByRole('option', { name: /all actions/i }));
    await page.waitForTimeout(900);
  } catch {}
  await scrollBy(page, 650);
  await page.waitForTimeout(1600);
  await scrollBy(page, -650);
  await page.waitForTimeout(700);

  // 13. Closing frame
  await navClick(page, 'Dashboard');
  await setCaption(page, 'Full documentation in docs/ — start with docs/GETTING-STARTED.md');
  await page.waitForTimeout(3600);
  await hideCaption(page);
  await page.waitForTimeout(800);

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
