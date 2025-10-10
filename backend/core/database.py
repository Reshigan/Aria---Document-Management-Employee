"""
Database connection and session management
"""
from typing import AsyncGenerator, Generator
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session
from .config import settings
from models.base import Base

# Create async engine
database_url = settings.get_database_url()
engine_args = {
    "echo": settings.DEBUG,
}

# SQLite doesn't support pool settings
if not database_url.startswith("sqlite"):
    engine_args.update({
        "pool_pre_ping": True,
        "pool_size": 20,
        "max_overflow": 40,
    })
else:
    # SQLite specific settings
    engine_args["connect_args"] = {"check_same_thread": False}

engine = create_async_engine(database_url, **engine_args)

# Create async session maker
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Create sync engine for compatibility
sync_database_url = database_url.replace("sqlite+aiosqlite://", "sqlite://")
sync_engine_args = {
    "echo": settings.DEBUG,
}

if not sync_database_url.startswith("sqlite"):
    sync_engine_args.update({
        "pool_pre_ping": True,
        "pool_size": 20,
        "max_overflow": 40,
    })
else:
    sync_engine_args["connect_args"] = {"check_same_thread": False}

sync_engine = create_engine(sync_database_url, **sync_engine_args)

# Create sync session maker
SessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function for FastAPI to get async database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_sync_db() -> Generator[Session, None, None]:
    """
    Dependency function for FastAPI to get sync database session
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


async def init_db():
    """
    Initialize database - create all tables
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """
    Close database connections
    """
    await engine.dispose()
