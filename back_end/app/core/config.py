from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "smart-water-backend"
    app_env: str = "development"
    app_port: int = 8000
    api_prefix: str = "/api/v1"

    mongodb_uri: str
    mongodb_db: str = "job_agent"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    firebase_service_account_path: str = "../serviceAccountKey.json"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
