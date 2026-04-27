# Deployment and Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded single-instance topology with a config-driven multi-instance registry that supports separate public/admin endpoints, backend-only admin credentials, and explicit instance selection in the UI.

**Architecture:** Introduce a typed backend deployment-config loader that reads a mounted YAML file plus environment-variable overrides, normalize that data into a sanitized instance registry for the UI, and drive proxy routing from the selected instance's admin endpoint. Keep the current trust-anchor-shaped UI working by returning deployment-managed instances through a dedicated backend route and removing the current silent first-instance auto-selection behavior.

**Tech Stack:** FastAPI, Pydantic, PyYAML, SQLAlchemy, httpx, React, TypeScript, TanStack Query, Playwright, Docker Compose

---

## File map

### Existing files to modify

- `backend/app/main.py` — load deployment config at startup, attach the registry to app state, and register the new instances router
- `backend/app/db/seed.py` — seed only users and sync deployment-managed instances from config instead of hardcoding `ta-1`
- `backend/app/routers/proxy.py` — resolve the selected instance from the backend registry and attach admin basic auth server-side
- `backend/app/routers/trust_anchors.py` — stop treating deployment-managed endpoint wiring as editable UI state
- `backend/app/schemas/trust_anchor.py` — expose only safe instance metadata to the frontend
- `backend/Dockerfile` — copy mounted/default gateway config into the backend image layout
- `docker-compose.yml` — make UI/backend/LightHouse ports configurable and mount the gateway config file
- `src/components/layout/BackendSwitcher.tsx` — remove implicit first-instance selection and show explicit selection/empty state
- `src/contexts/TrustAnchorContext.tsx` — persist only the selected instance ID and handle invalidated selections cleanly
- `src/hooks/useGatewayTrustAnchors.ts` — map the backend deployment-managed flag into the existing trust-anchor display model
- `src/lib/api-config.ts` — keep generated client routing keyed by the explicit selected instance
- `src/pages/TrustAnchorsPage.tsx` — mark deployment-managed instances read-only in the registry UI
- `src/pages/SettingsPage.tsx` — keep the existing no-instance placeholder path working with the new explicit selection flow
- `e2e/fixtures/index.ts` — stop assuming “LightHouse” auto-selects itself after login
- `e2e/tests/settings.spec.ts` — update settings flows to explicitly select an instance before hitting instance-scoped tabs
- `README.md` — document the new config file, env overrides, and non-default port deployment flow

### New files to create

- `backend/app/config/deployment.py` — typed loader for `gateway.yaml` plus env overrides
- `backend/app/routers/instances.py` — sanitized instance-registry API for the frontend
- `backend/app/schemas/instance.py` — response models for safe instance metadata
- `backend/tests/test_deployment_config.py` — parser/override validation
- `backend/tests/test_instances.py` — sanitized registry API coverage
- `backend/config/gateway.yaml` — default local config describing UI, backend, and LightHouse instance wiring
- `src/hooks/useInstances.ts` — frontend query hook for the sanitized instance registry
- `e2e/tests/instance-selection.spec.ts` — regression coverage for the no-auto-linking flow

---

### Task 1: Add the typed deployment-config loader

**Files:**
- Create: `backend/app/config/deployment.py`
- Create: `backend/tests/test_deployment_config.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Write the failing config-loader tests**

```python
from pathlib import Path

from app.config.deployment import load_deployment_config


def test_load_deployment_config_reads_yaml_and_env_overrides(monkeypatch, tmp_path: Path):
    config_file = tmp_path / "gateway.yaml"
    config_file.write_text(
        """
ui:
  public_base_url: http://localhost:8080
backend:
  public_base_url: http://localhost:8765
instances:
  - id: ta-1
    name: LightHouse
    public_base_url: http://localhost:8081
    admin_base_url: http://lighthouse:8080
    admin_auth:
      type: basic
      username_env: LIGHTHOUSE_ADMIN_USERNAME
      password_env: LIGHTHOUSE_ADMIN_PASSWORD
""".strip()
    )
    monkeypatch.setenv("LIGHTHOUSE_ADMIN_USERNAME", "gateway")
    monkeypatch.setenv("LIGHTHOUSE_ADMIN_PASSWORD", "secret")

    cfg = load_deployment_config(config_file)

    assert cfg.instances[0].id == "ta-1"
    assert cfg.instances[0].admin_auth.username == "gateway"
    assert cfg.instances[0].admin_auth.password == "secret"


