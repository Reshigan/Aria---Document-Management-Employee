"""
Database shim - re-exports from root database module
This allows models to use 'from ..database import Base' pattern
"""
from ..database import *

__all__ = ['Base', 'SessionLocal', 'engine', 'get_db']
