# Known Issues & Product Gaps

Discovered by running gap-finding e2e tests against the live stack.  
Tests are in `e2e/tests/entity-detail.spec.ts`, `settings-mutations.spec.ts`, `rbac-enforcement.spec.ts`, `trust-marks-crud.spec.ts`.

---

## 🛠️ Fixable by us (UI / BFF code changes only)

These are bugs or missing features in our own codebase — no LightHouse or OIDFed spec changes needed.

### 🔴 Critical — Incorrect API values (will produce HTTP 400)

- [x] ~~**`EntitiesPage` uses invalid status `'rejected'`**~~  
  **Fixed:** replaced `'rejected'` with `'inactive'`; removed "Rejected" filter option. (`src/pages/EntitiesPage.tsx`)

- [x] ~~**`EntityDetailPage` Lock button sends invalid status `'locked'`**~~  
  **Fixed:** status change now uses `'blocked'`/`'active'`/`'inactive'`. Button label updated to "Block/Unblock". (`src/pages/EntityDetailPage.tsx`)

### 🟠 High — Missing UI for existing backend functionality

- [x] ~~**Entity detail JWKS tab is read-only**~~  
  **Fixed:** `SubordinateJwksTab` component added with per-key delete buttons and Add JWK textarea, wiring `addJwk`/`deleteJwk` from `useSubordinateKeys`. (`src/pages/EntityDetailPage.tsx`)

- [x] ~~**Entity detail Metadata tab is read-only**~~  
  **Fixed:** `SubordinateMetadataTab` component with "Edit JSON" toggle, Textarea editor, JSON validation, and Save/Cancel via `updateMetadata` from `useEntityDetail`. (`src/pages/EntityDetailPage.tsx`)

- [x] ~~**No UI to change status of `inactive` entities**~~  
  **Fixed:** status dropdown now shown for `active`, `blocked`, `inactive`, and `pending` entities with contextual options. (`src/pages/EntityDetailPage.tsx`)

### 🟡 Medium — UX & accessibility

- [x] ~~**Delete button on entity detail has no accessible label**~~  
  **Fixed:** added `aria-label="Delete entity"` to the destructive icon button. (`src/pages/EntityDetailPage.tsx`)

- [x] ~~**Entity status filter is client-side only — no URL deep-link support**~~  
  **Fixed:** `statusFilter` now synced with `?status=` URL search param via `useSearchParams`. (`src/pages/EntitiesPage.tsx`)

- [x] ~~**Lock/Unlock requires two clicks (confusing UX)**~~  
  **Fixed:** dropdown now contains multiple contextual actions (Block, Set Active, Set Inactive) so the extra click is justified; removed single-item redundancy. (`src/pages/EntityDetailPage.tsx`)  
  The Lock button opens a DropdownMenu that contains a single menu item to actually change the status. For a single-action button, this adds unnecessary friction. Consider a direct confirmation dialog instead.