def test_load_deployment_config_rejects_duplicate_instance_ids(tmp_path: Path):
    config_file = tmp_path / "gateway.yaml"
    config_file.write_text(
        """
instances:
  - id: ta-1
    name: A
    public_base_url: http://localhost:8081
    admin_base_url: http://lighthouse:8080
  - id: ta-1
    name: B
    public_base_url: http://localhost:8082
    admin_base_url: http://lighthouse2:8080
""".strip()
    )

    try:
        load_deployment_config(config_file)
    except ValueError as exc:
        assert "duplicate instance id" in str(exc).lower()
    else:
        raise AssertionError("expected duplicate IDs to raise")
```

- [ ] **Step 2: Run the focused backend tests to verify they fail**

Run: `cd /Users/alex.petrunin/federation-gateway/backend && pytest tests/test_deployment_config.py -q`

Expected: FAIL with `ModuleNotFoundError` for `app.config.deployment` or missing `load_deployment_config`.

- [ ] **Step 3: Implement the typed loader**

```python
from pathlib import Path

import os
import yaml
from pydantic import BaseModel, Field, HttpUrl, model_validator


class BasicAuthConfig(BaseModel):
    type: str = "basic"
    username: str
    password: str


class RawBasicAuthConfig(BaseModel):
    type: str = "basic"
    username_env: str
    password_env: str

    def resolve(self) -> BasicAuthConfig:
        return BasicAuthConfig(
            username=os.environ[self.username_env],
            password=os.environ[self.password_env],
        )


class InstanceConfig(BaseModel):
    id: str
    name: str
    public_base_url: HttpUrl
    admin_base_url: HttpUrl
    public_port: int | None = None
    admin_port: int | None = None
    admin_auth: BasicAuthConfig | None = None


class DeploymentConfig(BaseModel):
    ui_public_base_url: HttpUrl | None = None
    backend_public_base_url: HttpUrl | None = None
    instances: list[InstanceConfig] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_unique_ids(self) -> "DeploymentConfig":
        ids = [instance.id for instance in self.instances]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate instance id in deployment config")
        return self


def load_deployment_config(path: Path) -> DeploymentConfig:
    raw = yaml.safe_load(path.read_text()) or {}
    instances: list[dict] = []
    for item in raw.get("instances", []):
        auth = item.get("admin_auth")
        if auth and auth.get("type", "basic") == "basic" and "username_env" in auth:
            item = {
                **item,
                "admin_auth": RawBasicAuthConfig.model_validate(auth).resolve().model_dump(),
            }
        instances.append(item)

    return DeploymentConfig.model_validate(
        {
            "ui_public_base_url": raw.get("ui", {}).get("public_base_url"),
            "backend_public_base_url": raw.get("backend", {}).get("public_base_url"),
            "instances": instances,
        }
    )
```

- [ ] **Step 4: Re-run the focused backend tests**

Run: `cd /Users/alex.petrunin/federation-gateway/backend && pytest tests/test_deployment_config.py -q`

Expected: PASS with 2 tests passed.

- [ ] **Step 5: Commit the loader**

```bash
git add backend/app/config/deployment.py backend/tests/test_deployment_config.py backend/requirements.txt
git commit -m "feat: add typed deployment config loader"
```

---

### Task 2: Expose a sanitized backend instance registry and sync it from config

**Files:**
- Create: `backend/app/routers/instances.py`
- Create: `backend/app/schemas/instance.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/db/seed.py`
- Modify: `backend/app/routers/trust_anchors.py`
- Modify: `backend/app/schemas/trust_anchor.py`
- Create: `backend/tests/test_instances.py`

- [ ] **Step 1: Write the failing registry-route tests**

```python
def test_instances_route_returns_sanitized_registry(client, admin_headers):
    resp = client.get("/api/v1/admin/instances", headers=admin_headers)

    assert resp.status_code == 200
    body = resp.json()
    assert body["instances"][0]["id"] == "ta-1"
    assert body["instances"][0]["admin_base_url"] == "http://lighthouse:8080"
    assert "admin_auth" not in body["instances"][0]
    assert body["instances"][0]["deployment_managed"] is True
    assert body["instances"][0]["selected_by_default"] is False


