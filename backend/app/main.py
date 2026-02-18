from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import Base, engine, SessionLocal
from app.routers import auth, subordinates, entity_configuration, debug, trust_anchors, capabilities, rbac, proxy
from app.db.seed import seed_data
from app.db.rbac_seed import seed_rbac_data

# Initialize database
Base.metadata.create_all(bind=engine)

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
app.include_router(subordinates.router)
app.include_router(entity_configuration.router)
app.include_router(debug.router)
app.include_router(trust_anchors.router)
app.include_router(proxy.router)


@app.get("/health")
def health():
    return {"status": "ok"}
