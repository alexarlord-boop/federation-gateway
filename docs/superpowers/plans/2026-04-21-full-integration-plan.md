# Full UI+BFF+LightHouse Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining integration gaps between the React UI, the FastAPI BFF, and the LightHouse federation admin/runtime surfaces.

**Architecture:** Treat the remaining work as a sequence of small integration tracks, not one giant feature. First stabilize the proxy and make capability discovery truthful, then normalize LightHouse-specific response contracts, and only after the live stack is trustworthy add the remaining product surfaces (Statistics, Resolver, Audit Log). Each track should land independently and keep the Docker stack runnable.

**Tech Stack:** React + TypeScript + Vite, TanStack Query, Playwright, FastAPI, SQLAlchemy, SQLite, Docker Compose, LightHouse `oidfed/lighthouse:0.20.0`

---

## Scope note

This is broader than a single PR. Implement it as **six sequential tracks**:

1. Proxy stabilization
2. Truthful capability discovery
3. Response-contract normalization
4. Statistics dashboard
5. Trust-chain resolver
6. Audit log

Do not start tracks 4-6 until tracks 1-3 are green on the live Docker stack.

## File map

### Existing files to modify

- `backend/app/routers/proxy.py` — generic BFF proxy to LightHouse Admin API
- `backend/app/routers/capabilities.py` — capability manifest returned to UI
- `backend/app/main.py` — FastAPI app wiring and middleware registration
- `backend/app/db/rbac_seed.py` — seeded feature flags from OAS
- `lighthouse/config.yaml` — LightHouse runtime config
- `src/contexts/CapabilityContext.tsx` — UI capability loading and fallback behavior
- `src/hooks/useGeneralConstraints.ts` — general constraints query handling
- `src/hooks/useSubordinateConstraints.ts` — subordinate constraints query handling
- `src/App.tsx` — route registration
- `src/components/layout/AppSidebar.tsx` — navigation
- `src/pages/DashboardPage.tsx` — dashboard host for statistics
- `e2e/tests/settings.spec.ts` — settings integration coverage

### New files likely needed

- `src/hooks/useStats.ts`
- `src/components/stats/StatsSummaryCards.tsx`
- `src/components/stats/StatsTimeseriesChart.tsx`
- `src/components/stats/StatsTopEndpointsTable.tsx`
- `src/pages/ResolverPage.tsx`
- `src/hooks/useResolveChain.ts`
- `backend/app/routers/audit.py`
- `backend/app/models/audit.py`
- `src/pages/AuditLogPage.tsx`
- `src/hooks/useAuditLog.ts`
- `e2e/tests/stats.spec.ts`
- `e2e/tests/resolver.spec.ts`
- `e2e/tests/audit.spec.ts`

---

### Task 1: Stabilize the live proxy path

**Files:**
- Modify: `backend/app/routers/proxy.py`
- Inspect: `backend/app/db/seed.py`
- Test: `backend/tests/test_proxy.py`
- Test: `e2e/tests/settings.spec.ts`

- [ ] **Step 1: Add a failing proxy regression test for one known-bad route**

```python
def test_proxy_forwards_authority_hints_path_verbatim(client, admin_headers, monkeypatch):
    called = {}

    class DummyResponse:
        status_code = 200
        headers = {"content-type": "application/json"}
        content = b"[]"

    async def fake_request(*, method, url, headers, content=None):
        called["method"] = method
        called["url"] = url
        return DummyResponse()

    monkeypatch.setattr("app.routers.proxy._get_client", lambda: type("C", (), {"request": fake_request})())

    resp = client.get(
        "/api/v1/proxy/ta-1/api/v1/admin/entity-configuration/authority-hints",
        headers=admin_headers,
    )

    assert resp.status_code == 200
    assert called["url"] == "http://lighthouse:8080/api/v1/admin/entity-configuration/authority-hints"
```

- [ ] **Step 2: Run the focused backend proxy tests**

Run:

```bash
cd /Users/alex.petrunin/federation-gateway/backend && pytest tests/test_proxy.py -q
```

Expected: either PASS for already-covered paths or FAIL on a newly added path assertion.

- [ ] **Step 3: Reproduce the current live proxy failures with curl**

Run:

