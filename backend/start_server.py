#!/usr/bin/env python3
"""
Simple server startup script for ARIA backend
"""
import uvicorn
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("Starting ARIA Backend Server...")
    try:
        uvicorn.run(
            "simple_main:app",
            host="0.0.0.0",
            port=12000,
            reload=False,  # Disable reload to avoid issues
            log_level="info"
        )
    except Exception as e:
        print(f"Failed to start server: {e}")
        sys.exit(1)