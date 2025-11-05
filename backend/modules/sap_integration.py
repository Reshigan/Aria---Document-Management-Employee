"""
SAP Integration Module for ARIA
Provides connectors for SAP ECC (RFC/BAPI) and SAP S/4HANA (OData/REST)
Enables Aria to work as a standalone intelligent automation layer on top of SAP systems
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum

router = APIRouter(prefix="/api/integrations/sap", tags=["SAP Integration"])


class SAPSystemType(str, Enum):
    ECC = "ecc"
    S4HANA = "s4hana"


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "module": "sap_integration",
        "version": "1.0.0",
        "supported_systems": ["SAP ECC", "SAP S/4HANA"],
        "features": ["rfc_bapi", "odata_rest", "bidirectional_sync"]
    }
