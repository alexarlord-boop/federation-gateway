# Parallel Fix Pass — Integration Task Tracker

Design document: `../specs/2026-05-11-parallel-fix-pass-design.md`

## Task 6: Integrate the tracks and run shared verification

- [x] **Step 1:** Add integration Playwright regression for My Instances subordinate counts
  - Added `My Instances shows the updated subordinate count after a registration` to `e2e/tests/trust-anchors.spec.ts`
  - Test written before integration changes (TDD intent satisfied)

- [x] **Step 2:** Merge / cherry-pick the three track branches and resolve conflicts
  - Cherry-picked `19295d0..parallel-fix-trustmarks` (7 commits) — clean
  - Cherry-picked `19295d0..parallel-fix-counts` (6 commits) — clean
  - Cherry-picked `19295d0..parallel-fix-entity-types` (4 commits) — clean
  - No merge conflicts; all 17 feature commits applied in order

- [x] **Step 3:** Backend verification
  - `cd backend && pytest tests/test_trust_anchors.py` → **8 passed**

- [x] **Step 4:** Frontend verification
  - `npx tsc --noEmit` → **PASS**
  - `npm run build` → **PASS** (739 kB bundle, built in 1.50 s)

- [x] **Step 5:** Shared Playwright verification set
  - Built and started integration stack on port 8082 (`UI_PORT=8082 BACKEND_PORT=8767`)
  - `npm run test:full` (full-stack / @proxy): **37 passed, 2 skipped**
  - `npx playwright test --project=bff-only tests/trust-anchors.spec.ts`: **8 passed**
  - Files covered: `trust-marks-crud.spec.ts`, `trust-marks.spec.ts`, `trust-marks-correctness.spec.ts`, `trust-anchors.spec.ts`, `entities.spec.ts`

- [x] **Step 6:** Update plan checkboxes and create the final integration commit
  - This file created and committed; integration commit created
