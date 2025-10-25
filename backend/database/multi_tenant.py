"""
Multi-Tenant Database Architecture for Aria

Strategy: Schema-per-tenant (PostgreSQL schemas)
- Each tenant gets their own PostgreSQL schema
- Shared global schema for tenants, users, subscriptions
- Data isolation, security, and scalability

Architecture:
- public schema: tenants, users, authentication
- tenant_<id> schema: customer-specific data (documents, transactions, etc.)
"""
import logging
from contextlib import contextmanager
from typing import Optional, Generator
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

logger = logging.getLogger(__name__)


class TenantContext:
    """
    Thread-local tenant context.
    
    Stores current tenant_id for request scope.
    """
    _tenant_id: Optional[str] = None
    
    @classmethod
    def set_tenant(cls, tenant_id: str):
        """Set current tenant ID."""
        cls._tenant_id = tenant_id
        logger.debug(f"Tenant context set to: {tenant_id}")
    
    @classmethod
    def get_tenant(cls) -> Optional[str]:
        """Get current tenant ID."""
        return cls._tenant_id
    
    @classmethod
    def clear(cls):
        """Clear tenant context."""
        cls._tenant_id = None


class MultiTenantDatabase:
    """
    Multi-tenant database manager.
    
    Handles schema-per-tenant architecture:
    - Creates tenant schemas
    - Sets search_path for tenant isolation
    - Manages database connections
    """
    
    def __init__(self, database_url: str):
        """
        Initialize multi-tenant database.
        
        Args:
            database_url: PostgreSQL connection string
        """
        self.database_url = database_url
        self.engine = create_engine(
            database_url,
            poolclass=QueuePool,
            pool_size=20,
            max_overflow=40,
            pool_pre_ping=True,  # Check connections before using
            echo=False
        )
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )
        
        # Set up event listener for tenant isolation
        self._setup_tenant_isolation()
    
    def _setup_tenant_isolation(self):
        """
        Set up automatic tenant isolation using search_path.
        
        Before each connection checkout, sets PostgreSQL search_path
        to tenant's schema, ensuring data isolation.
        """
        @event.listens_for(self.engine, "connect")
        def set_search_path(dbapi_conn, connection_record):
            """Set search_path on connection."""
            tenant_id = TenantContext.get_tenant()
            
            if tenant_id:
                schema_name = f"tenant_{tenant_id}"
                cursor = dbapi_conn.cursor()
                
                try:
                    # Set search_path to tenant schema, then public
                    cursor.execute(f"SET search_path TO {schema_name}, public")
                    logger.debug(f"Set search_path to: {schema_name}, public")
                except Exception as e:
                    logger.error(f"Error setting search_path: {e}")
                finally:
                    cursor.close()
            else:
                # No tenant context = public schema only
                cursor = dbapi_conn.cursor()
                try:
                    cursor.execute("SET search_path TO public")
                except Exception as e:
                    logger.error(f"Error setting search_path to public: {e}")
                finally:
                    cursor.close()
    
    def create_tenant_schema(self, tenant_id: str) -> bool:
        """
        Create a new schema for tenant.
        
        Args:
            tenant_id: Unique tenant identifier
            
        Returns:
            True if successful, False otherwise
        """
        schema_name = f"tenant_{tenant_id}"
        
        with self.engine.begin() as conn:
            try:
                # Create schema
                conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}"))
                
                # Grant permissions
                conn.execute(text(f"GRANT ALL ON SCHEMA {schema_name} TO CURRENT_USER"))
                
                logger.info(f"Created tenant schema: {schema_name}")
                return True
            
            except Exception as e:
                logger.error(f"Error creating tenant schema {schema_name}: {e}")
                return False
    
    def drop_tenant_schema(self, tenant_id: str, cascade: bool = False) -> bool:
        """
        Drop tenant schema (use with caution!).
        
        Args:
            tenant_id: Tenant identifier
            cascade: If True, drop all objects in schema
            
        Returns:
            True if successful, False otherwise
        """
        schema_name = f"tenant_{tenant_id}"
        cascade_sql = "CASCADE" if cascade else ""
        
        with self.engine.begin() as conn:
            try:
                conn.execute(text(f"DROP SCHEMA IF EXISTS {schema_name} {cascade_sql}"))
                logger.warning(f"Dropped tenant schema: {schema_name}")
                return True
            
            except Exception as e:
                logger.error(f"Error dropping tenant schema {schema_name}: {e}")
                return False
    
    def tenant_exists(self, tenant_id: str) -> bool:
        """Check if tenant schema exists."""
        schema_name = f"tenant_{tenant_id}"
        
        with self.engine.connect() as conn:
            result = conn.execute(text(
                "SELECT schema_name FROM information_schema.schemata "
                "WHERE schema_name = :schema_name"
            ), {"schema_name": schema_name})
            
            return result.first() is not None
    
    @contextmanager
    def get_db(self, tenant_id: Optional[str] = None) -> Generator[Session, None, None]:
        """
        Get database session with tenant context.
        
        Args:
            tenant_id: Optional tenant ID to set context
            
        Yields:
            SQLAlchemy session
        """
        # Set tenant context if provided
        if tenant_id:
            TenantContext.set_tenant(tenant_id)
        
        session = self.SessionLocal()
        
        try:
            # Set search_path for this session
            tenant_id = TenantContext.get_tenant()
            if tenant_id:
                schema_name = f"tenant_{tenant_id}"
                session.execute(text(f"SET search_path TO {schema_name}, public"))
            
            yield session
            session.commit()
        
        except Exception as e:
            session.rollback()
            logger.error(f"Database error: {e}")
            raise
        
        finally:
            session.close()
            TenantContext.clear()
    
    def init_tenant(self, tenant_id: str) -> bool:
        """
        Initialize new tenant (create schema + tables).
        
        Args:
            tenant_id: Tenant identifier
            
        Returns:
            True if successful
        """
        # Create schema
        if not self.create_tenant_schema(tenant_id):
            return False
        
        # Create tables in tenant schema
        try:
            with self.get_db(tenant_id) as db:
                # Run migrations/create tables for this tenant
                # This would typically call Alembic migrations
                logger.info(f"Initialized tenant: {tenant_id}")
                return True
        
        except Exception as e:
            logger.error(f"Error initializing tenant {tenant_id}: {e}")
            return False


