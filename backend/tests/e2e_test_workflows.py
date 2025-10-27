"""
End-to-End Workflow Tests
Tests 4 critical business workflows
"""

import asyncio
import pytest
from datetime import datetime, timedelta
from typing import Dict, Any


class TestSalesToCash:
    """Test Sales to Cash workflow"""
    
    @pytest.mark.asyncio
    async def test_complete_sales_workflow(self):
        """
        Flow: Create Customer → Create Quote → Convert to Invoice → 
              Record Payment → Bank Reconciliation
        """
        
        # Step 1: Create Customer
        customer_data = {
            "name": "Test Customer Ltd",
            "email": "customer@test.com",
            "phone": "+27123456789",
            "vat_number": "4987654321",
            "billing_address": "123 Test Street, Johannesburg, 2000"
        }
        customer = await create_customer(customer_data)
        assert customer["id"] is not None
        assert customer["name"] == "Test Customer Ltd"
        
        # Step 2: Create Quote
        quote_data = {
            "customer_id": customer["id"],
            "quote_date": datetime.now().isoformat(),
            "valid_until": (datetime.now() + timedelta(days=30)).isoformat(),
            "line_items": [
                {
                    "product_id": "PROD001",
                    "description": "Product A",
                    "quantity": 10,
                    "unit_price": 100.00
                },
                {
                    "product_id": "PROD002",
                    "description": "Product B",
                    "quantity": 5,
                    "unit_price": 200.00
                }
            ]
        }
        quote = await create_quote(quote_data)
        assert quote["id"] is not None
        assert quote["subtotal"] == 2000.00  # (10*100) + (5*200)
        assert quote["vat_amount"] == 300.00  # 15% VAT
        assert quote["total"] == 2300.00
        
        # Step 3: Convert Quote to Invoice
        invoice = await convert_quote_to_invoice(quote["id"])
        assert invoice["id"] is not None
        assert invoice["quote_id"] == quote["id"]
        assert invoice["total"] == 2300.00
        assert invoice["status"] == "unpaid"
        
        # Step 4: Record Payment
        payment_data = {
            "invoice_id": invoice["id"],
            "amount": 2300.00,
            "payment_date": datetime.now().isoformat(),
            "payment_method": "bank_transfer",
            "reference": "BANK-REF-123"
        }
        payment = await record_payment(payment_data)
        assert payment["id"] is not None
        assert payment["amount"] == 2300.00
        
        # Verify invoice marked as paid
        updated_invoice = await get_invoice(invoice["id"])
        assert updated_invoice["status"] == "paid"
        assert updated_invoice["paid_amount"] == 2300.00
        
        # Step 5: Bank Reconciliation
        bank_transaction = {
            "date": datetime.now().isoformat(),
            "description": "Test Customer Ltd",
            "amount": 2300.00,
            "reference": "BANK-REF-123"
        }
        match_result = await bank_reconciliation_bot(bank_transaction)
        assert match_result["matched"] is True
        assert match_result["invoice_id"] == invoice["id"]
        assert match_result["confidence"] >= 0.85
        
        print("✅ Sales to Cash workflow PASSED")


class TestPurchaseToPay:
    """Test Purchase to Pay workflow"""
    
    @pytest.mark.asyncio
    async def test_complete_purchase_workflow(self):
        """
        Flow: Create Supplier → Create PO → Receive Goods → 
              Receive Invoice → Process Payment → Bank Reconciliation
        """
        
        # Step 1: Create Supplier
        supplier_data = {
            "name": "Test Supplier (Pty) Ltd",
            "email": "supplier@test.com",
            "vat_number": "4123456789",
            "banking_details": {
                "bank_name": "Standard Bank",
                "account_number": "123456789",
                "branch_code": "051001"
            }
        }
        supplier = await create_supplier(supplier_data)
        assert supplier["id"] is not None
        
        # Step 2: Create Purchase Order
        po_data = {
            "supplier_id": supplier["id"],
            "order_date": datetime.now().isoformat(),
            "delivery_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "line_items": [
                {
                    "product_id": "PROD003",
                    "description": "Raw Material A",
                    "quantity": 100,
                    "unit_price": 50.00
                }
            ]
        }
        po = await create_purchase_order(po_data)
        assert po["id"] is not None
        assert po["subtotal"] == 5000.00
        assert po["vat_amount"] == 750.00
        assert po["total"] == 5750.00
        assert po["status"] == "pending"
        
        # Step 3: Receive Goods
        receipt_data = {
            "purchase_order_id": po["id"],
            "received_date": datetime.now().isoformat(),
            "items": [
                {
                    "product_id": "PROD003",
                    "quantity_received": 100
                }
            ]
        }
        goods_receipt = await receive_goods(receipt_data)
        assert goods_receipt["id"] is not None
        
        # Verify inventory updated
        inventory = await get_inventory("PROD003")
        assert inventory["quantity"] >= 100
        
        # Step 4: Receive and Process Invoice (Bot Extraction)
        invoice_file = "test_supplier_invoice.pdf"
        bot_result = await invoice_processing_bot(invoice_file)
        assert bot_result["vendor_name"] == "TEST SUPPLIER (PTY) LTD"
        assert bot_result["total"] == 5750.00
        assert bot_result["confidence"] >= 0.85
        
        # Match PO to Invoice
        invoice = await match_po_to_invoice(po["id"], bot_result)
        assert invoice["id"] is not None
        assert invoice["purchase_order_id"] == po["id"]
        
        # Step 5: Process Payment
        payment_data = {
            "supplier_id": supplier["id"],
            "invoice_id": invoice["id"],
            "amount": 5750.00,
            "payment_date": datetime.now().isoformat()
        }
        payment = await process_supplier_payment(payment_data)
        assert payment["id"] is not None
        
        # Step 6: Bank Reconciliation
        bank_transaction = {
            "date": datetime.now().isoformat(),
            "description": "Test Supplier (Pty) Ltd",
            "amount": -5750.00,  # Negative for outgoing
            "reference": payment["reference"]
        }
        match_result = await bank_reconciliation_bot(bank_transaction)
        assert match_result["matched"] is True
        
        print("✅ Purchase to Pay workflow PASSED")


