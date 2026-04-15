from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # 데이터베이스
    database_url: str

    # Claude API
    anthropic_api_key: str

    # JWT (NextAuth.js와 공유)
    jwt_secret: str
    jwt_algorithm: str = "HS256"

    # CORS
    cors_origins: str = "http://localhost:3000"

    # Rate Limiting
    rate_limit_per_minute: int = 30
    ai_rate_limit_per_minute: int = 5

    # Cache TTL (초)
    analysis_cache_ttl_seconds: int = 600

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
