"""
PostgreSQL Database Configuration for ERP Modules
Separate from the main SQLite database used by the 67 bots
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL_PG = os.getenv(
    "DATABASE_URL_PG",
    os.getenv("DATABASE_URL", "postgresql://aria_user:AriaSecure2025!@localhost/aria_erp")
)

engine = create_engine(
    DATABASE_URL_PG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
