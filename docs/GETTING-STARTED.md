# Getting Started

A one-page tour for anyone new to this tool — whether you're new to OpenID
Federation too, or you're an experienced federation operator seeing this UI
for the first time. Two parts: **run it**, then **use it**.

---

## 1. Run it

```sh
python3 scripts/generate-secrets.py   # one-time — writes a gitignored .env
docker compose up --build
```

The first command generates real local values for the admin credentials
and signing keys `docker compose up` now requires (`docker-compose.yml`
fails closed with no defaults — see `PRODUCTION-READINESS.md` #5). Only
needed once; it skips itself on a second run if `.env` already exists.

This starts the **UI** (nginx, port `8080`), the **backend** gateway/BFF
(FastAPI, port `8765`), two standalone **LightHouse** federation nodes
(`8081`, `8082`) pre-wired as separate trust anchors so you have something
real to explore multi-instance behavior with, and two small **meshes** of
LightHouse nodes each wired into an actual multi-hop hierarchy — one on its
own, one to demonstrate interfederation with the first — see
`docs/FEDERATION-TOPOLOGY.md` if you want to explore that instead.

Open **http://localhost:8080** and log in:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@oidfed.org` | `admin123` |
| Regular user | `tech@example.org` | `user123` |

(admin password is `ADMIN_BOOTSTRAP_PASSWORD` in `.env` — change it
before any real deployment, see `PRODUCTION-READINESS.md` #2)

**You'll land with no instance selected on purpose** — the UI never
auto-picks one. Use the instance switcher at the top of the sidebar and
choose **LightHouse** (or **LightHouse 2**) before anything else will load
data. This is deliberate: in a real multi-tenant deployment, silently
defaulting to an instance is how people edit the wrong federation.

Instances themselves aren't created in the UI — they're declared in
`backend/config/gateway.yaml` and loaded at backend startup. To point this
tool at a different (or additional) real Admin API, add an entry there; see
`FEDERATION-TOPOLOGY.md` for the full steps.

---

## 2. The mental model

This tool is a UI over the [OpenID Federation](https://openid.net/specs/openid-federation-1_0.html)
Admin API — it manages **one federation entity's** configuration (yours),
its **subordinates** (entities you vouch for), and the **trust marks** it
issues or holds. It talks to the real federation node (LightHouse, or any
backend implementing the same OpenAPI contract) through a backend proxy —
credentials never reach the browser.

A few terms worth knowing before you click around:

| Term | Meaning |
|---|---|
| **Entity** | Any participant in a federation — identified by a URL (its Entity ID). |
| **Trust Anchor** | An entity other federation members trust as a root of trust. This tool manages *your own instance* as one. |
| **Subordinate** | An entity your instance vouches for directly — you sign statements about it. |
| **Authority Hint** | The reverse relationship — who *your* entity points to as its own trust anchor(s). |
| **Trust Chain** | The signed path from a leaf entity up through intermediates to a trust anchor, proving federation membership. |
| **Trust Mark** | A signed, typed assertion one entity issues about another (e.g. "eduGAIN member") — see below, it has its own mini mental-model. |

### Trust marks have four roles — know which one you're in

This is the part that trips people up, because your own instance can play
more than one role at once. Every trust-mark screen in this tool maps to
exactly one of these:

| Role | What it does | Where in this tool |
|---|---|---|
| **Owner** | Defines what a mark type means, decides who may issue it | Trust Marks → **Federation Trust Marks** |
| **Issuer** | Signs and hands marks to subject entities | Trust Marks → **Issuance** |
| **Subject** | Holds a mark, publishes it in its own entity config | Trust Marks → **My Trust Marks** |
| **Relying Party** | Checks a mark is genuine and still active, live | **Chain Inspector** → any mark's "Verify Live Status" |

The Trust Marks page itself has a legend at the top showing this exact
mapping — if you forget, it's right there.

---

## 3. Workflow tour

### Dashboard
At-a-glance entity counts (total / active / pending), recent entities,
pending approvals, and a real **Instance** card (LightHouse version, signing
algorithm, which protocol endpoints are actually live right now, entity
statement freshness) — not a static "about" panel, it reflects the
currently connected instance.

### Subordinates (`Subordinates` in the sidebar)
The core CRUD flow: **Register Subordinate** is a four-step wizard —
enter the entity ID, review its fetched configuration (or fill it in
manually if the entity isn't reachable yet), add any extra details, then
confirm. Once registered, an entity's detail page has
tabs for Overview, Metadata, JWKS, Constraints, and Metadata Policies — each
editable if you have the `update` permission. Status changes (Active /
Blocked / Inactive) happen from the entity header; **Pending** entities
need someone with approval rights to act on them via **Approvals**.

From an entity's detail page you can also **Issue Trust Mark** directly
(pre-filled with that entity's ID) — no need to navigate to Trust Marks
separately if you already know who you're issuing to.

### Trust Marks
Follow the natural lifecycle, left to right in the tabs: define the type
and who can issue it (**Federation Trust Marks**), issue it to entities
(**Issuance**), and — if your own instance is a subject rather than just an
issuer — publish what you hold (**My Trust Marks**, three ways to add a
mark: paste a JWT you received, point at an external issuer to auto-fetch
and refresh, or self-issue).

Every mark you can view has a **Verify Live Status** action — it doesn't
check a local signature, it asks the *issuer's own* status endpoint whether
the mark is still active (the actual OIDF §8.3 mechanism). This works for
marks issued by anyone, not just this instance.

### Chain Inspector
Two modes, both under one page:
- **Any Entity** — paste *any* real entity ID on the internet and fetch its
  live `.well-known/openid-federation` statement directly, walk its
  authority hints, and verify any trust marks it holds. Doesn't require the
  entity to be registered with this instance at all.
- **Via Trust Anchor** — the traditional `/fetch` and `/resolve` calls
  scoped to entities registered as *this instance's* subordinates.

Use "Any Entity" to sanity-check interop against real federations (there
are shortcuts pre-filled for the live eduGAIN OIDFed testbed); use "Via
Trust Anchor" to debug your own subordinate relationships.

### Stats
Traffic metrics for the connected instance — request volume, error rate,
latency percentiles, a requests-over-time chart, and breakdowns by status
code, endpoint, user agent, client, and query parameter. Pulls directly
from LightHouse's own `/stats` endpoints; if disabled on the backend, the
page tells you the exact config line to add.

### Audit Log
Every mutating action taken through this UI, who did it, when, and — click
**View** — the actual resulting server state (not just "something changed").
Sensitive fields (keys, tokens, delegation JWTs) are redacted before
storage. Filter by resource type, action, or user.

### Settings / RBAC / Users
Settings covers your own entity's configuration surface (federation
endpoints advertised, signing keys, constraints, metadata policies) in more
detail than the Dashboard card. RBAC and Users are gateway-level (not
per-instance) — who can do what across this whole deployment.

---

## 4. Where to go deeper

- **`KNOWN-ISSUES.md`** — an honest, continuously-updated list of what's
  fixed, what's a known gap in our own code, and what needs upstream
  LightHouse/OIDFed collaboration. Read this before assuming something
  broken is a new bug — it might already be documented.
- **`../README.md`** — repository layout, services/ports, deployment
  config, and a full documentation index.
- **`LOCAL-DEVELOPMENT.md`** — running the UI/backend outside Docker.
- **`TESTING.md`** — running the Playwright suite.
- **`FEDERATION-TOPOLOGY.md`** — adding another instance, the mesh, how
  the Trust Anchors page relates to `gateway.yaml`.
- **`../Federation Admin OpenAPI.yaml`** — the API contract this UI is
  built against; the source of truth for what any backend needs to
  implement.
- **[testbed.oidf.lab.surf.nl](https://testbed.oidf.lab.surf.nl)** — a live
  directory of real eduGAIN OIDFed federations, useful for testing Chain
  Inspector and trust mark verification against genuine external data
  instead of only this instance's own fixtures.
