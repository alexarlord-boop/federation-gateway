# Federation Gateway

**Backend-Agnostic UI** for managing OpenID Federation entities, trust anchors, subordinates, and trust marks.

---

## Developer Quick Reference

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
│       │   ├── auth.py           # JWT login / refresh
│       │   └── trust_anchors.py  # TA registry (persisted in backend.db)
│       ├── db/seed.py            # First-run seed: admin user + ta-1 trust anchor
│       └── main.py               # FastAPI app entry point
├── e2e/                          # Playwright end-to-end tests
│   ├── tests/
│   │   ├── entities.spec.ts      # Entity registration + approvals workflow
│   │   ├── settings.spec.ts      # Settings page tabs
│   │   └── trust-marks.spec.ts   # Trust marks pages
│   ├── fixtures/index.ts         # loginAsAdmin + instancePage fixtures
│   └── playwright.config.ts      # Projects: bff-only (@bff), full-stack (@proxy)
├── lighthouse/
│   ├── config.yaml               # LightHouse node config (entity_id, storage, signing)
│   └── data/                     # SQLite DB + generated signing keys (gitignored)
├── Federation Admin OpenAPI.yaml # Canonical API contract (source of truth)
├── docker-compose.yml            # Three services: lighthouse · backend · ui
└── Dockerfile                    # UI: Bun build → nginx:alpine
```

### Services and ports

| Service | Port | Notes |
|---------|------|-------|
| **UI** (nginx, SPA) | `8080` | Proxies `/api/*` → backend at `8765` |
| **Backend** (FastAPI) | `8765` | BFF: auth + TA registry + proxy to LightHouse |
| **LightHouse** | `8081` | `oidfed/lighthouse:0.20.0` — federation node |

> **API flow**: Browser → nginx:8080 → FastAPI:8765 → LightHouse:8080 (internal Docker network)

### Default credentials (seeded on first run)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@oidfed.org` | `admin123` |
| User | `tech@example.org` | `user123` |

---

### Run the full stack

```sh
docker compose up --build
```

Opens at **http://localhost:8080**.

### Rebuild a single service (after source changes)

```sh
# UI (React source or nginx config changed)
docker compose build ui && docker compose up -d ui

# Backend (Python source changed)
docker compose build backend && docker compose up -d backend
```

> The UI image uses a multi-stage Bun build — there is no volume mount; source changes always require a rebuild.

### Reset everything from scratch

```sh
# Stop containers, remove volumes (wipes LightHouse DB + all subordinates)
docker compose down -v

# Rebuild images and start fresh
docker compose up --build
```

To keep LightHouse data but reset only the BFF database:

```sh
rm -f backend.db          # backend SQLite DB (re-seeded on next container start)
docker compose up -d backend
```

---

### Run tests

Tests live in `e2e/`. Install dependencies once:

```sh
cd e2e && npm install
cd e2e && npx playwright install chromium
```

#### Full-stack tests (`@proxy` — requires Docker stack running)

```sh
# Start the stack first
docker compose up --build -d

cd e2e
npm run test:full                              # all 34 full-stack tests
npm run test:full -- --grep "pending status"   # run a subset by name
npm run test:full -- --reporter=line           # compact output
```

#### BFF-only tests (`@bff` — no Docker needed)

```sh
cd e2e
npm run test:bff
```

#### Open Playwright UI / trace viewer

```sh
cd e2e
npm run test:ui              # interactive test runner
npx playwright show-report   # HTML report from last run
```

Test results and failure screenshots land in `e2e/test-results/`.

---

### Local UI development (without Docker)

The UI can run against the Dockerised backend:

```sh
# Ensure backend + lighthouse are running
docker compose up -d backend lighthouse

# Install UI deps and start Vite dev server
npm install
npm run dev          # http://localhost:5173, proxies /api → localhost:8765
```

Hot-module reload works; changes are instant without rebuilding Docker images.

### Local backend development (without Docker)

```sh
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8765
```

The backend stores state in `backend.db` (SQLite, root of repo).

---

### Adding a second LightHouse instance

1. Create `lighthouse2/config.yaml` (copy and adjust `lighthouse/config.yaml`).
2. Uncomment the `lighthouse2` service block in `docker-compose.yml`.
3. Uncomment the `ta-2` / `tenant-2` rows in `backend/app/db/seed.py`.
4. Full reset: `docker compose down -v && docker compose up --build`.

---

## Key Features

- ✅ **Backend-Agnostic Design** - Works with any Admin API implementing the OpenAPI spec
- ✅ **Capability Discovery** - UI adapts dynamically to backend features
- ✅ **Multiple Backend Support** - Python (FastAPI), Go, Java, .NET implementations
- ✅ **MSW Mocking** - Development without backend dependency
- ✅ **Production Ready** - Docker deployment with environment configuration

---

## Architecture

### Core Components

1. **UI (React + TypeScript)** - Universal frontend for OIDFed management
2. **OpenAPI Specification** - The contract all backends must implement
3. **Reference Backend (FastAPI)** - Example implementation (optional)
4. **MSW Handlers** - Canonical API behavior specification

### Backend Flexibility

The UI can connect to **any backend** that implements [`Federation Admin OpenAPI.yaml`](Federation Admin OpenAPI.yaml):

- **Reference**: Python FastAPI (included in this repo)
- **Community**: Go, Java, .NET, Node.js implementations (coming soon)
- **Custom**: Your organization's own implementation

---

## Quick Start

### Option 1: Full Stack (UI + Reference Backend)

```sh
# Clone the repository
git clone <repo-url>
cd federation-gateway

# Start everything with Docker Compose
docker-compose up --build
```

Access:
- UI: http://localhost:8080
- Backend API: http://localhost:8765
- API Docs: http://localhost:8765/docs

### Option 2: UI Only (Point to Your Backend)

```sh
# Install dependencies
npm install

# Configure your backend URL
cp .env.example .env.local
# Edit .env.local and set VITE_API_BASE_URL=https://your-backend.example.org

# Run development server
npm run dev
```

### Option 3: Reference Backend Only

```sh
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
fastapi run app/main.py --host 0.0.0.0 --port 8765
```

---

## Configuration

### Environment Variables

Create `.env.local` from the example:

```sh
cp .env.example .env.local
```

**Key Configuration**:

```bash
# Point to your backend implementation
VITE_API_BASE_URL=http://localhost:8765
```

**Deployment Examples**:

```bash
# Development (local FastAPI)
VITE_API_BASE_URL=http://localhost:8765

# Production (organization's backend)
VITE_API_BASE_URL=https://api.federation.example.org

# Kubernetes cluster
VITE_API_BASE_URL=https://oidfed-backend.cluster.local/v1

# Cloud deployment
VITE_API_BASE_URL=https://federation-api.cloud.edu
```

### Backend Requirements

Your backend must:

1. **Implement `/api/v1/capabilities`** - Capability discovery endpoint
2. **Return valid responses** matching [`Federation Admin OpenAPI.yaml`](Federation Admin OpenAPI.yaml)
3. **Handle CORS** - Allow requests from the UI origin
4. **Support authentication** - JWT, OAuth2, API keys, or custom

---

## Development

### UI Development

```sh
npm install
npm run dev  # Starts on http://localhost:5173 with MSW mocking
```

**MSW (Mock Service Worker)** is enabled in development mode, allowing UI development without a running backend.

### Backend Development (Reference FastAPI)

```sh
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8765
```

---

## Production Deployment

### Docker (UI Only)

Build and run the UI container pointing to your backend:

```sh
docker build -t federation-gateway-ui .
docker run -p 8080:80 \
  -e VITE_API_BASE_URL=https://your-backend.example.org \
  federation-gateway-ui
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: federation-ui
spec:
  template:
    spec:
      containers:
      - name: ui
        image: federation-gateway-ui:latest
        env:
        - name: VITE_API_BASE_URL
          value: "https://backend-service.namespace.svc.cluster.local:8765"
        ports:
        - containerPort: 80
```

### Static Hosting (S3, Netlify, Vercel)

```sh
# Build for production
npm run build

# Set API URL via build-time env var
VITE_API_BASE_URL=https://api.example.org npm run build

# Upload ./dist to your hosting service
```

---

## Backend Implementations

### Reference Implementation (FastAPI - This Repo)

**Status**: ✅ Partial (core features implemented)

**Features**:
- Subordinate management (CRUD)
- Trust anchor management
- JWT authentication
- Capability discovery

**Run**: See "Quick Start" above

### Community Implementations

| Language | Framework | Status | Repository |
|----------|-----------|--------|------------|
| Go | Gin/Echo | 📋 Planned | Coming soon |
| Java | Spring Boot | 📋 Planned | Coming soon |
| .NET | ASP.NET Core | 📋 Planned | Coming soon |
| Node.js | Express/NestJS | 📋 Planned | Coming soon |

---

## How It Works

### 1. Capability Discovery

On startup, the UI fetches `/api/v1/capabilities` from the backend:

```json
{
  "version": "1.0.0",
  "implementation": {
    "name": "FastAPI Reference Implementation",
    "version": "0.2.0"
  },
  "features": {
    "subordinates": {
      "enabled": true,
      "operations": ["list", "create", "read", "update", "delete"]
    },
    "trust_marks": {
      "enabled": false,
      "reason": "Coming in Q2 2026"
    }
  }
}
```

### 2. Dynamic UI Adaptation

Based on capabilities:
- **Navigation** shows only available features
- **Buttons** appear/disappear based on operations
- **RBAC permissions** are generated from enabled features
- **Backend info** is displayed to operators

### 3. Backend Flexibility

The same UI works with different backends:

```bash
# Switch backends by changing environment variable
VITE_API_BASE_URL=https://python-backend.org npm start    # FastAPI
VITE_API_BASE_URL=https://go-backend.org npm start        # Go implementation
VITE_API_BASE_URL=https://java-backend.org npm start      # Java implementation
```

---

## For Backend Implementers

Want to implement the Admin API in your preferred language?

### 1. Start with the OpenAPI Spec

File: [`Federation Admin OpenAPI.yaml`](Federation Admin OpenAPI.yaml)

This is your contract - implement all endpoints or a subset.

### 2. Reference MSW Handlers

File: [`src/mocks/handlers.ts`](src/mocks/handlers.ts)

Shows expected behavior, error handling, and edge cases.

### 3. Implement Capability Discovery

**Required**: `/api/v1/capabilities` endpoint

This tells the UI what your backend supports.

### 4. Test with the UI

```bash
# Clone this repo
git clone <repo-url>

# Point UI to your backend
VITE_API_BASE_URL=https://your-backend.example.org npm run dev
```

### 5. CORS Configuration

Your backend must allow requests from the UI:

```
Access-Control-Allow-Origin: https://your-ui-domain.org
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

---

## Project Structure

```
federation-gateway/
├── src/                          # UI source code
│   ├── client/                   # Auto-generated API client
│   ├── components/               # React components
│   ├── contexts/                 # React contexts (Auth, Capability, etc.)
│   ├── hooks/                    # Custom React hooks
│   ├── mocks/                    # MSW handlers
│   ├── pages/                    # Page components
│   ├── services/                 # Service layer (capabilities, etc.)
│   └── App.tsx                   # Main app component
├── backend/                      # Reference FastAPI backend (optional)
│   └── app/
│       ├── routers/              # API endpoints
│       ├── models/               # Database models
│       └── main.py               # FastAPI app
├── Federation Admin OpenAPI.yaml # API specification (THE CONTRACT)
├── docker-compose.yml            # Full stack deployment
├── Dockerfile                    # UI container
└── README.md                     # This file
```

---

## Scripts

```sh
npm run dev         # Start development server with HMR
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint
```

---

## Authentication

### Current (Demo/Development)

- Mock users in backend database seed
- JWT tokens issued by reference backend
- Credentials: `admin@example.com` / `admin123`

### Production (Planned)

- Separate Auth Gateway service
- OIDC/SAML federation support
- Identity mapping to local users
- Flexible authentication methods (JWT, OAuth2, API keys)

---

## Key Technologies

- **Frontend**: React 18, TypeScript, Vite, TanStack Query
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **Mocking**: Mock Service Worker (MSW)
- **Backend**: FastAPI, SQLAlchemy, SQLite (reference implementation)
- **Deployment**: Docker, Docker Compose

---

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) - System architecture and design
- [`CAPABILITY-DISCOVERY.md`](CAPABILITY-DISCOVERY.md) - Backend capability system
- [`Federation Admin OpenAPI.yaml`](Federation Admin OpenAPI.yaml) - API specification

---

## Contributing

Contributions welcome! Especially:

- New backend implementations (Go, Java, .NET, Node.js)
- UI improvements and bug fixes
- Documentation enhancements
- Test coverage

---

## License

MIT License - see LICENSE file for details

---

## Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Documentation**: See `/docs` folder

---

**Built for NRENs, federations, and organizations implementing OpenID Federation.**
