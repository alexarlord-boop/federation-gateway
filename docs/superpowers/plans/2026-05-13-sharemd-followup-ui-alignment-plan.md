# ShareMD Follow-up UI Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two remaining UI gaps from Gabriel's ShareMD note:
1. Remove the Registered Intermediates section from the Trust Anchors page.
2. Show trust-mark subject descriptions inline when available.

**Architecture:** Targeted changes to `TrustAnchorsPage.tsx` and the `SpecSubjectsPanel` inside `TrustMarksPage.tsx`, with focused E2E additions and a final verification pass.

**Tech Stack:** React, TypeScript, TanStack Query, FastAPI, SQLAlchemy, Playwright, pytest

---

## File map

### Existing files to modify

- `src/pages/TrustAnchorsPage.tsx` — remove the Registered Intermediates section and update page copy
- `src/pages/TrustMarksPage.tsx` — render subject `description` inline under entity IDs in `SpecSubjectsPanel`
- `e2e/tests/trust-anchors.spec.ts` — assert no Registered Intermediates section, guidance points to Subordinates
- `e2e/tests/trust-marks-correctness.spec.ts` — assert subject descriptions render inline when present

### No new files required

All changes fit within the existing files above.

---

### Task 1: Remove Registered Intermediates section from Trust Anchors page

**Files:**
- Modify: `src/pages/TrustAnchorsPage.tsx`
- Modify: `e2e/tests/trust-anchors.spec.ts`

- [x] **Step 1: Remove intermediate-related state, queries, and mutations from `TrustAnchorsPage.tsx`**

  Remove the subordinate query used only for intermediates, the `intermediateTAs` derived state, and any mutation wiring tied to the Registered Intermediates section. Keep authority hint add/remove behavior intact.

- [x] **Step 2: Remove the Registered Intermediates JSX section**

  Delete the full Registered Intermediates section (list, empty state, status controls, delete controls). Update the page description so it no longer promises that registered intermediates are shown there. Retain plain copy that intermediates are managed from **Subordinates**.

- [x] **Step 3: Add/update trust-anchors E2E assertions**

  In `e2e/tests/trust-anchors.spec.ts`, add assertions confirming:
  - no Registered Intermediates section is visible
  - guidance text points users to Subordinates

- [x] **Step 4: Run focused trust-anchors slice and verify it passes**

  ```bash
  cd e2e && npm run test:bff -- tests/trust-anchors.spec.ts
  ```

- [x] **Step 5: Commit the Trust Anchors cleanup**

  Commit: `refactor: remove intermediate management from trust anchors page`

---

### Task 2: Show trust-mark subject descriptions inline

**Files:**
- Modify: `src/pages/TrustMarksPage.tsx`
- Modify: `e2e/tests/trust-marks-correctness.spec.ts`

- [x] **Step 1: Render `description` below entity ID in `SpecSubjectsPanel`**

  When `subject.description` is present and non-empty, render it directly below the entity ID in muted secondary text. Subjects without a description must render exactly as before.

- [x] **Step 2: Add trust-marks-correctness E2E assertion**

  In `e2e/tests/trust-marks-correctness.spec.ts`, add a test asserting subject descriptions appear inline when present.

- [x] **Step 3: Run trust-marks-correctness slice and verify it passes**

  ```bash
  cd e2e && npx playwright test --project=full-stack tests/trust-marks-correctness.spec.ts
  ```

- [x] **Step 4: Commit the Trust Marks subject description change**

  Commit: `feat: show trust mark subject descriptions`

---

### Task 3: Final verification pass and plan bookkeeping

**Files:**
- Modify: `docs/superpowers/plans/2026-05-13-sharemd-followup-ui-alignment-plan.md`

- [x] **Step 1: Run the full focused verification set**

  ```bash
  cd backend && rm -f test_bff.db && pytest tests/test_trust_anchors.py tests/test_proxy.py tests/test_instances.py
  cd ../e2e && npm run test:bff -- tests/trust-anchors.spec.ts
  npx playwright test --project=full-stack tests/trust-marks-correctness.spec.ts
  cd .. && npx tsc --noEmit && npm run build
  ```

  Results:
  - Backend: 23 passed (test_trust_anchors: 8, test_proxy: 11, test_instances: 2, 4 warnings)
  - BFF trust-anchors: 8 passed
  - Full-stack trust-marks-correctness: 4 passed, 2 skipped (proxy-dependent skips expected in bff-only environment)
  - TypeScript: no errors
  - Build: success (730 kB bundle, no type errors)

- [x] **Step 2: Check off completed steps in this plan file and commit**

  Commit: `docs: mark ShareMD follow-up UI alignment plan complete`

---

## Self-review checklist

- **Spec coverage:** Task 1 removes the Registered Intermediates section and updates the E2E assertions. Task 2 adds inline subject description rendering with corresponding E2E coverage. Task 3 runs the full focused verification set and marks the plan complete.
- **Placeholder scan:** No `TODO`, `TBD`, or "similar to Task N" placeholders remain.
- **Type consistency:** No new types introduced; `description` is already optional on `TrustMarkSubject`. Trust Anchors page remains read-only and deployment-managed.
