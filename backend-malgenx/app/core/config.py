from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import AnyUrl


class Settings(BaseSettings):
    # Core
    ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Nexora MalGenX Service"
    PORT: int = 8001

    # Shared infra (reuse existing Nexora env)
    DATABASE_URL: str
    REDIS_URL: str

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/3"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/4"

    # Analysis Configuration
    SANDBOX_TIMEOUT_SECONDS: int = 300
    MAX_FILE_SIZE_MB: int = 100
    ENABLE_SANDBOX: bool = False
    ENABLE_ML_CLASSIFICATION: bool = False
    ENABLE_YARA_SCANNING: bool = False

    # Storage
    STORAGE_TYPE: str = "local"
    STORAGE_PATH: str = "./storage/samples"

    # Threat Intel
    VIRUSTOTAL_API_KEY: str = ""
    ABUSEIPDB_API_KEY: str = ""

    # Security / rate limiting
    RATE_LIMIT_REQUESTS_PER_MIN: int = 100

    model_config = {
        "case_sensitive": True,
        "env_file": ".env"
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
