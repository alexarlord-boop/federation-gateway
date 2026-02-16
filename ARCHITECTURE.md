# System Architecture

## Overview

The Federation Gateway Admin UI is a **backend-agnostic** web-based interface for managing OpenID Federation entities, subordinates, trust marks, and trust anchors.

### Core Design Principle

The UI is designed to work with **any** OpenID Federation Admin API implementation that adheres to the OpenAPI specification (`Federation Admin OpenAPI.yaml`). This means:

- **The UI is the product** - a universal frontend for OIDFed management
- **The OpenAPI spec is the contract** - any backend implementing it can plug in
- **Multiple backend implementations are expected** - organizations can choose/build their own (Python, Go, Java, .NET, etc.)
- **The FastAPI backend in this repo is a reference implementation** - not the only option
- **MSW handlers serve as the canonical behavior model** - they define expected API interactions

This architecture enables vendor-neutral deployment: NRENs can use this UI with their existing infrastructure while maintaining a consistent operator experience.

## System Components

### 1. React UI (`src/`)

**Purpose**: Operator-facing web interface for federation management

**Technology Stack**:
- React 18 with TypeScript
- Vite (development server & build tool)
- TanStack Query (React Query) for server state management
- Tailwind CSS + shadcn/ui components
- Mock Service Worker (MSW) for API mocking

**Port**: 8080

**Key Features**:
- Entity registration and management
- Trust anchor configuration
- Subordinate approval workflows
- Trust mark issuance
- Multi-context switching

**Structure**:
```
src/
├── client/          # Auto-generated API client from OpenAPI spec
├── components/      # Reusable UI components
├── contexts/        # React contexts (Auth, TrustAnchor)
├── hooks/           # Custom React hooks for data fetching
├── pages/           # Page-level components
├── mocks/           # MSW handlers for development
└── types/           # TypeScript type definitions
```

### 2. Admin API Backend (Reference Implementation: `backend/`)

**Purpose**: Reference implementation of the OpenID Federation Admin API specification

**Important**: This FastAPI backend is **one possible implementation**. Organizations can implement the same OpenAPI contract in any language/framework:
- Python (FastAPI, Django, Flask)
- Go (Gin, Echo, Chi)
- Java (Spring Boot, Quarkus)
- .NET (ASP.NET Core)
- Node.js (Express, Fastify, NestJS)

**Reference Implementation Stack**:
- FastAPI (Python web framework)
- SQLAlchemy (ORM)
- SQLite (development database)
- Jose (JWT handling)
- Bcrypt (password hashing)

**Port**: 8765 (configurable via `VITE_API_BASE_URL`)

**Status**: Partial reference implementation - primarily supports authentication and basic CRUD operations

**Structure**:
```
backend/app/
├── auth/            # JWT authentication & security
├── db/              # Database configuration & seeding
├── models/          # SQLAlchemy ORM models
├── routers/         # API endpoint handlers
└── schemas/         # Pydantic schemas for validation
```

**Implemented Endpoints**:
- `/auth/login` - User authentication
- `/subordinates/*` - Subordinate entity management
- `/trust-anchors/*` - Trust anchor management
- `/debug/context` - Context switching for development
- `/.well-known/openid-federation` - Entity configuration endpoint

### 3. Mock Service Worker (MSW)

**Purpose**: 
1. Development-time API mocking to enable frontend development without a backend
2. **Canonical behavior specification** - defines expected API interactions
3. Reference for backend implementers

**Location**: `public/mockServiceWorker.js` + `src/mocks/handlers.ts`

**Status**: Active in development mode only (disabled in production builds)

**Significance**: MSW handlers are effectively **executable API documentation**. They show:
- Expected request/response payloads
- Error handling patterns
- State transitions
- Validation rules
- Edge cases

Backend implementers should use MSW handlers as a reference alongside the OpenAPI spec.

**Mocked Endpoints**:
- Entity management (CRUD operations)
- Subordinate workflows
- Trust anchor operations
- Authority hints
- Trust marks

