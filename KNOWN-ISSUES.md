# Known Issues & Product Gaps

Discovered by running gap-finding e2e tests against the live stack.  
Tests are in `e2e/tests/entity-detail.spec.ts`, `settings-mutations.spec.ts`, `rbac-enforcement.spec.ts`, `trust-marks-crud.spec.ts`.

---

## 🛠️ Fixable by us (UI / BFF code changes only)

These are bugs or missing features in our own codebase — no LightHouse or OIDFed spec changes needed.

### 🔴 Critical — Incorrect API values (will produce HTTP 400)

- [ ] **`EntitiesPage` uses invalid status `'rejected'`**  
  File: `src/pages/EntitiesPage.tsx` line 37, 124, 197  
  The status change dropdown sends `status: 'rejected'` to LightHouse. LightHouse only accepts `active`, `blocked`, `pending`, `inactive`. Every status-change call with `'rejected'` returns HTTP 400 and silently fails.  
  Fix: replace `'rejected'` with `'inactive'` throughout.

- [ ] **`EntityDetailPage` Lock button sends invalid status `'locked'`**  
  File: `src/pages/EntityDetailPage.tsx` line 458  
  The Lock/Unlock dropdown calls `handleStatusChange('locked')`. `'locked'` is not a valid LightHouse status. The API returns 400, the UI shows "Update Failed" toast.  
  Fix: map "Lock" → `'blocked'` (or `'inactive'`) and update the UI label accordingly.

### 🟠 High — Missing UI for existing backend functionality

- [ ] **Entity detail JWKS tab is read-only**  
  File: `src/pages/EntityDetailPage.tsx` line ~596  
  The `useSubordinateKeys` hook already has `addJwk` and `deleteJwk` mutations, but no UI exposes them. The JWKS tab renders the keys as a read-only `<pre>` block. Operators cannot rotate keys per-subordinate from the UI.

- [ ] **Entity detail Metadata tab is read-only**  
  File: `src/pages/EntityDetailPage.tsx` line ~585  
  The Metadata tab displays the raw entity JSON but offers no way to edit it. No "Edit JSON" button exists on this tab (unlike the Policies tab which does have editing).

- [ ] **No UI to change status of `inactive` entities**  
  File: `src/pages/EntityDetailPage.tsx` line 448  
  The Lock/Unlock button is only rendered for `active` or `locked` statuses. Entities with `inactive` (or `pending`) status have no status-change controls on the detail page. There is no way to reactivate an inactive entity from the UI.

### 🟡 Medium — UX & accessibility

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

## 🤝 Requires LightHouse / OIDFed team collaboration

These require either a LightHouse API change, OIDFed spec clarification, or cross-team design agreement before we can implement the UI.

### 🟠 High — Backend behaviour blocks UI implementation

- [ ] **Entity detail Policies tab broken for entities with no policies**  
  File: `src/components/SubordinateMetadataPoliciesTab.tsx`  
  When a subordinate has no metadata policies configured, the LightHouse API returns a 404/error instead of an empty object `{}`. This causes the UI to enter a permanent error state — the "Edit JSON" button never appears and operators cannot create the first policy for an entity.  
  **Needs:** LightHouse to return `{}` (or `204`) for missing policies rather than an error response.

- [ ] **No "issue trust mark to entity" workflow**  
  File: `src/pages/TrustMarksPage.tsx`  
  Trust mark types can be created and deleted, but there is no UI to issue a trust mark to a specific entity. The backend has an issuance API, but the design of the issuance flow (which entity, which trust mark type, what claims) needs alignment with the OIDFed trust mark issuance spec (§ 5.3).  
  **Needs:** Agreement with LightHouse team on the issuance API contract and claim schema.

### 🔵 Low — Validation / spec ambiguity

- [ ] **Authority hint validation may silently reject valid-looking URLs**  
  File: `src/pages/SettingsPage.tsx` line 195 / LightHouse admin API  
  The `addHint` API call sends `{ entity_id: <url> }`. It is unclear whether LightHouse validates the URL resolves to a real federation entity. If it does, test/staging hints fail silently with no actionable error message in the UI.  
  **Needs:** LightHouse docs / team clarification on validation rules so we can surface the correct error message.

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
