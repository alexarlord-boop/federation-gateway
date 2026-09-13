# Deployment

`docs/GETTING-STARTED.md` and `README.md`'s Quick Start both walk through
the bundled demo — the `mesh-*`/`mesh2-*` LightHouse mesh this repo ships
and seeds for you, with local seeded accounts. This doc is the other
half: pointing the same `ui` + `backend` application at **your** real
LightHouse instance(s) instead, with real credentials and real login.

Read this after `PRODUCTION-READINESS.md`'s other six items — this doc
assumes they're already true of your deployment, not just theoretically
available. It's a checklist and a set of pointers, not new mechanism;
everything it references was built and verified in #1–#6.

## 1. What's actually yours to run

Only `ui` and `backend` are "this application." Everything else in
`docker-compose.yml` (`lighthouse`, `lighthouse2`, every `mesh-*`/
`mesh2-*` service) is demo fixture data for trying the tool out — a real
deployment doesn't run any of it.

`ui` and `backend` don't have the entity_id/identity constraints
LightHouse does (`CLAUDE.md` constraints #2/#11 — that's specifically
about the mesh) — they're a normal stateful web app (SQLite by default;
see `docs/ARCHITECTURE.md`'s "not yet built" note if you want Postgres)
and can run under whatever orchestration you already use: Kubernetes,
ECS, or a trimmed-down `docker-compose.yml`. Which trim depends on which
of these two you're doing:

### Scenario A — you already operate a LightHouse (or compatible) instance elsewhere

