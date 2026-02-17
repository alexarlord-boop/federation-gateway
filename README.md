# Federation Gateway

**Backend-Agnostic UI** for managing OpenID Federation entities, trust anchors, subordinates, and trust marks.

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
