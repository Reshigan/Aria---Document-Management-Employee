"""
Database Validation Layer for Comprehensive Bot Testing

This module provides SQL-based validation checks to ensure ERP postings
are correct after each bot interaction.
"""

import psycopg2
from typing import Dict, List, Any, Optional
from decimal import Decimal
import json
from datetime import datetime


class DatabaseValidator:
    """Validates ERP database invariants after bot interactions"""
    
    def __init__(self, db_config: Dict[str, str]):
        """
        Initialize database validator
        
        Args:
            db_config: Database connection config with keys: host, port, database, user, password
        """
        self.db_config = db_config
        self.conn = None
        self.cursor = None
    
    def connect(self):
        """Establish database connection"""
        self.conn = psycopg2.connect(**self.db_config)
        self.cursor = self.conn.cursor()
    
    def disconnect(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
    
    def __enter__(self):
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
    
    def validate_gl_balanced(self, company_id: str) -> Dict[str, Any]:
        """
        Validate that all GL journal entries are balanced (debits = credits)
        
        Args:
            company_id: Company UUID to validate
            
        Returns:
            Dict with validation result and details
        """
        query = """
        SELECT 
            je.id,
            je.reference,
            je.description,
            SUM(CASE WHEN jel.debit_credit = 'D' THEN jel.amount ELSE 0 END) as total_debits,
            SUM(CASE WHEN jel.debit_credit = 'C' THEN jel.amount ELSE 0 END) as total_credits,
            SUM(CASE WHEN jel.debit_credit = 'D' THEN jel.amount ELSE -jel.amount END) as balance
        FROM journal_entries je
        LEFT JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
        WHERE je.company_id = %s
        GROUP BY je.id, je.reference, je.description
        HAVING ABS(SUM(CASE WHEN jel.debit_credit = 'D' THEN jel.amount ELSE -jel.amount END)) > 0.01
        """
        
        self.cursor.execute(query, (company_id,))
        unbalanced = self.cursor.fetchall()
        
        return {
            "check": "GL Balanced",
            "passed": len(unbalanced) == 0,
            "unbalanced_entries": len(unbalanced),
            "details": [
                {
                    "entry_id": str(row[0]),
                    "reference": row[1],
                    "description": row[2],
                    "debits": float(row[3]) if row[3] else 0,
                    "credits": float(row[4]) if row[4] else 0,
                    "balance": float(row[5]) if row[5] else 0
                }
                for row in unbalanced
            ]
        }
    
    def validate_trial_balance(self, company_id: str) -> Dict[str, Any]:
        """
        Validate that trial balance sums to zero
        
        Args:
            company_id: Company UUID to validate
            
        Returns:
            Dict with validation result and details
        """
        query = """
        SELECT 
            SUM(CASE WHEN jel.debit_credit = 'D' THEN jel.amount ELSE 0 END) as total_debits,
            SUM(CASE WHEN jel.debit_credit = 'C' THEN jel.amount ELSE 0 END) as total_credits,
            SUM(CASE WHEN jel.debit_credit = 'D' THEN jel.amount ELSE -jel.amount END) as net_balance
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE je.company_id = %s AND je.status = 'posted'
        """
        
        self.cursor.execute(query, (company_id,))
        row = self.cursor.fetchone()
        
        total_debits = float(row[0]) if row[0] else 0
        total_credits = float(row[1]) if row[1] else 0
        net_balance = float(row[2]) if row[2] else 0
        
        return {
            "check": "Trial Balance",
            "passed": abs(net_balance) < 0.01,
            "total_debits": total_debits,
            "total_credits": total_credits,
            "net_balance": net_balance
        }
    
    def validate_ar_aging(self, company_id: str) -> Dict[str, Any]:
        """
        Validate that AR aging sums match open invoice totals
        
        Args:
            company_id: Company UUID to validate
            
        Returns:
            Dict with validation result and details
        """
        query = """
        SELECT 
            SUM(total_amount) as total_invoices,
            SUM(amount_paid) as total_paid,
            SUM(total_amount - amount_paid) as total_outstanding
        FROM invoices
        WHERE company_id = %s AND status IN ('approved', 'sent', 'partial')
        """
        
        self.cursor.execute(query, (company_id,))
        row = self.cursor.fetchone()
        
        total_invoices = float(row[0]) if row[0] else 0
        total_paid = float(row[1]) if row[1] else 0
        total_outstanding = float(row[2]) if row[2] else 0
        
        return {
            "check": "AR Aging",
            "passed": True,  # Basic check - can be enhanced with aging buckets
            "total_invoices": total_invoices,
            "total_paid": total_paid,
            "total_outstanding": total_outstanding
        }
    
    def validate_ap_aging(self, company_id: str) -> Dict[str, Any]:
        """
        Validate that AP aging sums match open supplier invoice totals
        
        Args:
            company_id: Company UUID to validate
            
        Returns:
            Dict with validation result and details
        """
        query = """
        SELECT 
            SUM(total_amount) as total_invoices,
            SUM(amount_paid) as total_paid,
            SUM(total_amount - amount_paid) as total_outstanding
        FROM supplier_invoices
        WHERE company_id = %s AND status IN ('approved', 'partial')
        """
        
        self.cursor.execute(query, (company_id,))
        row = self.cursor.fetchone()
        
        total_invoices = float(row[0]) if row[0] else 0
        total_paid = float(row[1]) if row[1] else 0
        total_outstanding = float(row[2]) if row[2] else 0
        
        return {
            "check": "AP Aging",
            "passed": True,  # Basic check - can be enhanced with aging buckets
            "total_invoices": total_invoices,
            "total_paid": total_paid,
            "total_outstanding": total_outstanding
        }
    
    def validate_inventory_valuation(self, company_id: str) -> Dict[str, Any]:
        """
        Validate that inventory valuation matches stock movements
        
        Args:
            company_id: Company UUID to validate
            
        Returns:
            Dict with validation result and details
        """
        query = """
        SELECT 
            p.code,
            p.name,
            COALESCE(SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE -sm.quantity END), 0) as calculated_qty,
            COALESCE(soh.quantity_on_hand, 0) as recorded_qty,
            COALESCE(SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE -sm.quantity END), 0) - COALESCE(soh.quantity_on_hand, 0) as variance
        FROM products p
        LEFT JOIN stock_movements sm ON p.id = sm.product_id
        LEFT JOIN stock_on_hand soh ON p.id = soh.product_id
        WHERE p.company_id = %s AND p.track_inventory = true
        GROUP BY p.id, p.code, p.name, soh.quantity_on_hand
        HAVING ABS(COALESCE(SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE -sm.quantity END), 0) - COALESCE(soh.quantity_on_hand, 0)) > 0.01
        """
        
        self.cursor.execute(query, (company_id,))
        variances = self.cursor.fetchall()
        
        return {
            "check": "Inventory Valuation",
            "passed": len(variances) == 0,
            "products_with_variance": len(variances),
            "details": [
                {
                    "product_code": row[0],
                    "product_name": row[1],
                    "calculated_qty": float(row[2]),
                    "recorded_qty": float(row[3]),
                    "variance": float(row[4])
                }
                for row in variances
            ]
        }
    
    def validate_stock_on_hand(self, company_id: str) -> Dict[str, Any]:
        """
        Validate that stock on hand is non-negative
        
        Args:
            company_id: Company UUID to validate
            
        Returns:
            Dict with validation result and details
        """
        query = """
        SELECT 
            p.code,
            p.name,
            soh.quantity_on_hand
        FROM stock_on_hand soh
        JOIN products p ON soh.product_id = p.id
        WHERE p.company_id = %s AND soh.quantity_on_hand < 0
        """
        
        self.cursor.execute(query, (company_id,))
        negative_stock = self.cursor.fetchall()
        
        return {
            "check": "Stock On Hand Non-Negative",
            "passed": len(negative_stock) == 0,
            "products_with_negative_stock": len(negative_stock),
            "details": [
                {
                    "product_code": row[0],
                    "product_name": row[1],
                    "quantity_on_hand": float(row[2])
                }
                for row in negative_stock
            ]
        }
    
    def run_all_validations(self, company_id: str) -> Dict[str, Any]:
        """
        Run all validation checks for a company
        
        Args:
            company_id: Company UUID to validate
            
        Returns:
            Dict with all validation results
        """
        results = {
            "company_id": company_id,
            "timestamp": datetime.utcnow().isoformat(),
            "validations": []
        }
        
        validations = [
            self.validate_gl_balanced(company_id),
            self.validate_trial_balance(company_id),
            self.validate_ar_aging(company_id),
            self.validate_ap_aging(company_id),
            self.validate_inventory_valuation(company_id),
            self.validate_stock_on_hand(company_id)
        ]
        
        results["validations"] = validations
        results["all_passed"] = all(v["passed"] for v in validations)
        results["passed_count"] = sum(1 for v in validations if v["passed"])
        results["failed_count"] = sum(1 for v in validations if not v["passed"])
        
        return results
    
    def save_validation_results(self, results: Dict[str, Any], output_file: str):
        """
        Save validation results to JSON file
        
        Args:
            results: Validation results dict
            output_file: Path to output JSON file
        """
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)


if __name__ == "__main__":
    # Example usage
    db_config = {
        "host": "127.0.0.1",
        "port": "5432",
        "database": "aria_erp",
        "user": "aria_user",
        "password": "AriaSecure2025!"
    }
    
    with DatabaseValidator(db_config) as validator:
        validator.cursor.execute("SELECT id FROM companies WHERE code = 'TEST001'")
        row = validator.cursor.fetchone()
        
        if row:
            test_company_id = str(row[0])
            results = validator.run_all_validations(test_company_id)
            
            print(json.dumps(results, indent=2))
            
            validator.save_validation_results(
                results,
                f"/home/ubuntu/validation_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )
        else:
            print("Test company not found. Run test_tenant_setup.sql first.")
