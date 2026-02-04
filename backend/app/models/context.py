from sqlalchemy import Column, String
from app.db.database import Base


class DemoContext(Base):
    __tablename__ = "demo_context"

    id = Column(String, primary_key=True, index=True)
    context_id = Column(String, nullable=False)
