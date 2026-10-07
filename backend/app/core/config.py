import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseModel):
    PROJECT_NAME: str = "Examination Management & Question Paper Formulation System (CoE)"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Storage & Persistence
    DATABASE_PATH: Path = BASE_DIR / "qp_system.db"
    DATABASE_URL: str = f"sqlite:///{DATABASE_PATH.as_posix()}"
    
    # Server Binding
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Security & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "institution-grade-super-secret-key-2026-qp-generator")

    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

settings = Settings()
