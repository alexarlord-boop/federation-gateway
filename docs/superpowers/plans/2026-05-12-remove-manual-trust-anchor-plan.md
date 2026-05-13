# Remove Manual Trust-Anchor Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the obsolete manual trust-anchor feature so trust anchors are presented only as deployment-managed/config-backed instances.

**Architecture:** Simplify the Trust Anchors page to a read-only deployment-instance view, remove the frontend and backend write paths that only exist for manual trust-anchor CRUD, and replace the old tests with assertions that the deployment-managed model is the only supported one. Keep the existing proxy model, authority hints, subordinate/intermediate flows, and subordinate-count behavior intact.

**Tech Stack:** React, TypeScript, TanStack Query, FastAPI, SQLAlchemy, Playwright, pytest

---

## File map

### Existing files to modify

- `src/pages/TrustAnchorsPage.tsx` — remove the manual trust-anchor dialogs/actions and tighten page copy around deployment-managed instances
- `src/hooks/useGatewayTrustAnchors.ts` — remove unused write mutations and config-write hook behavior if no UI consumes them
- `src/hooks/useTrustAnchors.ts` — keep the read-only re-export surface aligned with the underlying hook
- `backend/app/routers/trust_anchors.py` — remove manual trust-anchor write routes and any read-config route no longer used by the UI
- `backend/tests/test_trust_anchors.py` — replace manual-CRUD expectations with read-only deployment-model coverage
- `e2e/tests/trust-anchors.spec.ts` — remove manual trust-anchor UI expectations and assert the new read-only model
- `e2e/tests/instance-selection.spec.ts` — stop creating manual trust anchors through the API and replace with deployment-model assertions
- `README.md` — align trust-anchor/deployment wording with the config-managed model if current wording still implies runtime creation

### No new files required

This cleanup should fit in the existing files above.

---

### Task 1: Remove manual trust-anchor UI flows and replace the UI tests

**Files:**
- Modify: `e2e/tests/trust-anchors.spec.ts`
- Modify: `e2e/tests/instance-selection.spec.ts`
- Modify: `src/pages/TrustAnchorsPage.tsx`

- [x] **Step 1: Replace the old manual-TA E2E expectations with failing read-only assertions**

In `e2e/tests/trust-anchors.spec.ts`, replace the manual-create/configure tests with assertions like:

```ts
test('My Instances does not expose Add TA instance', async ({ authenticatedPage: page }) => {
  await page.goto(`${APP_URL}/trust-anchors`);
  await expect(page.getByRole('button', { name: /add ta instance/i })).toHaveCount(0);
});

test('deployment-managed LightHouse card is read-only', async ({ authenticatedPage: page }) => {
  await page.goto(`${APP_URL}/trust-anchors`);

  const lightHouseCard = page
    .locator('div.rounded-lg.border.bg-card')
    .filter({ has: page.getByRole('heading', { name: 'LightHouse' }) })
    .first();

  await expect(lightHouseCard).toBeVisible();
  await expect(lightHouseCard.getByText(/deployment managed/i)).toBeVisible();
  await expect(lightHouseCard.getByRole('button', { name: /trust anchor options/i })).toHaveCount(0);
  await expect(lightHouseCard.getByText(/subordinates/i)).toBeVisible();
});
```

In `e2e/tests/instance-selection.spec.ts`, replace the manual-creation test with a pure deployment-model assertion:

```ts
test('instance switcher only offers deployment-managed configured instances @proxy', async ({ authenticatedPage: page }) => {
  await page.goto(`${APP_URL}/dashboard`);
  await page.getByRole('button', { name: /select instance/i }).click();

  await expect(page.getByRole('menuitem', { name: /LightHouse/i })).toHaveCount(1);
  await expect(page.getByRole('menuitem', { name: /manual trust anchor/i })).toHaveCount(0);
});
```

- [x] **Step 2: Run the trust-anchor/instance-selection slices and verify they fail for the old UI**

Run:

```bash
cd e2e && npm run test:full -- tests/trust-anchors.spec.ts tests/instance-selection.spec.ts
```

Expected: FAIL because the page still renders **Add TA Instance** and still contains the manual-trust-anchor dialog/component flow.

- [x] **Step 3: Remove the obsolete dialogs and write wiring from `TrustAnchorsPage.tsx`**

Delete `AddTrustAnchorDialog` entirely and remove `ConfigureTrustAnchorDialog` if nothing else still opens it. Simplify the page wiring like:

