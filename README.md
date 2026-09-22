# Federation Gateway

```text
      |   
  \  ___  /     
 _  /   \  _    GÉANT
    |   |       Trust & Identity
     \_/        Incubator
      =
  _________
  |  * *  |     Co-Funded by
  | *   * |     the European
  |__*_*__|     Union
```
## What is this?

A **backend-agnostic admin UI** for OpenID Federation. If you operate a
LightHouse trust anchor or intermediate — or anything implementing the OIDF
Federation Admin API — this gives your federation operators a real web UI in
front of it: entities and subordinates, trust marks, metadata policies, keys,
an audit log, RBAC, and switching between multiple instances — instead of
raw `curl` calls against the admin API.

"Backend-agnostic" is a specific design choice, not marketing copy: the UI
never talks to LightHouse directly. It talks to a FastAPI backend-for-frontend
(auth, RBAC, audit, instance registry, proxy) which in turn talks to *any*
Admin API implementing [`Federation Admin OpenAPI.yaml`](Federation Admin OpenAPI.yaml)
— LightHouse is the reference implementation this repo ships and tests
against, not a hard dependency. Implementing the Admin API in another
language? See [`docs/BACKEND-IMPLEMENTORS.md`](docs/BACKEND-IMPLEMENTORS.md).

## Why use it?

- **Real access control in front of a raw admin API.** SSO login, RBAC
  roles, and a full audit log sit between your federation-ops team and
  LightHouse's admin endpoints, instead of everyone sharing one admin
  Basic-Auth credential.
- **One UI, multiple instances.** Manage several federation nodes — your
  trust anchor, an intermediate, a second federation — from one place,
  switching instances without re-authenticating to each one separately.
- **Not locked to one federation node implementation.** Swap in your own
  Admin API implementation any time; the UI only depends on the OpenAPI
  contract, not on LightHouse internals.

## How do I use it?

There are two ways people use this repo — pick the one that matches you.

### I already run a LightHouse (or compatible) instance and want this UI in front of it

This is the common case for most federation operators — one real instance
to manage, not a topology to build. Skip straight to
**[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)**: pointing `ui` + `backend` at
your real instance via `gateway.yaml`, admin credentials, TLS, real SSO
login, backup — all of it. Everything below this point is either a fast
local try-it-out path or reference material for that.

### I want to try this out locally first

The fastest path to a working login and one real trust anchor to click
around in:

```sh
python3 scripts/generate-secrets.py   # one-time — writes a gitignored .env
docker compose up -d --build ui backend lighthouse
python3 scripts/migrate-lighthouse-config.py --single-instance   # one-time per LightHouse image
python3 scripts/bootstrap-lighthouse-admin-users.py --single-instance   # one-time — idempotent
python3 scripts/seed-demo.py --single-instance
```

Opens at **http://localhost:8080** — log in as `admin@oidfed.org` /
`admin123`. Three containers (`ui`, `backend`, one `lighthouse` node), one
trust anchor with a couple of seeded subordinates and a trust mark. Enough
to try entity/subordinate/trust-mark CRUD; not enough for chain-resolution
or interfederation scenarios, which need the mesh demo below.

Every command above is idempotent — safe to re-run any of them if something
fails partway.

**Required secrets**: `docker compose up` fails closed —
`LIGHTHOUSE_ADMIN_USERNAME`/`PASSWORD`, `OIDC_ENCRYPTION_KEY`, and
`JWT_SECRET` have no fallback defaults (see `PRODUCTION-READINESS.md` #5 for
why). `generate-secrets.py` above handles this for local/demo use; see
`.env.example` if you'd rather set them by hand.

---

## Want multi-hop trust chains, interfederation, or the full demo?

This repo also ships a bigger topology — a 6-node LightHouse mesh (multi-hop,
multi-parent) plus a second, fully independent 3-node federation — useful for
exercising chain resolution and interfederation, not a first look at the
tool. 13 containers total, two standalone trust anchors, and the two demo
meshes.

```sh
python3 scripts/generate-secrets.py
docker compose up -d --build
python3 scripts/migrate-lighthouse-config.py
python3 scripts/bootstrap-lighthouse-admin-users.py
python3 scripts/seed-demo.py
python3 scripts/seed-mesh.py
python3 scripts/seed-mesh2.py
```

Same login, same UI at `http://localhost:8080`. See
[`docs/GETTING-STARTED.md`](docs/GETTING-STARTED.md) for the guided tour and
[`docs/FEDERATION-TOPOLOGY.md`](docs/FEDERATION-TOPOLOGY.md) for what each
node is and why.

`--single-instance` (used in the minimal path above) isn't just "ignore the
rest" — `bootstrap-lighthouse-admin-users.py` and `seed-demo.py` only ever
*talk* to the instance(s) you tell them to, so nothing times out waiting on
a container that was never started. Every other configured instance shows
up in the UI as unreachable if you ever select it — the app doesn't require
them to be up.

