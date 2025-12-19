from __future__ import annotations

import os
import sys
from enum import Enum
from functools import lru_cache
from typing import List, Optional

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

    @model_validator(mode="before")
    @classmethod
    def _normalize_env(cls, data: dict) -> dict:
        env_value = data.get("app_env") or data.get("APP_ENV")
        if isinstance(env_value, str):
            normalized = env_value.lower()
            if normalized == "production":
                data["app_env"] = EnvProfile.prod.value
            elif normalized == "staging":
                data["app_env"] = EnvProfile.stage.value
        return data

    app_env: EnvProfile = Field(default=EnvProfile.dev, alias="APP_ENV")
    api_football_key: str = Field(alias="API_FOOTBALL_KEY")
    openai_api_key: str = Field(alias="OPENAI_API_KEY")
    database_url: str = Field(alias="DATABASE_URL")
    timezone: str = Field(default="Europe/Belgrade", alias="TIMEZONE")
    allowed_origins: List[str] = Field(default_factory=list, alias="ALLOWED_ORIGINS")
    api_auth_tokens: List[str] = Field(default_factory=list, alias="API_AUTH_TOKENS")
    allow_dev_fallback: bool = Field(default=True, alias="ALLOW_DEV_FALLBACK")
    redis_url: str | None = Field(default=None, alias="REDIS_URL")
    use_fake_redis: bool = Field(default=False, alias="USE_FAKE_REDIS")
    alert_webhook: str | None = Field(default=None, alias="ALERT_WEBHOOK_URL")

    # --- Google Play Billing (server-side verify) ---
    google_play_service_account_json: Optional[str] = Field(
        default=None, alias="GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"
    )
    google_play_package_name: Optional[str] = Field(
        default=None, alias="GOOGLE_PLAY_PACKAGE_NAME"
    )
    google_pubsub_verification_token: Optional[str] = Field(
        default=None, alias="GOOGLE_PUBSUB_VERIFICATION_TOKEN"
    )

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
            raise ValueError(f"Missing critical env vars: {', '.join(sorted(missing))}")

        if not self.allowed_origins:
            self.allowed_origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:19006",
                "exp://127.0.0.1:19000",
            ]

        self.api_auth_tokens = [token for token in self.api_auth_tokens if token]
        if not self.api_auth_tokens and self.app_env == EnvProfile.dev and self.allow_dev_fallback:
            fallback_token = os.getenv("FALLBACK_API_AUTH_TOKEN", "dev-token")
            self.api_auth_tokens = [fallback_token]
            print(
                "[config] Missing API_AUTH_TOKENS; using fallback token. Set API_AUTH_TOKENS"
                " to lock down API access.",
                file=sys.stderr,
            )

        if self.app_env in {EnvProfile.stage, EnvProfile.prod} and not self.redis_url:
            self.use_fake_redis = True
            print(
                "[config] REDIS_URL not set for stage/prod; falling back to in-memory"
                " fake redis. Set REDIS_URL to enable shared cache.",
                file=sys.stderr,
            )

        # In prod/stage: strongly recommend Google verification configured
        if self.app_env in {EnvProfile.stage, EnvProfile.prod} and not self.google_play_service_account_json:
            print(
                "[config] GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not set. Billing verify will be blocked in prod/stage.",
                file=sys.stderr,
            )

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
                allow_dev_fallback=(os.getenv("ALLOW_DEV_FALLBACK", "true").lower() in {"1", "true", "yes"}),
                redis_url=os.getenv("REDIS_URL"),
                use_fake_redis=(os.getenv("USE_FAKE_REDIS", "false").lower() in {"1", "true", "yes"}),
                alert_webhook=os.getenv("ALERT_WEBHOOK_URL"),
                google_play_service_account_json=os.getenv("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"),
                google_play_package_name=os.getenv("GOOGLE_PLAY_PACKAGE_NAME"),
                google_pubsub_verification_token=os.getenv("GOOGLE_PUBSUB_VERIFICATION_TOKEN"),
            )
        except ValidationError as exc:  # noqa: BLE001
            raise RuntimeError(f"Invalid configuration: {exc}") from exc


@lru_cache
def get_settings() -> Settings:
    settings = Settings.load()
    if settings.app_env in {EnvProfile.stage, EnvProfile.prod}:
        if not settings.api_auth_tokens:
            raise RuntimeError("Missing API_AUTH_TOKENS for stage/prod")
        settings.allow_dev_fallback = False
    return settings


settings = get_settings()

# Glavni endpoint
API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io"

# Headers za API-Football pozive
HEADERS = {"x-apisports-key": settings.api_football_key}

# Lige koje smeju u feed
ALLOW_LIST: List[int] = [
    2, 3, 913, 5, 536, 808, 960, 10, 667, 29, 30, 31, 32, 37, 33, 34, 848, 342,
    218, 144, 315, 71, 169, 210, 346, 233, 39, 40, 41, 42, 703, 244, 245, 61, 62, 78, 79,
    197, 271, 164, 323, 135, 136, 389, 88, 89, 408, 103, 104, 106, 94, 283, 235, 286, 287,
    322, 140, 141, 113, 207, 208, 202, 203, 909, 268, 269, 270, 340,
]

# Statusi koje SKLANJAM iz feeda
SKIP_STATUS = {"FT", "AET", "PEN", "PST", "CANC", "ABD", "WO"}

# Omiljena timezone konfiguracija
TIMEZONE = settings.timezone
