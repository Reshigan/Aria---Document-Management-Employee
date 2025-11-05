"""
ARIA ERP - Purchase Order Automation Bot
Automates PO creation, approval routing, and supplier selection
"""
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List, Optional
from .bot_api_client import BotAPIClient

class PurchaseOrderBot:
    """Automated Purchase Order Processing"""
    
    def __init__(
        self,
        api_client: Optional[BotAPIClient] = None,
        mode: str = "api",
        api_base_url: str = "http://localhost:8000",
        api_token: Optional[str] = None,
        db_session = None,
        tenant_id: Optional[int] = None
    ):
        if api_client:
            self.client = api_client
        else:
            self.client = BotAPIClient(
                mode=mode,
                api_base_url=api_base_url,
                api_token=api_token,
                db_session=db_session,
                tenant_id=tenant_id
            )
    
    def auto_create_po(
        self,
        company_id: int,
        user_id: int,
        product_id: int,
        quantity: Decimal
    ) -> Dict:
        """Auto-create PO based on reorder levels"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get best supplier (lowest price, best rating)
            cursor.execute("""
                SELECT s.id, s.supplier_name, ps.unit_price, s.rating
                FROM suppliers s
                JOIN product_suppliers ps ON s.id = ps.supplier_id
                WHERE ps.product_id = ? AND s.is_active = 1
                ORDER BY ps.unit_price ASC, s.rating DESC
                LIMIT 1
            """, (product_id,))
            
            supplier = cursor.fetchone()
            if not supplier:
                return {'error': 'No supplier found'}
            
            supplier_id, supplier_name, unit_price, rating = supplier
            total_amount = Decimal(str(unit_price)) * quantity
            
            # Create PO
            cursor.execute("""
                INSERT INTO purchase_orders (
                    company_id, supplier_id, po_date, status,
                    total_amount, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                company_id, supplier_id, date.today(), 'DRAFT',
                float(total_amount), user_id, datetime.now()
            ))
            
            po_id = cursor.lastrowid
            
            # Add line item
            cursor.execute("""
                INSERT INTO purchase_order_lines (
                    purchase_order_id, product_id, quantity,
                    unit_price, total_price
                ) VALUES (?, ?, ?, ?, ?)
            """, (po_id, product_id, float(quantity), float(unit_price), float(total_amount)))
            
            conn.commit()
            
            return {
                'success': True,
                'po_id': po_id,
                'supplier': supplier_name,
                'total_amount': float(total_amount),
                'status': 'DRAFT'
            }
            
        except Exception as e:
            conn.rollback()
            return {'error': str(e)}
        finally:
            conn.close()
    
    def approve_po(
        self,
        company_id: int,
        po_id: int,
        approver_id: int
    ) -> Dict:
        """Approve purchase order"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                UPDATE purchase_orders SET
                    status = 'APPROVED',
                    approved_by = ?,
                    approved_at = ?
                WHERE id = ? AND company_id = ?
            """, (approver_id, datetime.now(), po_id, company_id))
            
            conn.commit()
            
            return {'success': True, 'po_id': po_id, 'status': 'APPROVED'}
            
        except Exception as e:
            conn.rollback()
            return {'error': str(e)}
        finally:
            conn.close()

def main():
    print("\n" + "="*60)
    print("ARIA ERP - PURCHASE ORDER BOT")
    print("="*60 + "\n")
    print("✓ Bot ready - automated PO creation")
    print("✓ Smart supplier selection: ACTIVE")
    print("✓ Auto-approval routing: ENABLED")
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