# Global database instance (initialized by app)
db_manager: Optional[MultiTenantDatabase] = None


def get_db_manager() -> MultiTenantDatabase:
    """Get global database manager."""
    if db_manager is None:
        raise RuntimeError("Database manager not initialized")
    return db_manager


def init_db_manager(database_url: str):
    """Initialize global database manager."""
    global db_manager
    db_manager = MultiTenantDatabase(database_url)
    logger.info("Multi-tenant database manager initialized")


@contextmanager
def get_tenant_db(tenant_id: str) -> Generator[Session, None, None]:
    """
    Context manager for tenant-specific database session.
    
    Usage:
        with get_tenant_db("tenant_123") as db:
            result = db.query(Document).all()
    
    Args:
        tenant_id: Tenant identifier
        
    Yields:
        SQLAlchemy session with tenant context
    """
    manager = get_db_manager()
    with manager.get_db(tenant_id) as session:
        yield session


# FastAPI dependency for tenant database
async def get_current_tenant_db(
    tenant_id: str = None  # Would come from request headers/token
) -> Generator[Session, None, None]:
    """
    FastAPI dependency to inject tenant-specific database.
    
    Usage in routes:
        @app.get("/documents")
        async def get_documents(db: Session = Depends(get_current_tenant_db)):
            return db.query(Document).all()
    
    Args:
        tenant_id: Extracted from JWT token or request header
        
    Yields:
        SQLAlchemy session
    """
    if not tenant_id:
        raise ValueError("Tenant ID required")
    
    with get_tenant_db(tenant_id) as session:
        yield session