---

## Common operations

### Rebuild a single service (after source changes)

```sh
# UI (React source or nginx config changed)
docker compose up -d --build ui

# Backend (Python source changed)
docker compose up -d --build backend
```

> `restart` alone will **not** pick up source changes for `ui` or
> `backend` — both bake source into the image at build time. See
> `CLAUDE.md`.

### Reset everything from scratch

```sh
docker compose down
find lighthouse/data -mindepth 1 ! -name '.gitkeep' -delete
docker compose up -d --build --force-recreate
python3 scripts/migrate-lighthouse-config.py
python3 scripts/bootstrap-lighthouse-admin-users.py
python3 scripts/seed-demo.py
```

To keep LightHouse data but reset only the BFF database:

```sh
docker compose up -d --build --force-recreate backend
```

---

## Reference

### Services and ports

| Service | Port | Notes |
|---------|------|-------|
| **UI** (nginx, SPA) | `8080` (configurable via `UI_PORT`) | Proxies `/api/*` → backend at `8765` |
| **Backend** (FastAPI) | `8765` (configurable via `BACKEND_PORT`) | BFF: auth + deployment config + proxy to instances |
| **LightHouse** | `8081` (configurable via `LIGHTHOUSE_PUBLIC_PORT`) | Federation node, digest-pinned in `docker-compose.yml` — check there for the current digest, it moves as we pick up upstream fixes |
| **LightHouse 2** | `8082` (configurable via `LIGHTHOUSE2_PUBLIC_PORT`) | A second, independent federation node/trust anchor — demo-only, see below |
| **Mesh** (`mesh-ta`/`mesh-ia`/`mesh-leaf-op`/`mesh-leaf-rp`) | `8090`–`8093` | A real multi-hop federation (TA → Intermediate → 2 leaves) — demo-only, see `docs/FEDERATION-TOPOLOGY.md` |
| **Mesh2** (`mesh2-ta`/`mesh2-ia`/`mesh2-leaf-op`) | `8094`–`8096` | A second, fully independent hierarchy — demo-only, for interfederation testing |
| **Mesh multi-parent** (`mesh-ia2`/`mesh-leaf-multi`) | `8097`–`8098` | A second Intermediate sibling to `mesh-ia`, and a leaf registered under both — demo-only, for multiple-valid-trust-chains testing |

> **API flow**: Browser → nginx:8080 → FastAPI:8765 → LightHouse:8080 (internal Docker network)
> **Configuration**: Instances are defined in `backend/config/gateway.yaml` and loaded at backend startup.
> **Persistence**: `lighthouse/data/` (and the mesh equivalents) are bind-mounted runtime directories. The compose entrypoint ensures they're writable before LightHouse starts.

### Deployment configuration (local demo)

Federation instances are declared in `backend/config/gateway.yaml` — this
is the bundled demo's version; see
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for pointing this at your own
real instance(s) instead:

```yaml
instances:
  - id: ta-1
    name: LightHouse
    public_base_url: http://localhost:8081
    admin_base_url: http://lighthouse:8080
    admin_auth:
      type: basic
      username_env: LIGHTHOUSE_ADMIN_USERNAME
      password_env: LIGHTHOUSE_ADMIN_PASSWORD
```

**Key behaviors**:
- The backend loads instance configuration from `GATEWAY_CONFIG_FILE` (defaults to `/config/gateway.yaml` in Docker).
- Admin credentials are read from environment variables (`LIGHTHOUSE_ADMIN_USERNAME`, `LIGHTHOUSE_ADMIN_PASSWORD`).
- The UI does **not** auto-select the first instance. Users must explicitly choose an instance from the dropdown.
- Proxy requests to admin endpoints are authenticated server-side; the UI never sees admin credentials.
- A background probe on backend startup corrects each instance's stored `entity_id` if it differs from `public_base_url` (see `docs/FEDERATION-TOPOLOGY.md`).

### Default credentials (seeded on first run)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@oidfed.org` | `admin123` |
| User | `tech@example.org` | `user123` |

The admin password is configurable (`ADMIN_BOOTSTRAP_PASSWORD` in
`.env`) — it's the only path to `super_admin` on a fresh database, so
change it before any real deployment. See `PRODUCTION-READINESS.md` #2.

### Repository layout

