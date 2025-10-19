"""
Commercial Database Configuration
Production-ready PostgreSQL setup with connection pooling, migrations, and optimization
"""

import os
import logging
from typing import Generator, Optional
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from sqlalchemy.engine import Engine
import asyncio
from contextlib import contextmanager
import time

from models import Base

logger = logging.getLogger(__name__)

class DatabaseConfig:
    """Production database configuration"""
    
    def __init__(self):
        self.database_url = self._get_database_url()
        self.engine = self._create_engine()
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
    def _get_database_url(self) -> str:
        """Get database URL from environment or use SQLite fallback"""
        # Production PostgreSQL URL
        if os.getenv("DATABASE_URL"):
            return os.getenv("DATABASE_URL")
        
        # Docker PostgreSQL URL
        if os.getenv("POSTGRES_HOST"):
            host = os.getenv("POSTGRES_HOST", "localhost")
            port = os.getenv("POSTGRES_PORT", "5432")
            db = os.getenv("POSTGRES_DB", "aria")
            user = os.getenv("POSTGRES_USER", "aria")
            password = os.getenv("POSTGRES_PASSWORD", "aria123")
            return f"postgresql://{user}:{password}@{host}:{port}/{db}"
        
        # Fallback to SQLite for development
        return "sqlite:///./aria_commercial.db"
    
    def _create_engine(self) -> Engine:
        """Create optimized database engine"""
        if "postgresql" in self.database_url:
            # PostgreSQL configuration
            engine = create_engine(
                self.database_url,
                poolclass=QueuePool,
                pool_size=20,
                max_overflow=30,
                pool_pre_ping=True,
                pool_recycle=3600,
                echo=False,  # Set to True for SQL debugging
                connect_args={
                    "connect_timeout": 10,
                    "application_name": "aria_commercial"
                }
            )
            
            # Add PostgreSQL-specific optimizations
            @event.listens_for(engine, "connect")
            def set_postgresql_search_path(dbapi_connection, connection_record):
                with dbapi_connection.cursor() as cursor:
                    cursor.execute("SET search_path TO public")
                    cursor.execute("SET timezone TO 'UTC'")
                    
        else:
            # SQLite configuration
            engine = create_engine(
                self.database_url,
                connect_args={"check_same_thread": False},
                echo=False
            )
            
            # Add SQLite optimizations
            @event.listens_for(engine, "connect")
            def set_sqlite_pragma(dbapi_connection, connection_record):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA synchronous=NORMAL")
                cursor.execute("PRAGMA cache_size=10000")
                cursor.execute("PRAGMA temp_store=MEMORY")
                cursor.close()
        
        return engine
    
    def create_tables(self):
        """Create all database tables"""
        try:
            Base.metadata.create_all(bind=self.engine)
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create database tables: {e}")
            raise
    
    def get_db(self) -> Generator[Session, None, None]:
        """Database session dependency"""
        db = self.SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @contextmanager
    def get_db_context(self):
        """Context manager for database sessions"""
        db = self.SessionLocal()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            with self.engine.connect() as connection:
                if "postgresql" in self.database_url:
                    result = connection.execute(text("SELECT version()"))
                else:
                    result = connection.execute(text("SELECT sqlite_version()"))
                
                version = result.fetchone()[0]
                logger.info(f"Database connection successful. Version: {version}")
                return True
                
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return False
    
    def get_connection_info(self) -> dict:
        """Get database connection information"""
        info = {
            "database_url": self.database_url.replace(
                self.database_url.split("://")[1].split("@")[0] + "@", 
                "***:***@"
            ) if "@" in self.database_url else self.database_url,
            "engine_info": str(self.engine.url),
            "pool_size": getattr(self.engine.pool, 'size', None),
            "pool_checked_out": getattr(self.engine.pool, 'checkedout', None),
            "pool_overflow": getattr(self.engine.pool, 'overflow', None),
        }
        return info

