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
deployment doesn't run any of it. Your LightHouse instance(s) are
whatever you (or your federation) already operate, wherever that is.

`ui` and `backend` don't have the entity_id/identity constraints
LightHouse does (`CLAUDE.md` constraints #2/#11 — that's specifically
about the mesh) — they're a normal stateful web app (SQLite by default;
see `docs/ARCHITECTURE.md`'s "not yet built" note if you want Postgres)
and can run under whatever orchestration you already use: Kubernetes,
ECS, or `docker-compose.yml` trimmed down to just those two services
(note `backend`'s `depends_on: lighthouse: condition: service_healthy`
in the bundled file exists only because the demo assumes the bundled
mesh — drop it, it doesn't apply to an external instance).

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
