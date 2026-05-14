# Mise Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a repo-root `mise.toml` that exposes the repository's common dev, stack, test, cleanup, demo, and reset workflows through clear task names, and document that entrypoint in the README.

**Architecture:** Keep `mise` as a thin task catalog over the commands already used in this repository. Put all task definitions in a single root `mise.toml`, separate safe and destructive operations by task namespace, and document the task surface in `README.md` without replacing the existing raw commands.

**Tech Stack:** mise, TOML, npm, pytest, Playwright, Docker Compose, Markdown

---

## File map

### New files

- `mise.toml` — root task catalog for common local workflows

### Existing files to modify

- `README.md` — add a short `mise` section with task discovery, common commands, and destructive-task guidance

### No new code modules required

This change is configuration and documentation only; it should not add application source files.

---

### Task 1: Create the safe `mise` task catalog

**Files:**
- Create: `mise.toml`

- [x] **Step 1: Create `mise.toml` with safe development, stack, test, and cleanup tasks**

  Add the initial task catalog with explicit descriptions and direct wrappers around the current repo commands:

  ```toml
  [tasks."dev:ui"]
  description = "Start the Vite dev server from the repository root"
  run = "npm run dev"

  [tasks."dev:backend"]
  description = "Start the FastAPI backend with reload from backend/"
  run = "cd backend && uvicorn app.main:app --reload --port 8765"

  [tasks."stack:up"]
  description = "Build and start the full Docker stack in the foreground"
  run = "docker compose up --build"

  [tasks."stack:up-detached"]
  description = "Build and start the full Docker stack in the background"
  run = "docker compose up --build -d"

  [tasks."stack:down"]
  description = "Stop the Docker stack"
  run = "docker compose down"

  [tasks."stack:rebuild-ui"]
  description = "Rebuild and restart only the UI service"
  run = "docker compose build ui && docker compose up -d ui"

  [tasks."stack:rebuild-backend"]
  description = "Rebuild and restart only the backend service"
  run = "docker compose build backend && docker compose up -d backend"

  [tasks."test:lint"]
  description = "Run the frontend ESLint check"
  run = "npm run lint"

  [tasks."test:build"]
  description = "Run the frontend production build"
  run = "npm run build"

  [tasks."test:types"]
  description = "Run the frontend TypeScript typecheck"
  run = "npx tsc --noEmit"

  [tasks."test:backend-trust-anchors"]
  description = "Run backend trust-anchor tests with a clean test database"
  run = "cd backend && rm -f test_bff.db && pytest tests/test_trust_anchors.py"

  [tasks."test:backend-proxy"]
  description = "Run backend proxy tests with a clean test database"
  run = "cd backend && rm -f test_bff.db && pytest tests/test_proxy.py"

  [tasks."test:backend-instances"]
  description = "Run backend instance registry tests with a clean test database"
  run = "cd backend && rm -f test_bff.db && pytest tests/test_instances.py"

  [tasks."test:bff"]
  description = "Run the Playwright BFF-only suite from e2e/"
  run = "cd e2e && npm run test:bff"

  [tasks."test:full"]
  description = "Run the Playwright full-stack suite from e2e/ (requires Docker stack)"
  run = "cd e2e && npm run test:full"

  [tasks."test:trust-anchors"]
  description = "Run the focused Trust Anchors Playwright slice"
  run = "cd e2e && npm run test:bff -- tests/trust-anchors.spec.ts"

  [tasks."test:trust-marks-correctness"]
  description = "Run the focused Trust Marks correctness slice (requires Docker stack)"
  run = "cd e2e && npx playwright test --project=full-stack tests/trust-marks-correctness.spec.ts"

  [tasks."clean:playwright"]
  description = "Remove Playwright HTML reports and test artifacts"
  run = "rm -rf e2e/test-results e2e/playwright-report"
  ```

