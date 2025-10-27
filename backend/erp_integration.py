"""
ARIA - ERP Integration Layer
Connects bots with ERP database for seamless data access
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import json


class ERPIntegration:
    """
    Integration layer between bots and ERP system
    Provides unified access to BOM, Work Orders, Quality Inspections
    """
    
    def __init__(self, db = None):
        self.db = db
        # In-memory cache for testing
        self._boms = {}
        self._work_orders = {}
        self._inspections = {}
    
    # ==================== BILL OF MATERIALS ====================
    
    async def get_bom(self, product_name: str) -> Optional[Dict[str, Any]]:
        """Get Bill of Materials for a product"""
        if not self.db:
            return self._boms.get(product_name)
        
        # Use database functions when available
        try:
            import database
            boms = database.get_boms(1)  # Org ID 1
            for bom in boms:
                if bom.get('product_name') == product_name:
                    return bom
        except:
            pass
        
        return None
    
    async def get_all_boms(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all BOMs"""
        if not self.db:
            return list(self._boms.values())[:limit]
        
        try:
            import database
            return database.get_boms(1)[:limit]
        except:
            return []
    
    async def create_bom(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new Bill of Materials"""
        bom_data = {
            "id": len(self._boms) + 1,
            "product_name": data.get("product_name"),
            "version": data.get("version", "1.0"),
            "components": data.get("components", []),
            "created_at": datetime.now().isoformat(),
            "created_by": data.get("created_by", "aria_bot")
        }
        
        if not self.db:
            self._boms[bom_data["product_name"]] = bom_data
            return bom_data
        
        try:
            import database
            result = database.create_bom(
                organization_id=1,
                product_name=data.get("product_name"),
                product_code=data.get("product_code", data.get("product_name")),
                version=data.get("version", "1.0"),
                components=data.get("components", []),
                notes=data.get("notes", ""),
                created_by=data.get("created_by", "aria_bot")
            )
            return result
        except Exception as e:
            print(f"Error creating BOM: {e}")
            self._boms[bom_data["product_name"]] = bom_data
            return bom_data
    
    async def update_bom(self, product_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing BOM"""
        if product_name in self._boms:
            self._boms[product_name].update(data)
            self._boms[product_name]["updated_at"] = datetime.now().isoformat()
            return self._boms[product_name]
        
        return None
    
    async def delete_bom(self, product_name: str) -> bool:
        """Delete a BOM"""
        if product_name in self._boms:
            del self._boms[product_name]
            return True
        return False
    
    # ==================== WORK ORDERS ====================
    
    async def get_work_order(self, order_number: str) -> Optional[Dict[str, Any]]:
        """Get a work order"""
        if not self.db:
            return self._work_orders.get(order_number)
        
        try:
            import database
            orders = database.get_work_orders(1)
            for order in orders:
                if order.get('order_number') == order_number:
                    return order
        except:
            pass
        
        return None
    
    async def get_all_work_orders(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all work orders"""
        if not self.db:
            return list(self._work_orders.values())[:limit]
        
        try:
            import database
            return database.get_work_orders(1)[:limit]
        except:
            return []
    
    async def create_work_order(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new work order"""
        order_data = {
            "id": len(self._work_orders) + 1,
            "order_number": data.get("order_number", f"WO-{len(self._work_orders) + 1:04d}"),
            "product_name": data.get("product_name"),
            "quantity": data.get("quantity"),
            "status": data.get("status", "pending"),
            "start_date": data.get("start_date"),
            "end_date": data.get("end_date"),
            "created_at": datetime.now().isoformat(),
            "created_by": data.get("created_by", "aria_bot")
        }
        
        if not self.db:
            self._work_orders[order_data["order_number"]] = order_data
            return order_data
        
        try:
            import database
            result = database.create_work_order(
                organization_id=1,
                order_number=order_data["order_number"],
                product_name=data.get("product_name"),
                quantity=data.get("quantity"),
                start_date=data.get("start_date"),
                end_date=data.get("end_date"),
                status=data.get("status", "pending"),
                priority=data.get("priority", "medium"),
                notes=data.get("notes", ""),
                created_by=data.get("created_by", "aria_bot")
            )
            return result
        except Exception as e:
            print(f"Error creating work order: {e}")
            self._work_orders[order_data["order_number"]] = order_data
            return order_data
    
    async def update_work_order(self, order_number: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a work order"""
        if order_number in self._work_orders:
            self._work_orders[order_number].update(data)
            self._work_orders[order_number]["updated_at"] = datetime.now().isoformat()
            return self._work_orders[order_number]
        
        return None
    
    async def delete_work_order(self, order_number: str) -> bool:
        """Delete a work order"""
        if order_number in self._work_orders:
            del self._work_orders[order_number]
            return True
        return False
    
    # ==================== QUALITY INSPECTIONS ====================
    
    async def get_inspection(self, inspection_number: str) -> Optional[Dict[str, Any]]:
        """Get a quality inspection"""
        if not self.db:
            return self._inspections.get(inspection_number)
        
        try:
            import database
            inspections = database.get_quality_inspections(1)
            for inspection in inspections:
                if inspection.get('inspection_number') == inspection_number:
                    return inspection
        except:
            pass
        
        return None
    
    async def get_all_inspections(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all quality inspections"""
        if not self.db:
            return list(self._inspections.values())[:limit]
        
        try:
            import database
            return database.get_quality_inspections(1)[:limit]
        except:
            return []
    
    async def create_inspection(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new quality inspection"""
        inspection_data = {
            "id": len(self._inspections) + 1,
            "inspection_number": data.get("inspection_number", f"QI-{len(self._inspections) + 1:04d}"),
            "product_name": data.get("product_name"),
            "batch_number": data.get("batch_number"),
            "status": data.get("status", "pending"),
            "result": data.get("result", "pending"),
            "inspection_date": data.get("inspection_date"),
            "created_at": datetime.now().isoformat(),
            "created_by": data.get("created_by", "aria_bot")
        }
        
        if not self.db:
            self._inspections[inspection_data["inspection_number"]] = inspection_data
            return inspection_data
        
        try:
            import database
            result = database.create_quality_inspection(
                organization_id=1,
                inspection_number=inspection_data["inspection_number"],
                product_name=data.get("product_name"),
                batch_number=data.get("batch_number"),
                inspection_date=data.get("inspection_date"),
                status=data.get("status", "pending"),
                result=data.get("result", "pending"),
                defects=data.get("defects", []),
                notes=data.get("notes", ""),
                inspector=data.get("created_by", "aria_bot")
            )
            return result
        except Exception as e:
            print(f"Error creating inspection: {e}")
            self._inspections[inspection_data["inspection_number"]] = inspection_data
            return inspection_data
    
    async def update_inspection(self, inspection_number: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a quality inspection"""
        if inspection_number in self._inspections:
            self._inspections[inspection_number].update(data)
            self._inspections[inspection_number]["updated_at"] = datetime.now().isoformat()
            return self._inspections[inspection_number]
        
        return None
    
    async def delete_inspection(self, inspection_number: str) -> bool:
        """Delete a quality inspection"""
        if inspection_number in self._inspections:
            del self._inspections[inspection_number]
            return True
        return False
    
    # ==================== ANALYTICS ====================
    
    async def get_production_analytics(self) -> Dict[str, Any]:
        """Get production analytics"""
        work_orders = await self.get_all_work_orders()
        
        total_orders = len(work_orders)
        completed = len([wo for wo in work_orders if wo.get('status') == 'completed'])
        in_progress = len([wo for wo in work_orders if wo.get('status') == 'in_progress'])
        pending = len([wo for wo in work_orders if wo.get('status') == 'pending'])
        
        return {
            "total_work_orders": total_orders,
            "completed": completed,
            "in_progress": in_progress,
            "pending": pending,
            "completion_rate": (completed / total_orders * 100) if total_orders > 0 else 0
        }
    
    async def get_quality_analytics(self) -> Dict[str, Any]:
        """Get quality analytics"""
        inspections = await self.get_all_inspections()
        
        total_inspections = len(inspections)
        passed = len([i for i in inspections if i.get('result') == 'passed'])
        failed = len([i for i in inspections if i.get('result') == 'failed'])
        pending = len([i for i in inspections if i.get('result') == 'pending'])
        
        return {
            "total_inspections": total_inspections,
            "passed": passed,
            "failed": failed,
            "pending": pending,
            "pass_rate": (passed / total_inspections * 100) if total_inspections > 0 else 0
        }


# ==================== FACTORY FUNCTION ====================

_erp_integration_instance = None

def get_erp_integration(db = None) -> ERPIntegration:
    """Get or create ERP integration instance"""
    global _erp_integration_instance
    if _erp_integration_instance is None:
        _erp_integration_instance = ERPIntegration(db)
    return _erp_integration_instance