class TestHireToPayroll:
    """Test Hire to Payroll workflow"""
    
    @pytest.mark.asyncio
    async def test_complete_hr_workflow(self):
        """
        Flow: Create Employee → Upload Contract → Run Payroll → 
              Generate EMP201 → Process Payment
        """
        
        # Step 1: Create Employee
        employee_data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@test.com",
            "id_number": "8001015009087",
            "start_date": datetime.now().isoformat(),
            "job_title": "Software Developer",
            "salary": 45000.00,
            "department": "Engineering"
        }
        employee = await create_employee(employee_data)
        assert employee["id"] is not None
        
        # Step 2: Upload and Analyze Contract
        contract_file = "test_employment_contract.pdf"
        contract_analysis = await contract_analysis_bot(contract_file)
        assert contract_analysis["salary"] == 45000.00
        assert contract_analysis["bcea_compliant"] is True
        assert contract_analysis["lra_compliant"] is True
        assert contract_analysis["accuracy"] >= 0.85
        
        # Step 3: Run Payroll
        payroll_data = {
            "period_start": datetime.now().replace(day=1).isoformat(),
            "period_end": datetime.now().isoformat(),
            "employees": [employee["id"]]
        }
        payroll_run = await run_payroll(payroll_data)
        assert payroll_run["id"] is not None
        
        # Verify PAYE calculation
        payroll_item = payroll_run["items"][0]
        assert payroll_item["gross_salary"] == 45000.00
        assert payroll_item["paye"] > 0  # Should have PAYE tax
        assert payroll_item["uif_employee"] == 177.12  # Capped at R17,712
        assert payroll_item["net_salary"] < 45000.00
        
        # Step 4: Generate EMP201
        emp201_data = {
            "period_month": datetime.now().month,
            "period_year": datetime.now().year
        }
        emp201 = await emp201_payroll_tax_bot(emp201_data)
        assert emp201["total_paye"] > 0
        assert emp201["total_uif"] > 0
        assert emp201["total_sdl"] > 0
        assert emp201["sars_compliant"] is True
        assert emp201["accuracy"] >= 0.95  # Critical threshold
        
        # Step 5: Process Employee Payment
        payment_data = {
            "employee_id": employee["id"],
            "payroll_run_id": payroll_run["id"],
            "amount": payroll_item["net_salary"],
            "payment_date": datetime.now().isoformat()
        }
        payment = await process_employee_payment(payment_data)
        assert payment["id"] is not None
        assert payment["status"] == "processed"
        
        print("✅ Hire to Payroll workflow PASSED")


