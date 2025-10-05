"""
Database connection and session management
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from .config import settings
from backend.models.base import Base

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


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function for FastAPI to get database session
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