def test_instances_route_is_empty_when_no_instances_configured(client, admin_headers, monkeypatch):
    monkeypatch.setattr("app.routers.instances.get_instance_registry", lambda request: [])

    resp = client.get("/api/v1/admin/instances", headers=admin_headers)

    assert resp.status_code == 200
    assert resp.json() == {"instances": []}
```

- [ ] **Step 2: Run the focused backend tests to verify they fail**

Run: `cd /Users/alex.petrunin/federation-gateway/backend && pytest tests/test_instances.py -q`

Expected: FAIL with `404` for `/api/v1/admin/instances` or import errors for the new schema/router.

- [ ] **Step 3: Implement the sanitized registry and startup sync**

```python
from fastapi import APIRouter, Request
from pydantic import BaseModel


class InstanceSummary(BaseModel):
    id: str
    name: str
    public_base_url: str
    admin_base_url: str
    public_port: int | None = None
    admin_port: int | None = None
    deployment_managed: bool = True
    selected_by_default: bool = False


class InstanceRegistryResponse(BaseModel):
    instances: list[InstanceSummary]


router = APIRouter(prefix="/api/v1/admin/instances", tags=["instances"])


def get_instance_registry(request: Request):
    return request.app.state.instance_registry.instances


@router.get("", response_model=InstanceRegistryResponse)
def list_instances(request: Request):
    instances = [
        InstanceSummary(
            id=item.id,
            name=item.name,
            public_base_url=str(item.public_base_url),
            admin_base_url=str(item.admin_base_url),
            public_port=item.public_port,
            admin_port=item.admin_port,
            deployment_managed=True,
            selected_by_default=False,
        )
        for item in get_instance_registry(request)
    ]
    return InstanceRegistryResponse(instances=instances)
```

```python
def seed_data(instance_config: DeploymentConfig | None = None):
    db: Session = SessionLocal()
    try:
        if db.query(User).count() == 0:
            db.add_all([admin, user])
            db.commit()

        if instance_config is None:
            return

        for item in instance_config.instances:
            anchor = db.query(TrustAnchor).filter(TrustAnchor.id == item.id).first()
            payload = json.dumps(
                {
                    "public_base_url": str(item.public_base_url),
                    "admin_api_base_url": str(item.admin_base_url),
                    "public_port": item.public_port,
                    "admin_port": item.admin_port,
                }
            )
            if anchor is None:
                db.add(
                    TrustAnchor(
                        id=item.id,
                        name=item.name,
                        entity_id=str(item.public_base_url),
                        description=f"Deployment-managed instance {item.name}",
                        type="federation",
                        status="active",
                        subordinate_count=0,
                        config_json=payload,
                    )
                )
            else:
                anchor.name = item.name
                anchor.entity_id = str(item.public_base_url)
                anchor.config_json = payload
        db.commit()
    finally:
        db.close()
```

```python
class TrustAnchorResponse(BaseModel):
    id: str
    name: str
    entity_id: str
    description: str | None = None
    type: str
    status: str
    subordinate_count: int = 0
    admin_api_base_url: str | None = None
    deployment_managed: bool = False
```

```python
result.append(
    TrustAnchorResponse(
        id=a.id,
        name=a.name,
        entity_id=a.entity_id,
        description=a.description,
        type=a.type,
        status=a.status,
        subordinate_count=0,
        admin_api_base_url=cfg.get("admin_api_base_url"),
        deployment_managed=True,
    )
)
```

- [ ] **Step 4: Wire the loader into `main.py`**

```python
from pathlib import Path

from app.config.deployment import load_deployment_config
from app.routers import instances


CONFIG_PATH = Path("/config/gateway.yaml")
deployment_config = load_deployment_config(CONFIG_PATH)
app.state.instance_registry = deployment_config