```
federation-gateway/
├── src/                          # React/TypeScript UI (Vite)
│   ├── client/                   # Auto-generated OpenAPI client (do not edit)
│   ├── components/               # Shared UI components (shadcn/ui)
│   ├── hooks/                    # React Query data hooks (useEntities, useSubordinates, …)
│   ├── pages/                    # Route-level page components
│   └── contexts/                 # TrustAnchorContext, AuthContext, …
├── backend/                      # Python FastAPI BFF (Backend-for-Frontend)
│   └── app/
│       ├── routers/
│       │   ├── proxy.py          # ⚠ Transparent proxy to LightHouse Admin API
│       │   ├── resolve.py        # SSRF-guarded ad-hoc entity/trust-mark-status lookups
│       │   ├── auth.py           # JWT login / refresh
│       │   └── trust_anchors.py  # Deployment-managed trust-anchor list (read-only; config-backed)
│       ├── utils/capability_probe.py  # Live per-instance capability + entity_id discovery
│       ├── db/seed.py            # First-run seed: admin user, deployment-managed trust anchors
│       └── main.py               # FastAPI app entry point
├── e2e/                          # Playwright end-to-end tests
│   ├── tests/
│   ├── fixtures/index.ts         # loginAsAdmin + instancePage fixtures
│   └── playwright.config.ts      # Projects: bff-only (@bff), full-stack (@proxy)
├── lighthouse/, lighthouse2/     # Demo-only: two standalone LightHouse trust anchors
│   ├── config.yaml               # LightHouse node config (entity_id, storage, signing)
│   └── data/                     # SQLite DB + generated signing keys (gitignored)
├── mesh-ta/, mesh-ia/, mesh-ia2/, # Demo-only: two independent multi-hop federations
│   mesh-leaf-op/, mesh-leaf-rp/, # (real trust chains, multi-parent, +
│   mesh-leaf-multi/,             # interfederation)
│   mesh2-ta/, mesh2-ia/,         # — see docs/FEDERATION-TOPOLOGY.md
│   mesh2-leaf-op/
├── scripts/                      # seed-demo.py, seed-mesh.py, seed-mesh2.py, and other setup scripts
├── docs/                         # Topic documentation — see "Documentation" below
├── Federation Admin OpenAPI.yaml # Canonical API contract (source of truth)
├── docker-compose.yml            # ui · backend · lighthouse · lighthouse2 · 9 demo mesh nodes
└── Dockerfile                    # UI: Bun build → nginx:alpine
```

### Key Technologies

- **Frontend**: React 18, TypeScript, Vite, TanStack Query
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **Backend**: FastAPI, SQLAlchemy, SQLite (reference implementation)
- **E2E Testing**: Playwright, against the real Docker-composed stack
- **Deployment**: Docker, Docker Compose

### Architecture

The UI is a **backend-agnostic** frontend: any Admin API implementing
`Federation Admin OpenAPI.yaml` can plug in. The FastAPI backend in this
repo is a reference implementation and gateway (BFF), not a mock — it
proxies to a real federation node (LightHouse) and owns its own concerns
(auth, RBAC, audit, instance registry). Full details in
`docs/ARCHITECTURE.md`.

---

## Documentation

- **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)** — pointing this at your own real LightHouse instance(s) instead of the bundled demo mesh — start here if you already run a federation node
- **[`docs/GETTING-STARTED.md`](docs/GETTING-STARTED.md)** — one-page tour for newcomers and operators: run it, then use it
- **[`CLAUDE.md`](CLAUDE.md)** — map of this repo for agents/new developers: constraints, verification commands, session checklist
- **[`PROGRESS.md`](PROGRESS.md)** — current state, recent work, known blockers
- **[`PRODUCTION-READINESS.md`](PRODUCTION-READINESS.md)** — priority-ordered checklist of what's left before this is safe to hand to a real federation admin
- **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** — system architecture and design
- **[`docs/CAPABILITY-DISCOVERY.md`](docs/CAPABILITY-DISCOVERY.md)** — backend capability system
- **[`docs/KNOWN-ISSUES.md`](docs/KNOWN-ISSUES.md)** — maintained list of fixed bugs, known gaps, and upstream LightHouse/OIDFed issues
- **[`docs/TESTING.md`](docs/TESTING.md)** — running the Playwright and backend test suites
- **[`docs/LOCAL-DEVELOPMENT.md`](docs/LOCAL-DEVELOPMENT.md)** — running the UI/backend outside Docker
- **[`docs/FEDERATION-TOPOLOGY.md`](docs/FEDERATION-TOPOLOGY.md)** — adding instances, the LightHouse mesh, the Trust Anchors page model
- **[`docs/BACKEND-IMPLEMENTORS.md`](docs/BACKEND-IMPLEMENTORS.md)** — implementing the Admin API in your own language/framework
- **[`docs/TLS.md`](docs/TLS.md)** — why TLS can't be retrofitted onto LightHouse-to-LightHouse traffic, and what a real deployment needs per hop
- **[`docs/BACKUP-RESTORE.md`](docs/BACKUP-RESTORE.md)** — snapshotting and restoring databases + LightHouse signing keys
- **[`Federation Admin OpenAPI.yaml`](Federation Admin OpenAPI.yaml)** — API specification (the contract)

---

## Contributing

Contributions welcome! Especially:

- New backend implementations (Go, Java, .NET, Node.js)
- UI improvements and bug fixes
- Documentation enhancements
- Test coverage

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

---

**Built for NRENs, federations, and organizations implementing OpenID Federation.**