```tsx
import { useTrustAnchors } from '@/hooks/useTrustAnchors';

export default function TrustAnchorsPage() {
  const { selectedBackend } = useBackend();
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'hint' | 'subordinate'; id: string; label: string }
    | null
  >(null);

  const { context: currentCtxData } = useDebugContext(selectedBackend.id, selectedBackend.baseUrl);
  const { trustAnchors: allAnchors, isLoading: isLoadingMyTAs } = useTrustAnchors();
  const localTAs = allAnchors.filter((ta) => ta.type === 'federation' || ta.type === 'intermediate');

  // ...

  return (
    <div className="animate-fade-in">
      <div className="page-header mb-8">
        <h1 className="page-title">Authority Hints and Trust Anchors</h1>
        <p className="page-description">
          Review deployment-managed instances, authority hints, and registered intermediates.
        </p>
      </div>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">My Instances</h2>
            <span className="text-sm text-muted-foreground">(Deployment-managed configuration)</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {localTAs.map((ta) => {
            const isActive = activeTrustAnchor?.id === ta.id;
            return (
              <TrustAnchorCard
                key={ta.id}
                ta={ta}
                isLocal
                isActive={isActive}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
```

Also remove the page-level `createTrustAnchor` / `deleteTrustAnchor` / `configTarget` plumbing and any delete handling branch for `kind === 'ta'`.

- [x] **Step 4: Run the same E2E slices and verify they pass**

Run:

```bash
cd e2e && npm run test:full -- tests/trust-anchors.spec.ts tests/instance-selection.spec.ts
```

Expected: PASS with the page showing only deployment-managed instance behavior.

- [x] **Step 5: Commit the UI cleanup**

