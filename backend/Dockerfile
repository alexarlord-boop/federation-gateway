FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY ["Federation Admin OpenAPI.yaml", "./Federation_Admin_OpenAPI.yaml"]

# Deployment wiring: create /config and copy default gateway.yaml
# so the backend has a default config even outside docker-compose.
RUN mkdir -p /config
COPY backend/config/gateway.yaml /config/gateway.yaml

EXPOSE 8765

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8765"]
