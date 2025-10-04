"""
Health check endpoints
"""
from fastapi import APIRouter, status
from datetime import datetime
from typing import Dict

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> Dict:
    """
    Health check endpoint
    Returns system health status
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "ARIA API Gateway"
    }


@router.get("/health/ready", status_code=status.HTTP_200_OK)
async def readiness_check() -> Dict:
    """
    Readiness check for Kubernetes
    Checks if application is ready to accept traffic
    """
    # Add checks for database, redis, etc.
    checks = {
        "database": "healthy",  # await check_database()
        "redis": "healthy",      # await check_redis()
        "models": "loaded"       # await check_models()
    }
    
    all_healthy = all(v in ["healthy", "loaded"] for v in checks.values())
    
    return {
        "ready": all_healthy,
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/health/live", status_code=status.HTTP_200_OK)
async def liveness_check() -> Dict:
    """
    Liveness check for Kubernetes
    Checks if application is alive
    """
    return {
        "alive": True,
        "timestamp": datetime.utcnow().isoformat()
    }
