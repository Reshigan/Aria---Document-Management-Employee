"""
Database shim - re-exports from root database module
This allows models to use 'from ..database import Base' pattern
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import *

__all__ = ['Base', 'SessionLocal', 'engine', 'get_db']
