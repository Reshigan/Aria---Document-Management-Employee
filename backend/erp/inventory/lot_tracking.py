"""
Advanced Lot/Serial/Batch Tracking System
Handles serial numbers, batch tracking, lot traceability, and costing methods
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
from decimal import Decimal


class LotTrackingMethod(Enum):
    """Lot tracking methods"""
    NONE = "none"              # No tracking
    SERIAL = "serial"          # Serial number (unique per unit)
    BATCH = "batch"            # Batch/lot number (multiple units)
    

class CostingMethod(Enum):
    """Inventory costing methods"""
    FIFO = "fifo"              # First In First Out
    LIFO = "lifo"              # Last In First Out
    WEIGHTED_AVG = "weighted_average"  # Weighted Average
    STANDARD = "standard"      # Standard Cost
    ACTUAL = "actual"          # Actual Cost per lot
    

@dataclass
class SerialNumber:
    """Serial number record"""
    serial_number: str
    item_id: str
    item_code: str
    status: str  # available, allocated, sold, scrapped
    location_id: str
    received_date: datetime
    expiry_date: Optional[datetime]
    supplier_id: Optional[str]
    purchase_order_id: Optional[str]
    unit_cost: Decimal
    attributes: Dict[str, Any]  # Custom attributes (warranty, version, etc.)
    

@dataclass
class BatchLot:
    """Batch/lot record"""
    lot_number: str
    item_id: str
    item_code: str
    quantity: Decimal
    available_quantity: Decimal
    allocated_quantity: Decimal
    location_id: str
    manufactured_date: datetime
    expiry_date: Optional[datetime]
    supplier_id: Optional[str]
    production_order_id: Optional[str]
    purchase_order_id: Optional[str]
    unit_cost: Decimal
    status: str  # active, quarantine, expired, consumed
    quality_status: str  # passed, failed, pending
    attributes: Dict[str, Any]
    

@dataclass
class LotTransaction:
    """Lot transaction record"""
    transaction_id: str
    transaction_type: str  # receipt, issue, transfer, adjustment
    lot_number: str
    serial_number: Optional[str]
    item_id: str
    quantity: Decimal
    from_location_id: Optional[str]
    to_location_id: Optional[str]
    transaction_date: datetime
    reference_type: str  # PO, SO, WO, adjustment
    reference_id: str
    unit_cost: Decimal
    total_cost: Decimal
    user_id: str
    

class LotTrackingEngine:
    """Lot and serial number tracking engine"""
    
    def __init__(self):
        self.serial_numbers: List[SerialNumber] = []
        self.batch_lots: List[BatchLot] = []
        self.transactions: List[LotTransaction] = []
        
    def generate_serial_numbers(self, item_id: str, item_code: str, quantity: int,
                                prefix: str = "SN") -> List[str]:
        """Generate unique serial numbers"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        serial_numbers = []
        
        for i in range(quantity):
            serial = f"{prefix}-{item_code}-{timestamp}-{i+1:04d}"
            serial_numbers.append(serial)
            
        return serial_numbers
    
    def generate_lot_number(self, item_code: str, production_date: datetime) -> str:
        """Generate batch/lot number"""
        date_str = production_date.strftime('%Y%m%d')
        batch_num = f"LOT-{item_code}-{date_str}"
        return batch_num
    
    def receive_serialized_items(self, item_id: str, item_code: str,
                                 serial_numbers: List[str], location_id: str,
                                 unit_cost: Decimal, po_id: str,
                                 supplier_id: str) -> Dict[str, Any]:
        """Receive items with serial numbers"""
        received = []
        
        for serial in serial_numbers:
            sn_record = SerialNumber(
                serial_number=serial,
                item_id=item_id,
                item_code=item_code,
                status="available",
                location_id=location_id,
                received_date=datetime.now(),
                expiry_date=None,
                supplier_id=supplier_id,
                purchase_order_id=po_id,
                unit_cost=unit_cost,
                attributes={}
            )
            self.serial_numbers.append(sn_record)
            received.append(serial)
            
            # Record transaction
            trans = LotTransaction(
                transaction_id=f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                transaction_type="receipt",
                lot_number="",
                serial_number=serial,
                item_id=item_id,
                quantity=Decimal(1),
                from_location_id=None,
                to_location_id=location_id,
                transaction_date=datetime.now(),
                reference_type="PO",
                reference_id=po_id,
                unit_cost=unit_cost,
                total_cost=unit_cost,
                user_id="system"
            )
            self.transactions.append(trans)
            
        return {
            "status": "success",
            "item_code": item_code,
            "serial_numbers_received": received,
            "quantity": len(received),
            "location": location_id
        }
    
    def receive_batch_items(self, item_id: str, item_code: str, lot_number: str,
                           quantity: Decimal, location_id: str, unit_cost: Decimal,
                           manufactured_date: datetime, expiry_date: Optional[datetime],
                           po_id: Optional[str] = None,
                           production_order_id: Optional[str] = None) -> Dict[str, Any]:
        """Receive items with batch/lot tracking"""
        lot = BatchLot(
            lot_number=lot_number,
            item_id=item_id,
            item_code=item_code,
            quantity=quantity,
            available_quantity=quantity,
            allocated_quantity=Decimal(0),
            location_id=location_id,
            manufactured_date=manufactured_date,
            expiry_date=expiry_date,
            supplier_id=None,
            production_order_id=production_order_id,
            purchase_order_id=po_id,
            unit_cost=unit_cost,
            status="active",
            quality_status="passed",
            attributes={}
        )
        self.batch_lots.append(lot)
        
        # Record transaction
        trans = LotTransaction(
            transaction_id=f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            transaction_type="receipt",
            lot_number=lot_number,
            serial_number=None,
            item_id=item_id,
            quantity=quantity,
            from_location_id=None,
            to_location_id=location_id,
            transaction_date=datetime.now(),
            reference_type="PO" if po_id else "WO",
            reference_id=po_id or production_order_id or "",
            unit_cost=unit_cost,
            total_cost=unit_cost * quantity,
            user_id="system"
        )
        self.transactions.append(trans)
        
        return {
            "status": "success",
            "lot_number": lot_number,
            "item_code": item_code,
            "quantity": float(quantity),
            "location": location_id,
            "expiry_date": expiry_date.isoformat() if expiry_date else None
        }
    
    def allocate_serial_numbers(self, item_id: str, quantity: int,
                               sales_order_id: str) -> List[str]:
        """Allocate serial numbers for sales order (FIFO)"""
        available = [sn for sn in self.serial_numbers 
                    if sn.item_id == item_id and sn.status == "available"]
        available.sort(key=lambda x: x.received_date)  # FIFO
        
        allocated = []
        for sn in available[:quantity]:
            sn.status = "allocated"
            allocated.append(sn.serial_number)
            
        return allocated
    
    def allocate_batch_quantity(self, item_id: str, quantity: Decimal,
                               costing_method: CostingMethod,
                               sales_order_id: str) -> List[Dict]:
        """Allocate batch quantities based on costing method"""
        active_lots = [lot for lot in self.batch_lots 
                      if lot.item_id == item_id and lot.available_quantity > 0]
        
        if costing_method == CostingMethod.FIFO:
            active_lots.sort(key=lambda x: x.manufactured_date)  # Oldest first
        elif costing_method == CostingMethod.LIFO:
            active_lots.sort(key=lambda x: x.manufactured_date, reverse=True)  # Newest first
        else:
            # For weighted average, can allocate from any lot
            pass
            
        allocations = []
        remaining = quantity
        
        for lot in active_lots:
            if remaining <= 0:
                break
                
            allocate_qty = min(lot.available_quantity, remaining)
            lot.available_quantity -= allocate_qty
            lot.allocated_quantity += allocate_qty
            remaining -= allocate_qty
            
            allocations.append({
                "lot_number": lot.lot_number,
                "quantity": float(allocate_qty),
                "unit_cost": float(lot.unit_cost)
            })
            
        return allocations
    
    def issue_serial_numbers(self, serial_numbers: List[str],
                            sales_order_id: str) -> Dict[str, Any]:
        """Issue serial numbers (ship to customer)"""
        issued = []
        
        for serial in serial_numbers:
            sn = next((s for s in self.serial_numbers if s.serial_number == serial), None)
            if sn:
                sn.status = "sold"
                issued.append(serial)
                
                # Record transaction
                trans = LotTransaction(
                    transaction_id=f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    transaction_type="issue",
                    lot_number="",
                    serial_number=serial,
                    item_id=sn.item_id,
                    quantity=Decimal(1),
                    from_location_id=sn.location_id,
                    to_location_id=None,
                    transaction_date=datetime.now(),
                    reference_type="SO",
                    reference_id=sales_order_id,
                    unit_cost=sn.unit_cost,
                    total_cost=sn.unit_cost,
                    user_id="system"
                )
                self.transactions.append(trans)
                
        return {
            "status": "success",
            "serial_numbers_issued": issued,
            "sales_order_id": sales_order_id
        }
    
    def get_lot_traceability(self, lot_number: str) -> Dict[str, Any]:
        """Get complete traceability for a lot"""
        lot = next((l for l in self.batch_lots if l.lot_number == lot_number), None)
        if not lot:
            return {"status": "error", "message": "Lot not found"}
            
        # Get all transactions for this lot
        lot_trans = [t for t in self.transactions if t.lot_number == lot_number]
        
        return {
            "lot_number": lot_number,
            "item_code": lot.item_code,
            "manufactured_date": lot.manufactured_date.isoformat(),
            "expiry_date": lot.expiry_date.isoformat() if lot.expiry_date else None,
            "original_quantity": float(lot.quantity),
            "available_quantity": float(lot.available_quantity),
            "status": lot.status,
            "quality_status": lot.quality_status,
            "supplier_id": lot.supplier_id,
            "production_order_id": lot.production_order_id,
            "purchase_order_id": lot.purchase_order_id,
            "transactions": [
                {
                    "transaction_id": t.transaction_id,
                    "type": t.transaction_type,
                    "quantity": float(t.quantity),
                    "date": t.transaction_date.isoformat(),
                    "reference": f"{t.reference_type}-{t.reference_id}"
                }
                for t in lot_trans
            ]
        }
    
    def get_serial_history(self, serial_number: str) -> Dict[str, Any]:
        """Get complete history for a serial number"""
        sn = next((s for s in self.serial_numbers if s.serial_number == serial_number), None)
        if not sn:
            return {"status": "error", "message": "Serial number not found"}
            
        # Get all transactions
        sn_trans = [t for t in self.transactions if t.serial_number == serial_number]
        
        return {
            "serial_number": serial_number,
            "item_code": sn.item_code,
            "status": sn.status,
            "received_date": sn.received_date.isoformat(),
            "current_location": sn.location_id,
            "supplier_id": sn.supplier_id,
            "purchase_order_id": sn.purchase_order_id,
            "unit_cost": float(sn.unit_cost),
            "attributes": sn.attributes,
            "transaction_history": [
                {
                    "transaction_id": t.transaction_id,
                    "type": t.transaction_type,
                    "date": t.transaction_date.isoformat(),
                    "from_location": t.from_location_id,
                    "to_location": t.to_location_id,
                    "reference": f"{t.reference_type}-{t.reference_id}"
                }
                for t in sn_trans
            ]
        }
    
    def check_expiring_lots(self, days_threshold: int = 30) -> List[Dict]:
        """Check for lots expiring soon"""
        threshold_date = datetime.now() + timedelta(days=days_threshold)
        expiring = []
        
        for lot in self.batch_lots:
            if lot.expiry_date and lot.expiry_date <= threshold_date and lot.available_quantity > 0:
                days_until_expiry = (lot.expiry_date - datetime.now()).days
                expiring.append({
                    "lot_number": lot.lot_number,
                    "item_code": lot.item_code,
                    "available_quantity": float(lot.available_quantity),
                    "expiry_date": lot.expiry_date.isoformat(),
                    "days_until_expiry": days_until_expiry,
                    "location": lot.location_id,
                    "status": "expired" if days_until_expiry < 0 else "expiring_soon"
                })
                
        return sorted(expiring, key=lambda x: x["days_until_expiry"])


