"""
MRP (Material Requirements Planning) Service
Calculates material shortfalls and creates purchase orders automatically
Integrates Manufacturing with Procure-to-Pay
"""
from typing import List, Optional, Dict
from uuid import UUID
from datetime import datetime, date, timedelta
from decimal import Decimal
import asyncpg
import httpx
import os
import logging

logger = logging.getLogger(__name__)


class MRPService:
    """Service for Material Requirements Planning"""
    
    async def calculate_material_requirements(
        self,
        company_id: UUID,
        work_order_id: UUID,
        product_id: UUID,
        quantity: Decimal,
        db_conn: Optional[asyncpg.Connection] = None
    ) -> Dict:
        """
        Calculate material requirements for a work order
        
        Args:
            company_id: Company UUID
            work_order_id: Work order UUID
            product_id: Product to manufacture
            quantity: Quantity to produce
            db_conn: Optional database connection
        
        Returns:
            Dict with material requirements and shortfalls
        """
        should_close = False
        if not db_conn:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL not configured")
            db_conn = await asyncpg.connect(database_url)
            should_close = True
        
        try:
            bom_query = """
                SELECT bm.component_product_id, p.name as component_name, bm.quantity_required,
                       p.unit_cost, bm.unit_of_measure
                FROM bom_materials bm
                JOIN products p ON bm.component_product_id = p.id
                WHERE bm.product_id = $1 AND bm.is_active = true
            """
            bom_items = await db_conn.fetch(bom_query, str(product_id))
            
            if not bom_items:
                logger.warning(f"No BOM found for product {product_id}")
                return {
                    "status": "warning",
                    "message": "No BOM defined for product",
                    "required_materials": [],
                    "shortfalls": []
                }
            
            required_materials = []
            shortfalls = []
            
            for bom_item in bom_items:
                component_id = bom_item['component_product_id']
                quantity_per_unit = Decimal(str(bom_item['quantity_required']))
                total_required = quantity_per_unit * quantity
                
                stock_query = """
                    SELECT COALESCE(SUM(quantity_on_hand), 0) as total_stock,
                           COALESCE((SELECT SUM(quantity) FROM inventory_reservations 
                                    WHERE product_id = $1 AND status = 'active'), 0) as reserved_qty
                    FROM stock_on_hand
                    WHERE product_id = $1
                """
                stock = await db_conn.fetchrow(stock_query, component_id)
                
                available_stock = Decimal(str(stock['total_stock'])) - Decimal(str(stock['reserved_qty']))
                
                material_info = {
                    "component_id": component_id,
                    "component_name": bom_item['component_name'],
                    "quantity_required": float(total_required),
                    "quantity_available": float(available_stock),
                    "unit_cost": float(bom_item['unit_cost']) if bom_item['unit_cost'] else 0,
                    "unit_of_measure": bom_item['unit_of_measure']
                }
                
                required_materials.append(material_info)
                
                if available_stock < total_required:
                    shortfall_qty = total_required - available_stock
                    shortfalls.append({
                        **material_info,
                        "shortfall_quantity": float(shortfall_qty),
                        "estimated_cost": float(shortfall_qty * Decimal(str(bom_item['unit_cost'] or 0)))
                    })
            
            return {
                "status": "success",
                "work_order_id": str(work_order_id),
                "product_id": str(product_id),
                "quantity_to_produce": float(quantity),
                "required_materials": required_materials,
                "shortfalls": shortfalls,
                "total_shortfall_count": len(shortfalls)
            }
        
        finally:
            if should_close and db_conn:
                await db_conn.close()
    
    async def create_purchase_orders_for_shortfalls(
        self,
        company_id: UUID,
        work_order_id: UUID,
        shortfalls: List[Dict],
        db_conn: Optional[asyncpg.Connection] = None
    ) -> Dict:
        """
        Create purchase orders for material shortfalls
        
        Args:
            company_id: Company UUID
            work_order_id: Work order UUID
            shortfalls: List of material shortfalls
            db_conn: Optional database connection
        
        Returns:
            Dict with created purchase orders
        """
        if not shortfalls:
            return {
                "status": "success",
                "message": "No shortfalls to process",
                "purchase_orders_created": []
            }
        
        try:
            service_api_key = os.getenv("SERVICE_API_KEY", "aria-internal-service-key-2025")
            headers = {"X-Service-Key": service_api_key}
            
            purchase_orders_created = []
            
            async with httpx.AsyncClient() as client:
                
                po_lines = []
                line_num = 1
                
                for shortfall in shortfalls:
                    po_lines.append({
                        "line_number": line_num,
                        "product_id": shortfall["component_id"],
                        "quantity": shortfall["shortfall_quantity"],
                        "unit_price": shortfall["unit_cost"],
                        "tax_rate": 0.15
                    })
                    line_num += 1
                
                po_data = {
                    "supplier_id": "00000000-0000-0000-0000-000000000001",  # Default supplier
                    "order_date": date.today().isoformat(),
                    "delivery_date": (date.today() + timedelta(days=14)).isoformat(),
                    "reference": f"WO-{work_order_id}-MRP",
                    "notes": f"MRP-generated PO for Work Order {work_order_id}",
                    "lines": po_lines
                }
                
                response = await client.post(
                    "http://localhost:8000/api/erp/procure-to-pay/purchase-orders",
                    json=po_data,
                    headers=headers,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    po_result = response.json()
                    purchase_orders_created.append({
                        "po_id": po_result.get("id"),
                        "po_number": po_result.get("po_number"),
                        "total_amount": po_result.get("total_amount"),
                        "line_count": len(po_lines)
                    })
                else:
                    logger.error(f"Failed to create PO: {response.text}")
                    return {
                        "status": "error",
                        "message": f"Failed to create purchase order: {response.text}"
                    }
            
            return {
                "status": "success",
                "purchase_orders_created": purchase_orders_created,
                "total_pos": len(purchase_orders_created)
            }
        
        except Exception as e:
            logger.error(f"Error creating purchase orders: {e}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    async def run_mrp(
        self,
        company_id: UUID,
        work_order_id: UUID,
        product_id: UUID,
        quantity: Decimal,
        auto_create_pos: bool = True
    ) -> Dict:
        """
        Run full MRP process: calculate requirements and optionally create POs
        
        Args:
            company_id: Company UUID
            work_order_id: Work order UUID
            product_id: Product to manufacture
            quantity: Quantity to produce
            auto_create_pos: Whether to automatically create POs for shortfalls
        
        Returns:
            Dict with MRP results
        """
        mrp_result = await self.calculate_material_requirements(
            company_id, work_order_id, product_id, quantity
        )
        
        if mrp_result["status"] != "success":
            return mrp_result
        
        if auto_create_pos and mrp_result["shortfalls"]:
            po_result = await self.create_purchase_orders_for_shortfalls(
                company_id, work_order_id, mrp_result["shortfalls"]
            )
            
            mrp_result["purchase_orders"] = po_result
        
        return mrp_result


mrp_service = MRPService()


async def run_mrp(company_id: UUID, work_order_id: UUID, product_id: UUID, quantity: Decimal, auto_create_pos: bool = True) -> Dict:
    """Convenience function to run MRP"""
    return await mrp_service.run_mrp(company_id, work_order_id, product_id, quantity, auto_create_pos)