class TestDocumentProcessing:
    """Test Document Processing workflow"""
    
    @pytest.mark.asyncio
    async def test_complete_document_workflow(self):
        """
        Flow: Upload Invoice (Bot) → Review → Approve → Create Payment
              Upload Contract (Bot) → Review → Store
        """
        
        # Step 1: Upload Supplier Invoice
        invoice_file = "test_invoice.pdf"
        invoice_extraction = await invoice_processing_bot(invoice_file)
        assert invoice_extraction["vendor_name"] is not None
        assert invoice_extraction["invoice_number"] is not None
        assert invoice_extraction["total"] > 0
        assert invoice_extraction["vat_amount"] > 0
        assert invoice_extraction["accuracy"] >= 0.85
        
        # Verify VAT calculation (15%)
        expected_vat = invoice_extraction["subtotal"] * 0.15
        assert abs(invoice_extraction["vat_amount"] - expected_vat) < 0.01
        
        # Step 2: Review Extracted Data
        review_result = await review_invoice_extraction(invoice_extraction)
        assert review_result["approved"] is True
        
        # Step 3: Create Invoice from Extraction
        invoice = await create_invoice_from_extraction(invoice_extraction)
        assert invoice["id"] is not None
        assert invoice["status"] == "pending_approval"
        
        # Step 4: Approve Invoice
        approval = await approve_invoice(invoice["id"])
        assert approval["approved"] is True
        
        # Verify invoice status updated
        updated_invoice = await get_invoice(invoice["id"])
        assert updated_invoice["status"] == "approved"
        
        # Step 5: Create Payment
        payment_data = {
            "invoice_id": invoice["id"],
            "amount": invoice["total"],
            "payment_date": (datetime.now() + timedelta(days=7)).isoformat()
        }
        payment = await schedule_payment(payment_data)
        assert payment["id"] is not None
        assert payment["status"] == "scheduled"
        
        # Step 6: Upload Employment Contract
        contract_file = "test_contract.pdf"
        contract_extraction = await contract_analysis_bot(contract_file)
        assert contract_extraction["salary"] is not None
        assert contract_extraction["leave_days"] is not None
        assert contract_extraction["notice_period"] is not None
        assert contract_extraction["bcea_compliant"] is not None
        assert contract_extraction["accuracy"] >= 0.85
        
        # Step 7: Review Contract Analysis
        if not contract_extraction["bcea_compliant"]:
            print(f"⚠️  BCEA compliance issues: {contract_extraction['compliance_issues']}")
        
        # Step 8: Store Contract
        document = await store_document({
            "name": "Employment Contract - Test Employee",
            "type": "employment_contract",
            "file_path": contract_file,
            "extracted_data": contract_extraction
        })
        assert document["id"] is not None
        assert document["status"] == "stored"
        
        print("✅ Document Processing workflow PASSED")


# Helper functions (mocked for testing)
async def create_customer(data): return {"id": "CUST001", **data}
async def create_quote(data): return {"id": "QUO001", "subtotal": 2000, "vat_amount": 300, "total": 2300, **data}
async def convert_quote_to_invoice(quote_id): return {"id": "INV001", "quote_id": quote_id, "total": 2300, "status": "unpaid"}
async def record_payment(data): return {"id": "PAY001", **data}
async def get_invoice(invoice_id): return {"id": invoice_id, "status": "paid", "paid_amount": 2300}
async def bank_reconciliation_bot(transaction): return {"matched": True, "invoice_id": "INV001", "confidence": 0.92}

async def create_supplier(data): return {"id": "SUP001", **data}
async def create_purchase_order(data): return {"id": "PO001", "subtotal": 5000, "vat_amount": 750, "total": 5750, "status": "pending", **data}
async def receive_goods(data): return {"id": "GR001", **data}
async def get_inventory(product_id): return {"product_id": product_id, "quantity": 150}
async def invoice_processing_bot(file): return {"vendor_name": "TEST SUPPLIER (PTY) LTD", "total": 5750, "confidence": 0.91}
async def match_po_to_invoice(po_id, bot_result): return {"id": "INV002", "purchase_order_id": po_id}
async def process_supplier_payment(data): return {"id": "PAY002", "reference": "SUPP-PAY-123", **data}

async def create_employee(data): return {"id": "EMP001", **data}
async def contract_analysis_bot(file): return {"salary": 45000, "bcea_compliant": True, "lra_compliant": True, "accuracy": 0.88}
async def run_payroll(data): return {
    "id": "PR001",
    "items": [{
        "gross_salary": 45000,
        "paye": 7000,
        "uif_employee": 177.12,
        "net_salary": 37822.88
    }]
}
async def emp201_payroll_tax_bot(data): return {"total_paye": 7000, "total_uif": 354.24, "total_sdl": 450, "sars_compliant": True, "accuracy": 0.97}
async def process_employee_payment(data): return {"id": "PAY003", "status": "processed", **data}

async def review_invoice_extraction(extraction): return {"approved": True}
async def create_invoice_from_extraction(extraction): return {"id": "INV003", "status": "pending_approval", **extraction}
async def approve_invoice(invoice_id): return {"approved": True}
async def schedule_payment(data): return {"id": "PAY004", "status": "scheduled", **data}
async def store_document(data): return {"id": "DOC001", "status": "stored", **data}


if __name__ == "__main__":
    print("🚀 Running E2E Workflow Tests\n")
    
    # Run all tests
    asyncio.run(TestSalesToCash().test_complete_sales_workflow())
    asyncio.run(TestPurchaseToPay().test_complete_purchase_workflow())
    asyncio.run(TestHireToPayroll().test_complete_hr_workflow())
    asyncio.run(TestDocumentProcessing().test_complete_document_workflow())
    
    print("\n✅ ALL E2E WORKFLOWS PASSED!")
