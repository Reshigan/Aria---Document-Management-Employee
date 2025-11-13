"""
PostgreSQL Database Configuration for ERP Modules
PostgreSQL-only configuration - SQLite is not supported
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# PostgreSQL-only configuration - fail fast if SQLite is attempted
DATABASE_URL_PG = os.getenv(
    "DATABASE_URL_PG",
    os.getenv("DATABASE_URL", "postgresql://aria_user:AriaSecure2025!@localhost/aria_erp")
)

if "sqlite" in DATABASE_URL_PG.lower():
    raise RuntimeError(
        "SQLite is not supported in production. "
        "Please set DATABASE_URL_PG to a PostgreSQL connection string."
    )

engine = create_engine(
    DATABASE_URL_PG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
