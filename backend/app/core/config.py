import os
from pathlib import Path
from pydantic import BaseModel, Field, model_validator
import secrets

# Resolve .env relative to the backend, independent of the launch directory.
def load_local_environment():
    env_file = Path(__file__).resolve().parent.parent.parent / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip("\"'"))
load_local_environment()

def signing_secret():
    configured = os.getenv("SECRET_KEY")
    if configured:
        if len(configured) < 32 or configured == "institution-grade-super-secret-key-2026-qp-generator":
            raise RuntimeError("SECRET_KEY must be a private random value of at least 32 characters")
        return configured
    if os.getenv("ENVIRONMENT", "development").lower() == "production":
        raise RuntimeError("SECRET_KEY must be configured in production")
    secret_file = Path(__file__).resolve().parent.parent.parent / ".local" / "signing.key"
    secret_file.parent.mkdir(mode=0o700, exist_ok=True)
    try:
        with secret_file.open("x") as handle:
            handle.write(secrets.token_urlsafe(48))
        secret_file.chmod(0o600)
    except FileExistsError:
        pass
    secret = secret_file.read_text().strip()
    if len(secret) < 32:
        raise RuntimeError("Invalid local signing key")
    return secret


BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseModel):
    PROJECT_NAME: str = "Examination Management & Question Paper Formulation System (CoE)"
    VERSION: str = "1.0.0"
    GEMINI_VISION_MODEL: str = Field(default_factory=lambda: os.getenv('GEMINI_VISION_MODEL', 'gemini-2.5-flash'), pattern=r'^[a-zA-Z0-9._-]+$', validate_default=True)
    API_V1_PREFIX: str = "/api/v1"
    
    # Storage & Persistence
    DATABASE_PATH: Path = BASE_DIR / "qp_system.db"
    DATABASE_URL: str = f"sqlite:///{DATABASE_PATH.as_posix()}"
    
    # Server Binding
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Security & Auth
    SECRET_KEY: str = Field(default_factory=signing_secret)
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "false").lower() in {"true", "1", "yes"}

    @model_validator(mode='after')
    def reject_production_demo(self):
        if os.getenv('ENVIRONMENT', 'development').lower() == 'production' and self.DEMO_MODE:
            raise ValueError('DEMO_MODE must be disabled in production. Provision a private administrator account.')
        return self

    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

settings = Settings()
