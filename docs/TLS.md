# TLS

Every hop in the bundled demo stack — browser→UI, UI→backend,
backend→LightHouse, LightHouse→LightHouse — is plain HTTP today. This
file is deliberately **guidance, not a build task**: PRODUCTION-READINESS.md
#4 scoped "TLS everywhere" to documentation-only for the reasons below,
rather than bolting self-signed certs onto the demo compose file.

## Why this isn't just a transport config flag

For the browser↔UI hop, TLS really is just a transport concern — add a
cert, terminate it at nginx, done. But for LightHouse, it isn't, because
of one constraint that's easy to miss: **`entity_id` is not a connection
address, it's the entity's cryptographic identity in the federation**
(see `CLAUDE.md`'s hard constraint #2 and #11). Every subordinate
registration, every issued trust mark, every resolved trust chain in
this repo's seeded demo mesh is signed against `http://mesh-ta:8080`,
`http://mesh-ia:8080`, etc. — literal strings, not just "wherever that
container happens to be reachable." Changing an entity's scheme from
`http://` to `https://` **is** an identity change, equivalent to that
entity ceasing to exist and a new one taking its place. It cannot be
migrated in place; every subordinate/authority-hint/trust-mark
relationship pointing at the old identity has to be re-established
against the new one.

That's why "TLS everywhere" doesn't decompose into one task — it splits
into two very different problems:

## 1. Browser→UI and UI→backend (transport-only — genuinely retrofittable)

These hops carry no identity semantics; TLS here is a pure infrastructure
concern and can be added at any time without touching federation state.
For a real deployment:

- Terminate TLS at the edge — a real reverse proxy or cloud load
  balancer (nginx, Caddy, Traefik, or a managed ingress/LB) in front of
  the `ui` container, with a real certificate (Let's Encrypt via ACME,
  or your org's CA) for your real public DNS name. Don't hand-roll this
  into the `ui` image's nginx config — a dedicated edge proxy/ingress is
  the standard pattern and keeps cert renewal out of the app image
  entirely.
- UI→backend (`nginx`'s `proxy_pass http://backend:8765` in `Dockerfile`)
  can reasonably stay plain HTTP if both containers are on a private,
  trusted network you control (the common case for a single
  docker-compose or single-pod deployment). If backend and UI are ever
  split across a network boundary you don't fully trust, add TLS there
  too — `uvicorn --ssl-keyfile`/`--ssl-certfile` on the backend side
  (currently plain `uvicorn app.main:app --host 0.0.0.0 --port 8765` in
  `backend/Dockerfile`, no TLS flags), matched with `proxy_pass
  https://backend:8765` and a trusted CA on the nginx side.

## 2. backend→LightHouse admin API (transport-only, but needs a note)

Unlike LightHouse-to-LightHouse federation traffic, the **admin API**
hop is not identity-bound — `admin_base_url` in
`backend/config/gateway.yaml` is a separate field from `entity_id`/
`public_base_url`, purely operational config for where the backend
happens to reach that instance's admin API. LightHouse's binary does
have TLS-related config surface for this (`admin_tls`/`key_file`
fields, found by extracting strings from the `oidfed/lighthouse` binary
per the same technique used to reverse-engineer its admin-auth schema
in PRODUCTION-READINESS.md #3 — undocumented, unverified, no vendored
docs exist). Real deployment guidance:

- Simplest and most robust: put the admin API behind the same private
  network boundary as backend↔LightHouse already assumes (docker
  network / VPC / private subnet), and don't expose `admin_base_url`
  publicly at all — network isolation, not TLS, is the actual control
  here, same as this repo already relies on today (`docs/KNOWN-ISSUES.md`
  called this out before #3 turned on LightHouse's own auth check on
  top of it).
- If backend and LightHouse instances ever cross an untrusted network,
  add TLS on that hop specifically — this would need empirical
  verification of LightHouse's actual `admin_tls` config schema (same
  binary-string-extraction or live-container-probe approach used for
  #3), plus `backend/app/routers/proxy.py`'s `_get_client()` and
  `backend/app/utils/capability_probe.py`'s `AsyncClient(...)` call
  sites would need a `verify=` argument pointed at a real/mounted CA
  bundle (neither passes `verify=` today, so httpx defaults to the
  system CA store — fine once `admin_base_url` uses a certificate that
  store actually trusts, i.e. not a bare self-signed cert). Not built
  here because it hasn't been needed yet and would need real
  verification against the actual (undocumented) LightHouse TLS schema
  before shipping it — flagged as a concrete next step if/when this
  hop needs to cross a real network boundary.

## 3. LightHouse-to-LightHouse (federation protocol — not retrofittable)

This is the one that can't be bolted on after the fact. **Decide the
scheme before you seed anything.** If you're standing up a real
federation (not the bundled `mesh-*`/`mesh2-*` demo), every instance's
`entity_id` and `public_base_url` must be its real `https://` public DNS
name **from the very first entity configuration it ever publishes** —
not `http://` now with a plan to migrate to `https://` later. A working
real-world OIDF federation (e.g. the `testbed.oidf.lab.surf.nl`
federation this repo's `docs/KNOWN-ISSUES.md` cross-checks bugs against)
uses real HTTPS entity_ids for exactly this reason.

Practically, this means:
- Real public DNS name + real certificate (Let's Encrypt or your CA) for
  every LightHouse instance's public federation listener, provisioned
  **before** the first `docker compose up` / first entity configuration
  is published.
- `backend/config/gateway.yaml`'s `public_base_url`/`admin_base_url` and
  each instance's own `config.yaml`'s `entity_id` set to the real
  `https://` hostname from day one.
- The bundled demo mesh (`mesh-*`/`mesh2-*`) is explicitly **not** this —
  it exists to exercise multi-hop resolution, constraints, trust marks,
  etc. using cheap, disposable, purely-internal identities
  (`http://mesh-ta:8080`) that never need to survive contact with the
  real internet. Don't try to "upgrade" it to HTTPS in place; stand up a
  separate, real-DNS-backed set of instances instead, the same way you'd
  never try to relabel a test fixture into production data.

## Summary for whoever deploys this for real

| Hop | Retrofittable? | What to do |
|---|---|---|
| Browser → UI | Yes | Real reverse proxy/ingress + real cert (Let's Encrypt/org CA) |
| UI → backend | Yes | Private network is usually enough; TLS via `uvicorn --ssl-*` if not |
| backend → LightHouse (admin) | Yes, but unverified | Private network preferred; TLS needs LightHouse's `admin_tls` schema verified first |
| LightHouse → LightHouse (federation) | **No** | Real HTTPS entity_ids from the first seed, not migrated later |
