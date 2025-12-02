"""Configuration module for ML service."""

import yaml
from pathlib import Path
from typing import Dict, Any
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # API Settings
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_workers: int = 4
    
    # Model Settings
    model_config_path: str = "src/config/model_config.yaml"
    model_storage_path: str = "models/"
    
    # MLflow Settings
    mlflow_tracking_uri: str = "sqlite:///mlflow.db"
    mlflow_experiment_name: str = "nexora-threat-detection"
    
    # Database Settings
    database_url: str = "postgresql://user:password@localhost:5432/nexora"
    redis_url: str = "redis://localhost:6379"
    
    # Monitoring
    prometheus_port: int = 9090
    log_level: str = "INFO"
    
    # Security
    api_key_header: str = "X-API-Key"
    
    class Config:
        env_file = ".env"


def load_model_config() -> Dict[str, Any]:
    """Load model configuration from YAML file."""
    config_path = Path(__file__).parent / "model_config.yaml"
    
    with open(config_path, 'r') as file:
        config = yaml.safe_load(file)
    
    return config


# Global instances
settings = Settings()
model_config = load_model_config()
