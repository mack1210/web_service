import os
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "overnight-web-agent-kit-api")
    app_env: str = os.getenv("APP_ENV", "development")
    version: str = "0.1.0"


settings = Settings()
