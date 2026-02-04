from pydantic import BaseModel


class DebugContext(BaseModel):
    contextId: str