seed_data(deployment_config)
app.include_router(instances.router)
```

- [ ] **Step 5: Re-run the focused backend tests**

Run: `cd /Users/alex.petrunin/federation-gateway/backend && pytest tests/test_deployment_config.py tests/test_instances.py -q`

Expected: PASS with the new registry route returning sanitized data, `deployment_managed: true`, and no `admin_auth` fields.

- [ ] **Step 6: Commit the backend registry**

```bash
git add backend/app/main.py backend/app/db/seed.py backend/app/routers/instances.py backend/app/routers/trust_anchors.py backend/app/schemas/instance.py backend/app/schemas/trust_anchor.py backend/tests/test_instances.py
git commit -m "feat: expose sanitized deployment instance registry"
```

---

### Task 3: Route proxy calls through admin endpoints with backend-only auth

**Files:**
- Modify: `backend/app/routers/proxy.py`
- Modify: `backend/tests/test_proxy.py`

- [ ] **Step 1: Add failing proxy coverage for admin basic auth and registry-backed lookup**

```python
def test_proxy_uses_registry_admin_endpoint(client, admin_headers, monkeypatch):
    called = {}

    class DummyResponse:
        status_code = 200
        headers = {"content-type": "application/json"}
        content = b"[]"

    async def fake_request(*, method, url, headers, content=None):
        called["method"] = method
        called["url"] = url
        called["authorization"] = headers.get("Authorization")
        return DummyResponse()

    monkeypatch.setattr("app.routers.proxy._get_client", lambda: type("C", (), {"request": fake_request})())

    resp = client.get(
        "/api/v1/proxy/ta-1/api/v1/admin/subordinates",
        headers=admin_headers,
    )

    assert resp.status_code == 200
    assert called["url"] == "http://lighthouse:8080/api/v1/admin/subordinates"
    assert called["authorization"].startswith("Basic ")
```

- [ ] **Step 2: Run the focused proxy tests**

Run: `cd /Users/alex.petrunin/federation-gateway/backend && pytest tests/test_proxy.py -q`

Expected: FAIL because `_resolve_instance` still reads only the DB row and does not attach registry-backed basic auth credentials.

- [ ] **Step 3: Update `_resolve_instance` and auth injection**

```python
import base64


def _resolve_instance(instance_id: str, request: Request, db: Session) -> dict:
    registry = request.app.state.instance_registry
    match = next((item for item in registry.instances if item.id == instance_id), None)
    if match is None:
        raise HTTPException(status_code=404, detail=f"Instance '{instance_id}' not found in the registry")

    anchor = db.query(TrustAnchor).filter(TrustAnchor.id == instance_id).first()
    name = anchor.name if anchor else match.name
    basic_credentials = None
    if match.admin_auth is not None:
        raw = f"{match.admin_auth.username}:{match.admin_auth.password}".encode()
        basic_credentials = base64.b64encode(raw).decode()

    return {
        "base_url": str(match.admin_base_url).rstrip("/"),
        "basic_credentials": basic_credentials,
        "name": name,
    }
