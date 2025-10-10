#!/usr/bin/env python3
"""
Test database table creation
"""
import asyncio
import os

# Import all models first to register them with SQLAlchemy
import models.user
import models.document
import models.advanced
from models import Base

from core.config import settings
from core.database import engine

async def test_db_creation():
    """Test database table creation"""
    print("Testing database table creation...")
    
    # Remove existing database
    db_path = "aria_dms.db"
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"Removed existing database: {db_path}")
    
    print(f"Database URL: {settings.get_database_url()}")
    print(f"Tables in metadata: {list(Base.metadata.tables.keys())}")
    
    # Create tables
    async with engine.begin() as conn:
        print("Creating tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("Tables created successfully!")
    
    # Check if database file exists and has content
    if os.path.exists(db_path):
        size = os.path.getsize(db_path)
        print(f"Database file created: {db_path} (size: {size} bytes)")
    else:
        print("Database file not created!")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_db_creation())