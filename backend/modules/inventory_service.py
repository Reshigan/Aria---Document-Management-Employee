"""
Inventory Reservation Service
Manages inventory reservations for work orders, sales orders, and field service requests
Uses soft allocation approach until items are physically issued
"""
from typing import List, Optional, Dict
from uuid import UUID, uuid4
from datetime import datetime, timedelta
from decimal import Decimal
import asyncpg
import os
import logging

logger = logging.getLogger(__name__)


class InventoryReservationService:
    """Service for managing inventory reservations"""
    
    async def reserve_parts(
        self,
        company_id: UUID,
        reference_type: str,  # 'work_order', 'sales_order', 'field_service'
        reference_id: UUID,
        parts: List[Dict],  # [{"product_id": UUID, "quantity": Decimal, "warehouse_id": UUID}]
        db_conn: Optional[asyncpg.Connection] = None
    ) -> Dict:
        """
        Reserve parts for a transaction
        
        Args:
            company_id: Company UUID
            reference_type: Type of transaction
            reference_id: Transaction ID
            parts: List of parts to reserve
            db_conn: Optional database connection
        
        Returns:
            Dict with reservation status and details
        """
        should_close = False
        if not db_conn:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL not configured")
            db_conn = await asyncpg.connect(database_url)
            should_close = True
        
        try:
            reserved_parts = []
            shortfall_parts = []
            
            for part in parts:
                product_id = part['product_id']
                quantity_needed = Decimal(str(part['quantity']))
                warehouse_id = part.get('warehouse_id')
                
                if warehouse_id:
                    stock_query = """
                        SELECT quantity_on_hand, 
                               COALESCE((SELECT SUM(quantity) FROM inventory_reservations 
                                        WHERE product_id = $1 AND warehouse_id = $2 
                                        AND status = 'active'), 0) as reserved_quantity
                        FROM stock_on_hand
                        WHERE product_id = $1 AND warehouse_id = $2
                    """
                    stock = await db_conn.fetchrow(stock_query, str(product_id), str(warehouse_id))
                else:
                    stock_query = """
                        SELECT SUM(quantity_on_hand) as quantity_on_hand,
                               COALESCE((SELECT SUM(quantity) FROM inventory_reservations 
                                        WHERE product_id = $1 AND status = 'active'), 0) as reserved_quantity
                        FROM stock_on_hand
                        WHERE product_id = $1
                    """
                    stock = await db_conn.fetchrow(stock_query, str(product_id))
                
                if not stock or stock['quantity_on_hand'] is None:
                    available_quantity = Decimal('0')
                else:
                    available_quantity = Decimal(str(stock['quantity_on_hand'])) - Decimal(str(stock['reserved_quantity']))
                
                if available_quantity >= quantity_needed:
                    reservation_id = uuid4()
                    await db_conn.execute(
                        """
                        INSERT INTO inventory_reservations (
                            id, company_id, product_id, warehouse_id,
                            quantity, reference_type, reference_id,
                            status, reserved_at, expires_at, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        """,
                        str(reservation_id),
                        str(company_id),
                        str(product_id),
                        str(warehouse_id) if warehouse_id else None,
                        float(quantity_needed),
                        reference_type,
                        str(reference_id),
                        'active',
                        datetime.now(),
                        datetime.now() + timedelta(days=7),  # Expires in 7 days
                        datetime.now()
                    )
                    
                    reserved_parts.append({
                        "reservation_id": str(reservation_id),
                        "product_id": str(product_id),
                        "quantity": float(quantity_needed),
                        "warehouse_id": str(warehouse_id) if warehouse_id else None,
                        "status": "reserved"
                    })
                else:
                    shortfall_parts.append({
                        "product_id": str(product_id),
                        "quantity_needed": float(quantity_needed),
                        "quantity_available": float(available_quantity),
                        "shortfall": float(quantity_needed - available_quantity),
                        "warehouse_id": str(warehouse_id) if warehouse_id else None
                    })
            
            return {
                "status": "success" if not shortfall_parts else "partial",
                "reserved_parts": reserved_parts,
                "shortfall_parts": shortfall_parts,
                "total_reserved": len(reserved_parts),
                "total_shortfall": len(shortfall_parts)
            }
        
        finally:
            if should_close and db_conn:
                await db_conn.close()
    
    async def release_reservation(
        self,
        reservation_id: UUID,
        db_conn: Optional[asyncpg.Connection] = None
    ) -> bool:
        """Release a reservation"""
        should_close = False
        if not db_conn:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL not configured")
            db_conn = await asyncpg.connect(database_url)
            should_close = True
        
        try:
            await db_conn.execute(
                """
                UPDATE inventory_reservations
                SET status = 'released', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND status = 'active'
                """,
                str(reservation_id)
            )
            return True
        finally:
            if should_close and db_conn:
                await db_conn.close()
    
    async def fulfill_reservation(
        self,
        reservation_id: UUID,
        db_conn: Optional[asyncpg.Connection] = None
    ) -> bool:
        """Mark reservation as fulfilled (when stock is actually issued)"""
        should_close = False
        if not db_conn:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL not configured")
            db_conn = await asyncpg.connect(database_url)
            should_close = True
        
        try:
            await db_conn.execute(
                """
                UPDATE inventory_reservations
                SET status = 'fulfilled', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND status = 'active'
                """,
                str(reservation_id)
            )
            return True
        finally:
            if should_close and db_conn:
                await db_conn.close()
    
    async def get_reservations(
        self,
        company_id: UUID,
        reference_type: Optional[str] = None,
        reference_id: Optional[UUID] = None,
        status: Optional[str] = None,
        db_conn: Optional[asyncpg.Connection] = None
    ) -> List[Dict]:
        """Get reservations with filters"""
        should_close = False
        if not db_conn:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL not configured")
            db_conn = await asyncpg.connect(database_url)
            should_close = True
        
        try:
            query = """
                SELECT ir.id, ir.product_id, p.name as product_name, ir.warehouse_id, w.name as warehouse_name,
                       ir.quantity, ir.reference_type, ir.reference_id, ir.status,
                       ir.reserved_at, ir.expires_at
                FROM inventory_reservations ir
                JOIN products p ON ir.product_id = p.id
                LEFT JOIN warehouses w ON ir.warehouse_id = w.id
                WHERE ir.company_id = $1
            """
            params = [str(company_id)]
            
            if reference_type:
                query += f" AND ir.reference_type = ${len(params) + 1}"
                params.append(reference_type)
            
            if reference_id:
                query += f" AND ir.reference_id = ${len(params) + 1}"
                params.append(str(reference_id))
            
            if status:
                query += f" AND ir.status = ${len(params) + 1}"
                params.append(status)
            
            query += " ORDER BY ir.reserved_at DESC"
            
            rows = await db_conn.fetch(query, *params)
            
            return [dict(row) for row in rows]
        
        finally:
            if should_close and db_conn:
                await db_conn.close()


inventory_reservation_service = InventoryReservationService()


async def reserve_parts(company_id: UUID, reference_type: str, reference_id: UUID, parts: List[Dict]) -> Dict:
    """Convenience function to reserve parts"""
    return await inventory_reservation_service.reserve_parts(company_id, reference_type, reference_id, parts)


async def release_reservation(reservation_id: UUID) -> bool:
    """Convenience function to release reservation"""
    return await inventory_reservation_service.release_reservation(reservation_id)


async def fulfill_reservation(reservation_id: UUID) -> bool:
    """Convenience function to fulfill reservation"""
    return await inventory_reservation_service.fulfill_reservation(reservation_id)