- [x] **Step 2: Validate task definitions and verify the expected names are discoverable**

  Run:

  ```bash
  mise tasks validate
  mise tasks ls | grep -E 'dev:ui|dev:backend|stack:up|test:bff|test:backend-proxy|clean:playwright'
  ```

  Expected:

  - `mise tasks validate` exits successfully
  - the listed task names appear exactly once

- [x] **Step 3: Run representative safe tasks from the new catalog**

  Run:

  ```bash
  mise run test:types
  mise run test:backend-proxy
  mise run test:trust-anchors
  mise run clean:playwright
  ```

  Expected:

  - TypeScript typecheck passes
  - backend proxy tests pass
  - the focused Trust Anchors Playwright slice passes
  - Playwright artifact cleanup exits successfully even if the directories are already absent

- [x] **Step 4: Commit the safe task catalog**

  ```bash
  git add mise.toml
  git commit -m "build: add safe mise task catalog" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

### Task 2: Add explicit reset, demo, and aggregate verification tasks

**Files:**
- Modify: `mise.toml`

- [x] **Step 1: Extend `mise.toml` with destructive and aggregate tasks**

  Append the explicit reset, demo, and verification helpers:

  ```toml
  [tasks."reset:lighthouse-data"]
  description = "Delete LightHouse runtime data under lighthouse/data (destructive)"
  run = '''
  find lighthouse/data -mindepth 1 ! -name '.gitkeep' -delete
  '''

  [tasks."reset:test-registrations"]
  description = "Delete test subordinate rows from the LightHouse SQLite database (destructive)"
  run = '''
  docker compose stop lighthouse &&
  sqlite3 lighthouse/data/lighthouse.db \
    "DELETE FROM subordinates; DELETE FROM subordinate_entity_types; DELETE FROM subordinate_additional_claims; DELETE FROM subordinate_events; DELETE FROM authority_hints WHERE entity_id LIKE '%ta-test-%';" &&
  docker compose start lighthouse
  '''

  [tasks."demo:fresh-start"]
  description = "Recreate the demo stack from a clean LightHouse state (destructive)"
  run = '''
  docker compose down &&
  find lighthouse/data -mindepth 1 ! -name '.gitkeep' -delete &&
  LIGHTHOUSE_ADMIN_USERNAME=gateway \
  LIGHTHOUSE_ADMIN_PASSWORD=gateway \
  docker compose up --build --force-recreate
  '''

  [tasks."verify:frontend"]
  description = "Run the frontend typecheck, lint, and production build"
  run = '''
  npx tsc --noEmit &&
  npm run lint &&
  npm run build
  '''

  [tasks."verify:sharemd"]
  description = "Run the focused ShareMD verification flow (trust anchors, trust marks, backend, types, build; requires Docker stack)"
  run = '''
  cd backend &&
  rm -f test_bff.db &&
  pytest tests/test_trust_anchors.py tests/test_proxy.py tests/test_instances.py &&
  cd ../e2e &&
  npm run test:bff -- tests/trust-anchors.spec.ts &&
  npx playwright test --project=full-stack tests/trust-marks-correctness.spec.ts &&
  cd .. &&
  npx tsc --noEmit &&
  npm run build
  '''
  ```

- [x] **Step 2: Validate the new task names and dry-run the destructive flows**

  Run:

  ```bash
  mise tasks validate
  mise tasks ls | grep -E 'reset:lighthouse-data|reset:test-registrations|demo:fresh-start|verify:frontend|verify:sharemd'
  mise run -n demo:fresh-start
  mise run -n reset:lighthouse-data
  ```

  Expected:

  - validation still passes
  - the explicit destructive names appear in the task list
  - the dry-run output shows the intended destructive command sequence without mutating local state

- [x] **Step 3: Run the safe aggregate verification task**

  Run:

  ```bash
  mise run verify:frontend
  ```

  Expected:

  - TypeScript typecheck passes
  - ESLint passes
  - the frontend build passes

- [x] **Step 4: Commit the reset/demo/aggregate task additions**

  ```bash
  git add mise.toml
  git commit -m "build: add destructive and aggregate mise tasks" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

