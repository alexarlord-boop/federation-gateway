# Federation Gateway

Minimal demo UI + FastAPI backend for managing trust anchors, intermediates, and leaf entities.

## Run locally

Frontend (Vite):

```sh
npm install
npm run dev
```

Backend (FastAPI):

```sh
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
fastapi run app/main.py --host 0.0.0.0 --port 8765
```

## Docker (UI only)

```sh
docker build -t federation-gateway-ui .
docker run --rm -p 8080:80 federation-gateway-ui
```

Note: the provided Dockerfile builds the UI only. Run the FastAPI backend separately.

## Docker Compose (UI + backend)

```sh
docker compose up --build
```
