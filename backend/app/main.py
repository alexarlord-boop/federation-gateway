import asyncio
import base64
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import Base, engine, SessionLocal
from app.routers import auth, debug, trust_anchors, capabilities, rbac, proxy, users, instances
from app.routers import resolve, tenants, tech_contacts, registrations, audit
from app.db.seed import seed_data
from app.db.rbac_seed import seed_rbac_data
from app.config.deployment import load_deployment_config, resolve_deployment_config_path
# Import models so SQLAlchemy creates their tables via create_all
import app.models.tenant          # noqa: F401
import app.models.tech_contact    # noqa: F401
import app.models.entity_registration  # noqa: F401
import app.models.oidc_provider   # noqa: F401
import app.models.audit_log       # noqa: F401

# Initialize database
Base.metadata.create_all(bind=engine)


def _run_schema_migrations() -> None:
    """Idempotent DDL migration for columns added after the initial create_all.

    SQLAlchemy create_all only creates *missing tables*, not missing columns.
    Each ALTER TABLE is swallowed on failure so it is safe to re-run on
    every container start.
    """
    from sqlalchemy import text

    stmts = [
        "ALTER TABLE users ADD COLUMN oidc_sub TEXT",
        "ALTER TABLE users ADD COLUMN oidc_issuer TEXT",
        "ALTER TABLE users ADD COLUMN is_operator INTEGER DEFAULT 0",
    ]
    with engine.connect() as conn:
        for stmt in stmts:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass  # column already exists — ignore


_run_schema_migrations()

# Load deployment config
CONFIG_PATH = resolve_deployment_config_path()

deployment_config = None
if CONFIG_PATH.exists():
    deployment_config = load_deployment_config(CONFIG_PATH)

# Seed data with deployment config
seed_data(deployment_config)

# Seed RBAC data from OpenAPI spec
db = SessionLocal()
try:
    seed_rbac_data(db)
finally:
    db.close()

app = FastAPI(title="OIDFed Auth Gateway", version="0.1.0")

# Store deployment config in app state (empty config if file doesn't exist)
if deployment_config is None:
    from app.config.deployment import DeploymentConfig
    deployment_config = DeploymentConfig()
app.state.instance_registry = deployment_config

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(capabilities.router)
app.include_router(rbac.router)
app.include_router(auth.router)
app.include_router(debug.router)
app.include_router(trust_anchors.router)
app.include_router(users.router)
app.include_router(resolve.router)
# Tenant management, tech contacts, and registration workflow (BFF-owned).
app.include_router(tenants.router)
app.include_router(tech_contacts.router)
app.include_router(registrations.router)
# Proxy — forwards /api/v1/proxy/{instance_id}/… to the upstream LightHouse Admin API.
app.include_router(proxy.router)
# Instance registry — lists deployment-managed instances
app.include_router(instances.router)
app.include_router(audit.router)


async def _probe_all_instances() -> None:
    from app.models.trust_anchor import TrustAnchor
    from app.utils.capability_probe import probe_entity_id, probe_instance_capabilities

    logger = logging.getLogger(__name__)
    session = SessionLocal()
    try:
        for item in deployment_config.instances:
            basic_credentials = None
            if item.admin_auth is not None:
                raw = f"{item.admin_auth.username}:{item.admin_auth.password}".encode()
                basic_credentials = base64.b64encode(raw).decode()
            try:
                await probe_instance_capabilities(
                    session, item.id, str(item.admin_base_url), basic_credentials,
                )
            except Exception:
                logger.warning("Startup capability probe failed for instance %s", item.id, exc_info=True)

            # seed_data() defaults entity_id to public_base_url, which is
            # only correct by coincidence — correct it to what the instance
            # actually signs its own statements with, once it's reachable.
            try:
                real_entity_id = await probe_entity_id(str(item.admin_base_url))
                if real_entity_id:
                    anchor = session.query(TrustAnchor).filter(TrustAnchor.id == item.id).first()
                    if anchor and anchor.entity_id != real_entity_id:
                        anchor.entity_id = real_entity_id
                        session.commit()
            except Exception:
                logger.warning("Startup entity_id probe failed for instance %s", item.id, exc_info=True)
    finally:
        session.close()


@app.on_event("startup")
async def _probe_instances_on_startup() -> None:
    """Best-effort live capability discovery for every configured instance,
    so the first UI load already reflects reality instead of only the
    bundled spec's assumptions. Scheduled as a background task rather than
    awaited here — probing ~15 features sequentially against a possibly
    slow or not-yet-ready instance must not delay the app from starting to
    serve /health, or the container's own healthcheck would time out on
    every startup. An admin can also trigger
    POST /api/v1/admin/instances/{id}/capabilities/refresh manually.
    """
    asyncio.create_task(_probe_all_instances())


@app.get("/health")
def health():
    return {"status": "ok"}