```

```python
async def proxy(
    instance_id: str,
    path: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    instance = _resolve_instance(instance_id, request, db)
    upstream_url = f"{instance['base_url']}/{path.lstrip('/')}"
```

- [ ] **Step 4: Re-run the focused proxy tests**

Run: `cd /Users/alex.petrunin/federation-gateway/backend && pytest tests/test_proxy.py -q`

Expected: PASS with the proxy resolving `admin_base_url` from the registry and attaching `Authorization: Basic …` only on the server side.

- [ ] **Step 5: Commit the proxy changes**

```bash
git add backend/app/routers/proxy.py backend/tests/test_proxy.py
git commit -m "feat: proxy deployment-managed admin endpoints"
```

---

### Task 4: Remove auto-linking and make instance selection explicit in the UI

**Files:**
- Create: `src/hooks/useInstances.ts`
- Modify: `src/components/layout/BackendSwitcher.tsx`
- Modify: `src/contexts/TrustAnchorContext.tsx`
- Modify: `src/hooks/useGatewayTrustAnchors.ts`
- Modify: `src/lib/api-config.ts`
- Modify: `src/pages/TrustAnchorsPage.tsx`
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Add the frontend registry hook**

```ts
import { useQuery } from '@tanstack/react-query';
import { gatewayFetch } from '@/lib/gateway-fetch';

export interface DeploymentInstance {
  id: string;
  name: string;
  public_base_url: string;
  admin_base_url: string;
  public_port?: number;
  admin_port?: number;
  deployment_managed: boolean;
  selected_by_default: boolean;
}

export function useInstances() {
  return useQuery({
    queryKey: ['gateway', 'instances'],
    queryFn: () =>
      gatewayFetch<{ instances: DeploymentInstance[] }>({
        path: '/api/v1/admin/instances',
      }),
    select: (data) => data.instances,
  });
}
```

```ts
export interface TrustAnchorDisplay {
  id: string;
  entityId: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  subordinateCount?: number;
  adminApiBaseUrl?: string;
  deploymentManaged?: boolean;
}

function toDisplay(ta: any): TrustAnchorDisplay {
  return {
    id: ta.id,
    entityId: ta.entity_id ?? ta.entityId,
    name: ta.name,
    type: ta.type,
    status: ta.status,
    description: ta.description,
    subordinateCount: ta.subordinate_count ?? ta.subordinateCount,
    adminApiBaseUrl: ta.admin_api_base_url ?? ta.adminApiBaseUrl,
    deploymentManaged: ta.deployment_managed ?? ta.deploymentManaged ?? false,
  };
}
```

- [ ] **Step 2: Write the minimal explicit-selection context change**

```tsx
const STORAGE_KEY = 'selected_instance_id';

const [activeTrustAnchor, setActiveTrustAnchorState] = useState<TrustAnchorDisplay | null>(null);

useEffect(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  setActiveInstance(stored || null);
}, []);

