#!/usr/bin/env python3
"""
Development server runner for Aria Document Management System.

This script starts the FastAPI development server with hot reload
and proper configuration for development.
"""

import uvicorn

from aria.core.config import settings

if __name__ == "__main__":
    # Run the development server
    uvicorn.run(
        "aria.main:app",
        host="0.0.0.0",
        port=12001,  # Use port 12001 for backend
        reload=True,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True,
        reload_dirs=["aria"],
        reload_includes=["*.py"],
    )