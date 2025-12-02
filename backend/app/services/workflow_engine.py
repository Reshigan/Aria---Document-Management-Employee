"""
Workflow Engine Service
Manages transactional workflows: Quote-to-Cash, Procure-to-Pay, Production workflows
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras
from app.database import get_db_connection
import uuid


class WorkflowEngine:
    """Manage ERP transactional workflows"""
    
    def quote_to_sales_order(self, quote_id: str, company_id: str, user_id: str) -> Dict[str, Any]:
        """Convert approved quote to sales order"""
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT * FROM quotes WHERE id = %s AND company_id = %s
            """, [quote_id, company_id])
            quote = dict(cursor.fetchone() or {})
            
            if not quote:
                raise ValueError("Quote not found")
            
            if quote['status'] != 'APPROVED':
                raise ValueError("Quote must be approved before converting to sales order")
            
            so_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO sales_orders (
                    id, company_id, customer_id, so_number, so_date, 
                    delivery_date, status, subtotal, tax_amount, total_amount,
                    notes, created_by, created_at, updated_at
                )
                SELECT 
                    %s, company_id, customer_id, 
                    'SO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(FLOOR(RANDOM() * 10000) AS TEXT), 4, '0'),
                    NOW(), delivery_date, 'CONFIRMED', 
                    subtotal, tax_amount, total_amount, notes, %s, NOW(), NOW()
                FROM quotes WHERE id = %s
                RETURNING id, so_number
            """, [so_id, user_id, quote_id])
            
            so_result = dict(cursor.fetchone())
            
            cursor.execute("""
                SELECT * FROM quote_lines WHERE quote_id = %s ORDER BY line_number
            """, [quote_id])
            quote_lines = [dict(row) for row in cursor.fetchall()]
            
            for line in quote_lines:
                cursor.execute("""
                    INSERT INTO sales_order_lines (
                        id, sales_order_id, line_number, product_id, item_code,
                        description, quantity, unit_price, tax_rate, tax_amount,
                        line_total, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, [
                    str(uuid.uuid4()), so_id, line['line_number'], line.get('product_id'),
                    line['item_code'], line['description'], line['quantity'],
                    line['unit_price'], line.get('tax_rate', 0), line.get('tax_amount', 0),
                    line['line_total']
                ])
            
            cursor.execute("""
                UPDATE quotes SET status = 'CONVERTED', updated_at = NOW()
                WHERE id = %s
            """, [quote_id])
            
            conn.commit()
            
            return {
                'success': True,
                'sales_order_id': so_result['id'],
                'sales_order_number': so_result['so_number'],
                'message': 'Quote successfully converted to sales order'
            }
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    def sales_order_to_invoice(self, so_id: str, company_id: str, user_id: str) -> Dict[str, Any]:
        """Convert sales order to invoice"""
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT * FROM sales_orders WHERE id = %s AND company_id = %s
            """, [so_id, company_id])
            so = dict(cursor.fetchone() or {})
            
            if not so:
                raise ValueError("Sales order not found")
            
            if so['status'] not in ['CONFIRMED', 'DELIVERED']:
                raise ValueError("Sales order must be confirmed or delivered before invoicing")
            
            invoice_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO customer_invoices (
                    id, company_id, customer_id, invoice_number, invoice_date,
                    due_date, status, subtotal, tax_amount, total_amount,
                    amount_paid, notes, created_by, created_at, updated_at
                )
                SELECT 
                    %s, company_id, customer_id,
                    'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(FLOOR(RANDOM() * 10000) AS TEXT), 4, '0'),
                    NOW(), NOW() + INTERVAL '30 days', 'DRAFT',
                    subtotal, tax_amount, total_amount, 0, notes, %s, NOW(), NOW()
                FROM sales_orders WHERE id = %s
                RETURNING id, invoice_number
            """, [invoice_id, user_id, so_id])
            
            invoice_result = dict(cursor.fetchone())
            
            cursor.execute("""
                SELECT * FROM sales_order_lines WHERE sales_order_id = %s ORDER BY line_number
            """, [so_id])
            so_lines = [dict(row) for row in cursor.fetchall()]
            
            for line in so_lines:
                cursor.execute("""
                    INSERT INTO customer_invoice_lines (
                        id, invoice_id, line_number, product_id, item_code,
                        description, quantity, unit_price, tax_rate, tax_amount,
                        line_total, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, [
                    str(uuid.uuid4()), invoice_id, line['line_number'], line.get('product_id'),
                    line['item_code'], line['description'], line['quantity'],
                    line['unit_price'], line.get('tax_rate', 0), line.get('tax_amount', 0),
                    line['line_total']
                ])
            
            cursor.execute("""
                UPDATE sales_orders SET status = 'INVOICED', updated_at = NOW()
                WHERE id = %s
            """, [so_id])
            
            conn.commit()
            
            return {
                'success': True,
                'invoice_id': invoice_result['id'],
                'invoice_number': invoice_result['invoice_number'],
                'message': 'Sales order successfully converted to invoice'
            }
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    def purchase_order_to_goods_receipt(self, po_id: str, company_id: str, user_id: str) -> Dict[str, Any]:
        """Create goods receipt from purchase order"""
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT * FROM purchase_orders WHERE id = %s AND company_id = %s
            """, [po_id, company_id])
            po = dict(cursor.fetchone() or {})
            
            if not po:
                raise ValueError("Purchase order not found")
            
            if po['status'] != 'APPROVED':
                raise ValueError("Purchase order must be approved before goods receipt")
            
            gr_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO goods_receipts (
                    id, company_id, purchase_order_id, gr_number, receipt_date,
                    status, received_by, notes, created_at, updated_at
                )
                VALUES (
                    %s, %s, %s,
                    'GR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(FLOOR(RANDOM() * 10000) AS TEXT), 4, '0'),
                    NOW(), 'RECEIVED', %s, 'Goods received from PO', NOW(), NOW()
                )
                RETURNING id, gr_number
            """, [gr_id, company_id, po_id, user_id])
            
            gr_result = dict(cursor.fetchone())
            
            cursor.execute("""
                SELECT * FROM purchase_order_lines WHERE purchase_order_id = %s ORDER BY line_number
            """, [po_id])
            po_lines = [dict(row) for row in cursor.fetchall()]
            
            for line in po_lines:
                cursor.execute("""
                    INSERT INTO goods_receipt_lines (
                        id, goods_receipt_id, line_number, product_id, item_code,
                        description, quantity_ordered, quantity_received, unit_price,
                        created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, [
                    str(uuid.uuid4()), gr_id, line['line_number'], line.get('product_id'),
                    line['item_code'], line['description'], line['quantity'], line['quantity'],
                    line['unit_price']
                ])
            
            cursor.execute("""
                UPDATE purchase_orders SET status = 'RECEIVED', updated_at = NOW()
                WHERE id = %s
            """, [po_id])
            
            conn.commit()
            
            return {
                'success': True,
                'goods_receipt_id': gr_result['id'],
                'goods_receipt_number': gr_result['gr_number'],
                'message': 'Goods receipt successfully created from purchase order'
            }
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    def approve_document(self, document_type: str, document_id: str, company_id: str, user_id: str, notes: Optional[str] = None) -> Dict[str, Any]:
        """Approve a document (PO, Invoice, Payment, etc.)"""
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        try:
            table_map = {
                'purchase_order': 'purchase_orders',
                'payment': 'payments',
                'sales_order': 'sales_orders',
                'quote': 'quotes'
            }
            
            table_name = table_map.get(document_type)
            if not table_name:
                raise ValueError(f"Invalid document type: {document_type}")
            
            cursor.execute(f"""
                UPDATE {table_name}
                SET status = 'APPROVED', 
                    approved_by = %s,
                    approved_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s AND company_id = %s
                RETURNING id
            """, [user_id, document_id, company_id])
            
            result = cursor.fetchone()
            if not result:
                raise ValueError(f"{document_type} not found")
            
            approval_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO approval_history (
                    id, company_id, document_type, document_id, 
                    approved_by, approval_date, notes, created_at
                ) VALUES (%s, %s, %s, %s, %s, NOW(), %s, NOW())
            """, [approval_id, company_id, document_type, document_id, user_id, notes])
            
            conn.commit()
            
            return {
                'success': True,
                'message': f'{document_type} approved successfully',
                'approval_id': approval_id
            }
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()


workflow_engine = WorkflowEngine()