```bash
TOKEN=$(curl -sS -X POST http://localhost:8765/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@oidfed.org","password":"admin123"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

curl -i http://localhost:8080/api/v1/proxy/ta-1/api/v1/admin/subordinates \
  -H "Authorization: Bearer $TOKEN"

curl -i http://localhost:8080/api/v1/proxy/ta-1/api/v1/admin/entity-configuration/authority-hints \
  -H "Authorization: Bearer $TOKEN"
```

Expected: reproduce the current `502` or confirm the endpoint contract mismatch precisely.

- [ ] **Step 4: Implement the smallest proxy or trust-anchor fix**

Start from the existing URL join:

```python
upstream_url = f"{instance['base_url']}/{path}"
```

If the failing route needs path normalization, introduce it here instead of changing generated clients:

```python
normalized_path = path.lstrip("/")
upstream_url = f"{instance['base_url']}/{normalized_path}"
```

If the real problem is the seeded upstream base URL shape, fix the seeded config in `backend/app/db/seed.py` instead.

- [ ] **Step 5: Re-run the focused backend proxy tests and the live curl proof**

Run:

```bash
cd /Users/alex.petrunin/federation-gateway/backend && pytest tests/test_proxy.py -q
```

and then the same curl commands from Step 3.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/proxy.py backend/tests/test_proxy.py backend/app/db/seed.py
git commit -m "fix: stabilize proxied Lighthouse admin routes"
```

---

### Task 2: Make capability discovery truthful

**Files:**
- Modify: `backend/app/routers/capabilities.py`
- Modify: `backend/app/db/rbac_seed.py`
- Modify: `src/contexts/CapabilityContext.tsx`
- Test: `backend/tests/test_capabilities.py`
- Test: `e2e/tests/settings.spec.ts`

- [ ] **Step 1: Add a failing backend test for an unsupported extension claim**

```python
def test_capabilities_do_not_claim_audit_logging_without_backend_support(client, admin_headers):
    resp = client.get("/api/v1/capabilities", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["extensions"]["audit_logging"] is False
```

- [ ] **Step 2: Run the focused capability test**

Run:

```bash
cd /Users/alex.petrunin/federation-gateway/backend && pytest tests/test_capabilities.py -q
```

Expected: FAIL because `audit_logging` is currently hardcoded `True`.

- [ ] **Step 3: Remove false-positive claims from the manifest**

In `backend/app/routers/capabilities.py`, change:

```python
extensions={
    "custom_metadata_fields": True,
    "webhook_notifications": False,
    "audit_logging": True,
    "bulk_operations": False,
}
```

to:

```python
extensions={
    "custom_metadata_fields": True,
    "webhook_notifications": False,
    "audit_logging": False,
    "bulk_operations": False,
}
```

- [ ] **Step 4: Stop showing all features when capability fetch fails**

In `src/contexts/CapabilityContext.tsx`, replace the current fallback-all-enabled manifest with a restrictive fallback:

```ts
const capabilities = manifest ?? null;
```

and only render capability-gated sections when the real manifest is present.

- [ ] **Step 5: Re-run the capability test and Settings e2e**

Run:

```bash
cd /Users/alex.petrunin/federation-gateway/backend && pytest tests/test_capabilities.py -q
cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/settings.spec.ts --project=full-stack
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/capabilities.py src/contexts/CapabilityContext.tsx backend/tests/test_capabilities.py
git commit -m "fix: make capability discovery reflect real support"
```

---

### Task 3: Normalize LightHouse empty-state contracts

**Files:**
- Modify: `src/hooks/useGeneralConstraints.ts`
- Modify: `src/hooks/useSubordinateConstraints.ts`
- Inspect: `src/hooks/useSubordinateMetadataPolicies.ts`
- Test: `e2e/tests/settings.spec.ts`
- Test: `e2e/tests/entity-detail.spec.ts`

- [ ] **Step 1: Add a failing e2e regression for general constraints**

Use the existing pattern in `e2e/tests/settings.spec.ts`:

```ts
test('Constraints tab does not issue a failing general constraints request', async ({ instancePage: page }) => {
  const failingResponses: Array<{ url: string; status: number }> = [];

  page.on('response', response => {
    if (
      response.url().includes('/api/v1/proxy/ta-1/api/v1/admin/subordinates/constraints') &&
      response.status() >= 400
    ) {
      failingResponses.push({ url: response.url(), status: response.status() });
    }
  });

  await page.goto(`${APP_URL}/settings`);
  await page.getByRole('tab', { name: /constraints/i }).click();
  await expect(page.getByRole('heading', { name: /max path length/i })).toBeVisible();
  expect(failingResponses).toEqual([]);
});
```

- [ ] **Step 2: Run the focused Settings regression**

Run:

```bash
cd /Users/alex.petrunin/federation-gateway/e2e && APP_URL=http://localhost:8080 npx playwright test tests/settings.spec.ts --project=full-stack --grep "Constraints tab does not issue a failing general constraints request"
```

Expected: FAIL with captured `404` responses.

- [ ] **Step 3: Normalize `404` to empty state in the query hook**

In `src/hooks/useGeneralConstraints.ts`, change:

```ts
queryFn: () => GeneralConstraintsService.getGeneralConstraints(),
```

to:

```ts
queryFn: async () => {
  try {
    return await GeneralConstraintsService.getGeneralConstraints();
  } catch (err: any) {
    if (err?.status === 404) return {};
    throw err;
  }
},
```

- [ ] **Step 4: Mirror the same rule for subordinate constraints if LightHouse uses the same contract there**

If live calls show subordinate constraints behave the same way, apply:

```ts
queryFn: async () => {
  try {
    return await SubordinateConstraintsService.getSubordinateConstraints(idNum);
  } catch (err: any) {
    if (err?.status === 404) return {};
    throw err;
  }
},
```

- [ ] **Step 5: Re-run focused e2e checks**

Run:

```bash
cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/settings.spec.ts --project=full-stack
cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/entity-detail.spec.ts --project=full-stack
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useGeneralConstraints.ts src/hooks/useSubordinateConstraints.ts e2e/tests/settings.spec.ts e2e/tests/entity-detail.spec.ts
git commit -m "fix: normalize empty LightHouse constraints responses"
```

---

### Task 4: Add Statistics to the integrated stack

**Files:**
- Modify: `lighthouse/config.yaml`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/App.tsx`
- Create: `src/hooks/useStats.ts`
- Create: `src/components/stats/StatsSummaryCards.tsx`
- Create: `src/components/stats/StatsTimeseriesChart.tsx`
- Create: `src/components/stats/StatsTopEndpointsTable.tsx`
- Test: `e2e/tests/stats.spec.ts`

- [ ] **Step 1: Enable LightHouse stats in config**

Add:

```yaml
stats:
  enabled: true
```

to `lighthouse/config.yaml`.

- [ ] **Step 2: Write a failing Playwright test for the stats surface**

```ts
test('statistics tab shows summary cards', async ({ instancePage: page }) => {
  await page.goto(`${APP_URL}/dashboard`);
  await page.getByRole('tab', { name: /statistics/i }).click();
  await expect(page.getByText(/total requests/i)).toBeVisible();
  await expect(page.getByText(/error rate/i)).toBeVisible();
});
```

- [ ] **Step 3: Run the failing stats test**

Run:

```bash
cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/stats.spec.ts --project=full-stack
```

- [ ] **Step 4: Implement the hook and dashboard UI**

Create `src/hooks/useStats.ts` with:

```ts
export function useStatsQuery(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ['stats', path, qs],
    queryFn: async () => {
      const res = await fetch(`/api/v1/proxy/ta-1/stats/${path}?${qs}`);
      if (!res.ok) throw new Error(`Stats request failed: ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
```

- [ ] **Step 5: Rebuild the stack and rerun the stats test**

Run:

```bash
cd /Users/alex.petrunin/federation-gateway && docker compose up -d --build ui lighthouse
cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/stats.spec.ts --project=full-stack
```

- [ ] **Step 6: Commit**

```bash
git add lighthouse/config.yaml src/pages/DashboardPage.tsx src/hooks/useStats.ts src/components/stats e2e/tests/stats.spec.ts
git commit -m "feat: add Lighthouse statistics integration"
```

---

### Task 5: Add the trust-chain resolver

**Files:**
- Modify: `backend/app/routers/resolve.py`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/AppSidebar.tsx`
- Create: `src/pages/ResolverPage.tsx`
- Create: `src/hooks/useResolveChain.ts`
- Test: `e2e/tests/resolver.spec.ts`

- [ ] **Step 1: Add a failing e2e test for the Resolver page**

```ts
test('resolver page loads and accepts a subject entity id', async ({ instancePage: page }) => {
  await page.goto(`${APP_URL}/resolver`);
  await expect(page.getByRole('button', { name: /resolve/i })).toBeVisible();
  await page.getByLabel(/subject entity id/i).fill('https://example.org');
});
```

- [ ] **Step 2: Run the failing resolver test**

Run:

```bash
cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/resolver.spec.ts --project=full-stack
```

- [ ] **Step 3: Add the BFF resolver proxy endpoint**

Extend `backend/app/routers/resolve.py` with:

```python
@router.get("/api/v1/resolve/chain")
async def resolve_chain(sub: str, anchor: str | None = None, type: str | None = None):
    ...
```

Use `httpx` to fetch LightHouse `/resolve`, decode the JWT payload, and return JSON.

- [ ] **Step 4: Add the UI route, sidebar entry, hook, and page**

Wire:

```tsx
<Route path="/resolver" element={<ResolverPage />} />
```

and sidebar entry:

```ts
{ title: 'Resolver', href: '/resolver', icon: Network }
```

- [ ] **Step 5: Re-run the resolver e2e**

Run:

```bash
cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/resolver.spec.ts --project=full-stack
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/resolve.py src/App.tsx src/components/layout/AppSidebar.tsx src/pages/ResolverPage.tsx src/hooks/useResolveChain.ts e2e/tests/resolver.spec.ts
git commit -m "feat: add trust chain resolver tool"
```

---

### Task 6: Add real audit logging

**Files:**
- Create: `backend/app/models/audit.py`
- Create: `backend/app/routers/audit.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/routers/capabilities.py`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/AppSidebar.tsx`
- Create: `src/pages/AuditLogPage.tsx`
- Create: `src/hooks/useAuditLog.ts`
- Test: `e2e/tests/audit.spec.ts`

- [ ] **Step 1: Add a failing backend capability test**

```python
def test_capabilities_advertise_audit_logging_only_after_endpoint_exists(client, admin_headers):
    resp = client.get("/api/v1/capabilities", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["extensions"]["audit_logging"] is False
```

- [ ] **Step 2: Add a failing e2e audit test**

```ts
test('audit page shows a log row after a mutating entity action', async ({ instancePage: page }) => {
  await page.goto(`${APP_URL}/audit`);
  await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible();
});
```

- [ ] **Step 3: Implement the audit model and router**

Create `backend/app/models/audit.py` with:

```python
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    actor = Column(String, index=True)
    action = Column(String, index=True)
    resource_type = Column(String)
    resource_id = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
```

- [ ] **Step 4: Wire audit writes into the FastAPI app**

Register middleware in `backend/app/main.py`:

```python
app.add_middleware(AuditMiddleware)
```

and expose:

```python
app.include_router(audit.router)
```

- [ ] **Step 5: Add the page, route, sidebar item, and hook**

Wire:

```tsx
<Route path="/audit" element={<AuditLogPage />} />
```

and sidebar entry:

```ts
{ title: 'Audit Log', href: '/audit', icon: ClipboardCheck, adminOnly: true }
```

- [ ] **Step 6: Re-run backend and e2e audit checks**

Run:

```bash
cd /Users/alex.petrunin/federation-gateway/backend && pytest tests/test_capabilities.py -q
cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/audit.spec.ts --project=full-stack
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/audit.py backend/app/routers/audit.py backend/app/main.py backend/app/routers/capabilities.py src/App.tsx src/components/layout/AppSidebar.tsx src/pages/AuditLogPage.tsx src/hooks/useAuditLog.ts e2e/tests/audit.spec.ts
git commit -m "feat: add audit logging and viewer"
```

---

### Task 7: Run the full integration proof

**Files:**
- Validate: `docker-compose.yml`
- Validate: `lighthouse/config.yaml`
- Validate: `backend/app/routers/*.py`
- Validate: `src/**/*.tsx`
- Test: `e2e/tests/*.ts`

- [ ] **Step 1: Rebuild the live stack**

```bash
cd /Users/alex.petrunin/federation-gateway && docker compose up -d --build
```

- [ ] **Step 2: Run the full-stack e2e suite**

```bash
cd /Users/alex.petrunin/federation-gateway/e2e && npm run test:full
```

- [ ] **Step 3: Run the frontend production build**

```bash
cd /Users/alex.petrunin/federation-gateway && npm run build
```

- [ ] **Step 4: Run backend tests**

```bash
cd /Users/alex.petrunin/federation-gateway/backend && pytest -q
```

- [ ] **Step 5: Commit the final integration batch**

```bash
git add backend src lighthouse e2e docker-compose.yml
git commit -m "feat: complete full Lighthouse integration tracks"
```