## Current Architecture (Development/Demo)

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │           React Application                        │     │
│  │  ┌──────────────────────────────────────────┐     │     │
│  │  │         UI Components                    │     │     │
│  │  │  (Pages, Forms, Tables, Modals)         │     │     │
│  │  └──────────────────────────────────────────┘     │     │
│  │                     │                              │     │
│  │                     ▼                              │     │
│  │  ┌──────────────────────────────────────────┐     │     │
│  │  │      React Query (TanStack Query)        │     │     │
│  │  │   (Server State Management & Caching)    │     │     │
│  │  └──────────────────────────────────────────┘     │     │
│  │                     │                              │     │
│  │                     ▼                              │     │
│  │  ┌──────────────────────────────────────────┐     │     │
│  │  │     Auto-generated API Client            │     │     │
│  │  │      (TypeScript from OpenAPI)           │     │     │
│  │  └──────────────────────────────────────────┘     │     │
│  └────────────────────────────────────────────────────┘     │
│                     │                                        │
│                     ▼                                        │
│  ┌────────────────────────────────────────────────────┐     │
│  │    Mock Service Worker (Development Only)          │     │
│  │         Intercepts API requests                    │     │
│  └────────────────────────────────────────────────────┘     │
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   Vite Dev Server      │
         │     Port: 8080         │
         │  (HMR, Asset Serving)  │
         └────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   FastAPI Backend      │
         │     Port: 8765         │
         │  (Auth, Subordinates,  │
         │   Entity Config)       │
         └────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │    SQLite Database     │
         │     (local file)       │
         │  - users               │
         │  - subordinates        │
         │  - trust_anchors       │
         │  - authority_hints     │
         └────────────────────────┘
```

## Planned Production Architecture

```
┌─────────────────┐
│   End Users     │
│   (Browsers)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│           Load Balancer / CDN                   │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│            Nginx (Reverse Proxy)                │
│         Port: 443 (HTTPS)                       │
│  - Static asset serving (React build)           │
│  - API request proxying to gateway              │
└────────┬────────────────────────────────────────┘
         │
         ├─────────────────┬──────────────────────┐
         ▼                 ▼                      ▼
┌──────────────┐  ┌──────────────────┐  ┌─────────────────┐
│ Static Files │  │  FastAPI Auth    │  │  Admin API      │
│ (React Build)│  │    Gateway       │  │  (Backend)      │
│              │  │  Port: 8765      │  │  Port: 9000     │
│ - index.html │  │                  │  │                 │
│ - JS bundles │  │ - OIDC/SAML     │  │ - Entity mgmt   │
│ - CSS        │  │ - JWT issuance  │  │ - Trust anchors │
│ - Assets     │  │ - User mapping  │  │ - Subordinates  │
└──────────────┘  └────────┬─────────┘  └────────┬────────┘
                           │                     │
                           │                     │
                           ▼                     ▼
                  ┌─────────────────────────────────┐
                  │      PostgreSQL Database        │
                  │                                 │
                  │  - users                        │
                  │  - subordinates                 │
                  │  - trust_anchors                │
                  │  - authority_hints              │
                  │  - trust_marks                  │
                  │  - audit_logs                   │
                  └─────────────────────────────────┘
```

## Data Flow Patterns

### 1. Entity Registration Flow

```
User Input (Form)
    ↓
EntityRegisterPage Component
    ↓
useCreateSubordinate() Hook
    ↓
React Query Mutation
    ↓
API Client → POST /subordinates
    ↓
MSW Handler (dev) / FastAPI Backend (prod)
    ↓
Database Write (mockDB / SQLite)
    ↓
Response → React Query Cache Update
    ↓
UI Re-render → Success Toast → Redirect
```

### 2. Trust Anchor Context Switching

```
User selects Trust Anchor in ContextSwitcher
    ↓
POST /api/debug/context
    ↓
Backend updates current context (session/state)
    ↓
React Query cache invalidation
    ↓
All queries re-fetch with new context
    ↓
Subordinates filtered by trust anchor
    ↓
UI updates across all pages
```

### 3. Authentication Flow

```
User submits credentials
    ↓
POST /auth/login
    ↓
Backend validates credentials (bcrypt)
    ↓
JWT token issued (jose)
    ↓
Token stored in AuthContext
    ↓
Token included in all subsequent API requests
    ↓
Backend validates JWT on protected endpoints
```

### 4. Data Fetching with React Query

```
Component mounts
    ↓
Custom hook (e.g., useSubordinates)
    ↓
React Query useQuery
    ↓
Check cache (fresh? → return cached data)
    ↓
Cache miss/stale → API request
    ↓
API Client → GET /subordinates
    ↓
Response → Update cache
    ↓
