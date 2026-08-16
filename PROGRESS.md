# Progress

Current state, not a changelog — `git log` has full history. Read this at
the start of a session; update it before a substantial one ends.

## Current state

All 13 compose services (`ui`, `backend`, `lighthouse`, `lighthouse2`,
`mesh-ta`, `mesh-ia`, `mesh-ia2`, `mesh-leaf-op`, `mesh-leaf-rp`,
`mesh-leaf-multi`, `mesh2-ta`, `mesh2-ia`, `mesh2-leaf-op`) are up and
healthy, spread across two docker networks (`default` + `mesh2net`,
`backend` on both — see `docs/FEDERATION-TOPOLOGY.md`). Full e2e suite
(90 passing + 8 pre-existing, testbed-dependent skips) and full backend
pytest suite (105 tests) both green as of the last verification pass.

## Recently completed

- **`mesh-tests/` — mesh integration pytest suite, `MESH-TESTING-PROGRESS.md`
  now fully complete**: a new top-level suite (deliberately sibling to
  `backend/tests/`, not nested in it — see its `conftest.py` docstring
  for why) covering every checklist item that a self-contained
  registry+LightHouse deployment could reasonably prove: B1 (metadata
  policy), B2 (constraints enforcement — `naming_constraints` proven
  live, the other two sub-mechanisms confirmed correct in source but
  need topology beyond what's justified building for their own sake),
  C4 (trust mark delegation), C5 (trust marked entities listing), C6
  (trust mark revocation/expiry), D1 (federation historical keys
  endpoint — enabled it on `mesh-leaf-rp`, wasn't turned on anywhere in
  this repo before), D2 (key rollover), D3 (subordinate revocation
  propagating to resolution), §10.3 (choosing among multiple valid trust
  chains) and "entity with redundant/multiple parents" (added `mesh-ia2`,
  a second Intermediate sibling to `mesh-ia`, and `mesh-leaf-multi`,
  registered under both), §10.4 (trust chain expiration), and the
  standalone Resolver role (§17.3/§10.6 — turned out to need no new node
  at all, just any uninvolved entity's existing `/resolve` endpoint).
  Runs on the host against published localhost ports, skips cleanly if
  the stack isn't up. `mise run test:mesh-integration` to run it (25
  tests, all green, confirmed idempotent across repeated full runs).
  Found four real, confirmed LightHouse bugs along the way: `/resolve`
  doesn't honor a subordinate's `blocked` status at all (filed upstream);
  deleting a trust mark owner doesn't release its `entity_id` for reuse;
  an expired trust mark is reported as `invalid` instead of the
  spec-defined `expired`; and setting per-subordinate constraints
  silently freezes that subordinate's metadata policy against future
  general-policy changes (found while fixing a test that broke — chasing
  it down corrected an earlier wrong belief that `docker compose restart`
  clears LightHouse's caching/state, which it does not; see
  `MESH-TESTING-PROGRESS.md`'s investigation notes for the full story).
  All four tracked in `docs/KNOWN-ISSUES.md` as bugs 5-8, three not yet
  filed upstream. Two narrow, low-priority gaps remain genuinely
  untestable without further topology this repo doesn't obviously need
  for its own sake (`max_path_length`, `allowed_entity_types`) — see
  `MESH-TESTING-PROGRESS.md`'s "Suggested next order" for exactly what
  each would need if either area comes back into focus later.
- **mesh2 + interfederation testing**: a second, fully independent
  LightHouse mesh (`mesh2-ta` → `mesh2-ia` → `mesh2-leaf-op`, no shared
  root with the first mesh) plus `scripts/seed-mesh2.py`. Confirmed live
  the one real distinction OIDFed draws for cross-federation trust: an
  issuer from mesh 1 (`mesh-ia`) can mark a mesh 2 entity directly (trust
  marks are issuer-authoritative, no chain needed — status check returns
  200), while resolving a trust *chain* from that same entity through
  mesh 1's anchor correctly fails (`404 invalid_trust_chain` — no spec
  mechanism crosses an unrelated root).
- **mesh2 network/credential separation**: moved `mesh2-*` onto their own
  docker network (`mesh2net`, isolated from `default`) with distinct admin
  credentials (`LIGHTHOUSE2_ADMIN_*`) — the initial mesh2 shared both with
  mesh1, which undersold the interfederation demo. `backend` joins both
  networks (deliberate: one app still administers both). Confirmed live:
  `mesh-ia` genuinely cannot resolve `mesh2-ta` by hostname anymore, yet
  the trust-mark status check above is completely unaffected (still 200) —
  proof the mark is a portable signed assertion, not something needing
  live connectivity between issuer and subject infrastructure. The
  negative-path `/resolve` error also turned out unaffected either way
  (LightHouse never needed to reach the subject for that check).
- **Fixed a real tenant-id collision bug found while verifying the above**:
  `db/seed.py` derived each instance's `Tenant.id` from only the *last*
  hyphen segment of its instance id (`item.id.split('-')[-1]`) — silently
  correct for `ta-1`/`ta-2` (→ `tenant-1`/`tenant-2`), but `mesh-ta`/
  `mesh2-ta` and `mesh-ia`/`mesh2-ia` both derived the same short id, so
  each backend startup after mesh2 was added silently overwrote
  `mesh-ta`'s/`mesh-ia`'s tenant record with mesh2's data (whichever
  config entry seeded last "won") — a real, already-live data-corruption
  bug, not just a mesh2-specific one. Fixed to use the full instance id
  (`tenant-mesh-ta`, `tenant-ta-1`, etc. — no collisions possible);
  updated the handful of tests that hardcoded the old `tenant-1`/
  `tenant-2` literals, and cleaned the two orphaned garbage rows out of
  the local dev `backend.db` (verified nothing referenced them first).
- **Harness engineering cleanup**: added this file and `CLAUDE.md`, moved
  `ARCHITECTURE.md`/`CAPABILITY-DISCOVERY.md`/`KNOWN-ISSUES.md`/
  `GETTING-STARTED.md` into `docs/`, split the 782-line `README.md` into a
  ~200-line entry point plus 4 new focused docs (`TESTING.md`,
  `LOCAL-DEVELOPMENT.md`, `FEDERATION-TOPOLOGY.md`,
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
  issues. Production-deployment gaps (real login, TLS, secrets, LightHouse
  admin auth) are parked in its own section there.

## Next steps

`MESH-TESTING-PROGRESS.md` is complete — no mesh testing work is
currently planned. If `max_path_length` or `allowed_entity_types`
constraint enforcement becomes a priority later, see that file's
"Suggested next order" for exactly what topology each would need
(neither is unblocked by the `mesh-ia2` sibling added for multi-parent
testing — that was a corrected assumption, see the file's investigation
notes).