class DatabaseMigration:
    """Database migration utilities"""
    
    def __init__(self, db_config: DatabaseConfig):
        self.db_config = db_config
        self.engine = db_config.engine
    
    def run_migrations(self):
        """Run database migrations"""
        try:
            # Create migration table if it doesn't exist
            with self.engine.connect() as connection:
                if "postgresql" in str(self.engine.url):
                    connection.execute(text("""
                        CREATE TABLE IF NOT EXISTS schema_migrations (
                            version VARCHAR(255) PRIMARY KEY,
                            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """))
                else:
                    connection.execute(text("""
                        CREATE TABLE IF NOT EXISTS schema_migrations (
                            version TEXT PRIMARY KEY,
                            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """))
                connection.commit()
            
            # Run specific migrations
            self._run_migration_001()
            self._run_migration_002()
            
            logger.info("Database migrations completed successfully")
            
        except Exception as e:
            logger.error(f"Database migration failed: {e}")
            raise
    
    def _run_migration_001(self):
        """Migration 001: Add indexes for performance"""
        migration_version = "001_add_indexes"
        
        with self.engine.connect() as connection:
            # Check if migration already applied
            result = connection.execute(
                text("SELECT version FROM schema_migrations WHERE version = :version"),
                {"version": migration_version}
            )
            
            if result.fetchone():
                logger.info(f"Migration {migration_version} already applied")
                return
            
            # Apply migration
            try:
                # Add indexes for better performance
                connection.execute(text("CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by)"))
                connection.execute(text("CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)"))
                connection.execute(text("CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date)"))
                connection.execute(text("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)"))
                connection.execute(text("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"))
                
                # Record migration
                connection.execute(
                    text("INSERT INTO schema_migrations (version) VALUES (:version)"),
                    {"version": migration_version}
                )
                connection.commit()
                
                logger.info(f"Migration {migration_version} applied successfully")
                
            except Exception as e:
                connection.rollback()
                logger.error(f"Migration {migration_version} failed: {e}")
                raise
    
    def _run_migration_002(self):
        """Migration 002: Add full-text search capabilities"""
        migration_version = "002_fulltext_search"
        
        with self.engine.connect() as connection:
            # Check if migration already applied
            result = connection.execute(
                text("SELECT version FROM schema_migrations WHERE version = :version"),
                {"version": migration_version}
            )
            
            if result.fetchone():
                logger.info(f"Migration {migration_version} already applied")
                return
            
            try:
                if "postgresql" in str(self.engine.url):
                    # PostgreSQL full-text search
                    connection.execute(text("""
                        ALTER TABLE documents 
                        ADD COLUMN IF NOT EXISTS search_vector tsvector
                    """))
                    
                    connection.execute(text("""
                        CREATE INDEX IF NOT EXISTS idx_documents_search_vector 
                        ON documents USING gin(search_vector)
                    """))
                    
                    # Create trigger to update search vector
                    connection.execute(text("""
                        CREATE OR REPLACE FUNCTION update_document_search_vector()
                        RETURNS trigger AS $$
                        BEGIN
                            NEW.search_vector := to_tsvector('english', 
                                COALESCE(NEW.filename, '') || ' ' || 
                                COALESCE(NEW.ai_analysis, '')
                            );
                            RETURN NEW;
                        END;
                        $$ LANGUAGE plpgsql;
                    """))
                    
                    connection.execute(text("""
                        DROP TRIGGER IF EXISTS documents_search_vector_update ON documents;
                        CREATE TRIGGER documents_search_vector_update
                        BEFORE INSERT OR UPDATE ON documents
                        FOR EACH ROW EXECUTE FUNCTION update_document_search_vector();
                    """))
                
                else:
                    # SQLite FTS (Full-Text Search)
                    connection.execute(text("""
                        CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
                            document_id,
                            filename,
                            content,
                            content='documents',
                            content_rowid='id'
                        )
                    """))
                
                # Record migration
                connection.execute(
                    text("INSERT INTO schema_migrations (version) VALUES (:version)"),
                    {"version": migration_version}
                )
                connection.commit()
                
                logger.info(f"Migration {migration_version} applied successfully")
                
            except Exception as e:
                connection.rollback()
                logger.error(f"Migration {migration_version} failed: {e}")
                raise

class DatabaseOptimizer:
    """Database performance optimization utilities"""
    
    def __init__(self, db_config: DatabaseConfig):
        self.db_config = db_config
        self.engine = db_config.engine
    
    def analyze_performance(self) -> dict:
        """Analyze database performance"""
        stats = {}
        
        try:
            with self.engine.connect() as connection:
                if "postgresql" in str(self.engine.url):
                    # PostgreSQL performance stats
                    result = connection.execute(text("""
                        SELECT 
                            schemaname,
                            tablename,
                            n_tup_ins as inserts,
                            n_tup_upd as updates,
                            n_tup_del as deletes,
                            n_live_tup as live_tuples,
                            n_dead_tup as dead_tuples
                        FROM pg_stat_user_tables
                        ORDER BY n_live_tup DESC
                    """))
                    
                    stats['table_stats'] = [dict(row) for row in result]
                    
                    # Index usage stats
                    result = connection.execute(text("""
                        SELECT 
                            schemaname,
                            tablename,
                            indexname,
                            idx_scan,
                            idx_tup_read,
                            idx_tup_fetch
                        FROM pg_stat_user_indexes
                        ORDER BY idx_scan DESC
                    """))
                    
                    stats['index_stats'] = [dict(row) for row in result]
                
                else:
                    # SQLite performance stats
                    result = connection.execute(text("PRAGMA database_list"))
                    stats['databases'] = [dict(row) for row in result]
                    
                    result = connection.execute(text("PRAGMA table_list"))
                    stats['tables'] = [dict(row) for row in result]
        
        except Exception as e:
            logger.error(f"Performance analysis failed: {e}")
            stats['error'] = str(e)
        
        return stats
    
    def optimize_database(self):
        """Run database optimization"""
        try:
            with self.engine.connect() as connection:
                if "postgresql" in str(self.engine.url):
                    # PostgreSQL optimization
                    connection.execute(text("ANALYZE"))
                    connection.execute(text("VACUUM ANALYZE"))
                    logger.info("PostgreSQL optimization completed")
                    
                else:
                    # SQLite optimization
                    connection.execute(text("ANALYZE"))
                    connection.execute(text("VACUUM"))
                    logger.info("SQLite optimization completed")
                
                connection.commit()
                
        except Exception as e:
            logger.error(f"Database optimization failed: {e}")
            raise

# Global database configuration
db_config = DatabaseConfig()

# Convenience functions
def get_db() -> Generator[Session, None, None]:
    """Get database session"""
    return db_config.get_db()

def init_database():
    """Initialize database with tables and migrations"""
    try:
        # Test connection
        if not db_config.test_connection():
            raise Exception("Database connection test failed")
        
        # Create tables
        db_config.create_tables()
        
        # Run migrations
        migration = DatabaseMigration(db_config)
        migration.run_migrations()
        
        logger.info("Database initialization completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False

def get_database_health() -> dict:
    """Get database health information"""
    try:
        connection_info = db_config.get_connection_info()
        
        # Test connection
        connection_healthy = db_config.test_connection()
        
        # Get performance stats
        optimizer = DatabaseOptimizer(db_config)
        performance_stats = optimizer.analyze_performance()
        
        return {
            "status": "healthy" if connection_healthy else "unhealthy",
            "connection_info": connection_info,
            "performance_stats": performance_stats,
            "timestamp": time.time()
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": time.time()
        }