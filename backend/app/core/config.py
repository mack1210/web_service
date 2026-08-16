import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "overnight-web-agent-kit-api")
    app_env: str = os.getenv("APP_ENV", "development")
    version: str = "0.1.0"
    aipot_content_root: Path = Path(
        os.getenv("AIPOT_CONTENT_ROOT", "/aipot-content")
    )
    aipot_history_file: Path = Path(
        os.getenv("AIPOT_HISTORY_FILE", "/app/data/aipot-history.json")
    )
    aipot_database_file: Path = Path(
        os.getenv("AIPOT_DATABASE_FILE", "/app/data/aipot.sqlite3")
    )
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_base_url: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    aipot_judge_model: str = os.getenv("AIPOT_JUDGE_MODEL", "anthropic/claude-haiku-4.5")
    aipot_text_model: str = os.getenv("AIPOT_TEXT_MODEL", "anthropic/claude-haiku-4.5")
    aipot_image_model: str = os.getenv("AIPOT_IMAGE_MODEL", "openai/gpt-image-1")
    aipot_evaluator_timeout_seconds: int = int(
        os.getenv("AIPOT_EVALUATOR_TIMEOUT_SECONDS", "45")
    )
    aipot_sandbox_socket: Path = Path(
        os.getenv("AIPOT_SANDBOX_SOCKET", "/aipot-sandbox/aipot-runner.sock")
    )


settings = Settings()