const setActiveTrustAnchor = useCallback((ta: TrustAnchorDisplay | null) => {
  const nextId = ta?.id ?? null;
  setActiveTrustAnchorState(ta);
  setActiveInstance(nextId);
  if (nextId) {
    localStorage.setItem(STORAGE_KEY, nextId);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  queryClient.cancelQueries();
  queryClient.invalidateQueries();
}, [queryClient]);
```

- [ ] **Step 3: Replace the silent first-instance auto-selection**

```tsx
const { data: instances = [] } = useInstances();

useEffect(() => {
  const matched = trustAnchors.find((ta) => ta.id === getActiveInstanceId());
  if (matched) {
    setActiveTrustAnchor(matched);
    return;
  }
  setActiveTrustAnchor(null);
}, [trustAnchors, setActiveTrustAnchor]);

const selectedLabel = activeTrustAnchor?.name ?? 'Select instance';
```

```tsx
{taBackends.length === 0 && (
  <DropdownMenuItem disabled>
    <span className="text-xs text-muted-foreground">No instances configured</span>
  </DropdownMenuItem>
)}
{taBackends.map((backend) => (
  <DropdownMenuItem
    key={backend.id}
    onClick={() => {
      setSelectedBackend(backend.id);
      const match = trustAnchors.find((ta) => `ta:${ta.id}` === backend.id) ?? null;
      setActiveTrustAnchor(match);
    }}
  >
```

- [ ] **Step 4: Keep pages safe when nothing is selected**

```tsx
function NoInstanceCard() {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        Choose a configured instance from the sidebar before editing instance-scoped settings.
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Hide deployment-managed endpoint editing in the trust-anchor page**

```tsx
<TrustAnchorCard
  ta={ta}
  isLocal
  isActive={activeTrustAnchor?.id === ta.id}
  onConfigure={ta.deploymentManaged ? undefined : handleConfigure}
  onDelete={ta.deploymentManaged ? undefined : handleDelete}
/>
```

```tsx
{ta.deploymentManaged && (
  <span className="entity-badge bg-muted/50 text-muted-foreground border-muted">
    Deployment managed
  </span>
)}
```

- [ ] **Step 6: Build the UI**

Run: `cd /Users/alex.petrunin/federation-gateway && npm run build`

Expected: PASS with TypeScript accepting the new hook and explicit-selection flow.

- [ ] **Step 7: Commit the frontend selection flow**

```bash
git add src/hooks/useInstances.ts src/hooks/useGatewayTrustAnchors.ts src/components/layout/BackendSwitcher.tsx src/contexts/TrustAnchorContext.tsx src/lib/api-config.ts src/pages/TrustAnchorsPage.tsx src/pages/SettingsPage.tsx
git commit -m "feat: require explicit instance selection"
```

---

### Task 5: Wire deployment files, docs, and end-to-end coverage

**Files:**
- Create: `backend/config/gateway.yaml`
- Modify: `backend/Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `README.md`
- Modify: `e2e/fixtures/index.ts`
- Modify: `e2e/tests/settings.spec.ts`
- Create: `e2e/tests/instance-selection.spec.ts`

- [ ] **Step 1: Add a default local deployment config file**

```yaml
ui:
  public_base_url: http://localhost:8080
backend:
  public_base_url: http://localhost:8765
instances:
  - id: ta-1
    name: LightHouse
    public_base_url: http://localhost:8081
    admin_base_url: http://lighthouse:8080
    public_port: 8081
    admin_port: 8080
    admin_auth:
      type: basic
      username_env: LIGHTHOUSE_ADMIN_USERNAME
      password_env: LIGHTHOUSE_ADMIN_PASSWORD
```

- [ ] **Step 2: Mount the config and make ports configurable**

```yaml
services:
  backend:
    environment:
      GATEWAY_CONFIG_FILE: /config/gateway.yaml
      LIGHTHOUSE_ADMIN_USERNAME: ${LIGHTHOUSE_ADMIN_USERNAME:-gateway}
      LIGHTHOUSE_ADMIN_PASSWORD: ${LIGHTHOUSE_ADMIN_PASSWORD:-gateway}
    volumes:
      - ./backend/config:/config:ro
    ports:
      - "${BACKEND_PORT:-8765}:8765"

  ui:
    ports:
      - "${UI_PORT:-8080}:80"

  lighthouse:
    ports:
      - "${LIGHTHOUSE_PUBLIC_PORT:-8081}:8080"
```

- [ ] **Step 3: Update the Playwright fixture to select an instance explicitly**

```ts
async function selectInstance(page: Page, name = 'LightHouse') {
  await page.goto(`${APP_URL}/dashboard`);
  await page.getByRole('button', { name: /select instance|lighthouse/i }).click();
  await page.getByRole('menuitem', { name: new RegExp(name, 'i') }).click();
  await expect(page.getByRole('button', { name: new RegExp(name, 'i') })).toBeVisible();
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await loginAsAdmin(page);
    await use(page);
  },
  instancePage: async ({ authenticatedPage: page }, use) => {
    await selectInstance(page);
    await use(page);
  },
});
```

- [ ] **Step 4: Add a no-auto-link regression test**

```ts
test('dashboard starts with no active instance selected @proxy', async ({ authenticatedPage: page }) => {
  await page.goto(`${APP_URL}/dashboard`);
  await expect(page.getByRole('button', { name: /select instance/i })).toBeVisible();
});
```

- [ ] **Step 5: Run the repo verification commands**

Run:

```bash
cd /Users/alex.petrunin/federation-gateway/backend && pytest tests/test_deployment_config.py tests/test_instances.py tests/test_proxy.py -q
cd /Users/alex.petrunin/federation-gateway && npm run build
cd /Users/alex.petrunin/federation-gateway/e2e && npx playwright test tests/instance-selection.spec.ts tests/settings.spec.ts
```

Expected:

- backend pytest: PASS
- `npm run build`: PASS
- Playwright: PASS with settings tests selecting an instance explicitly and the new no-auto-link test proving the first instance is not auto-selected

- [ ] **Step 6: Commit the deployment wiring**

```bash
git add backend/config/gateway.yaml backend/Dockerfile docker-compose.yml README.md e2e/fixtures/index.ts e2e/tests/settings.spec.ts e2e/tests/instance-selection.spec.ts
git commit -m "feat: wire deployment-managed instance configuration"
```