Your instance is wherever you (or your federation) already run it —
this repo's compose file doesn't manage it at all. Run just `ui` +
`backend`, with no `lighthouse` service and no dependency on one:

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      GATEWAY_CONFIG_FILE: /config/gateway.yaml
      # Names are yours to choose — see step 2 below. These two are just
      # an example matching this doc's gateway.yaml sample.
      MY_TA_ADMIN_USERNAME: ${MY_TA_ADMIN_USERNAME:?Set in .env}
      MY_TA_ADMIN_PASSWORD: ${MY_TA_ADMIN_PASSWORD:?Set in .env}
      DATABASE_URL: sqlite:////data/backend.db
      OIDC_ENCRYPTION_KEY: ${OIDC_ENCRYPTION_KEY:?Set in .env}
      JWT_SECRET: ${JWT_SECRET:?Set in .env}
      ADMIN_BOOTSTRAP_PASSWORD: ${ADMIN_BOOTSTRAP_PASSWORD:?Set in .env}
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost:8080}
    volumes:
      - ./backend/config:/config:ro
      - ./backend/data:/data
    ports:
      - "${BACKEND_PORT:-8765}:8765"
    healthcheck:
      test: ["CMD", "python3", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8765/health')"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 10s

  ui:
    build:
      context: .
    environment:
      BACKEND_HOST: ${BACKEND_SERVICE_NAME:-backend}
      BACKEND_PORT: ${BACKEND_PORT:-8765}
    ports:
      - "${UI_PORT:-8080}:80"
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://127.0.0.1/"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 5s
```

No `depends_on: lighthouse` here (the bundled `docker-compose.yml` only
has that because the demo assumes the bundled mesh) and no
`LIGHTHOUSE2_ADMIN_*` (that pair is specific to the demo's second
federation) — this file only knows about your one real instance, named
via whatever env vars your own `gateway.yaml` (step 2) references.

### Scenario B — you're standing up a new LightHouse instance specifically for this deployment

Same two services, plus a `lighthouse` service you actually own and
run going forward (not the shared demo one) — this is the bundled
`docker-compose.yml`'s `ui`/`backend`/`lighthouse` trio, unchanged, with
`lighthouse2` and every `mesh-*`/`mesh2-*` service removed:

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      GATEWAY_CONFIG_FILE: /config/gateway.yaml
      MY_TA_ADMIN_USERNAME: ${MY_TA_ADMIN_USERNAME:?Set in .env}
      MY_TA_ADMIN_PASSWORD: ${MY_TA_ADMIN_PASSWORD:?Set in .env}
      DATABASE_URL: sqlite:////data/backend.db
      OIDC_ENCRYPTION_KEY: ${OIDC_ENCRYPTION_KEY:?Set in .env}
      JWT_SECRET: ${JWT_SECRET:?Set in .env}
      ADMIN_BOOTSTRAP_PASSWORD: ${ADMIN_BOOTSTRAP_PASSWORD:?Set in .env}
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost:8080}
    volumes:
      - ./backend/config:/config:ro
      - ./backend/data:/data
    ports:
      - "${BACKEND_PORT:-8765}:8765"
    depends_on:
      lighthouse:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "python3", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8765/health')"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 10s

  ui:
    build:
      context: .
    environment:
      BACKEND_HOST: ${BACKEND_SERVICE_NAME:-backend}
      BACKEND_PORT: ${BACKEND_PORT:-8765}
    ports:
      - "${UI_PORT:-8080}:80"
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://127.0.0.1/"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 5s

  lighthouse:
    image: oidfed/lighthouse@sha256:828cafdf07ecb933e136d735afd69d05010e24da87191e8d25998bc0dbe52889
    restart: unless-stopped
    entrypoint:
      - /bin/sh
      - -c
      - mkdir -p /data/keys && chmod 0777 /data /data/keys && exec /entrypoint.sh
    ports:
      - "${LIGHTHOUSE_PUBLIC_PORT:-8081}:8080"
    volumes:
      - ./lighthouse/config.yaml:/config/config.yaml:ro
      - ./lighthouse/data:/data
    environment:
      LH_CONFIG_FILE: "/config/config.yaml"
    healthcheck:
      test: ["CMD", "bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/8080 && printf 'GET /.well-known/openid-federation HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n' >&3 && head -1 <&3 | grep -q 200"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
```

The one thing you cannot copy from the demo: `lighthouse/config.yaml`'s
`entity_id` is `http://localhost:8081` there, which only resolves inside
your own machine. Yours needs to be the real, publicly resolvable HTTPS
URL this instance will be known by — get this wrong on day one and
you're re-keying and re-establishing every trust relationship later
(`docs/TLS.md` explains why it can't be fixed retroactively). This
instance also still needs the one-time `lhmigrate config2db` step
(step 3 below) and its own admin user before the admin API responds to
anything.

## 2. Point `gateway.yaml` at your real instances

`backend/config/gateway.yaml` (read from `GATEWAY_CONFIG_FILE`, mounted
read-only in `docker-compose.yml` today) is a static list — there's no
"add instance" flow in the UI, only this file. Replace the bundled
`instances:` entries with your own:

```yaml
instances:
  - id: my-ta
    name: My Federation's Trust Anchor
    public_base_url: https://ta.my-federation.example.org
    admin_base_url: https://ta-admin.my-federation.example.org
    public_port: 443
    admin_port: 443
    admin_auth:
      type: basic
      username_env: MY_TA_ADMIN_USERNAME
      password_env: MY_TA_ADMIN_PASSWORD
```

`public_base_url` is the instance's real federation identity
(`entity_id`) — get this wrong and you're not administering the entity
you think you are. `admin_base_url` is a separate, purely operational
address; it doesn't have to be publicly reachable at all (see
`docs/TLS.md` #2 on why these two are different in kind). Pick your own
env var names per instance (`username_env`/`password_env` — they don't
have to be `LIGHTHOUSE_ADMIN_*`, that's just what the bundled demo
instances happen to use) and set real values for them in `.env`.

## 3. Your LightHouse instance needs its own admin user

If your real LightHouse instance already has `api.admin.users_enabled:
true` and an admin user provisioned some other way, you're done — point
`admin_auth` at those credentials. If not, the *mechanism*
`scripts/bootstrap-lighthouse-admin-users.py` uses works against any
reachable instance — `PRODUCTION-READINESS.md` #3 documents it in full
(it's genuinely undocumented upstream; that writeup is the only place
this is explained) — but the script's own `INSTANCES` list is hardcoded
to the bundled demo instances' `localhost` ports. Either add your
instance to that list or just replicate the two-step curl sequence #3
describes directly: an unauthenticated `POST /api/v1/admin/users/`
works exactly once, before any user exists on that instance.

If your instance runs the same `oidfed/lighthouse` image this repo pins
(0.22.x+), it also needs the one-time `lhmigrate config2db` step —
`scripts/migrate-lighthouse-config.py` automates it for the bundled demo
instances; see `CLAUDE.md` hard constraint #13 and `docs/KNOWN-ISSUES.md`
for why. Doesn't apply if your instance predates 0.22 or isn't LightHouse.

## 4. Secrets

Copy `.env.example` to `.env` and set real values for everything your
`gateway.yaml` instances reference, plus `OIDC_ENCRYPTION_KEY` and
`JWT_SECRET` (`scripts/generate-secrets.py` for random values — fine for
those two, and for any per-instance admin password). Two exceptions:

- **`ADMIN_BOOTSTRAP_PASSWORD`** — set this to something real yourself,
  don't leave it `admin123`. See step 6 below; there's no forced
  rotation yet (`PRODUCTION-READINESS.md` #2), so this is on you.
- **A real secrets manager, not a committed `.env` file** — this repo
  reads plain env vars, so however your infrastructure injects those
  (Vault, your cloud provider's secrets manager, Kubernetes secrets,
  whatever you already use) works without any code changes here. A flat
  `.env` on a real server is exactly the "no secrets-manager
  integration" gap `PRODUCTION-READINESS.md` #5 flagged as
  deliberately not solved in this repo — picking a specific vendor
  isn't this repo's call to make.

## 5. TLS

Per-hop guidance, and why LightHouse-to-LightHouse specifically needs
real HTTPS `entity_id`s from your very first seed rather than added
later: `docs/TLS.md`.

## 6. Real user login, and getting off the bootstrap account

1. Log in once as `admin@oidfed.org` with whatever you set
   `ADMIN_BOOTSTRAP_PASSWORD` to.
2. Configure at least one real OIDC provider at `/identity-providers`
   (super_admin-only).
3. Log in via that provider, then have the bootstrap admin assign your
   new SSO account the `super_admin` RBAC role from the Users page — new
   SSO users are deliberately roleless until assigned by hand
   (`PRODUCTION-READINESS.md` #1, by design, not a bug).
4. From here, treat `admin@oidfed.org` as a break-glass account, not a
   daily driver: nothing in this repo disables it automatically or
   forces its password to rotate. Change its password to something you
   don't use day-to-day, or stop relying on it entirely once real SSO
   accounts exist.

## 7. Backup/restore

`scripts/backup.py`/`restore.py` back up `backend.db` and every
LightHouse instance's DB + signing keys by reading their files directly
off the local filesystem (`backup.py`'s `LIGHTHOUSE_INSTANCES` list, one
entry per bind-mounted `*/data/` directory). That only works if your
real LightHouse instance(s) run the same way the demo mesh does — local
to this same host/deployment, data directories reachable on disk. If
your federation's LightHouse instance is genuinely separate
infrastructure (a different server, run by a different team), backing
*that* one up is its own operator's responsibility, with whatever tool
fits their infrastructure — this script isn't it, and can't be, since it
has no remote-access story at all. `backend.db` is always local to your
deployment regardless, so `backup.py` (adjusted to drop the
`LIGHTHOUSE_INSTANCES` entries that don't apply) still covers that half.
See `docs/BACKUP-RESTORE.md` for the full procedure either way, and why
a signing key and a database are different severities of loss. Where
the archive ends up and how often it runs are your call, same as the
secrets-manager question above.

## Checklist before calling this "live"

- [ ] `gateway.yaml` lists your real instance(s) with real, HTTPS
      `public_base_url`/`entity_id` — not a bundled demo entry
- [ ] Each instance's admin user is provisioned and `admin_auth`
      credentials in `.env` match
- [ ] `.env` holds real values (no `change-me`, no default
      `ADMIN_BOOTSTRAP_PASSWORD`), injected via a real secrets manager
      in production rather than a flat file
- [ ] TLS in place per `docs/TLS.md`'s per-hop breakdown
- [ ] At least one real OIDC provider configured and tested; a real
      person, not just the bootstrap account, holds `super_admin`
- [ ] Backup scheduled somewhere off-host, restore tested at least once
- [ ] You've read `PRODUCTION-READINESS.md`'s "Tracked, not actionable
      here" section (LightHouse's `/resolve` not honoring `blocked` — an
      upstream bug, not something this repo can fix, but worth knowing
      about before you rely on blocking as a real control)