- [x] ~~**Stats page only used 2 of 8 available LightHouse stats endpoints**~~  
  **Fixed:** added `stats/top/user-agents`, `stats/top/clients`, `stats/top/params`, `stats/top/countries`, `stats/latency` (full p50–p99/min/max), and a `stats/timeseries`-backed "Requests Over Time" line chart (Total Requests + Errors, `useStatsTimeseries` with `keepPreviousData` so range switches don't flash) to `useStats.ts` and `StatsPage.tsx`, plus a CSV/JSON export button backed by `stats/export`. `stats/top/countries` gracefully shows an empty state (no GeoIP configured) rather than being hidden. `stats/daily` is still not wired up — still non-functional upstream, see below. Chart colors validated with the dataviz skill's palette validator in both light and dark mode; `--destructive`'s dark value failed contrast as a thin line, so added a dedicated `--chart-line-2` token instead of reusing it.

- [x] ~~**`docker-compose.yml` was pinned to the stale `oidfed/lighthouse:latest` tag**~~  
  **Found by:** being told the two bugs below were "already fixed" — they weren't, on the image we had. Docker Hub showed `latest` was last pushed 2026-06-15 while `main` and several `sha-*` builds went out as recently as 2026-07-09 — `latest` isn't kept in sync with actual HEAD. **Fixed:** re-pinned both `lighthouse` and `lighthouse2` services to `oidfed/lighthouse@sha256:689b121...` (the real newest build, currently tagged `main`). Note: `lighthouse_version` in the entity config still reports `0.21.0` on this build even though it contains new fixes — the version claim can't be used to tell builds apart, only the image digest can. Caveat: `main` is a floating branch tag, not a stable release — worth watching for a proper versioned tag upstream.

---

## 🤝 Requires LightHouse / OIDFed team collaboration

- [ ] **`stats/daily` is non-functional against SQLite storage**  
  Returns an empty array despite real data existing in range, even with a narrow, sane date window. Same class of bug as `stats/timeseries` used to have (date-bucketing query) — `timeseries` itself is now fixed upstream (see above), but `daily` still fails, silently (swallowed error) rather than propagating one. Confirmed still broken on the newest available build (`sha256:689b121...`, 2026-07-09). Not wired into the Stats page; noted inline instead of a silent gap.

- [ ] **Unmatched-route requests are logged with the wrong status code**  
  **Found by:** wiring the "Requests Over Time" chart and noticing the Errors line stayed flat at 0 despite deliberately hitting several nonexistent paths. A live `curl` to a bogus path returns a real `404`, but the stored stats-log row for that same request has `status_code: 200`. Scoped precisely: this only affects **unmatched routes** hitting Fiber's default "Cannot GET" fallback — registered endpoints returning real 4xx via application logic (e.g. `/resolve`, `/fetch` with bad params → 400) log correctly. Confirmed on the newest build (`sha256:689b121...`). Effect: `stats/summary`'s `error_rate`/`total_errors`, the `Requests by Status` breakdown, and the new timeseries chart's Errors line will all *undercount* errors from bogus/scanner traffic specifically — genuine application errors are unaffected. Not fixable on our side.

Items originally thought to need external collaboration turned out to be self-fixable:

- [x] ~~**Entity detail Policies tab broken for entities with no policies**~~  
  **Fixed:** `useSubordinateMetadataPolicies.ts` query function now catches 404 and returns `{}` — no LightHouse change needed. (`src/hooks/useSubordinateMetadataPolicies.ts`)

- [x] ~~**No "issue trust mark to entity" workflow**~~  
  **Fixed:** `IssuanceSpecsTab` + `SpecSubjectsPanel` were already fully implemented in `TrustMarksPage.tsx`; the **Issuance** tab is now visible when `trust_mark_issuance` is advertised by LightHouse (enabled in v0.20.0 manifest). Note: there is still no single-click "issue to entity" shortcut — you navigate Trust Marks → Issuance → select spec → Add Subject. GAP test updated to reflect this (direct-issue shortcut is a UX gap, not a blocker).

- [x] ~~**Authority hint validation silently drops error detail**~~  
  **Fixed:** `handleAdd` in `AuthorityHintsSection` now surfaces `err?.body?.detail` in the error toast so operators see actionable validation messages. (`src/pages/SettingsPage.tsx`)

- [x] ~~**Public `federation_trust_mark_endpoint`/`_list`/`_status` were never advertised or served**~~  
  **Found by:** comparing our own instance's entity configuration against real eduGAIN federations on `testbed.oidf.lab.surf.nl` — every real trust anchor there advertises these three endpoints; ours advertised none, and hitting `/trust_mark` returned a bare 404 rather than a spec-compliant `invalid_request`. Root cause: `lighthouse/config.yaml` / `lighthouse2/config.yaml` only enabled `fetch`, `list`, `resolve` under `endpoints:` — LightHouse supports `trust_mark`, `trust_mark_status`, `trust_mark_list` the same way but they were never turned on.  
  **Fixed:** added the three endpoint entries to both config files. Verified: issued a mark to a real testbed subject entity and round-tripped it through our own instance's public `/trust_mark` endpoint successfully (matches the shape of real federation responses: `alg: ES512`, `typ: trust-mark+jwt`). Without this, marks we issue are only visible in our own admin UI — never resolvable by an external relying party querying the standard federation protocol.

- [x] ~~**Trust mark JWT viewer decoded the wrong claim for the trust mark type**~~  
  **Found by:** the round-trip above — the real JWT LightHouse returns uses the claim `trust_mark_type`, not `id`. `jwt-utils.ts`'s `TrustMarkPayload` type and `JwtDetailDialog.tsx` assumed `id` (an older/different spec draft's claim name), so the "Trust Mark Type" field in the JWT detail dialog was always blank for every real issued mark — silently, since no test ever opened that dialog and asserted on its content.  
  **Fixed:** `src/lib/jwt-utils.ts`, `src/components/trust-marks/JwtDetailDialog.tsx`, `src/components/trust-marks/SelfTrustMarksTab.tsx` now read `trust_mark_type`. Added `e2e/tests/trust-marks-testbed-validation.spec.ts` (opt-in via `RUN_TESTBED_TESTS=1`, skips gracefully if the testbed is unreachable) which issues a mark to a real testbed entity, fetches it back via the public endpoint, and asserts the correct claim names — guarding this regression going forward.

---

## ✅ Confirmed working (from e2e tests)

- RBAC: non-admin users are correctly blocked from `/approvals`, `/users`, `/trust-anchors`, `/rbac`
- RBAC: non-admin users do NOT see the "Register Entity" button
- LightHouse federation endpoints `/fetch`, `/list`, `/resolve` are live and advertised in entity config JWT
- Entity registration (pending status) flow works end-to-end
- Approval flow (approve/reject) works end-to-end
- Settings: entity config tab, keys tab, constraints tab, metadata policies tab all load correctly
- Trust mark type creation works; Issuance tab (specs + subjects) fully functional
- Entity detail: overview, metadata (editable), JWKS (add/delete), constraints, policies tabs all load
- Delete entity from detail page works (with AlertDialog confirmation)
- Back navigation from entity detail works
- Authority hint error details are surfaced in the UI toast
- Entity status URL deep-link (`?status=`) works for bookmarkable/shareable filters
- 106/109 e2e tests pass (3 skipped: 2 trust-marks UI spec gaps, 1 entity-detail no-direct-issue shortcut)
