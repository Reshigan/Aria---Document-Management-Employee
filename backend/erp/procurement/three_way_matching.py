"""
3-Way Matching Engine for Procurement
Matches Purchase Order, Goods Receipt Note (GRN), and Supplier Invoice
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
from decimal import Decimal


class MatchStatus(Enum):
    """Match status"""
    MATCHED = "matched"
    VARIANCE = "variance"
    UNMATCHED = "unmatched"
    PENDING = "pending"


class VarianceType(Enum):
    """Types of variances"""
    QUANTITY = "quantity_variance"
    PRICE = "price_variance"
    TOTAL = "total_variance"
    

@dataclass
class PurchaseOrderLine:
    """PO line item"""
    po_number: str
    line_number: int
    item_code: str
    item_description: str
    ordered_quantity: Decimal
    unit_price: Decimal
    line_total: Decimal
    

@dataclass
class GRNLine:
    """GRN line item"""
    grn_number: str
    po_number: str
    line_number: int
    item_code: str
    received_quantity: Decimal
    received_date: datetime
    

@dataclass
class InvoiceLine:
    """Invoice line item"""
    invoice_number: str
    po_number: str
    line_number: int
    item_code: str
    invoiced_quantity: Decimal
    unit_price: Decimal
    line_total: Decimal
    

@dataclass
class MatchResult:
    """3-way match result"""
    po_number: str
    grn_number: str
    invoice_number: str
    line_number: int
    item_code: str
    match_status: MatchStatus
    variances: List[Dict[str, Any]]
    po_quantity: Decimal
    grn_quantity: Decimal
    invoice_quantity: Decimal
    po_price: Decimal
    invoice_price: Decimal
    approved_for_payment: bool
    

class ThreeWayMatchingEngine:
    """3-way matching engine"""
    
    def __init__(self, tolerance_pct: Decimal = Decimal("5.0")):
        """
        Initialize matching engine
        
        Args:
            tolerance_pct: Tolerance percentage for variances (default 5%)
        """
        self.tolerance_pct = tolerance_pct
        
    def perform_three_way_match(self, po_lines: List[PurchaseOrderLine],
                                grn_lines: List[GRNLine],
                                invoice_lines: List[InvoiceLine]) -> Dict[str, Any]:
        """
        Perform 3-way matching
        
        Args:
            po_lines: Purchase order lines
            grn_lines: Goods receipt note lines
            invoice_lines: Supplier invoice lines
            
        Returns:
            Match results with variances and approval status
        """
        results = []
        
        for inv_line in invoice_lines:
            # Find matching PO line
            po_line = next((po for po in po_lines 
                          if po.po_number == inv_line.po_number 
                          and po.line_number == inv_line.line_number
                          and po.item_code == inv_line.item_code), None)
            
            # Find matching GRN line
            grn_line = next((grn for grn in grn_lines 
                           if grn.po_number == inv_line.po_number 
                           and grn.line_number == inv_line.line_number
                           and grn.item_code == inv_line.item_code), None)
            
            if not po_line or not grn_line:
                result = MatchResult(
                    po_number=inv_line.po_number,
                    grn_number=grn_line.grn_number if grn_line else "N/A",
                    invoice_number=inv_line.invoice_number,
                    line_number=inv_line.line_number,
                    item_code=inv_line.item_code,
                    match_status=MatchStatus.UNMATCHED,
                    variances=[{"type": "missing_document", "message": "PO or GRN not found"}],
                    po_quantity=po_line.ordered_quantity if po_line else Decimal(0),
                    grn_quantity=grn_line.received_quantity if grn_line else Decimal(0),
                    invoice_quantity=inv_line.invoiced_quantity,
                    po_price=po_line.unit_price if po_line else Decimal(0),
                    invoice_price=inv_line.unit_price,
                    approved_for_payment=False
                )
                results.append(result)
                continue
            
            # Check for variances
            variances = []
            
            # Quantity variance (compare invoice qty with GRN qty)
            qty_variance_pct = self._calculate_variance_pct(
                grn_line.received_quantity, inv_line.invoiced_quantity
            )
            if abs(qty_variance_pct) > self.tolerance_pct:
                variances.append({
                    "type": VarianceType.QUANTITY.value,
                    "grn_quantity": float(grn_line.received_quantity),
                    "invoice_quantity": float(inv_line.invoiced_quantity),
                    "variance_pct": float(qty_variance_pct),
                    "message": f"Quantity variance of {qty_variance_pct:.2f}% exceeds tolerance"
                })
            
            # Price variance (compare invoice price with PO price)
            price_variance_pct = self._calculate_variance_pct(
                po_line.unit_price, inv_line.unit_price
            )
            if abs(price_variance_pct) > self.tolerance_pct:
                variances.append({
                    "type": VarianceType.PRICE.value,
                    "po_price": float(po_line.unit_price),
                    "invoice_price": float(inv_line.unit_price),
                    "variance_pct": float(price_variance_pct),
                    "message": f"Price variance of {price_variance_pct:.2f}% exceeds tolerance"
                })
            
            # Total variance
            expected_total = grn_line.received_quantity * po_line.unit_price
            actual_total = inv_line.line_total
            total_variance_pct = self._calculate_variance_pct(expected_total, actual_total)
            
            if abs(total_variance_pct) > self.tolerance_pct:
                variances.append({
                    "type": VarianceType.TOTAL.value,
                    "expected_total": float(expected_total),
                    "invoice_total": float(actual_total),
                    "variance_amount": float(actual_total - expected_total),
                    "variance_pct": float(total_variance_pct),
                    "message": f"Total variance of {total_variance_pct:.2f}% exceeds tolerance"
                })
            
            # Determine match status
            if len(variances) == 0:
                match_status = MatchStatus.MATCHED
                approved = True
            else:
                match_status = MatchStatus.VARIANCE
                # Auto-approve if all variances are within auto-approval threshold (10%)
                auto_approval_threshold = self.tolerance_pct * 2
                all_within_auto = all(
                    abs(v.get("variance_pct", 999)) <= auto_approval_threshold 
                    for v in variances
                )
                approved = all_within_auto
            
            result = MatchResult(
                po_number=inv_line.po_number,
                grn_number=grn_line.grn_number,
                invoice_number=inv_line.invoice_number,
                line_number=inv_line.line_number,
                item_code=inv_line.item_code,
                match_status=match_status,
                variances=variances,
                po_quantity=po_line.ordered_quantity,
                grn_quantity=grn_line.received_quantity,
                invoice_quantity=inv_line.invoiced_quantity,
                po_price=po_line.unit_price,
                invoice_price=inv_line.unit_price,
                approved_for_payment=approved
            )
            results.append(result)
        
        # Summarize results
        matched_count = sum(1 for r in results if r.match_status == MatchStatus.MATCHED)
        variance_count = sum(1 for r in results if r.match_status == MatchStatus.VARIANCE)
        unmatched_count = sum(1 for r in results if r.match_status == MatchStatus.UNMATCHED)
        approved_count = sum(1 for r in results if r.approved_for_payment)
        
        total_invoice_value = sum(float(inv.line_total) for inv in invoice_lines)
        approved_value = sum(
            float(inv.line_total) for inv in invoice_lines 
            if any(r.invoice_number == inv.invoice_number and r.approved_for_payment for r in results)
        )
        
        return {
            "status": "success",
            "match_date": datetime.now().isoformat(),
            "tolerance_pct": float(self.tolerance_pct),
            "summary": {
                "total_lines": len(results),
                "matched": matched_count,
                "variance": variance_count,
                "unmatched": unmatched_count,
                "approved_for_payment": approved_count,
                "requires_review": variance_count + unmatched_count - (approved_count - matched_count),
                "total_invoice_value": total_invoice_value,
                "approved_value": approved_value,
                "pending_approval_value": total_invoice_value - approved_value
            },
            "results": [self._format_match_result(r) for r in results]
        }
    
    def _calculate_variance_pct(self, expected: Decimal, actual: Decimal) -> Decimal:
        """Calculate variance percentage"""
        if expected == 0:
            return Decimal(100) if actual != 0 else Decimal(0)
        return ((actual - expected) / expected) * Decimal(100)
    
    def _format_match_result(self, result: MatchResult) -> Dict[str, Any]:
        """Format match result for output"""
        return {
            "po_number": result.po_number,
            "grn_number": result.grn_number,
            "invoice_number": result.invoice_number,
            "line_number": result.line_number,
            "item_code": result.item_code,
            "match_status": result.match_status.value,
            "approved_for_payment": result.approved_for_payment,
            "quantities": {
                "po_quantity": float(result.po_quantity),
                "grn_quantity": float(result.grn_quantity),
                "invoice_quantity": float(result.invoice_quantity)
            },
            "prices": {
                "po_price": float(result.po_price),
                "invoice_price": float(result.invoice_price)
            },
            "variances": result.variances
        }