### Task 3: Document the `mise` entrypoint in the README

**Files:**
- Modify: `README.md`

- [x] **Step 1: Add a short optional `mise` section to `README.md`**

  Insert a compact section near the existing run/test workflow documentation:

  ````md
  ### Use mise tasks (optional)

  If you use [mise](https://mise.jdx.dev/), the repository includes a root `mise.toml` with common developer workflows.

  ```sh
  mise tasks ls

  mise run dev:ui
  mise run stack:up-detached
  mise run test:bff
  mise run test:backend-proxy
  mise run verify:frontend
  ```

  Safe cleanup tasks live under `clean:*`.
  Destructive state-reset tasks live under `reset:*` and `demo:*`; review them before running.

  The raw `npm`, `pytest`, and `docker compose` commands below remain the source of truth and can still be used directly.
  ````

- [x] **Step 2: Verify the README task names match `mise.toml` exactly**

  Run:

  ```bash
  rg -n "dev:ui|stack:up-detached|test:bff|test:backend-proxy|verify:frontend|reset:|demo:" README.md mise.toml
  ```

  Expected:

  - every task name shown in the README exists verbatim in `mise.toml`
  - the README only references task names that were actually implemented

- [x] **Step 3: Commit the README documentation update**

  ```bash
  git add README.md
  git commit -m "docs: document mise task entrypoint" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

### Task 4: Run final representative verification and close the plan

**Files:**
- Modify: `docs/superpowers/plans/2026-05-14-mise-setup-plan.md`

- [x] **Step 1: Run the final representative verification set**

  Run:

  ```bash
  mise tasks validate
  mise tasks ls | grep -E 'dev:ui|stack:up|test:bff|clean:playwright|reset:lighthouse-data|demo:fresh-start|verify:sharemd'
  mise run test:types
  mise run test:backend-proxy
  mise run test:trust-anchors
  mise run verify:frontend
  mise run -n demo:fresh-start
  ```

  Expected:

  - task validation passes
  - the key safe, destructive, and aggregate task names are present
  - the representative safe tasks pass
  - the destructive demo reset can be dry-run and inspected without mutating local state

  **Actual results (recorded on completion):**

  - `mise tasks validate` — ✅ passed
  - key task names (`dev:ui`, `stack:up`, `test:bff`, `clean:playwright`, `reset:lighthouse-data`, `demo:fresh-start`, `verify:sharemd`) — ✅ all present
  - `mise run test:types` — ✅ passed
  - `mise run test:backend-proxy` — ✅ passed
  - `mise run test:trust-anchors` — ✅ passed
  - `mise run verify:frontend` — ❌ **failed** due to the known pre-existing ESLint baseline issue (unrelated to this branch; lint was already failing on `main` before this work began)
  - `mise run -n demo:fresh-start` (dry-run) — ✅ passed

- [x] **Step 2: Mark completed steps in this plan file and commit the final bookkeeping update**

  ```bash
  git add docs/superpowers/plans/2026-05-14-mise-setup-plan.md
  git commit -m "docs: mark mise setup plan complete" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

## Self-review checklist

- **Spec coverage:** Task 1 creates the root `mise.toml` and safe task surface. Task 2 adds explicit destructive/demo tasks plus aggregate verification helpers. Task 3 documents the optional `mise` entrypoint in the README. Task 4 verifies task discovery and representative execution.
- **Placeholder scan:** No `TODO`, `TBD`, or “similar to Task N” placeholders remain. Every task includes exact files, commands, expected outcomes, and commit messages.
- **Type consistency:** Task names are consistent across `mise.toml`, README examples, and verification commands: `dev:*`, `stack:*`, `test:*`, `clean:*`, `reset:*`, `demo:*`, and `verify:*`.
