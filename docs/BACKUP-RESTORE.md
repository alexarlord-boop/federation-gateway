# Backup / Restore

`PRODUCTION-READINESS.md` #6. Covers everything with state that can't be
regenerated: `backend/data/backend.db` (users, RBAC config, audit
history, instance registry) and every LightHouse instance's
`data/lighthouse.db` + `data/keys/*.pem`.

## Why keys and databases are different severities of loss

Losing `backend.db` is bad — recreate accounts, redo RBAC role
assignments, lose audit history. Losing a LightHouse instance's signing
key is worse and different in kind: a signing key **is** that entity's
identity. A freshly-generated key isn't "the same entity with a new
key," it's a different entity, and every subordinate registration,
authority hint, and trust mark pointing at the old key becomes
unverifiable. There's no regenerate-and-move-on recovery path for that —
only restoring the actual key file works.

## Back up

```sh
python3 scripts/backup.py [--out DIR]   # default: ./backups/ (gitignored)
```

Safe to run while the stack is up. Every `.db` file is snapshotted via
SQLite's own online backup API (`sqlite3.Connection.backup()` — the same
mechanism the `sqlite3 <db> ".backup ..."` CLI command uses), not a raw
file copy of a possibly-mid-write file. Signing keys are static once
written, so a plain copy is fine for those. Produces one timestamped
`backup-<UTC timestamp>.tar.gz`.

**This repo doesn't decide where that archive ends up.** For local/demo
use, `./backups/` is fine. For a real deployment, copy it off-host after
each run — object storage (S3 and equivalents), a separate backup
server, whatever your infrastructure already uses. Scheduling
(`cron`, a systemd timer, a CI job) is the same story: pick whatever
your deployment environment already uses to run things periodically and
point it at `scripts/backup.py`.

## Restore

```sh
docker compose down                              # required, not optional — see below
python3 scripts/restore.py backups/backup-<timestamp>.tar.gz          # dry-run: describes what would happen
python3 scripts/restore.py backups/backup-<timestamp>.tar.gz --force  # actually do it
docker compose up -d --build
```

**Refuses to run while any part of the stack is up — no override.**
Overwriting a database or key file out from under a container that has
it open can corrupt it; `docker compose down` first is one extra step,
not an unreasonable one.

Database files are fully replaced (a database is one atomic unit — there's
no meaningful way to "merge" two SQLite files). Signing keys are copied
in additively: a key file already on disk that isn't in the backup is
left alone, so restoring an older backup can't silently destroy newer
key material that happens to exist locally (e.g. from a KMS rotation
that happened after the backup was taken).

## Verified

Live round-trip, not just a read of the code: backed up the real running
demo stack, brought it down, restored from that backup, brought it back
up, and confirmed — user/subordinate counts identical, all signing keys
present (including a 63-key-rollover-history instance), login still
works, the proxy still authenticates against every LightHouse instance,
a live trust-chain `/resolve` still verifies correctly (proving the
restored keys still produce valid signatures, not just that the files
exist), full `mesh-tests` suite (25/25) and the BFF e2e suite (26/26)
both green afterward.
