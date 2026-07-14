# System Architecture

## Overview

The Federation Gateway Admin UI is a **backend-agnostic** web-based interface for managing OpenID Federation entities, subordinates, trust marks, and trust anchors.

### Core Design Principle

The UI is designed to work with **any** OpenID Federation Admin API implementation that adheres to the OpenAPI specification (`Federation Admin OpenAPI.yaml`). This means:

- **The UI is the product** - a universal frontend for OIDFed management
- **The OpenAPI spec is the contract** - any backend implementing it can plug in
- **Multiple backend implementations are expected** - organizations can choose/build their own (Python, Go, Java, .NET, etc.)
- **The FastAPI backend in this repo is a reference implementation and gateway (BFF)** - it isn't a mock; it's a real service that proxies to a real federation node (LightHouse) and owns its own concerns (auth, RBAC, audit, instance registry)

This architecture enables vendor-neutral deployment: NRENs can use this UI with their existing infrastructure while maintaining a consistent operator experience.

## System Components

### 1. React UI (`src/`)

**Purpose**: Operator-facing web interface for federation management

**Technology Stack**:
- React 18 with TypeScript
- Vite (development server & build tool)
- TanStack Query (React Query) for server state management
- Tailwind CSS + shadcn/ui components

**Port**: 8080 (served by nginx in Docker; 5173 via Vite for local dev)

**Key Features**:
- Entity (subordinate) registration, approval, and lifecycle management
- Trust mark issuance, self-publication, and live verification against real issuers
- Trust chain inspection — both against this instance's own subordinates and against *any* real entity on the internet
- Multi-instance switching (the UI can point at more than one federation node)
- RBAC-gated actions throughout (`useOperationAllowed` hooks hide/disable UI for users without permission)

**Structure**:
```
src/
├── client/          # Auto-generated API client from OpenAPI spec
├── components/      # Reusable UI components
├── contexts/        # React contexts (Auth, TrustAnchor, Capability)
├── hooks/           # Custom React hooks for data fetching
├── pages/           # Page-level components
└── lib/             # api-config (per-instance proxy base URL), jwt-utils, etc.
```

### 2. Backend / Gateway (`backend/`) — a real BFF, not a mock

**Purpose**: Authenticates operators, enforces RBAC, and **transparently proxies** every instance-scoped admin request to the real federation node's Admin API — the browser never talks to LightHouse directly and never sees its credentials.

```
Browser → nginx (UI, :8080) → FastAPI backend (:8765) → LightHouse Admin API (:8080, internal)
```

The backend owns exactly four concerns of its own; everything about entities, subordinates, and trust marks lives in the connected LightHouse instance, not in the backend's database:

1. **Auth** — local JWT login (`backend/app/routers/auth.py`)
2. **RBAC** — roles, permissions, and per-feature enable/disable, seeded from the OpenAPI spec (`backend/app/routers/rbac.py`, `backend/app/db/rbac_seed.py`)
3. **Instance registry** — which federation nodes exist and how to reach them, sourced from `backend/config/gateway.yaml` (`backend/app/routers/instances.py`, `trust_anchors.py`)
4. **Audit log** — every mutating proxied request, with the *response* body captured (redacted) as `details` (`backend/app/routers/proxy.py`, `backend/app/utils/audit.py`)

Plus two narrow, SSRF-guarded helper endpoints (`backend/app/routers/resolve.py`) that fetch arbitrary *external* entity data on the browser's behalf — real federation hosts generally don't set CORS headers, so the browser can't call them directly:
- `GET /api/v1/admin/resolve?entity_id=` — fetch any entity's own `.well-known/openid-federation`
- `GET /api/v1/admin/trust-mark-status?...` — ask a mark's issuer whether it's still active (tries both known wire contracts — see `KNOWN-ISSUES.md`)

**Reference Implementation Stack**:
- FastAPI (Python), SQLAlchemy (ORM), SQLite (`backend/data/backend.db`, bind-mounted so it survives container rebuilds), python-jose (JWT), bcrypt

