# Known Issues & Product Gaps

Discovered by running gap-finding e2e tests against the live stack.  
Tests are in `e2e/tests/entity-detail.spec.ts`, `settings-mutations.spec.ts`, `rbac-enforcement.spec.ts`, `trust-marks-crud.spec.ts`.

---

## 🔴 Critical — Incorrect API values (will produce HTTP 400)

- [ ] **`EntitiesPage` uses invalid status `'rejected'`**  
  File: `src/pages/EntitiesPage.tsx` line 37, 124, 197  
  The status change dropdown sends `status: 'rejected'` to LightHouse. LightHouse only accepts `active`, `blocked`, `pending`, `inactive`. Every status-change call with `'rejected'` returns HTTP 400 and silently fails.  
  Fix: replace `'rejected'` with `'inactive'` throughout.

- [ ] **`EntityDetailPage` Lock button sends invalid status `'locked'`**  
  File: `src/pages/EntityDetailPage.tsx` line 458  
  The Lock/Unlock dropdown calls `handleStatusChange('locked')`. `'locked'` is not a valid LightHouse status. The API returns 400, the UI shows "Update Failed" toast.  
  Fix: map "Lock" → `'blocked'` (or `'inactive'`) and update the UI label accordingly.

---

## 🟠 High — Missing functionality

- [ ] **Entity detail JWKS tab is read-only**  
  File: `src/pages/EntityDetailPage.tsx` line ~596  
  The `useSubordinateKeys` hook already has `addJwk` and `deleteJwk` mutations, but no UI exposes them. The JWKS tab renders the keys as a read-only `<pre>` block. Operators cannot rotate keys per-subordinate from the UI.

- [ ] **Entity detail Metadata tab is read-only**  
  File: `src/pages/EntityDetailPage.tsx` line ~585  
  The Metadata tab displays the raw entity JSON but offers no way to edit it. No "Edit JSON" button exists on this tab (unlike the Policies tab which does have editing).

- [ ] **Entity detail Policies tab broken for entities with no policies**  
  File: `src/pages/EntityDetailPage.tsx` / `src/components/SubordinateMetadataPoliciesTab.tsx`  
  When a subordinate has no metadata policies configured, the LightHouse API may return a 404/error instead of an empty object `{}`. This causes the component to enter a permanent error or loading state — the "Edit JSON" button never appears. Operators cannot add the first policy for an entity.

- [ ] **No UI to change status of `inactive` entities**  
  File: `src/pages/EntityDetailPage.tsx` line 448  
  The Lock/Unlock button is only rendered for `active` or `locked` statuses. Entities with `inactive` (or `pending`) status have no status-change controls on the detail page. There is no way to reactivate an inactive entity from the UI.

- [ ] **No "issue trust mark to entity" workflow**  
  File: `src/pages/TrustMarksPage.tsx`  
  Trust mark types can be created and deleted, but there is no UI to issue a trust mark to a specific entity. The only issuance path is through Issuance Specs, which requires a separate configuration step not surfaced in the entity detail flow.

---

## 🟡 Medium — UX & accessibility issues

- [ ] **Delete button on entity detail has no accessible label**  
  File: `src/pages/EntityDetailPage.tsx` line 481  
  The delete entity button is `<Button variant="destructive" size="icon"><Trash2 /></Button>` with no `aria-label` or tooltip. Screen readers and automated tests cannot identify it by name.  
  Fix: add `aria-label="Delete entity"` to the button.

- [ ] **Entity status filter is client-side only — no URL deep-link support**  
  File: `src/pages/EntitiesPage.tsx`  
  The `statusFilter` state is not reflected in the URL. Navigating to `/entities?status=active` does not pre-filter the list. Users cannot share links to filtered views or bookmark filtered states.

- [ ] **Lock/Unlock requires two clicks (confusing UX)**  
  File: `src/pages/EntityDetailPage.tsx` line 449–467  
  The Lock button opens a DropdownMenu that contains a single menu item to actually change the status. For a single-action button, this adds unnecessary friction. Consider a direct confirmation dialog instead.

---

## 🔵 Low — Validation concerns

- [ ] **Authority hint validation may reject non-existent federation entity IDs**  
  File: `src/pages/SettingsPage.tsx` line 195 / LightHouse admin API  
  The `addHint` API call sends `{ entity_id: <url> }`. If LightHouse validates that the URL belongs to a resolvable federation entity, hints with arbitrary URLs (e.g., test/staging values) are silently rejected with an error toast, giving users no guidance on what constitutes a valid authority hint.

---

## ✅ Confirmed working (from e2e tests)

- RBAC: non-admin users are correctly blocked from `/approvals`, `/users`, `/trust-anchors`, `/rbac`
- RBAC: non-admin users do NOT see the "Register Entity" button
- LightHouse federation endpoints `/fetch`, `/list`, `/resolve` are live and advertised in entity config JWT
- Entity registration (pending status) flow works end-to-end
- Approval flow (approve/reject) works end-to-end
- Settings: entity config tab, keys tab, constraints tab, metadata policies tab all load correctly
- Trust mark type creation works
- Entity detail: overview, metadata (read-only), JWKS (read-only), constraints tabs all load
- Delete entity from detail page works (with AlertDialog confirmation)
- Back navigation from entity detail works
