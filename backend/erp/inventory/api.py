"""Inventory ERP API"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal
from .models import InventoryItem
from .lot_tracking import (
    LotTrackingEngine, CostingEngine, SerialNumber, BatchLot,
    CostingMethod, QualityStatus
)

router = APIRouter(prefix="/api/v1/erp/inventory", tags=["Inventory ERP"])

# Initialize engines
lot_engine = LotTrackingEngine()
costing_engine = CostingEngine()


# Pydantic models for API
class SerialReceiveRequest(BaseModel):
    item_id: str
    quantity: int
    unit_cost: Decimal
    location_id: str
    reference: str
    attributes: Optional[dict] = None


class BatchReceiveRequest(BaseModel):
    item_id: str
    lot_number: Optional[str] = None
    quantity: Decimal
    unit_cost: Decimal
    location_id: str
    manufactured_date: Optional[date] = None
    expiry_date: Optional[date] = None
    reference: str
    attributes: Optional[dict] = None


class SerialIssueRequest(BaseModel):
    serial_numbers: List[str]
    destination: str
    reference: str


class BatchIssueRequest(BaseModel):
    item_id: str
    quantity: Decimal
    destination: str
    reference: str
    lot_number: Optional[str] = None


@router.post("/items")
async def create_item(item: InventoryItem):
    return {"success": True}


@router.get("/items")
async def get_items():
    return []


# Serial Number Tracking Endpoints
@router.post("/lot/receive-serial")
async def receive_serialized_items(request: SerialReceiveRequest):
    """Receive serialized items and generate serial numbers"""
    try:
        result = lot_engine.receive_serialized_items(
            item_id=request.item_id,
            quantity=request.quantity,
            unit_cost=request.unit_cost,
            location_id=request.location_id,
            reference=request.reference,
            attributes=request.attributes
        )
        
        return {
            "success": True,
            "serial_numbers": result["serial_numbers"],
            "count": result["count"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/lot/issue-serial")
async def issue_serialized_items(request: SerialIssueRequest):
    """Issue serialized items by serial numbers"""
    try:
        result = lot_engine.issue_serial_numbers(
            serial_numbers=request.serial_numbers,
            destination=request.destination,
            reference=request.reference
        )
        
        return {
            "success": True,
            "issued_serials": result["issued_serials"],
            "count": result["count"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/lot/serial/{serial_number}")
async def get_serial_history(serial_number: str):
    """Get complete history of a serial number"""
    try:
        history = lot_engine.get_serial_history(serial_number)
        
        if not history:
            raise HTTPException(status_code=404, detail="Serial number not found")
        
        return {
            "serial_number": serial_number,
            "history": history
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Batch/Lot Tracking Endpoints
@router.post("/lot/receive-batch")
async def receive_batch_items(request: BatchReceiveRequest):
    """Receive batch/lot tracked items"""
    try:
        result = lot_engine.receive_batch_items(
            item_id=request.item_id,
            lot_number=request.lot_number,
            quantity=request.quantity,
            unit_cost=request.unit_cost,
            location_id=request.location_id,
            manufactured_date=request.manufactured_date,
            expiry_date=request.expiry_date,
            reference=request.reference,
            attributes=request.attributes
        )
        
        return {
            "success": True,
            "lot_number": result["lot_number"],
            "quantity": float(result["quantity"])
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/lot/issue-batch")
async def issue_batch_items(request: BatchIssueRequest):
    """Issue batch/lot tracked items"""
    try:
        result = lot_engine.issue_batch_items(
            item_id=request.item_id,
            quantity=request.quantity,
            destination=request.destination,
            reference=request.reference,
            lot_number=request.lot_number
        )
        
        return {
            "success": True,
            "issued_lots": result["issued_lots"],
            "total_quantity": float(result["total_quantity"])
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/lot/batch/{lot_number}")
async def get_lot_traceability(lot_number: str):
    """Get complete traceability for a lot/batch"""
    try:
        traceability = lot_engine.get_lot_traceability(lot_number)
        
        if not traceability:
            raise HTTPException(status_code=404, detail="Lot number not found")
        
        return {
            "lot_number": lot_number,
            "traceability": traceability
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/lot/expiring")
async def get_expiring_lots(days_ahead: int = 30):
    """Get lots expiring within specified days"""
    try:
        expiring_lots = lot_engine.get_expiring_lots(days_ahead)
        
        return {
            "days_ahead": days_ahead,
            "expiring_lots": [
                {
                    "lot_number": lot.lot_number,
                    "item_id": lot.item_id,
                    "expiry_date": lot.expiry_date.isoformat() if lot.expiry_date else None,
                    "quantity_on_hand": float(lot.quantity_on_hand),
                    "location_id": lot.location_id
                }
                for lot in expiring_lots
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Costing Endpoints
@router.post("/costing/calculate-cogs")
async def calculate_cogs(
    item_id: str,
    quantity: Decimal,
    costing_method: str = "FIFO"
):
    """Calculate cost of goods sold for an issue"""
    try:
        method = CostingMethod[costing_method.upper()]
        cost = costing_engine.calculate_issue_cost(item_id, quantity, method)
        
        return {
            "item_id": item_id,
            "quantity": float(quantity),
            "costing_method": costing_method,
            "total_cost": float(cost)
        }
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid costing method: {costing_method}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/costing/valuation/{item_id}")
async def get_inventory_valuation(item_id: str, costing_method: str = "FIFO"):
    """Get inventory valuation for an item"""
    try:
        method = CostingMethod[costing_method.upper()]
        valuation = costing_engine.get_inventory_valuation(item_id, method)
        
        return {
            "item_id": item_id,
            "costing_method": costing_method,
            "quantity_on_hand": float(valuation["quantity_on_hand"]),
            "total_value": float(valuation["total_value"]),
            "average_cost": float(valuation["average_cost"])
        }
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid costing method: {costing_method}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
