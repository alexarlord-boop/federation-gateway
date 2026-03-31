from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import Base, engine, SessionLocal
from app.routers import auth, debug, trust_anchors, capabilities, rbac, proxy, users
from app.routers import resolve, tenants, tech_contacts, registrations
from app.db.seed import seed_data
from app.db.rbac_seed import seed_rbac_data
# Import models so SQLAlchemy creates their tables via create_all
import app.models.tenant          # noqa: F401
import app.models.tech_contact    # noqa: F401
import app.models.entity_registration  # noqa: F401
import app.models.oidc_provider   # noqa: F401

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

# Seed data
seed_data()

# Seed RBAC data from OpenAPI spec
db = SessionLocal()
try:
    seed_rbac_data(db)
finally:
    db.close()

app = FastAPI(title="OIDFed Auth Gateway", version="0.1.0")

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


@app.get("/health")
def health():
    return {"status": "ok"}
