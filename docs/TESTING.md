# Testing

Tests live in `e2e/`. Install dependencies once:

```sh
cd e2e && npm install
cd e2e && npx playwright install chromium
```

## Full-stack tests (`@proxy` — requires Docker stack running)

```sh
# Start the stack first
docker compose up --build -d

cd e2e
npm run test:full                              # all full-stack tests
npm run test:full -- --grep "pending status"   # run a subset by name
npm run test:full -- --reporter=line           # compact output
```

## BFF-only tests (`@bff` — no Docker needed)

```sh
cd e2e
npm run test:bff
```

## Open Playwright UI / trace viewer

```sh
cd e2e
npm run test:ui              # interactive test runner
npx playwright show-report   # HTML report from last run
```

Test results and failure screenshots land in `e2e/test-results/`.

## Clean up after tests

Playwright file artifacts (screenshots, traces, HTML report):

```sh
rm -rf e2e/test-results/ e2e/playwright-report/
```

Test runs register entities in LightHouse's database. To clear them without
a full reset:

```sh
docker compose stop lighthouse
sqlite3 lighthouse/data/lighthouse.db \
  "DELETE FROM subordinates; DELETE FROM subordinate_entity_types; DELETE FROM subordinate_additional_claims; DELETE FROM subordinate_events; DELETE FROM authority_hints WHERE entity_id LIKE '%ta-test-%';"
docker compose start lighthouse
```

This preserves LightHouse signing keys and config. To re-seed only the BFF
registration records, recreate the backend container:

```sh
docker compose up -d --build --force-recreate backend
```

## Backend tests

Run these against the **built image**, not the local `.venv` — see
`../CLAUDE.md` for why the local venv currently can't be trusted:

```sh
docker run --rm \
  -v "$(pwd)/backend/tests:/app/tests:ro" \
  -v "$(pwd)/backend/pytest.ini:/app/pytest.ini:ro" \
  federation-gateway-backend python3 -m pytest tests/ -q
```

(Requires the `federation-gateway-backend` image to already be built — run
`docker compose build backend` first if it doesn't exist yet.)

## Mesh integration tests

`mesh-tests/` — black-box tests against the real running `mesh-*`
LightHouse containers (see `MESH-TESTING-PROGRESS.md`, `docs/FEDERATION-TOPOLOGY.md`).
Unlike `backend/tests/` (mocked httpx), these hit live HTTP endpoints on
published localhost ports. Deliberately a top-level sibling of
`backend/tests/`, not nested inside it, and run on the **host** (not the
docker-run pattern above) — a couple of tests need `docker compose restart
mesh-ia` to bust LightHouse's own in-process cache, which needs the host's
docker CLI.

Requires the stack up and the mesh chain wired first:

```sh
docker compose up -d --build
python3 scripts/seed-mesh.py   # idempotent — safe to re-run

backend/.venv/bin/python3 -m pytest mesh-tests -v
```

(`backend/.venv` is fine here — see constraint 3 in `../CLAUDE.md`, this
suite never imports `app.*`, only `httpx`/`pytest`, neither of which cares
about the 3.9-vs-3.11 gap.) If the mesh isn't reachable at
`localhost:8090`, the whole suite skips with a clear message instead of
hanging or erroring.

## mise tasks (optional)

The repo includes a root `mise.toml` with common workflows as named tasks.
If you have [mise](https://mise.jdx.dev/) installed:

```sh
mise tasks ls                      # list all available tasks

mise run dev:ui                    # start the Vite dev server (no Docker)
mise run stack:up-detached         # docker compose up -d --build

mise run test:bff                  # BFF-only Playwright tests
mise run test:backend-proxy        # full-stack proxy tests
mise run test:mesh-integration     # mesh_integration pytest suite (requires Docker stack up)

mise run verify:frontend           # type-check + lint + build
```

Safe cleanup tasks live under `clean:*`. Destructive state-reset tasks live
under `reset:*` and `demo:*` — use with care.

The raw `npm`, `pytest`, and `docker compose` commands documented above
remain the source of truth; mise tasks are thin wrappers around them.