**Status**: Functionally complete for the current feature set — subordinates, trust marks (types/owners/issuers/issuance/self-publication/verification), chain inspection, stats, audit log, RBAC, all exercised end to end by the Playwright suite.

### 3. LightHouse — the real federation node

**Purpose**: The actual OpenID Federation Trust Anchor / Intermediate Authority implementation. This is where subordinate, trust-mark, and entity-statement data actually lives — the FastAPI backend never persists it.

`docker-compose.yml` runs **two** LightHouse instances out of the box (`ta-1` on `:8081`, `ta-2` on `:8082`) so multi-instance behavior is exercisable immediately, not just theoretical. Each has its own bind-mounted `data/` directory for its SQLite store and generated signing keys.

## Current Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                            Browser                                │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                    React Application                       │   │
│  │  UI Components → React Query → Auto-generated API Client   │   │
│  └──────────────────────────┬────────────────────────────────┘   │
└─────────────────────────────┼─────────────────────────────────────┘
                               │  HTTPS/HTTP
                               ▼
                  ┌────────────────────────┐
                  │   nginx (UI, :8080)    │
                  │  serves the SPA build   │
                  └───────────┬─────────────┘
                               │  /api/* proxied
                               ▼
                  ┌─────────────────────────────────┐
                  │   FastAPI Backend (BFF, :8765)   │
                  │  auth · RBAC · instance registry │
                  │  · audit (response capture,      │
                  │    redacted) · SSRF-guarded       │
                  │    external-entity helpers        │
                  └──────┬─────────────────┬──────────┘
                         │                 │
              instance-scoped        backend's own
              requests proxied       SQLite (users,
              verbatim, basic        roles/permissions,
              auth injected          audit_logs,
              server-side            trust_anchors registry)
                         │
                         ▼
       ┌─────────────────────────────────────┐
       │   LightHouse (:8081) — ta-1          │
       │   LightHouse 2 (:8082) — ta-2        │
       │   real OIDFed Trust Anchors           │
       │   own SQLite + signing keys per node  │
       └─────────────────────────────────────┘
```

## Data Flow Patterns

### 1. Entity (Subordinate) Registration Flow

```
User Input (4-step wizard: ID → fetched config → details → review)
    ↓
EntityRegisterPage Component
    ↓
useSubordinates() mutation
    ↓
API Client → POST /api/v1/proxy/{instanceId}/api/v1/admin/subordinates
    ↓
FastAPI backend: inject basic auth, forward verbatim to LightHouse
    ↓
LightHouse creates the subordinate, returns the real assigned record
    ↓
Backend audits the action (response body, redacted, as `details`)
    ↓
Response → React Query cache update → UI re-render → success toast
```

### 2. Instance Switching (not a backend "context" — pure frontend state + proxy routing)

```
User selects an instance in the sidebar switcher
    ↓
TrustAnchorContext / setActiveInstance(instanceId)
    ↓
OpenAPI.BASE getter (src/lib/api-config.ts) now resolves to
  ${GATEWAY_BASE}/api/v1/proxy/${instanceId}
    ↓
Every subsequent generated-client call is routed to that instance
    ↓
React Query cache is keyed by instanceId, so switching never shows
  stale cross-instance data
```

There is no server-side "current context" to set — routing is entirely
determined by which instance ID is embedded in the request path.

### 3. Authentication Flow

```
User submits credentials
    ↓
POST /api/auth/login
    ↓
Backend validates credentials (bcrypt) against the local `users` table
    ↓
JWT issued (python-jose)
    ↓
Token stored client-side, attached as Authorization: Bearer to every
  gateway and proxied request
    ↓
Backend validates the JWT and resolves the user's roles/permissions on
  every protected endpoint
```

### 4. Data Fetching with React Query

```
Component mounts → custom hook (e.g. useSubordinates) → useQuery
    ↓
Cache fresh? → return cached data
Cache stale/missing? → API request via the generated client
    ↓
Response → cache updated → component re-renders
```

## Authentication & Authorization

**Authentication**: JWT, local accounts seeded in the backend's own `users` table (see `README.md` for default credentials). An `OIDCProvider` model exists as scaffolding for federated login but is not yet wired into a live login flow — external IdP federation (OIDC/SAML) remains a real gap, not a "nice to have."

**Authorization — RBAC is implemented, not planned**: roles, permissions, and per-feature toggles are seeded from the OpenAPI spec at startup (`rbac_seed.py`) and enforced both server-side (proxy audit classification, RBAC endpoints) and client-side (`useOperationAllowed` gates hide/disable actions a user's role doesn't permit). The RBAC Management page lets admins adjust roles and toggle which features are enabled.

**Audit logging is implemented**: every mutating proxied request is recorded with actor, action, resource type/ID, and a redacted capture of the actual response body — see the Audit Log page and `backend/app/utils/audit.py`.

## Database Schema (backend's own SQLite — NOT federation entity data)

The backend's database holds only gateway-level concerns. Subordinates, trust marks, entity configuration, JWKS, and metadata policies all live in the connected LightHouse instance(s), fetched live through the proxy — the backend never mirrors that data locally.

**users** — id, email, hashed_password, role assignment, is_active, created_at

**roles** / **permissions** / **role_permissions** — RBAC seed data, generated from the OpenAPI spec's feature/operation list at startup

**feature_config** — per-feature enable/disable, surfaced to the UI via `/api/v1/capabilities`

**trust_anchors** — the instance *registry* (id, name, entity_id, public/admin base URLs, status) — mirrors `backend/config/gateway.yaml`, not a federation trust-anchor concept

**audit_logs** — id, tenant_id (instance), user_id/email, action, resource_type, resource_id, `details` (redacted JSON response body), created_at

**entity_registrations** / **tech_contacts** / **tenants** — supporting tables for the registration/approval workflow

## API Design

### OpenAPI Specification

Location: `Federation Admin OpenAPI.yaml` — the contract the *proxied* (LightHouse-side) admin API implements. The backend's own gateway-level endpoints (auth, RBAC, audit, instances, resolve) are BFF-specific and not part of this contract.

**Auto-generation**: TypeScript client generated into `src/client/` via `openapi-typescript-codegen`, providing type-safe calls for every LightHouse-side operation.

### API Base URL Configuration

The generated client's `OpenAPI.BASE` is a **getter**, not a static value — it resolves per-request to the currently active instance's proxy path (see "Instance Switching" above). Gateway-level calls (auth, RBAC, audit, capabilities) go straight to `GATEWAY_BASE` (`VITE_API_BASE_URL`, default `http://localhost:8765`) regardless of which instance is selected.

### Key Endpoint Groups

**Gateway-level** (backend's own, not proxied):
- `POST /api/auth/login` — authentication
- `GET /api/v1/capabilities` — feature manifest driving dynamic UI adaptation
- `GET/POST /api/v1/rbac/*` — roles, permissions, feature toggles
- `GET /api/v1/audit-logs` — paginated, filterable audit trail
- `GET /api/v1/admin/instances`, `GET /api/v1/admin/trust-anchors` — the deployment-managed instance registry (read-only; instances are declared in `gateway.yaml`, not created via the UI)
- `GET /api/v1/admin/resolve`, `GET /api/v1/admin/trust-mark-status` — SSRF-guarded external-entity helpers

**Proxied** (forwarded verbatim to the selected LightHouse instance, full contract in `Federation Admin OpenAPI.yaml`):
- `ANY /api/v1/proxy/{instanceId}/api/v1/admin/*` — subordinates, trust marks (types/owners/issuers/issuance-spec/subjects), entity configuration, JWKS, constraints, metadata policies, stats

**Public federation protocol** (served directly by LightHouse, not proxied — the UI's Chain Inspector "Any Entity" mode and public trust-mark verification call these on real external hosts):
- `.well-known/openid-federation`, `/fetch`, `/list`, `/resolve`, `/trust_mark`, `/trust_mark/list`, `/trust_mark/status`

## Deployment

### Docker Compose (the primary way this runs)

**Services**: `ui` (nginx, serves the Vite build), `backend` (FastAPI/Uvicorn), `lighthouse` (`ta-1`), `lighthouse2` (`ta-2`). See `README.md` for the full port table and persistence details.

**Persistence**: `backend/data/`, `lighthouse/data/`, and `lighthouse2/data/` are all bind-mounted host directories — container rebuilds no longer silently wipe users, RBAC config, audit history, or federation state.

```bash
docker compose up --build
```

Access:
- UI: http://localhost:8080
- Backend: http://localhost:8765 (interactive docs at `/docs`)
- LightHouse instances: http://localhost:8081, http://localhost:8082

### Production Deployment (Planned)

Not yet built. Aspirational direction: container orchestration (Kubernetes), a managed Postgres instead of SQLite for the backend's own data, TLS termination, and — most importantly — real OIDC/SAML federation for login instead of local accounts. RBAC and audit logging, previously listed here as "planned," are already implemented; what remains genuinely planned is federated identity and horizontal scaling of the backend itself.

## Technology Decisions

### Why React + TypeScript?
Type safety for a large, RBAC-gated, multi-instance UI; strong ecosystem; backend-agnostic by construction.

### Why Vite?
Fast HMR, modern build tooling, straightforward environment-variable-driven API base configuration.

### Why OpenAPI-First Design?
Enables multiple backend implementations against the same contract; auto-generated, type-safe TypeScript client; UI and backend work independently against a shared spec.

### Why FastAPI for the reference backend/gateway?
Native async/await (matters here — it's a proxy doing a lot of outbound HTTP), auto-generated docs, Pydantic type hints, and genuinely used as more than a demo shim: it's the thing doing SSRF-guarding, redaction, and RBAC enforcement for every request.

### Why React Query?
Eliminates data-fetching boilerplate, built-in caching/invalidation, and its cache-key-per-instance pattern is what makes instance switching correct without extra plumbing.

### Why SQLAlchemy?
Standard Python ORM, type-safe queries, works fine for the backend's own narrow, low-volume schema (users/RBAC/audit/instance registry).

## Known Gaps

See `KNOWN-ISSUES.md` for the maintained, evidence-based list — it documents what's fixed, what's a known gap in our own code, and what needs upstream LightHouse/OIDFed collaboration (including two confirmed real interop bugs: an undocumented trust-mark-status wire-contract mismatch, and an upstream endpoint-path logging bug). That file is the living source of truth; this document won't try to duplicate it.

## Documentation

- `README.md` — full developer setup, local dev without Docker, test suite, adding instances
- `GETTING-STARTED.md` — one-page operator/newcomer tour of the actual UI workflows
- `KNOWN-ISSUES.md` — maintained list of fixed/known/upstream issues
- `Federation Admin OpenAPI.yaml` — the proxied API contract
- `CAPABILITY-DISCOVERY.md` — how the capability manifest drives dynamic UI adaptation

## For Organizations Building Their Own Admin API

If you're implementing the (proxied-side) Admin API in your preferred language/framework:

1. **Start with the OpenAPI spec** — `Federation Admin OpenAPI.yaml` is the contract.
2. **Use the reference backend as a behavioral example** — `backend/app/routers/` shows real request/response shapes; `e2e/tests/` exercises them end to end against a live stack.
3. **Implement `/api/v1/capabilities`** so the UI can adapt navigation, buttons, and RBAC permission lists to what your backend actually supports.
4. **Handle CORS** for the UI origin, and accept whatever bearer-token scheme you choose — the backend attaches auth server-side, the browser never needs to know your credential format.
5. Point this UI's backend proxy at your implementation by adjusting `backend/config/gateway.yaml`'s `admin_base_url` for an instance — there's no separate "point the UI directly at a custom backend" mode; the FastAPI gateway is a required layer (it's what does RBAC, audit, and SSRF-guarding).

---
