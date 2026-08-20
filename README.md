# Federation Gateway

**Backend-Agnostic UI** for managing OpenID Federation entities, trust anchors, subordinates, and trust marks.

> New here? Start with **[`CLAUDE.md`](CLAUDE.md)** (agent/developer map of this
> repo) or **[`docs/GETTING-STARTED.md`](docs/GETTING-STARTED.md)** (human tour:
> run it, then use it).

---

## Repository layout

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
├── lighthouse/, lighthouse2/     # Two standalone LightHouse trust anchors
│   ├── config.yaml               # LightHouse node config (entity_id, storage, signing)
│   └── data/                     # SQLite DB + generated signing keys (gitignored)
├── mesh-ta/, mesh-ia/, mesh-ia2/, # Two independent multi-hop federations
│   mesh-leaf-op/, mesh-leaf-rp/, # (real trust chains, multi-parent, +
│   mesh-leaf-multi/,             # interfederation)
│   mesh2-ta/, mesh2-ia/,         # — see docs/FEDERATION-TOPOLOGY.md
│   mesh2-leaf-op/
├── scripts/                      # seed-demo.py, seed-mesh.py, seed-mesh2.py, and other setup scripts
├── docs/                         # Topic documentation — see "Documentation" below
├── Federation Admin OpenAPI.yaml # Canonical API contract (source of truth)
├── docker-compose.yml            # ui · backend · lighthouse · lighthouse2 · 9 mesh nodes
└── Dockerfile                    # UI: Bun build → nginx:alpine
```

## Services and ports

| Service | Port | Notes |
|---------|------|-------|
| **UI** (nginx, SPA) | `8080` (configurable via `UI_PORT`) | Proxies `/api/*` → backend at `8765` |
| **Backend** (FastAPI) | `8765` (configurable via `BACKEND_PORT`) | BFF: auth + deployment config + proxy to instances |
| **LightHouse** | `8081` (configurable via `LIGHTHOUSE_PUBLIC_PORT`) | Federation node, digest-pinned in `docker-compose.yml` — check there for the current digest, it moves as we pick up upstream fixes |
| **LightHouse 2** | `8082` (configurable via `LIGHTHOUSE2_PUBLIC_PORT`) | A second, independent federation node/trust anchor |
| **Mesh** (`mesh-ta`/`mesh-ia`/`mesh-leaf-op`/`mesh-leaf-rp`) | `8090`–`8093` | A real multi-hop federation (TA → Intermediate → 2 leaves) — see `docs/FEDERATION-TOPOLOGY.md` |
| **Mesh2** (`mesh2-ta`/`mesh2-ia`/`mesh2-leaf-op`) | `8094`–`8096` | A second, fully independent hierarchy — for interfederation testing, see `docs/FEDERATION-TOPOLOGY.md` |
| **Mesh multi-parent** (`mesh-ia2`/`mesh-leaf-multi`) | `8097`–`8098` | A second Intermediate sibling to `mesh-ia`, and a leaf registered under both — for multiple-valid-trust-chains testing, see `docs/FEDERATION-TOPOLOGY.md` |

> **API flow**: Browser → nginx:8080 → FastAPI:8765 → LightHouse:8080 (internal Docker network)
> **Configuration**: Instances are defined in `backend/config/gateway.yaml` and loaded at backend startup.
> **Persistence**: `lighthouse/data/` (and the mesh equivalents) are bind-mounted runtime directories. The compose entrypoint ensures they're writable before LightHouse starts.

## Deployment configuration

Federation instances are declared in `backend/config/gateway.yaml`:

```yaml
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

---

## Quick start

```sh
python3 scripts/generate-secrets.py   # one-time — writes a gitignored .env
docker compose up -d --build
```

Opens at **http://localhost:8080**. This brings up all 13 services (ui,
backend, lighthouse, lighthouse2, and 9 mesh nodes across two independent
federations). See `docs/GETTING-STARTED.md` for the guided first-run tour.

**Required secrets**: `docker compose up` fails closed —
`LIGHTHOUSE_ADMIN_USERNAME`/`PASSWORD`, `LIGHTHOUSE2_ADMIN_USERNAME`/
`PASSWORD`, `OIDC_ENCRYPTION_KEY`, and `JWT_SECRET` have no fallback
defaults (see `PRODUCTION-READINESS.md` #5 for why). `generate-secrets.py`
above handles this for local/demo use; see `.env.example` if you'd rather
set them by hand or wire in a real secrets manager for production.

**Other environment variables** (optional, all have working defaults):
```sh
UI_PORT=8080 \
BACKEND_PORT=8765 \
LIGHTHOUSE_PUBLIC_PORT=8081 \
docker compose up -d --build
```

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
```

To keep LightHouse data but reset only the BFF database:

```sh
docker compose up -d --build --force-recreate backend
```

---

## Key Technologies

- **Frontend**: React 18, TypeScript, Vite, TanStack Query
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **Backend**: FastAPI, SQLAlchemy, SQLite (reference implementation)
- **E2E Testing**: Playwright, against the real Docker-composed stack
- **Deployment**: Docker, Docker Compose

## Architecture

The UI is a **backend-agnostic** frontend: any Admin API implementing
`Federation Admin OpenAPI.yaml` can plug in. The FastAPI backend in this
repo is a reference implementation and gateway (BFF), not a mock — it
proxies to a real federation node (LightHouse) and owns its own concerns
(auth, RBAC, audit, instance registry). Full details in
`docs/ARCHITECTURE.md`.

---

## Documentation

- **[`CLAUDE.md`](CLAUDE.md)** — map of this repo for agents/new developers: constraints, verification commands, session checklist
- **[`PROGRESS.md`](PROGRESS.md)** — current state, recent work, known blockers
- **[`docs/GETTING-STARTED.md`](docs/GETTING-STARTED.md)** — one-page tour for newcomers and operators: run it, then use it
- **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** — system architecture and design
- **[`docs/CAPABILITY-DISCOVERY.md`](docs/CAPABILITY-DISCOVERY.md)** — backend capability system
- **[`docs/KNOWN-ISSUES.md`](docs/KNOWN-ISSUES.md)** — maintained list of fixed bugs, known gaps, and upstream LightHouse/OIDFed issues
- **[`docs/TESTING.md`](docs/TESTING.md)** — running the Playwright and backend test suites
- **[`docs/LOCAL-DEVELOPMENT.md`](docs/LOCAL-DEVELOPMENT.md)** — running the UI/backend outside Docker
- **[`docs/FEDERATION-TOPOLOGY.md`](docs/FEDERATION-TOPOLOGY.md)** — adding instances, the LightHouse mesh, the Trust Anchors page model
- **[`docs/BACKEND-IMPLEMENTORS.md`](docs/BACKEND-IMPLEMENTORS.md)** — implementing the Admin API in your own language/framework
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
