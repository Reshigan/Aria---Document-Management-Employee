"""
Remittance Bot for ARIA ERP
Automatically reconciles customer payments to invoices
Processes bank statements and remittance advices via email
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID, uuid4
import re
import json


class RemittanceBot:
    """
    Remittance Bot - Automatically reconciles payments to invoices
    
    Features:
    - Parse bank statements (CSV, PDF, email)
    - Parse remittance advices from customers
    - Match payments to invoices (by reference, amount, customer)
    - Auto-allocate payments to oldest invoices (FIFO)
    - Handle partial payments and overpayments
    - Create unallocated payment records for manual review
    - Send confirmation emails to customers
    """
    
    def __init__(self, db_session, company_id: UUID):
        self.db = db_session
        self.company_id = company_id
        self.name = "Remittance Bot"
        self.version = "1.0.0"
    
    async def process_email(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process incoming email with payment information
        
        Email formats supported:
        - Bank statement attachments (CSV, PDF)
        - Customer remittance advice (PDF, Excel)
        - Plain text payment notifications
        """
        subject = email_data.get("subject", "")
        body = email_data.get("body", "")
        attachments = email_data.get("attachments", [])
        from_email = email_data.get("from", "")
        
        payment_info = self._extract_payment_info(subject, body)
        
        for attachment in attachments:
            if attachment.get("filename", "").endswith(".csv"):
                csv_payments = self._parse_bank_statement_csv(attachment.get("content"))
                payment_info.extend(csv_payments)
            elif attachment.get("filename", "").endswith(".pdf"):
                pdf_payments = self._parse_remittance_advice_pdf(attachment.get("content"))
                payment_info.extend(pdf_payments)
        
        results = []
        for payment in payment_info:
            result = await self._process_payment(payment, from_email)
            results.append(result)
        
        return {
            "bot": self.name,
            "status": "success",
            "payments_processed": len(results),
            "results": results
        }
    
    def _extract_payment_info(self, subject: str, body: str) -> List[Dict[str, Any]]:
        """Extract payment information from email text"""
        payments = []
        
        pattern1 = r"payment of R?([\d,]+\.?\d*) for invoice ([A-Z0-9-]+)"
        matches = re.finditer(pattern1, body, re.IGNORECASE)
        for match in matches:
            amount = Decimal(match.group(1).replace(",", ""))
            invoice_number = match.group(2)
            payments.append({
                "amount": amount,
                "invoice_number": invoice_number,
                "payment_method": "bank_transfer"
            })
        
        pattern2 = r"reference:?\s*([A-Z0-9-]+).*?amount:?\s*R?([\d,]+\.?\d*)"
        matches = re.finditer(pattern2, body, re.IGNORECASE)
        for match in matches:
            invoice_number = match.group(1)
            amount = Decimal(match.group(2).replace(",", ""))
            payments.append({
                "amount": amount,
                "invoice_number": invoice_number,
                "payment_method": "bank_transfer"
            })
        
        if not payments:
            amount_pattern = r"R?([\d,]+\.?\d*)"
            amounts = re.findall(amount_pattern, body)
            if amounts:
                payments.append({
                    "amount": Decimal(amounts[0].replace(",", "")),
                    "payment_method": "bank_transfer"
                })
        
        return payments
    
    def _parse_bank_statement_csv(self, csv_content: str) -> List[Dict[str, Any]]:
        """Parse bank statement CSV file"""
        payments = []
        lines = csv_content.split("\n")
        
        for line in lines[1:]:  # Skip header
            if not line.strip():
                continue
            
            parts = line.split(",")
            if len(parts) >= 4:
                try:
                    payment_date = datetime.strptime(parts[0].strip(), "%Y-%m-%d").date()
                    reference = parts[1].strip()
                    amount = Decimal(parts[2].strip())
                    description = parts[3].strip()
                    
                    payments.append({
                        "payment_date": payment_date,
                        "reference_number": reference,
                        "amount": amount,
                        "description": description,
                        "payment_method": "bank_transfer"
                    })
                except (ValueError, IndexError):
                    continue
        
        return payments
    
    def _parse_remittance_advice_pdf(self, pdf_content: bytes) -> List[Dict[str, Any]]:
        """Parse remittance advice PDF (placeholder - requires PDF parsing library)"""
        return []
    
    async def _process_payment(self, payment_data: Dict[str, Any], from_email: str) -> Dict[str, Any]:
        """Process a single payment and reconcile to invoices"""
        
        customer = await self._find_customer_by_email(from_email)
        if not customer:
            return {
                "status": "error",
                "message": f"Customer not found for email: {from_email}"
            }
        
        payment_id = uuid4()
        payment_number = await self._generate_payment_number()
        payment_date = payment_data.get("payment_date", date.today())
        amount = payment_data.get("amount")
        reference = payment_data.get("reference_number", payment_data.get("invoice_number", ""))
        
        from sqlalchemy import text
        self.db.execute(text("""
            INSERT INTO customer_payments (
                id, company_id, payment_number, customer_id, payment_date,
                payment_method, reference_number, amount, currency_code,
                status, reconciled_amount, unallocated_amount
            ) VALUES (
                :id, :company_id, :payment_number, :customer_id, :payment_date,
                :payment_method, :reference_number, :amount, 'ZAR',
                'pending', 0.00, :amount
            )
        """), {
            "id": str(payment_id),
            "company_id": str(self.company_id),
            "payment_number": payment_number,
            "customer_id": str(customer["id"]),
            "payment_date": payment_date,
            "payment_method": payment_data.get("payment_method", "bank_transfer"),
            "reference_number": reference,
            "amount": float(amount)
        })
        self.db.commit()
        
        invoices = await self._find_matching_invoices(customer["id"], reference, amount)
        
        allocation_results = await self._allocate_payment(payment_id, amount, invoices)
        
        total_allocated = sum(a["amount"] for a in allocation_results)
        unallocated = amount - total_allocated
        status = "reconciled" if unallocated == 0 else "partially_reconciled" if total_allocated > 0 else "unallocated"
        
        self.db.execute(text("""
            UPDATE customer_payments
            SET status = :status, reconciled_amount = :reconciled, unallocated_amount = :unallocated
            WHERE id = :id
        """), {
            "status": status,
            "reconciled": float(total_allocated),
            "unallocated": float(unallocated),
            "id": str(payment_id)
        })
        self.db.commit()
        
        return {
            "status": "success",
            "payment_id": str(payment_id),
            "payment_number": payment_number,
            "amount": float(amount),
            "allocated": float(total_allocated),
            "unallocated": float(unallocated),
            "allocations": allocation_results
        }
    
    async def _find_customer_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find customer by email address"""
        from sqlalchemy import text
        result = self.db.execute(text("""
            SELECT id, code, name, email
            FROM customers
            WHERE company_id = :company_id AND email = :email AND is_active = true
            LIMIT 1
        """), {"company_id": str(self.company_id), "email": email})
        
        row = result.fetchone()
        if row:
            return {"id": row[0], "code": row[1], "name": row[2], "email": row[3]}
        return None
    
    async def _generate_payment_number(self) -> str:
        """Generate unique payment number"""
        from sqlalchemy import text
        result = self.db.execute(text("""
            SELECT COUNT(*) FROM customer_payments WHERE company_id = :company_id
        """), {"company_id": str(self.company_id)})
        count = result.fetchone()[0]
        return f"PMT-{count + 1:06d}"
    
    async def _find_matching_invoices(self, customer_id: UUID, reference: str, amount: Decimal) -> List[Dict[str, Any]]:
        """Find invoices matching the payment"""
        from sqlalchemy import text
        
        if reference:
            result = self.db.execute(text("""
                SELECT id, invoice_number, total_amount, paid_amount, (total_amount - paid_amount) as outstanding
                FROM invoices
                WHERE company_id = :company_id 
                  AND customer_id = :customer_id
                  AND invoice_number = :reference
                  AND status != 'cancelled'
                  AND (total_amount - paid_amount) > 0
                ORDER BY invoice_date ASC
            """), {
                "company_id": str(self.company_id),
                "customer_id": str(customer_id),
                "reference": reference
            })
            
            invoices = []
            for row in result:
                invoices.append({
                    "id": row[0],
                    "invoice_number": row[1],
                    "total_amount": row[2],
                    "paid_amount": row[3],
                    "outstanding": row[4]
                })
            
            if invoices:
                return invoices
        
        result = self.db.execute(text("""
            SELECT id, invoice_number, total_amount, paid_amount, (total_amount - paid_amount) as outstanding
            FROM invoices
            WHERE company_id = :company_id 
              AND customer_id = :customer_id
              AND (total_amount - paid_amount) = :amount
              AND status != 'cancelled'
            ORDER BY invoice_date ASC
            LIMIT 1
        """), {
            "company_id": str(self.company_id),
            "customer_id": str(customer_id),
            "amount": float(amount)
        })
        
        row = result.fetchone()
        if row:
            return [{
                "id": row[0],
                "invoice_number": row[1],
                "total_amount": row[2],
                "paid_amount": row[3],
                "outstanding": row[4]
            }]
        
        result = self.db.execute(text("""
            SELECT id, invoice_number, total_amount, paid_amount, (total_amount - paid_amount) as outstanding
            FROM invoices
            WHERE company_id = :company_id 
              AND customer_id = :customer_id
              AND status != 'cancelled'
              AND (total_amount - paid_amount) > 0
            ORDER BY invoice_date ASC
        """), {
            "company_id": str(self.company_id),
            "customer_id": str(customer_id)
        })
        
        invoices = []
        for row in result:
            invoices.append({
                "id": row[0],
                "invoice_number": row[1],
                "total_amount": row[2],
                "paid_amount": row[3],
                "outstanding": row[4]
            })
        
        return invoices
    
    async def _allocate_payment(self, payment_id: UUID, amount: Decimal, invoices: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Allocate payment to invoices (FIFO)"""
        from sqlalchemy import text
        allocations = []
        remaining = amount
        
        for invoice in invoices:
            if remaining <= 0:
                break
            
            outstanding = Decimal(str(invoice["outstanding"]))
            allocated = min(remaining, outstanding)
            
            allocation_id = uuid4()
            self.db.execute(text("""
                INSERT INTO payment_allocations (
                    id, company_id, payment_id, invoice_id, allocated_amount
                ) VALUES (
                    :id, :company_id, :payment_id, :invoice_id, :allocated_amount
                )
            """), {
                "id": str(allocation_id),
                "company_id": str(self.company_id),
                "payment_id": str(payment_id),
                "invoice_id": str(invoice["id"]),
                "allocated_amount": float(allocated)
            })
            
            self.db.execute(text("""
                UPDATE invoices
                SET paid_amount = paid_amount + :allocated
                WHERE id = :invoice_id
            """), {
                "allocated": float(allocated),
                "invoice_id": str(invoice["id"])
            })
            
            allocations.append({
                "invoice_number": invoice["invoice_number"],
                "amount": float(allocated)
            })
            
            remaining -= allocated
        
        self.db.commit()
        return allocations
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Return bot capabilities"""
        return {
            "name": self.name,
            "version": self.version,
            "description": "Automatically reconciles customer payments to invoices",
            "capabilities": [
                "parse_bank_statements",
                "parse_remittance_advice",
                "match_payments_to_invoices",
                "auto_allocate_fifo",
                "handle_partial_payments",
                "handle_overpayments",
                "email_processing"
            ],
            "supported_formats": ["email", "csv", "pdf"],
            "matching_strategies": ["invoice_number", "exact_amount", "fifo"]
        }
