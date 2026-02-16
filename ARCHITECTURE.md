# System Architecture

## Overview

The Federation Gateway Admin UI is a web-based interface for managing OpenID Federation entities, subordinates, trust marks, and trust anchors. This document outlines the system architecture, components, data flow, and deployment strategy.

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

### 2. FastAPI Backend (`backend/`)

**Purpose**: Authentication, subordinate management, and entity configuration

**Technology Stack**:
- FastAPI (Python web framework)
- SQLAlchemy (ORM)
- SQLite (development database)
- Jose (JWT handling)
- Bcrypt (password hashing)

**Port**: 8765

**Status**: Partial implementation - primarily supports authentication and basic CRUD operations

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

**Purpose**: Development-time API mocking to enable frontend development without a full backend

**Location**: `public/mockServiceWorker.js` + `src/mocks/handlers.ts`

**Status**: Active in development mode only (disabled in production builds)

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

**Development**:
```typescript
// src/client/core/OpenAPI.ts
BASE: 'http://localhost:8765'
```

**Production** (planned):
```typescript
BASE: import.meta.env.VITE_API_BASE_URL || '/api'
```

Environment variable: `VITE_API_BASE_URL`

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

### Why Vite?
- Fast HMR (Hot Module Replacement)
- Modern build tool (ESBuild)
- Better than Create React App for performance

### Why FastAPI?
- Native async/await support
- Auto-generated OpenAPI docs
- Type hints with Pydantic
- Fast performance (comparable to Node.js)

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

### Short-term
1. Complete FastAPI backend implementation
2. Real database migration system (Alembic)
3. Comprehensive error handling
4. Form validation improvements
5. Loading states and skeleton screens

### Medium-term
1. Role-based access control (RBAC)
2. Audit logging for all operations
3. Advanced search and filtering
4. Batch operations
5. Export functionality (CSV, JSON)

### Long-term
1. Separate Auth Gateway service
2. OIDC/SAML federation support
3. Multi-tenancy support
4. GraphQL API (alternative to REST)
5. Real-time updates (WebSockets)
6. Mobile-responsive design improvements

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

## Contact & Maintenance

**Codebase**: `/Users/alex.petrunin/federation-gateway`

**Key Files**:
- [`package.json`](package.json) - Frontend dependencies
- [`vite.config.ts`](vite.config.ts) - Build configuration
- [`docker-compose.yml`](docker-compose.yml) - Container orchestration
- [`backend/app/main.py`](backend/app/main.py) - FastAPI entry point
- [`src/App.tsx`](src/App.tsx) - React app entry point

---

**Last Updated**: February 16, 2026