Component re-renders with data
```

## Authentication & Authorization

### Current Implementation (Demo)

**Authentication Method**: JWT (JSON Web Tokens)

**User Storage**: SQLite database with seeded users
- `admin@example.com` / `admin123`
- `operator@example.com` / `operator123`

**Token Generation**: 
- Library: python-jose
- Algorithm: HS256
- Expiry: 30 minutes (configurable)

**Password Hashing**: bcrypt

**Frontend Auth State**: 
- Managed by AuthContext
- Token stored in memory (not localStorage for security)
- Auto-logout on token expiry

**Authorization**: 
- Currently no role-based access control (RBAC)
- All authenticated users have full access

### Planned Production Implementation

**Authentication Gateway**:
- Dedicated FastAPI service
- OIDC/SAML integration
- Identity provider federation
- User attribute mapping

**Authorization**:
- Role-based access control (RBAC)
- Permissions per trust anchor context
- Audit logging for all operations

## Database Schema

### Current Models (SQLAlchemy)

**users**
- id (PK)
- email (unique)
- hashed_password
- is_active
- created_at

**subordinates**
- id (PK)
- entity_id (unique)
- entity_name
- entity_type
- organization_name
- status (pending/approved/rejected)
- trust_anchor_id (FK)
- created_at
- updated_at

**trust_anchors**
- id (PK)
- entity_id (unique)
- name
- is_active
- created_at

**authority_hints**
- id (PK)
- subordinate_id (FK)
- hint_url
- created_at

**contexts** (session management)
- id (PK)
- user_id (FK)
- trust_anchor_id (FK)
- created_at
- updated_at

## API Design

### OpenAPI Specification

Location: `Federation Admin OpenAPI.yaml`

**Auto-generation**:
- TypeScript client generated in `src/client/`
- Uses `openapi-typescript-codegen` or similar tool
- Provides type-safe API calls

### API Base URL Configuration

**Critical for Backend Flexibility**: The UI can connect to any compliant Admin API by configuring the base URL.

**Development** (Reference FastAPI):
```typescript
// src/client/core/OpenAPI.ts
BASE: 'http://localhost:8765'
```

**Production** (Pluggable Backend):
```typescript
BASE: import.meta.env.VITE_API_BASE_URL || '/api'
```

**Example Deployments**:
```bash
# Connecting to organization's Go implementation
VITE_API_BASE_URL=https://api.nren.example.org/oidfed

# Connecting to cloud-hosted Java backend
VITE_API_BASE_URL=https://federation-api.cloud.edu/v1

# Local development with reference FastAPI
VITE_API_BASE_URL=http://localhost:8765
```

Environment variable: `VITE_API_BASE_URL`

**Backend Requirements**:
- Must implement all endpoints in `Federation Admin OpenAPI.yaml`
- Must handle CORS for browser-based UI
- Should return errors in standard format
- Authentication method is flexible (JWT, OAuth2, API keys, etc.)

### Key Endpoints

**Authentication**:
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout (planned)
- `GET /auth/me` - Current user info (planned)

**Subordinates**:
- `GET /subordinates` - List subordinates (with context filter)
- `POST /subordinates` - Create subordinate
- `GET /subordinates/{id}` - Get subordinate details
- `PATCH /subordinates/{id}` - Update subordinate
- `DELETE /subordinates/{id}` - Delete subordinate

**Trust Anchors**:
- `GET /trust-anchors` - List trust anchors
- `POST /trust-anchors` - Create trust anchor
- `GET /trust-anchors/{id}` - Get trust anchor details

**Entity Configuration**:
- `GET /.well-known/openid-federation` - Entity configuration (RFC 9529)

**Debug** (development only):
- `POST /api/debug/context` - Set current trust anchor context

## Deployment

### Development

**Start Development Servers**:
```bash
# Frontend (Vite + MSW)
npm run dev  # Port 8080