class CostingEngine:
    """Inventory costing calculation engine"""
    
    def __init__(self, costing_method: CostingMethod):
        self.costing_method = costing_method
        self.cost_layers: List[Dict] = []
        
    def add_receipt(self, item_id: str, quantity: Decimal, unit_cost: Decimal,
                   transaction_date: datetime):
        """Add inventory receipt (cost layer)"""
        self.cost_layers.append({
            "item_id": item_id,
            "quantity": quantity,
            "remaining_quantity": quantity,
            "unit_cost": unit_cost,
            "transaction_date": transaction_date,
            "layer_type": "receipt"
        })
        
    def calculate_issue_cost(self, item_id: str, issue_quantity: Decimal) -> Dict[str, Any]:
        """Calculate cost for inventory issue"""
        item_layers = [l for l in self.cost_layers 
                      if l["item_id"] == item_id and l["remaining_quantity"] > 0]
        
        if self.costing_method == CostingMethod.FIFO:
            item_layers.sort(key=lambda x: x["transaction_date"])  # Oldest first
        elif self.costing_method == CostingMethod.LIFO:
            item_layers.sort(key=lambda x: x["transaction_date"], reverse=True)  # Newest first
        elif self.costing_method == CostingMethod.WEIGHTED_AVG:
            return self._calculate_weighted_average_cost(item_id, issue_quantity)
            
        total_cost = Decimal(0)
        remaining = issue_quantity
        layers_used = []
        
        for layer in item_layers:
            if remaining <= 0:
                break
                
            qty_from_layer = min(layer["remaining_quantity"], remaining)
            cost_from_layer = qty_from_layer * layer["unit_cost"]
            
            layer["remaining_quantity"] -= qty_from_layer
            total_cost += cost_from_layer
            remaining -= qty_from_layer
            
            layers_used.append({
                "quantity": float(qty_from_layer),
                "unit_cost": float(layer["unit_cost"]),
                "layer_date": layer["transaction_date"].isoformat()
            })
            
        average_unit_cost = total_cost / issue_quantity if issue_quantity > 0 else Decimal(0)
        
        return {
            "issue_quantity": float(issue_quantity),
            "total_cost": float(total_cost),
            "average_unit_cost": float(average_unit_cost),
            "costing_method": self.costing_method.value,
            "layers_used": layers_used
        }
    
    def _calculate_weighted_average_cost(self, item_id: str, issue_quantity: Decimal) -> Dict[str, Any]:
        """Calculate weighted average cost"""
        item_layers = [l for l in self.cost_layers 
                      if l["item_id"] == item_id and l["remaining_quantity"] > 0]
        
        total_quantity = sum(l["remaining_quantity"] for l in item_layers)
        total_value = sum(l["remaining_quantity"] * l["unit_cost"] for l in item_layers)
        
        if total_quantity == 0:
            return {
                "issue_quantity": float(issue_quantity),
                "total_cost": 0,
                "average_unit_cost": 0,
                "costing_method": self.costing_method.value
            }
            
        weighted_avg_cost = total_value / total_quantity
        total_cost = issue_quantity * weighted_avg_cost
        
        # Reduce all layers proportionally
        for layer in item_layers:
            proportion = layer["remaining_quantity"] / total_quantity
            qty_to_reduce = issue_quantity * proportion
            layer["remaining_quantity"] -= qty_to_reduce
            
        return {
            "issue_quantity": float(issue_quantity),
            "total_cost": float(total_cost),
            "average_unit_cost": float(weighted_avg_cost),
            "costing_method": self.costing_method.value,
            "total_on_hand": float(total_quantity),
            "total_value": float(total_value)
        }
    
    def get_inventory_valuation(self, item_id: Optional[str] = None) -> Dict[str, Any]:
        """Get current inventory valuation"""
        layers = self.cost_layers if not item_id else [l for l in self.cost_layers if l["item_id"] == item_id]
        layers = [l for l in layers if l["remaining_quantity"] > 0]
        
        valuation = {}
        for layer in layers:
            item = layer["item_id"]
            if item not in valuation:
                valuation[item] = {
                    "item_id": item,
                    "total_quantity": Decimal(0),
                    "total_value": Decimal(0)
                }
            valuation[item]["total_quantity"] += layer["remaining_quantity"]
            valuation[item]["total_value"] += layer["remaining_quantity"] * layer["unit_cost"]
            
        results = []
        for item_id, data in valuation.items():
            avg_cost = data["total_value"] / data["total_quantity"] if data["total_quantity"] > 0 else Decimal(0)
            results.append({
                "item_id": item_id,
                "quantity": float(data["total_quantity"]),
                "total_value": float(data["total_value"]),
                "average_cost": float(avg_cost)
            })
            
        return {
            "costing_method": self.costing_method.value,
            "valuation_date": datetime.now().isoformat(),
            "items": results,
            "total_inventory_value": sum(r["total_value"] for r in results)
        }
