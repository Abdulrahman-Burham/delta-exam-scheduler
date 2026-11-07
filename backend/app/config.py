import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "Faculty Exam Invigilation Management System"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-exam-invigilation-jwt-token-key-2026-delta-university")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # Short-lived 60 minutes for high security
    
    # SQLite default for instant portability; postgresql://user:pass@localhost:5432/invigilation in Docker/Prod
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./invigilation.db")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    ALLOW_DEMO_SWITCHER: bool = os.getenv("ALLOW_DEMO_SWITCHER", "true").lower() in ("true", "1", "yes")
    
    # Strictly whitelisted CORS origins (NO wildcard '*' allowed when allow_credentials=True)
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://20.46.50.255",
        "https://20.46.50.255",
        "http://20.46.50.255:3000",
        "http://20.46.50.255:8050",
        "http://delta-s.duckdns.org",
        "https://delta-s.duckdns.org",
    ]

    model_config = {"case_sensitive": True}


settings = Settings()