# Backend (FastAPI)
cd backend
uvicorn app.main:app --reload --port 8765
```

**Environment**:
- MSW enabled for API mocking
- SQLite database (auto-created)
- Hot module replacement (HMR)

### Docker Deployment

**Services** (docker-compose.yml):

1. **UI Container**:
   - Base: Node.js (build) → Nginx (serve)
   - Build: `npm run build` → `/dist`
   - Serve: Nginx on port 8080
   - Static files + proxy to backend

2. **Backend Container**:
   - Base: Python 3.11
   - Framework: Uvicorn serving FastAPI
   - Port: 8765
   - Database: SQLite mounted volume

**Build & Run**:
```bash
docker-compose up --build
```

**Access**:
- UI: http://localhost:8080
- API: http://localhost:8765
- API Docs: http://localhost:8765/docs

### Production Deployment (Planned)

**Infrastructure**:
- Container orchestration (Kubernetes/ECS)
- PostgreSQL database (RDS/managed)
- Redis for session storage
- S3/CDN for static assets

**Security**:
- HTTPS/TLS everywhere
- CORS configuration
- Rate limiting
- Input validation
- SQL injection protection (SQLAlchemy ORM)
- XSS protection (React escaping)

**Monitoring**:
- Application logs (structured JSON)
- Error tracking (Sentry)
- Performance monitoring (APM)
- Database query monitoring

## Technology Decisions

### Why React + TypeScript?
- Type safety for large codebase
- Strong ecosystem and community
- Excellent developer experience
- Enterprise-grade tooling
- **Backend-agnostic** - works with any API

### Why Vite?
- Fast HMR (Hot Module Replacement)
- Modern build tool (ESBuild)
- Better than Create React App for performance
- Environment variable support for API configuration

### Why OpenAPI-First Design?
- **Enables multiple backend implementations**
- Auto-generated TypeScript client (type-safe)
- Contract-driven development
- UI and backend teams can work independently
- Backend implementers have clear specification

### Why FastAPI (for reference implementation)?
- Native async/await support
- Auto-generated OpenAPI docs
- Type hints with Pydantic
- Fast performance (comparable to Node.js)
- **Note**: Organizations can implement in any language

### Why React Query?
- Eliminates boilerplate for data fetching
- Built-in caching and invalidation
- Optimistic updates
- Background refetching

### Why MSW (Mock Service Worker)?
- Network-level mocking (more realistic)
- Works in both browser and tests
- No code changes between dev/prod
- Better than axios-mock-adapter

### Why SQLAlchemy?
- Industry standard Python ORM
- Type-safe queries
- Migration support (Alembic)
- Works with multiple databases

## Future Enhancements

### Short-term (UI Focus)
1. Comprehensive error handling for backend failures
2. Form validation improvements
3. Loading states and skeleton screens
4. Offline detection and graceful degradation
5. Backend health checking and status display

### Medium-term (UI + OpenAPI Evolution)
1. Advanced search and filtering
2. Batch operations UI
3. Export functionality (CSV, JSON)
4. **OpenAPI spec v2** with extended endpoints:
   - Advanced query parameters
   - Bulk operations
   - WebSocket events (optional)
5. Backend compatibility testing suite

### Long-term (Ecosystem)
1. **Multi-backend support dashboard** - connect to multiple Admin APIs simultaneously
2. **Backend implementation templates** - starter kits for Go, Java, .NET
3. **Compliance testing tool** - validate backend adherence to OpenAPI spec
4. **Community backend registry** - catalog of known implementations
5. **Plugin system** - extend UI for custom backend features
6. GraphQL gateway (optional - wraps REST backends)
7. Mobile app (React Native) using same OpenAPI client
8. Real-time updates (WebSockets as optional OpenAPI extension)

## Backend Implementation Guide

### For Organizations Building Their Own Admin API

If you're implementing the Admin API in your preferred language/framework:

**1. Start with the OpenAPI Spec**
```bash
# File: Federation Admin OpenAPI.yaml
# This is the contract your backend must fulfill
```

**2. Use MSW Handlers as Behavioral Reference**
```bash
# File: src/mocks/handlers.ts
# Shows expected request/response patterns
# Demonstrates error handling
# Illustrates state transitions
```

**3. Required Endpoints (Minimum Viable Backend)**
- `POST /auth/login` - Authentication
- `GET /subordinates` - List subordinates
- `POST /subordinates` - Create subordinate
- `GET /subordinates/{id}` - Get subordinate details
- `PATCH /subordinates/{id}` - Update subordinate
- `GET /trust-anchors` - List trust anchors
- `GET /.well-known/openid-federation` - Entity configuration

**4. Testing Your Backend with the UI**
```bash
# Build the UI pointing to your backend
VITE_API_BASE_URL=https://your-api.example.org npm run build

# Or in development
VITE_API_BASE_URL=https://your-api.example.org npm run dev
```

**5. CORS Configuration**
```
Access-Control-Allow-Origin: https://ui.example.org
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

**6. Authentication Flexibility**

The UI expects an `Authorization` header, but your backend can use:
- JWT tokens (like reference implementation)
- OAuth2 bearer tokens
- API keys
- Session cookies
- Any other method that can be passed in headers

**7. Reference Implementations**

| Language | Framework | Repository | Status |
|----------|-----------|------------|--------|
| Python | FastAPI | This repo (`backend/`) | Partial |
| Go | (TBD) | - | Planned |
| Java | (TBD) | - | Planned |
| .NET | (TBD) | - | Planned |

**8. Validation**

Run the UI test suite against your backend:
```bash
npm run test:backend-compliance -- --api-url https://your-api.example.org
```
(Planned feature - will validate OpenAPI conformance)

