import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Alembic Config object
config = context.config

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import metadata
from backend.models import Base  # noqa: E402

target_metadata = Base.metadata


def get_database_url() -> str:
    """
    Render provides DATABASE_URL. We normalize it and force psycopg v3 driver.

    Accepts these inputs:
      - postgresql://...
      - postgres://...
      - DATABASE_URL=postgresql://...   (accidental paste)
      - postgresql+psycopg://...
    """
    url = (os.getenv("DATABASE_URL") or "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL env var is missing for Alembic")

    # If user accidentally pasted "DATABASE_URL=...."
    if url.upper().startswith("DATABASE_URL="):
        url = url.split("=", 1)[1].strip()

    # Old scheme normalization
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    # Force psycopg v3 driver unless already specified
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)

    return url


def run_migrations_offline() -> None:
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_database_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        future=True,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