```bash
git add e2e/tests/trust-anchors.spec.ts e2e/tests/instance-selection.spec.ts src/pages/TrustAnchorsPage.tsx
git commit -m "refactor: remove manual trust-anchor UI flows" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Remove obsolete trust-anchor write APIs and hook mutations

**Files:**
- Modify: `src/hooks/useGatewayTrustAnchors.ts`
- Modify: `src/hooks/useTrustAnchors.ts`
- Modify: `backend/app/routers/trust_anchors.py`
- Modify: `backend/tests/test_trust_anchors.py`

- [x] **Step 1: Replace backend manual-CRUD tests with failing read-only route expectations**

In `backend/tests/test_trust_anchors.py`, remove the manual round-trip tests and add read-only expectations like:

```python
def test_manual_trust_anchor_create_route_is_not_supported(client, admin_headers):
    resp = client.post(
        "/api/v1/admin/trust-anchors",
        json={
            "name": "Manual Anchor",
            "entity_id": "http://manual.ta.test",
            "type": "federation",
            "status": "active",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 405


def test_manual_trust_anchor_delete_route_is_not_supported(client, admin_headers):
    resp = client.delete("/api/v1/admin/trust-anchors/ta-does-not-exist", headers=admin_headers)
    assert resp.status_code == 405
```

If you remove the `/config` route entirely, add a failing expectation for the path being absent:

```python
def test_trust_anchor_config_route_is_not_supported(client, admin_headers):
    resp = client.get("/api/v1/admin/trust-anchors/ta-1/config", headers=admin_headers)
    assert resp.status_code == 404
```

- [x] **Step 2: Run the backend trust-anchor tests and verify they fail**

Run:

```bash
cd backend && pytest tests/test_trust_anchors.py
```

Expected: FAIL because the write routes still exist and the old manual-CRUD tests still reflect the obsolete feature.

- [x] **Step 3: Remove unused hook mutations from the gateway trust-anchor hook**

Simplify `src/hooks/useGatewayTrustAnchors.ts` to a read-only hook if no UI still needs mutations:

```ts
export function useGatewayTrustAnchors() {
  const query = useQuery({
    queryKey: trustAnchorKeys.list(),
    queryFn: async () => {
      const data = await gatewayFetch<any[]>({
        path: '/api/v1/admin/trust-anchors',
        softFail: [403],
      });
      return (data ?? []).map(toDisplay);
    },
  });

  return {
    trustAnchors: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
```

Then keep `src/hooks/useTrustAnchors.ts` aligned:

```ts
export {
  useGatewayTrustAnchors as useTrustAnchors,
  type TrustAnchorDisplay,
} from '@/hooks/useGatewayTrustAnchors';
```

Delete `TrustAnchorCreate` exports if nothing still imports them.

- [x] **Step 4: Remove obsolete write routes from `backend/app/routers/trust_anchors.py`**

Keep the list route and subordinate-count logic, but remove the manual trust-anchor mutation endpoints:

```python
@router.get("", response_model=list[TrustAnchorResponse])
def list_trust_anchors(
    db: Session = Depends(get_db),
    user=Depends(require_permission("trust_anchors", "list")),
):
    # existing list behavior stays
```

Delete:

```python
@router.post("", response_model=TrustAnchorResponse, status_code=201)
def create_trust_anchor(...):
    ...

@router.delete("/{ta_id}", status_code=204)
def delete_trust_anchor(...):
    ...

@router.get("/{ta_id}/config", response_model=TrustAnchorConfig)
def get_trust_anchor_config(...):
    ...

@router.put("/{ta_id}/config", response_model=TrustAnchorConfig)
def update_trust_anchor_config(...):
    ...
```

Also remove unused imports/schemas (`uuid`, `TrustAnchorCreate`, `TrustAnchorConfig`, etc.) once those routes are gone.

- [x] **Step 5: Rerun backend tests and verify they pass**

Run:

```bash
cd backend && pytest tests/test_trust_anchors.py tests/test_instances.py
```

Expected: PASS with the trust-anchor surface now read-only and deployment-managed.

- [x] **Step 6: Run typecheck/build after the hook cleanup**

Run:

```bash
npx tsc --noEmit
npm run build
```

Expected: PASS with no remaining references to removed trust-anchor write hooks.

- [x] **Step 7: Commit the API/hook cleanup**

```bash
git add src/hooks/useGatewayTrustAnchors.ts src/hooks/useTrustAnchors.ts backend/app/routers/trust_anchors.py backend/tests/test_trust_anchors.py backend/tests/test_instances.py
git commit -m "refactor: retire manual trust-anchor API paths" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Align docs and run the final trust-anchor/deployment verification set

**Files:**
- Modify: `README.md`
- Modify: `e2e/tests/trust-anchors.spec.ts` (only if wording assertions still need final adjustment)
- Modify: `e2e/tests/instance-selection.spec.ts` (only if wording assertions still need final adjustment)
- Modify: `docs/superpowers/plans/2026-05-12-remove-manual-trust-anchor-plan.md`

- [x] **Step 1: Update README wording to remove runtime trust-anchor creation language**

Adjust the trust-anchor/deployment guidance so it clearly says instances are config-managed. For example:

```md
> **Configuration**: Deployment-managed instances are defined in `backend/config/gateway.yaml` and loaded at backend startup.

### Trust Anchors page model

- **My Instances** shows deployment-managed instances mirrored from config
- authority hints are still managed in the UI
- registered intermediates are still managed through the Subordinates flow
- the UI does not create or edit trust anchors directly
```

- [x] **Step 2: Run the focused trust-anchor verification set**

Run:

```bash
cd e2e && npm run test:full -- tests/trust-anchors.spec.ts tests/instance-selection.spec.ts
cd ..
cd backend && pytest tests/test_trust_anchors.py tests/test_instances.py
cd ..
npx tsc --noEmit
npm run build
```

Expected: PASS across trust-anchor UI, instance selection, backend trust-anchor reads, instance registry, typecheck, and build.

- [x] **Step 3: Run the broader demo-safety slice**

Run:

```bash
cd e2e && npm run test:full -- tests/entities.spec.ts tests/trust-marks.spec.ts tests/trust-marks-correctness.spec.ts
```

Expected: PASS, proving this cleanup did not regress subordinate or trust-mark flows.

- [x] **Step 4: Mark this plan complete and commit the final cleanup pass**

```bash
git add README.md docs/superpowers/plans/2026-05-12-remove-manual-trust-anchor-plan.md e2e/tests/trust-anchors.spec.ts e2e/tests/instance-selection.spec.ts
git commit -m "docs: align trust-anchor UI with deployment-managed model" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Self-review checklist

- **Spec coverage:** Task 1 removes the obsolete manual trust-anchor UI surfaces and updates the affected E2E tests. Task 2 removes the write-side hook/API paths and replaces backend expectations with the deployment-managed read model. Task 3 aligns docs and reruns focused plus broader verification.
- **Placeholder scan:** No `TODO`, `TBD`, or “similar to Task N” placeholders remain; every code-changing step includes concrete files, code, commands, and expected results.
- **Type consistency:** The plan consistently treats trust anchors as deployment-managed/read-only, keeps `useTrustAnchors()` as the list hook, and uses the existing `/api/v1/admin/instances` route as the deployment registry surface.
