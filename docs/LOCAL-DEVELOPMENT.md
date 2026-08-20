# Local Development (without Docker)

## Clean setup / live demo

For a fresh demo with no stale LightHouse state:

```sh
docker compose down
find lighthouse/data -mindepth 1 ! -name '.gitkeep' -delete

# One-time: docker compose up now fails closed without a .env (no more
# gateway/gateway-style defaults — see PRODUCTION-READINESS.md #5).
python3 scripts/generate-secrets.py

docker compose up --build --force-recreate
```

Then open:

- UI: `http://localhost:8080`
- Backend health: `http://localhost:8765/health`
- LightHouse public entity: `http://localhost:8081`

Seeded admin login: `admin@oidfed.org` / `admin123`

Suggested live flow:

1. Show `backend/config/gateway.yaml` and the configured ports / admin
   endpoint split.
2. Log in and show that no instance is auto-selected.
3. Select **LightHouse** from the instance switcher.
4. Open **Settings** and navigate across tabs to show the selection
   persists.
5. Mention that admin credentials stay server-side and requests go through
   the gateway proxy.

## Local UI development

The UI can run against the Dockerised backend:

```sh
# Ensure backend + lighthouse are running
docker compose up -d backend lighthouse

# Install UI deps and start Vite dev server
npm install
npm run dev          # http://localhost:5173, proxies /api → localhost:8765
```

Hot-module reload works; changes are instant without rebuilding Docker
images. Note the backend only allows CORS from a fixed set of origins
(`backend/app/main.py`) — `5173` is already in that list, but if you run
Vite on a different port you'll get "Failed to fetch" on login until you
add it there too.

## Local backend development

Requires Python 3.11 (pinned in `backend/.python-version` and
`backend/Dockerfile` — older versions, e.g. the 3.9 that ships with some
macOS/Linux systems, fail to build the pinned `bcrypt` wheel, **and** will
silently pass/fail tests differently than CI — see `../CLAUDE.md`).

```sh
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8765
```

If `python3.11` isn't installed and you don't want to install it
system-wide, run it in a throwaway container instead:

```sh
docker run --rm -it -v "$(pwd)/..:/repo" -w /repo/backend -p 8765:8765 \
  python:3.11-slim bash -c "pip install -r requirements.txt && uvicorn app.main:app --host 0.0.0.0 --port 8765"
```

The same pattern works for running the test suite: swap the last command
for `pytest` (or see `TESTING.md` for running tests against the
already-built image instead, which avoids the container-per-run overhead).

The backend stores state in `backend.db` (SQLite, root of repo).
