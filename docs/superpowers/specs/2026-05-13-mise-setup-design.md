# Mise Setup Design

## Problem

The repository has a stable set of developer workflows, but they are spread across:

- root `package.json` scripts for frontend work
- `e2e/package.json` scripts for Playwright
- backend-local `pytest` commands
- Docker Compose commands in the README

That makes common operations discoverable only if contributors already know which directory each command belongs in and which flows are safe versus destructive.

## Goal

Add a repo-root `mise` task setup that gives contributors one entrypoint for the common local workflows:

- local development helpers
- Docker stack lifecycle commands
- backend and frontend verification commands
- demo startup and reset flows
- cleanup helpers

The setup should wrap the commands the repository already uses instead of introducing a new workflow model.

## Non-goals

- managing tool versions with `mise`
- replacing `npm`, `pytest`, or `docker compose` as the underlying tools
- refactoring existing package scripts just to fit `mise`
- changing environment variable, auth, or deployment configuration behavior
- hiding destructive behavior behind ambiguous task names

## Current State

The repository already has working commands for the main developer flows:

### Frontend

At the repo root:

- `npm run dev`
- `npm run build`
- `npm run lint`

### End-to-end tests

Under `e2e/`:

- `npm run test:bff`
- `npm run test:full`
- `npm run test:ui`

### Backend verification

Under `backend/`:

- focused `pytest` commands such as `pytest tests/test_proxy.py`
- focused verification flows that first remove `test_bff.db`

### Stack and demo flows

The README documents:

- `docker compose up --build`
- `docker compose up --build -d`
- `docker compose down`
- service-specific rebuilds
- demo reset flows that wipe `lighthouse/data`
- cleanup of Playwright artifacts

The command surface is already good enough to reuse directly; the gap is discoverability and a single entrypoint.

## Proposed Design

### 1. Add a repo-root `mise.toml`

Create a single `mise.toml` at the repository root.

Its first responsibility is task discovery, not environment management. Contributors should be able to run `mise tasks` and see the common project workflows in one place.

### 2. Use task namespaces that reflect intent

Tasks should be grouped by purpose so contributors can quickly tell what they do:

- `dev:*` for local development helpers
- `stack:*` for Docker Compose lifecycle and rebuild operations
- `test:*` for backend, frontend, Playwright, and combined verification commands
- `demo:*` for guided demo startup/reset flows
- `clean:*` for safe cleanup operations
- `reset:*` for destructive state-reset operations

This naming keeps dangerous operations visually separate from normal day-to-day commands.

### 3. Wrap existing commands directly

Each task should execute the repository's current command from the correct directory instead of inventing a parallel script layer.

Examples of the intended mapping:

- `dev:ui` -> `npm run dev`
- `test:bff` -> `cd e2e && npm run test:bff`
- `test:trust-anchors` -> `cd e2e && npm run test:bff -- tests/trust-anchors.spec.ts`
- `test:backend-proxy` -> `cd backend && pytest tests/test_proxy.py`
- `stack:up` -> `docker compose up --build`
- `stack:up-detached` -> `docker compose up --build -d`
- `demo:reset` -> the existing README flow that brings the stack down, wipes runtime LightHouse state, and recreates the stack

The exact task list should cover the workflows already used regularly in this repository rather than every possible shell command.

### 4. Keep safe and destructive tasks explicit

Safe cleanup tasks belong under `clean:*`, for example:

- Playwright report cleanup
- test artifact cleanup

Destructive tasks belong under `reset:*` or explicit `demo:*` names that clearly indicate data loss, for example:

- wiping `lighthouse/data`
- recreating the stack from a clean demo state

Destructive tasks should never be named in a way that could be mistaken for a harmless refresh.

### 5. Add a small number of aggregate tasks

The setup may include a few aggregate helpers where they match real workflows already used in the repository, such as:

- a focused ShareMD-aligned verification flow
- a broader `verify:*` task that runs the common checks in sequence

Aggregate tasks should stay limited to established workflows. They should not become a second CI design living only in `mise.toml`.

## Planned Task Surface

The initial `mise` setup should cover these categories:

### Development

- UI dev server

### Stack lifecycle

- start stack in foreground
- start stack detached
- stop stack
- rebuild only UI
- rebuild only backend

### Verification

- frontend build
- frontend lint
- TypeScript typecheck
- backend focused pytest commands
- Playwright BFF suite
- Playwright full-stack suite
- focused trust-anchor and trust-mark checks used in current development work

### Cleanup

- remove Playwright artifacts

### Reset and demo

- reset demo state by clearing LightHouse runtime data
- recreate the stack for a fresh demo

## Documentation

Update the README with a short `mise` section that:

- explains that `mise` is an optional command entrypoint for existing workflows
- shows how to list tasks
- highlights the main day-to-day commands
- distinguishes safe cleanup from destructive reset tasks

The raw underlying commands should remain documented, because they are still the source of truth and useful even without `mise`.

## Error Handling and Safety

- `mise` tasks should fail with the underlying command's exit status
- tasks that require Docker or an already-running stack should say so in their descriptions
- destructive tasks must have unmistakably destructive names
- the setup should not introduce silent fallbacks or alternate behavior paths

## Verification

The implementation should be verified by:

- confirming the `mise` task list renders correctly
- running representative safe tasks from each main category
- running at least one destructive/reset task only if explicitly intended during verification
- ensuring README instructions match the implemented task names

## Completion Criteria

This work is complete when:

- the repository has a root `mise.toml`
- common development, stack, test, cleanup, and reset workflows are exposed as `mise` tasks
- task names make safe versus destructive operations obvious
- README documents the `mise` entrypoint without replacing the existing raw commands
- representative `mise` tasks run the expected underlying commands successfully
