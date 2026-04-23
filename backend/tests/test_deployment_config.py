from pathlib import Path

from app.config.deployment import load_deployment_config


def test_load_deployment_config_reads_yaml_and_env_overrides(monkeypatch, tmp_path: Path):
    config_file = tmp_path / "gateway.yaml"
    config_file.write_text(
        """
ui:
  public_base_url: http://localhost:8080
backend:
  public_base_url: http://localhost:8765
instances:
  - id: ta-1
    name: LightHouse
    public_base_url: http://localhost:8081
    admin_base_url: http://lighthouse:8080
    admin_auth:
      type: basic
      username_env: LIGHTHOUSE_ADMIN_USERNAME
      password_env: LIGHTHOUSE_ADMIN_PASSWORD
""".strip()
    )
    monkeypatch.setenv("LIGHTHOUSE_ADMIN_USERNAME", "gateway")
    monkeypatch.setenv("LIGHTHOUSE_ADMIN_PASSWORD", "secret")

    cfg = load_deployment_config(config_file)

    assert cfg.instances[0].id == "ta-1"
    assert cfg.instances[0].admin_auth.username == "gateway"
    assert cfg.instances[0].admin_auth.password == "secret"


def test_load_deployment_config_rejects_duplicate_instance_ids(tmp_path: Path):
    config_file = tmp_path / "gateway.yaml"
    config_file.write_text(
        """
instances:
  - id: ta-1
    name: A
    public_base_url: http://localhost:8081
    admin_base_url: http://lighthouse:8080
  - id: ta-1
    name: B
    public_base_url: http://localhost:8082
    admin_base_url: http://lighthouse2:8080
""".strip()
    )

    try:
        load_deployment_config(config_file)
    except ValueError as exc:
        assert "duplicate instance id" in str(exc).lower()
    else:
        raise AssertionError("expected duplicate IDs to raise")
