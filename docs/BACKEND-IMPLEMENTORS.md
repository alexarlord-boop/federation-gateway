# Building Your Own Admin API Backend

The UI is designed to work with **any** OpenID Federation Admin API
implementation that adheres to the OpenAPI specification
(`../Federation Admin OpenAPI.yaml`):

- **The UI is the product** — a universal frontend for OIDFed management.
- **The OpenAPI spec is the contract** — any backend implementing it can
  plug in.
- **Multiple backend implementations are expected** — organizations can
  choose or build their own (Python, Go, Java, .NET, etc.).
- **The FastAPI backend in this repo is a reference implementation and
  gateway (BFF)** — it isn't a mock; it's a real service that proxies to a
  real federation node (LightHouse) and owns its own concerns (auth, RBAC,
  audit, instance registry).

## Steps

1. **Start with the OpenAPI spec** — `../Federation Admin OpenAPI.yaml` is
   the contract. Implement all endpoints, or a documented subset.
2. **Use the reference backend as a behavioral example** —
   `backend/app/routers/` shows real request/response shapes; `proxy.py`
   shows how mutating requests get audited, `resolve.py` shows the
   SSRF-guarded pattern for fetching arbitrary external entity data. The
   e2e suite in `e2e/tests/` exercises real request/response shapes end to
   end against a live stack.
3. **Implement `/api/v1/capabilities`** so the UI can adapt navigation,
   buttons, and RBAC permission lists to what your backend actually
   supports (see `CAPABILITY-DISCOVERY.md`). Example response:
   ```json
   {
     "version": "1.0.0",
     "implementation": { "name": "My Backend", "version": "0.1.0" },
     "features": {
       "subordinates": { "enabled": true, "operations": ["list", "create", "read", "update", "delete"] },
       "trust_marks": { "enabled": false, "reason": "Not implemented yet" }
     }
   }
   ```
4. **Handle CORS** for the UI origin, and accept whatever bearer-token
   scheme you choose — the backend attaches auth server-side, the browser
   never needs to know your credential format:
   ```
   Access-Control-Allow-Origin: https://your-ui-domain.org
   Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
   Access-Control-Allow-Headers: Content-Type, Authorization
   Access-Control-Allow-Credentials: true
   ```
5. Point this UI's backend proxy at your implementation by adjusting
   `backend/config/gateway.yaml`'s `admin_base_url` for an instance —
   there's no separate "point the UI directly at a custom backend" mode;
   the FastAPI gateway is a required layer (it's what does RBAC, audit, and
   SSRF-guarding). See `FEDERATION-TOPOLOGY.md` for the full steps to add
   an instance.

## Community implementations

| Language | Framework | Status |
|----------|-----------|--------|
| Go | Gin/Echo | Planned |
| Java | Spring Boot | Planned |
| .NET | ASP.NET Core | Planned |
| Node.js | Express/NestJS | Planned |

None exist yet — the reference FastAPI backend in this repo is the only
implementation exercised in practice so far.

## Deploying the UI against a backend you don't run in this repo's compose stack

The UI reads its backend URL from `VITE_API_BASE_URL` at build time:

```sh
cp .env.example .env.local
# Edit .env.local:
VITE_API_BASE_URL=https://your-backend.example.org
npm run dev
```

Docker (UI only):

```sh
docker build -t federation-gateway-ui .
docker run -p 8080:80 \
  -e VITE_API_BASE_URL=https://your-backend.example.org \
  federation-gateway-ui
```

Static hosting (S3, Netlify, Vercel):

```sh
VITE_API_BASE_URL=https://api.example.org npm run build
# Upload ./dist
```

Kubernetes:

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

This is a genuinely different deployment shape from the docker-compose
setup documented everywhere else in this repo (which always runs the
bundled reference backend) — none of the above has been exercised in this
repo's own development or test suite.
