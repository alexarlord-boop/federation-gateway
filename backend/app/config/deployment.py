from pathlib import Path
from typing import Optional

import os
import yaml
from pydantic import BaseModel, Field, HttpUrl, model_validator


class BasicAuthConfig(BaseModel):
    type: str = "basic"
    username: str
    password: str


class RawBasicAuthConfig(BaseModel):
    type: str = "basic"
    username_env: str
    password_env: str

    def resolve(self) -> BasicAuthConfig:
        missing = [
            env_name
            for env_name in (self.username_env, self.password_env)
            if env_name not in os.environ
        ]
        if missing:
            raise ValueError(
                "missing required deployment config environment variable(s): "
                + ", ".join(missing)
            )
        return BasicAuthConfig(
            username=os.environ[self.username_env],
            password=os.environ[self.password_env],
        )


class InstanceConfig(BaseModel):
    id: str
    name: str
    public_base_url: HttpUrl
    admin_base_url: HttpUrl
    public_port: Optional[int] = None
    admin_port: Optional[int] = None
    admin_auth: Optional[BasicAuthConfig] = None


class DeploymentConfig(BaseModel):
    ui_public_base_url: Optional[HttpUrl] = None
    backend_public_base_url: Optional[HttpUrl] = None
    instances: list[InstanceConfig] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_unique_ids(self) -> "DeploymentConfig":
        ids = [instance.id for instance in self.instances]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate instance id in deployment config")
        return self


def resolve_deployment_config_path() -> Path:
    env_path = os.getenv("GATEWAY_CONFIG_FILE")
    if env_path:
        return Path(env_path)

    docker_path = Path("/config/gateway.yaml")
    if docker_path.exists():
        return docker_path

    return Path(__file__).parent.parent.parent / "config" / "gateway.yaml"


def load_deployment_config(path: Path) -> DeploymentConfig:
    raw = yaml.safe_load(path.read_text()) or {}
    instances: list[dict] = []
    for item in raw.get("instances", []):
        auth = item.get("admin_auth")
        if auth and auth.get("type", "basic") == "basic" and "username_env" in auth:
            item = {
                **item,
                "admin_auth": RawBasicAuthConfig.model_validate(auth).resolve().model_dump(),
            }
        instances.append(item)

    return DeploymentConfig.model_validate(
        {
            "ui_public_base_url": raw.get("ui", {}).get("public_base_url"),
            "backend_public_base_url": raw.get("backend", {}).get("public_base_url"),
            "instances": instances,
        }
    )
