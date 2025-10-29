"""Procurement ERP API"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from decimal import Decimal
from .models import ProcurementItem
from .three_way_matching import ThreeWayMatchingEngine, MatchLine, ToleranceConfig

router = APIRouter(prefix="/api/v1/erp/procurement", tags=["Procurement ERP"])

# Initialize matching engine
matching_engine = ThreeWayMatchingEngine()


# Pydantic models for API
class POLine(BaseModel):
    line_id: str
    item_id: str
    description: str
    quantity: Decimal
    unit_price: Decimal


class GRNLine(BaseModel):
    line_id: str
    po_line_id: str
    item_id: str
    quantity_received: Decimal


class InvoiceLine(BaseModel):
    line_id: str
    po_line_id: str
    item_id: str
    description: str
    quantity_invoiced: Decimal
    unit_price_invoiced: Decimal


class ThreeWayMatchRequest(BaseModel):
    invoice_id: str
    po_lines: List[POLine]
    grn_lines: List[GRNLine]
    invoice_lines: List[InvoiceLine]
    tolerance_config: Optional[Dict[str, float]] = None


@router.post("/items")
async def create_item(item: ProcurementItem):
    return {"success": True}


@router.get("/items")
async def get_items():
    return []


# 3-Way Matching Endpoints
@router.post("/three-way-match")
async def perform_three_way_match(request: ThreeWayMatchRequest):
    """Perform 3-way matching between PO, GRN, and Invoice"""
    try:
        # Convert Pydantic models to MatchLine objects
        po_match_lines = [
            MatchLine(
                line_id=po.line_id,
                item_id=po.item_id,
                description=po.description,
                quantity=po.quantity,
                unit_price=po.unit_price
            )
            for po in request.po_lines
        ]
        
        grn_match_lines = [
            MatchLine(
                line_id=grn.line_id,
                item_id=grn.item_id,
                description="",
                quantity=grn.quantity_received,
                unit_price=Decimal(0)
            )
            for grn in request.grn_lines
        ]
        
        invoice_match_lines = [
            MatchLine(
                line_id=inv.line_id,
                item_id=inv.item_id,
                description=inv.description,
                quantity=inv.quantity_invoiced,
                unit_price=inv.unit_price_invoiced
            )
            for inv in request.invoice_lines
        ]
        
        # Set tolerance config if provided
        if request.tolerance_config:
            matching_engine.tolerance = ToleranceConfig(**request.tolerance_config)
        
        # Perform matching
        match_result = matching_engine.perform_three_way_match(
            po_lines=po_match_lines,
            grn_lines=grn_match_lines,
            invoice_lines=invoice_match_lines
        )
        
        # Format response
        return {
            "invoice_id": request.invoice_id,
            "match_status": match_result["match_status"],
            "total_variance_amount": float(match_result["total_variance_amount"]),
            "total_variance_pct": round(match_result["total_variance_pct"], 2),
            "approval_recommendation": match_result["approval_recommendation"],
            "line_matches": [
                {
                    "line_id": lm["line_id"],
                    "item_id": lm["item_id"],
                    "match_status": lm["match_status"],
                    "po_quantity": float(lm["po_quantity"]),
                    "grn_quantity": float(lm["grn_quantity"]),
                    "invoice_quantity": float(lm["invoice_quantity"]),
                    "quantity_variance": float(lm["quantity_variance"]),
                    "quantity_variance_pct": round(lm["quantity_variance_pct"], 2),
                    "po_unit_price": float(lm["po_unit_price"]),
                    "invoice_unit_price": float(lm["invoice_unit_price"]),
                    "price_variance": float(lm["price_variance"]),
                    "price_variance_pct": round(lm["price_variance_pct"], 2),
                    "line_total_variance": float(lm["line_total_variance"]),
                    "issues": lm["issues"]
                }
                for lm in match_result["line_matches"]
            ],
            "summary": {
                "total_po_amount": float(match_result["summary"]["total_po_amount"]),
                "total_invoice_amount": float(match_result["summary"]["total_invoice_amount"]),
                "total_lines": match_result["summary"]["total_lines"],
                "matched_lines": match_result["summary"]["matched_lines"],
                "variance_lines": match_result["summary"]["variance_lines"],
                "hold_lines": match_result["summary"]["hold_lines"]
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/three-way-match/invoice/{invoice_id}")
async def get_match_results(invoice_id: str):
    """Get previous 3-way match results for an invoice"""
    # This would typically retrieve from a database
    # For now, return a placeholder response
    return {
        "invoice_id": invoice_id,
        "message": "Match results would be retrieved from database",
        "status": "not_implemented"
    }


@router.post("/three-way-match/approve/{invoice_id}")
async def approve_matched_invoice(invoice_id: str, approved_by: str):
    """Approve a matched invoice"""
    # This would typically update the invoice status in the database
    return {
        "invoice_id": invoice_id,
        "status": "approved",
        "approved_by": approved_by,
        "message": "Invoice approved for payment"
    }


@router.post("/three-way-match/hold/{invoice_id}")
async def hold_invoice(invoice_id: str, reason: str, held_by: str):
    """Put invoice on hold due to matching issues"""
    return {
        "invoice_id": invoice_id,
        "status": "on_hold",
        "reason": reason,
        "held_by": held_by,
        "message": "Invoice placed on hold for review"
    }
