"""
ARIA ERP - Inventory Module
Production-grade inventory management with FIFO/LIFO costing and stock valuation
"""

import sqlite3
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from collections import deque

class InventoryModule:
    """Complete Inventory Module"""
    
    def __init__(self, database_path: str = 'aria_erp_production.db'):
        self.db_path = database_path
    
    def calculate_fifo_cost(
        self,
        product_id: int,
        quantity: Decimal
    ) -> Tuple[Decimal, List[Dict]]:
        """Calculate cost using FIFO (First In, First Out) method"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get stock purchases in FIFO order
            cursor.execute("""
                SELECT id, quantity_available, unit_cost
                FROM stock_receipts
                WHERE product_id = ? AND quantity_available > 0
                ORDER BY receipt_date ASC, id ASC
            """, (product_id,))
            
            receipts = cursor.fetchall()
            
            remaining_qty = quantity
            total_cost = Decimal('0.00')
            allocations = []
            
            for receipt_id, available_qty, unit_cost in receipts:
                if remaining_qty <= 0:
                    break
                
                qty_to_use = min(Decimal(str(available_qty)), remaining_qty)
                cost = qty_to_use * Decimal(str(unit_cost))
                
                allocations.append({
                    'receipt_id': receipt_id,
                    'quantity': float(qty_to_use),
                    'unit_cost': float(unit_cost),
                    'total_cost': float(cost)
                })
                
                total_cost += cost
                remaining_qty -= qty_to_use
            
            if remaining_qty > 0:
                return None, []  # Insufficient stock
            
            return total_cost, allocations
            
        finally:
            conn.close()
    
    def calculate_lifo_cost(
        self,
        product_id: int,
        quantity: Decimal
    ) -> Tuple[Decimal, List[Dict]]:
        """Calculate cost using LIFO (Last In, First Out) method"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get stock purchases in LIFO order
            cursor.execute("""
                SELECT id, quantity_available, unit_cost
                FROM stock_receipts
                WHERE product_id = ? AND quantity_available > 0
                ORDER BY receipt_date DESC, id DESC
            """, (product_id,))
            
            receipts = cursor.fetchall()
            
            remaining_qty = quantity
            total_cost = Decimal('0.00')
            allocations = []
            
            for receipt_id, available_qty, unit_cost in receipts:
                if remaining_qty <= 0:
                    break
                
                qty_to_use = min(Decimal(str(available_qty)), remaining_qty)
                cost = qty_to_use * Decimal(str(unit_cost))
                
                allocations.append({
                    'receipt_id': receipt_id,
                    'quantity': float(qty_to_use),
                    'unit_cost': float(unit_cost),
                    'total_cost': float(cost)
                })
                
                total_cost += cost
                remaining_qty -= qty_to_use
            
            if remaining_qty > 0:
                return None, []
            
            return total_cost, allocations
            
        finally:
            conn.close()
    
    def get_stock_valuation(
        self,
        company_id: int,
        method: str = 'FIFO'
    ) -> Dict:
        """Calculate total stock valuation"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get all products with stock
            cursor.execute("""
                SELECT p.id, p.sku, p.product_name, p.current_stock
                FROM products p
                WHERE p.company_id = ? AND p.current_stock > 0
            """, (company_id,))
            
            products = cursor.fetchall()
            
            total_valuation = Decimal('0.00')
            items = []
            
            for prod_id, sku, name, current_stock in products:
                qty = Decimal(str(current_stock))
                
                if method == 'FIFO':
                    cost, _ = self.calculate_fifo_cost(prod_id, qty)
                else:
                    cost, _ = self.calculate_lifo_cost(prod_id, qty)
                
                if cost:
                    avg_cost = cost / qty if qty > 0 else Decimal('0.00')
                    items.append({
                        'sku': sku,
                        'name': name,
                        'quantity': float(qty),
                        'avg_cost': float(avg_cost),
                        'total_value': float(cost)
                    })
                    total_valuation += cost
            
            return {
                'method': method,
                'total_valuation': float(total_valuation),
                'item_count': len(items),
                'items': items
            }
            
        finally:
            conn.close()
    
    def check_reorder_levels(
        self,
        company_id: int
    ) -> List[Dict]:
        """Check products that need reordering"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT p.id, p.sku, p.product_name, p.current_stock,
                       p.reorder_level, p.reorder_quantity
                FROM products p
                WHERE p.company_id = ?
                AND p.current_stock <= p.reorder_level
                AND p.is_active = 1
                ORDER BY p.current_stock ASC
            """, (company_id,))
            
            reorder_list = []
            
            for row in cursor.fetchall():
                reorder_list.append({
                    'product_id': row[0],
                    'sku': row[1],
                    'name': row[2],
                    'current_stock': float(row[3]),
                    'reorder_level': float(row[4] or 0),
                    'suggested_order_qty': float(row[5] or 0)
                })
            
            return reorder_list
            
        finally:
            conn.close()
    
    def record_stock_movement(
        self,
        company_id: int,
        user_id: int,
        product_id: int,
        movement_type: str,
        quantity: Decimal,
        reference: str,
        notes: Optional[str] = None
    ) -> Dict:
        """Record stock movement (adjustment, transfer, etc.)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get current stock
            cursor.execute("""
                SELECT current_stock FROM products WHERE id = ?
            """, (product_id,))
            
            current = cursor.fetchone()
            if not current:
                return {'success': False, 'error': 'Product not found'}
            
            current_stock = Decimal(str(current[0]))
            
            # Calculate new stock
            if movement_type in ['RECEIPT', 'ADJUSTMENT_IN', 'TRANSFER_IN']:
                new_stock = current_stock + quantity
            else:
                new_stock = current_stock - quantity
                if new_stock < 0:
                    return {'success': False, 'error': 'Insufficient stock'}
            
            # Record movement
            cursor.execute("""
                INSERT INTO stock_movements (
                    company_id, product_id, movement_type, quantity,
                    reference_number, notes, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                company_id, product_id, movement_type, float(quantity),
                reference, notes, user_id, datetime.now()
            ))
            
            # Update product stock
            cursor.execute("""
                UPDATE products SET
                    current_stock = ?,
                    updated_at = ?
                WHERE id = ?
            """, (float(new_stock), datetime.now(), product_id))
            
            conn.commit()
            
            return {
                'success': True,
                'previous_stock': float(current_stock),
                'new_stock': float(new_stock),
                'movement': float(quantity)
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            conn.close()


def main():
    """CLI interface"""
    inventory = InventoryModule()
    
    print("\n" + "="*60)
    print("ARIA ERP - INVENTORY MODULE")
    print("="*60 + "\n")
    
    # Stock valuation
    print("STOCK VALUATION")
    print("-" * 60)
    
    for method in ['FIFO', 'LIFO']:
        valuation = inventory.get_stock_valuation(1, method)
        print(f"\n{method} Method:")
        print(f"  Total Items:     {valuation['item_count']}")
        print(f"  Total Valuation: R{valuation['total_valuation']:>12,.2f}")
        
        if valuation['items']:
            print("\n  Top 5 Items:")
            top_items = sorted(valuation['items'], key=lambda x: x['total_value'], reverse=True)[:5]
            for item in top_items:
                print(f"    {item['sku']:15s} {item['name']:30s} R{item['total_value']:>10,.2f}")
    
    print("\n" + "="*60)
    
    # Reorder levels
    print("\nREORDER ALERTS")
    print("-" * 60)
    
    reorder_list = inventory.check_reorder_levels(1)
    
    if reorder_list:
        print(f"\n{len(reorder_list)} products need reordering:\n")
        for item in reorder_list:
            print(f"  {item['sku']:15s} {item['name']:30s}")
            print(f"    Current: {item['current_stock']:>6.0f} | Reorder Level: {item['reorder_level']:>6.0f} | Suggested: {item['suggested_order_qty']:>6.0f}")
    else:
        print("\n✓ All products are adequately stocked.")
    
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
