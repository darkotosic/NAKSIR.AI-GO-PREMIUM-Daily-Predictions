from __future__ import annotations

import os
from enum import Enum
from functools import lru_cache
from typing import List

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator


def _split_csv(value: str | None) -> List[str]:
    return [item.strip() for item in (value or "").split(",") if item.strip()]


class EnvProfile(str, Enum):
    dev = "dev"
    stage = "stage"
    prod = "prod"


class Settings(BaseModel):
    """Centralized, validated configuration for all environments."""

    model_config = ConfigDict(populate_by_name=True)

    app_env: EnvProfile = Field(default=EnvProfile.dev, alias="APP_ENV")
    api_football_key: str = Field(alias="API_FOOTBALL_KEY")
    openai_api_key: str = Field(alias="OPENAI_API_KEY")
    database_url: str = Field(alias="DATABASE_URL")
    timezone: str = Field(default="Europe/Belgrade", alias="TIMEZONE")
    allowed_origins: List[str] = Field(default_factory=list, alias="ALLOWED_ORIGINS")
    api_auth_tokens: List[str] = Field(default_factory=list, alias="API_AUTH_TOKENS")
    redis_url: str | None = Field(default=None, alias="REDIS_URL")
    use_fake_redis: bool = Field(default=False, alias="USE_FAKE_REDIS")
    alert_webhook: str | None = Field(default=None, alias="ALERT_WEBHOOK_URL")

    @model_validator(mode="after")
    def _validate_required(self) -> "Settings":
        missing = [
            name
            for name, value in {
                "API_FOOTBALL_KEY": self.api_football_key,
                "OPENAI_API_KEY": self.openai_api_key,
                "DATABASE_URL": self.database_url,
            }.items()
            if not value
        ]
        if missing:
            raise ValueError(
                f"Missing critical env vars: {', '.join(sorted(missing))}"
            )

        if not self.allowed_origins:
            self.allowed_origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:19006",
                "exp://127.0.0.1:19000",
            ]

        self.api_auth_tokens = [token for token in self.api_auth_tokens if token]
        if not self.api_auth_tokens:
            if self.app_env is EnvProfile.dev:
                self.api_auth_tokens = ["dev-token"]
            else:
                raise ValueError("API_AUTH_TOKENS must be set in stage/prod")

        if self.app_env in {EnvProfile.stage, EnvProfile.prod} and not self.redis_url:
            raise ValueError("REDIS_URL is required for stage/prod to keep cache consistent")

        return self

    @classmethod
    def load(cls) -> "Settings":
        try:
            return cls(
                app_env=os.getenv("APP_ENV", EnvProfile.dev.value),
                api_football_key=os.getenv("API_FOOTBALL_KEY", ""),
                openai_api_key=os.getenv("OPENAI_API_KEY", ""),
                database_url=os.getenv("DATABASE_URL", ""),
                timezone=os.getenv("TIMEZONE", "Europe/Belgrade"),
                allowed_origins=_split_csv(os.getenv("ALLOWED_ORIGINS")),
                api_auth_tokens=_split_csv(os.getenv("API_AUTH_TOKENS")),
                redis_url=os.getenv("REDIS_URL"),
                use_fake_redis=(
                    os.getenv("USE_FAKE_REDIS", "false").lower() in {"1", "true", "yes"}
                ),
                alert_webhook=os.getenv("ALERT_WEBHOOK_URL"),
            )
        except ValidationError as exc:  # noqa: BLE001
            raise RuntimeError(f"Invalid configuration: {exc}") from exc


@lru_cache
def get_settings() -> Settings:
    return Settings.load()


settings = get_settings()

# Glavni endpoint
API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io"

# Headers za API-Football pozive
HEADERS = {"x-apisports-key": settings.api_football_key}

# Lige koje smeju u feed
ALLOW_LIST: List[int] = [
    2,
    3,
    913,
    5,
    536,
    808,
    960,
    10,
    667,
    29,
    30,
    31,
    32,
    37,
    33,
    34,
    848,
    311,
    310,
    342,
    218,
    144,
    315,
    71,
    169,
    210,
    346,
    233,
    39,
    40,
    41,
    42,
    703,
    244,
    245,
    61,
    62,
    78,
    79,
    197,
    271,
    164,
    323,
    135,
    136,
    389,
    88,
    89,
    408,
    103,
    104,
    106,
    94,
    283,
    235,
    286,
    287,
    322,
    140,
    141,
    113,
    207,
    208,
    202,
    203,
    909,
    268,
    269,
    270,
    340,
]

# Statusi koje SKLANJAM iz feeda
SKIP_STATUS = {"FT", "AET", "PEN", "PST", "CANC", "ABD", "WO"}

# Omiljena timezone konfiguracija
TIMEZONE = settings.timezone
