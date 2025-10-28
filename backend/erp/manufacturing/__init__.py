"""Manufacturing ERP Module - Complete production management system"""
from .models import *
from .api import router as manufacturing_router

__all__ = ['manufacturing_router']