## Development Guidelines

### Adding a New Page

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Create custom hook in `src/hooks/` if fetching data
4. Add MSW handler in `src/mocks/handlers.ts`
5. Add backend endpoint in `backend/app/routers/`

### Adding a New API Endpoint

1. Update `Federation Admin OpenAPI.yaml`
2. Regenerate TypeScript client: `npm run generate-client`
3. Create Pydantic schema in `backend/app/schemas/`
4. Create router in `backend/app/routers/`
5. Add MSW handler for development
6. Create custom React hook

### Database Changes

1. Update SQLAlchemy model in `backend/app/models/`
2. Create Alembic migration (when implemented)
3. Update seed data in `backend/app/db/seed.py`
4. Update Pydantic schemas

## Security Considerations

### Current State
- JWT authentication (no HTTPS in dev)
- Password hashing with bcrypt
- Basic input validation (Pydantic)
- No CSRF protection (stateless JWT)

### Production Requirements
- HTTPS/TLS required
- CORS whitelist configuration
- Rate limiting on auth endpoints
- Password complexity requirements
- Token rotation/refresh
- Audit logging
- Secrets management (not hardcoded)

## Performance Considerations

### Frontend
- Code splitting (React.lazy)
- React Query caching (staleTime, cacheTime)
- Virtual scrolling for large lists (planned)
- Image optimization
- Bundle size monitoring

### Backend
- Database query optimization
- Connection pooling
- Response caching (Redis, planned)
- Async I/O (FastAPI native)
- Database indexing

## Testing Strategy

### Current State
- No comprehensive test suite (to be implemented)

### Planned
**Frontend**:
- Unit tests: Vitest + React Testing Library
- Integration tests: MSW + React Testing Library
- E2E tests: Playwright/Cypress

**Backend**:
- Unit tests: pytest
- Integration tests: TestClient (FastAPI)
- API contract tests: OpenAPI validation

## Monitoring & Observability

### Planned
- **Logging**: Structured JSON logs with correlation IDs
- **Metrics**: Request counts, latency, error rates
- **Tracing**: Distributed tracing across services
- **Alerting**: Critical error notifications

## Documentation

### Current
- `README.md` - Setup and getting started
- `ARCHITECTURE.md` - This document
- `DEMO-ASSESSMENT.md` - Demo readiness assessment
- `demo-script-revised.md` - Demo walkthrough
- OpenAPI spec - API documentation

### Planned
- API reference documentation
- User guide for operators
- Deployment runbook
- Troubleshooting guide

## Project Scope & Deliverables

### Primary Deliverable: Universal UI

**What this project provides**:
1. ✅ Production-ready React UI for OIDFed management
2. ✅ OpenAPI specification (the contract)
3. ✅ MSW handlers (reference behavior)
4. ✅ Reference FastAPI backend (example implementation)
5. ✅ Docker deployment templates
6. ✅ TypeScript API client generation tools

**What this project does NOT provide**:
- ❌ A specific backend you must use
- ❌ Database schema (implementation-dependent)
- ❌ Cryptographic OIDFed protocol implementation (backend's responsibility)
- ❌ Specific authentication method (flexible)

### Adoption Paths

**Path 1: Use the Reference Backend**
```bash
# Quick start - use our FastAPI implementation
docker-compose up --build
```

**Path 2: Build Your Own Backend**
```bash
# Implement the OpenAPI spec in your language
# Point the UI to your backend
VITE_API_BASE_URL=https://your-api.org npm run build
```

**Path 3: Hybrid**
```bash
# Use our UI + reference backend, extend with custom endpoints
# Add custom features via OpenAPI extensions
```

## Contact & Maintenance

**Codebase**: `/Users/alex.petrunin/federation-gateway`

**Key Files**:
- [`Federation Admin OpenAPI.yaml`](Federation Admin OpenAPI.yaml) - **THE CONTRACT**
- [`src/mocks/handlers.ts`](src/mocks/handlers.ts) - Reference behavior
- [`package.json`](package.json) - Frontend dependencies
- [`vite.config.ts`](vite.config.ts) - Build configuration
- [`backend/app/main.py`](backend/app/main.py) - Reference backend (optional)
- [`src/App.tsx`](src/App.tsx) - React app entry point

**For Backend Implementers**:
- Start with: [`Federation Admin OpenAPI.yaml`](Federation Admin OpenAPI.yaml)
- Reference: [`src/mocks/handlers.ts`](src/mocks/handlers.ts)
- Example: [`backend/`](backend/)

---

**Last Updated**: February 16, 2026
