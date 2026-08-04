# Progress

Current state, not a changelog — `git log` has full history. Read this at
the start of a session; update it before a substantial one ends.

## Current state

All 8 compose services (`ui`, `backend`, `lighthouse`, `lighthouse2`,
`mesh-ta`, `mesh-ia`, `mesh-leaf-op`, `mesh-leaf-rp`) are up and healthy.
Full e2e suite (90 passing tests + 8 pre-existing, testbed-dependent
skips) and full backend pytest suite (105 tests) both green as of the last
verification pass.

## Recently completed

- **Harness engineering cleanup** (this session): added this file and
  `CLAUDE.md`, moved `ARCHITECTURE.md`/`CAPABILITY-DISCOVERY.md`/
  `KNOWN-ISSUES.md`/`GETTING-STARTED.md` into `docs/`, split the
  782-line `README.md` into a ~200-line entry point plus 4 new focused
  docs (`TESTING.md`, `LOCAL-DEVELOPMENT.md`, `FEDERATION-TOPOLOGY.md`,
  `BACKEND-IMPLEMENTORS.md`).
- **Small LightHouse mesh**: a real 2-hop multi-instance federation
  (`mesh-ta` → `mesh-ia` → `mesh-leaf-op`/`mesh-leaf-rp`) for testing
  actual trust-chain resolution and trust-mark delegation, plus
  `scripts/seed-mesh.py` to wire it up. Found and fixed 3 real bugs along
  the way: a latin-1 crash in the proxy's response headers, each
  instance's stored `entity_id` defaulting to `public_base_url` instead
  of its real self-asserted identity, and `lighthouse2/data` never having
  been gitignored (a real private signing key had been committed).
- **Sidebar rework**: fixed-width icon rail instead of collapsing to
  `width: 0`, a Radix Tooltip missing a `Portal` (was silently broken
  app-wide), several rounds of animation/alignment fixes, and Trust
  Marks' role-legend cards replaced with tab tooltips.
- **Trust-mark spec compliance**: `trust_mark_status` is POST +
  `application/x-www-form-urlencoded` per the actual OIDF text, not GET —
  see `docs/KNOWN-ISSUES.md` for the full story including two confirmed
  upstream LightHouse bugs found via the real `testbed.oidf.lab.surf.nl`
  federation.

## Known blockers

- **`backend/.venv` is stale**: Python 3.9 present, project pinned to
  3.11. Local `pytest` results can't be trusted — see `docs/TESTING.md`
  for the workaround (run tests against the built Docker image instead).
  Not yet fixed; unrelated to any in-progress feature work.
- Everything else open is tracked in `docs/KNOWN-ISSUES.md`, not here —
  that file is the maintained, evidence-based list of gaps and upstream
  issues.

## Next steps

Nothing currently queued. No commits from this session have been pushed
to `origin/main` (standing rule — see `CLAUDE.md`).
