'''Comprehensive UAT Test Suite - All 67 Bots + ERP'''
import pytest
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from bot_registry import bot_registry

class TestUATFinancialBots:
    """UAT for 5 Financial Bots"""
    
    @pytest.mark.asyncio
    async def test_general_ledger_bot_full_workflow(self):
        """Test GL bot with journal entries and reconciliation"""
        print("\n🧪 Testing General Ledger Bot...")
        
        # Test 1: Post journal entry
        result = await bot_registry.execute_bot("general_ledger_bot", {
            "action": "post_journal_entry",
            "entries": [
                {"account": "1000", "debit": 10000.00, "credit": 0},
                {"account": "5000", "debit": 0, "credit": 10000.00}
            ],
            "description": "Test journal entry",
            "date": datetime.now().isoformat()
        })
        assert result["success"], f"GL post failed: {result.get('error')}"
        print(f"  ✅ Posted journal entry: {result.get('journal_number')}")
        
        # Test 2: Generate trial balance
        result = await bot_registry.execute_bot("general_ledger_bot", {
            "action": "trial_balance"
        })
        assert result["success"]
        assert "accounts" in result
        print(f"  ✅ Trial balance generated: {len(result.get('accounts', []))} accounts")
        
        # Test 3: Reconciliation
        result = await bot_registry.execute_bot("general_ledger_bot", {
            "action": "reconcile",
            "account": "1000"
        })
        assert result["success"]
        print(f"  ✅ Reconciliation complete: {result.get('status')}")
    
    @pytest.mark.asyncio
    async def test_tax_compliance_bot_sa_vat(self):
        """Test South African VAT calculation"""
        print("\n🧪 Testing Tax Compliance Bot (SA VAT)...")
        
        # Test VAT calculation
        result = await bot_registry.execute_bot("tax_compliance_bot", {
            "action": "calculate_vat",
            "amount": 10000.00,
            "vat_rate": 15
        })
        assert result["success"]
        assert result["vat_amount"] == 1500.00
        assert result["total_incl_vat"] == 11500.00
        print(f"  ✅ VAT calculated: R{result['vat_amount']}")
        
        # Test VAT return
        result = await bot_registry.execute_bot("tax_compliance_bot", {
            "action": "generate_vat_return",
            "period": "2025-01"
        })
        assert result["success"]
        print(f"  ✅ VAT return generated: {result.get('return_id')}")
    
    @pytest.mark.asyncio
    async def test_payment_processing_bot_batch(self):
        """Test payment batch processing"""
        print("\n🧪 Testing Payment Processing Bot...")
        
        # Create payment batch
        result = await bot_registry.execute_bot("payment_processing_bot", {
            "action": "create_batch",
            "payments": [
                {"supplier_id": "SUP001", "amount": 15000.00, "reference": "INV-001"},
                {"supplier_id": "SUP002", "amount": 25000.00, "reference": "INV-002"}
            ]
        })
        assert result["success"]
        batch_id = result.get("batch_id")
        print(f"  ✅ Payment batch created: {batch_id}, total: R{result.get('total_amount')}")
        
        # Generate bank file
        result = await bot_registry.execute_bot("payment_processing_bot", {
            "action": "generate_bank_file",
            "batch_id": batch_id
        })
        assert result["success"]
        print(f"  ✅ Bank file generated: {result.get('file_name')}")

class TestUATERPCoreBots:
    """UAT for 8 ERP Core Bots"""
    
    @pytest.mark.asyncio
    async def test_purchase_order_bot_full_cycle(self):
        """Test complete PO lifecycle"""
        print("\n🧪 Testing Purchase Order Bot - Full Cycle...")
        
        # Create PO
        result = await bot_registry.execute_bot("purchase_order_bot", {
            "action": "create_po",
            "supplier_id": "SUP001",
            "items": [
                {"product_id": "PROD001", "quantity": 100, "price": 50.00}
            ]
        })
        assert result["success"]
        po_number = result.get("po_number")
        print(f"  ✅ PO created: {po_number}, total: R{result.get('total')}")
        
        # Approve PO
        result = await bot_registry.execute_bot("purchase_order_bot", {
            "action": "approve_po",
            "po_number": po_number
        })
        assert result["success"]
        print(f"  ✅ PO approved: {po_number}")
        
        # Receive goods
        result = await bot_registry.execute_bot("purchase_order_bot", {
            "action": "receive_goods",
            "po_number": po_number,
            "quantity_received": 100
        })
        assert result["success"]
        print(f"  ✅ Goods received: {result.get('receipt_number')}")
        
        # 3-way match
        result = await bot_registry.execute_bot("purchase_order_bot", {
            "action": "three_way_match",
            "po_number": po_number
        })
        assert result["success"]
        print(f"  ✅ 3-way match: {result.get('match_status')}")
    
    @pytest.mark.asyncio
    async def test_bom_management_bot_explosion(self):
        """Test BOM explosion and cost rollup"""
        print("\n🧪 Testing BOM Management Bot...")
        
        # Create BOM
        result = await bot_registry.execute_bot("bom_management_bot", {
            "action": "create_bom",
            "product_id": "FG-001",
            "components": [
                {"component_id": "RM-001", "quantity": 2, "unit_cost": 50.00},
                {"component_id": "RM-002", "quantity": 3, "unit_cost": 30.00}
            ]
        })
        assert result["success"]
        bom_id = result.get("bom_id")
        print(f"  ✅ BOM created: {bom_id}")
        
        # BOM explosion
        result = await bot_registry.execute_bot("bom_management_bot", {
            "action": "explode_bom",
            "bom_id": bom_id,
            "quantity": 10
        })
        assert result["success"]
        print(f"  ✅ BOM exploded: {len(result.get('requirements', []))} requirements")
        
        # Cost rollup
        result = await bot_registry.execute_bot("bom_management_bot", {
            "action": "cost_rollup",
            "bom_id": bom_id
        })
        assert result["success"]
        print(f"  ✅ Cost rollup: R{result.get('total_cost')}")

class TestUATProcurementBots:
    """UAT for 10 Procurement Bots"""
    
    @pytest.mark.asyncio
    async def test_supplier_management_full_workflow(self):
        """Test supplier onboarding and management"""
        print("\n🧪 Testing Supplier Management Bot...")
        
        # Onboard supplier
        result = await bot_registry.execute_bot("supplier_management_bot", {
            "action": "onboard_supplier",
            "company_name": "Acme Supplies (Pty) Ltd",
            "tax_number": "1234567890",
            "address": "123 Main St, Johannesburg, 2000"
        })
        assert result["success"]
        supplier_id = result.get("supplier_id")
        print(f"  ✅ Supplier onboarded: {supplier_id}")
        
        # Verify compliance
        result = await bot_registry.execute_bot("supplier_management_bot", {
            "action": "check_compliance",
            "supplier_id": supplier_id
        })
        assert result["success"]
        print(f"  ✅ Compliance check: {result.get('status')}")
    
    @pytest.mark.asyncio
    async def test_rfq_management_complete_cycle(self):
        """Test RFQ creation and evaluation"""
        print("\n🧪 Testing RFQ Management Bot...")
        
        # Create RFQ
        result = await bot_registry.execute_bot("rfq_management_bot", {
            "action": "create_rfq",
            "items": [
                {"description": "Steel sheets", "quantity": 1000, "unit": "kg"}
            ],
            "suppliers": ["SUP001", "SUP002", "SUP003"]
        })
        assert result["success"]
        rfq_id = result.get("rfq_id")
        print(f"  ✅ RFQ created: {rfq_id}, sent to {result.get('suppliers_contacted')} suppliers")
        
        # Compare quotes
        result = await bot_registry.execute_bot("rfq_management_bot", {
            "action": "compare_quotes",
            "rfq_id": rfq_id
        })
        assert result["success"]
        print(f"  ✅ Quotes compared: Best price R{result.get('best_price')}")

class TestUATHRBots:
    """UAT for 7 HR Bots"""
    
    @pytest.mark.asyncio
    async def test_recruitment_bot_full_cycle(self):
        """Test recruitment from job posting to offer"""
        print("\n🧪 Testing Recruitment Bot - Full Cycle...")
        
        # Post job
        result = await bot_registry.execute_bot("recruitment_bot", {
            "action": "post_job",
            "title": "Senior Software Engineer",
            "department": "IT",
            "location": "Johannesburg"
        })
        assert result["success"]
        job_id = result.get("job_id")
        print(f"  ✅ Job posted: {job_id}")
        
        # Screen candidates
        result = await bot_registry.execute_bot("recruitment_bot", {
            "action": "screen_candidates",
            "job_id": job_id
        })
        assert result["success"]
        print(f"  ✅ Screened {result.get('screened')} candidates, shortlisted {result.get('shortlisted')}")
        
        # Schedule interview
        result = await bot_registry.execute_bot("recruitment_bot", {
            "action": "schedule_interview",
            "candidate_id": "CAND001"
        })
        assert result["success"]
        print(f"  ✅ Interview scheduled: {result.get('interview_date')}")
        
        # Generate offer
        result = await bot_registry.execute_bot("recruitment_bot", {
            "action": "generate_offer",
            "candidate_id": "CAND001"
        })
        assert result["success"]
        print(f"  ✅ Offer generated: {result.get('offer_id')}, salary R{result.get('salary')}")
    
    @pytest.mark.asyncio
    async def test_time_attendance_bot_daily_cycle(self):
        """Test time and attendance tracking"""
        print("\n🧪 Testing Time & Attendance Bot...")
        
        # Clock in
        result = await bot_registry.execute_bot("time_attendance_bot", {
            "action": "clock_in",
            "employee_id": "EMP001"
        })
        assert result["success"]
        print(f"  ✅ Clocked in: {result.get('clock_in_time')}")
        
        # Clock out
        result = await bot_registry.execute_bot("time_attendance_bot", {
            "action": "clock_out",
            "employee_id": "EMP001"
        })
        assert result["success"]
        print(f"  ✅ Clocked out: {result.get('total_hours')} hours")

class TestUATSalesCRMBots:
    """UAT for 6 Sales/CRM Bots"""
    
    @pytest.mark.asyncio
    async def test_lead_to_order_full_cycle(self):
        """Test complete sales cycle from lead to order"""
        print("\n🧪 Testing Sales Cycle - Lead to Order...")
        
        # Create lead
        result = await bot_registry.execute_bot("lead_management_bot", {
            "action": "create_lead",
            "company": "ABC Corp",
            "contact": "John Doe",
            "source": "website"
        })
        assert result["success"]
        lead_id = result.get("lead_id")
        print(f"  ✅ Lead created: {lead_id}")
        
        # Qualify lead
        result = await bot_registry.execute_bot("lead_management_bot", {
            "action": "qualify_lead",
            "lead_id": lead_id
        })
        assert result["success"]
        print(f"  ✅ Lead qualified: {result.get('qualified')}")
        
        # Create opportunity
        result = await bot_registry.execute_bot("opportunity_management_bot", {
            "action": "create_opportunity",
            "lead_id": lead_id,
            "value": 250000.00
        })
        assert result["success"]
        opp_id = result.get("opportunity_id")
        print(f"  ✅ Opportunity created: {opp_id}, value R{result.get('value')}")
        
        # Generate quote
        result = await bot_registry.execute_bot("quote_generation_bot", {
            "action": "create_quote",
            "opportunity_id": opp_id,
            "items": [
                {"product": "Product A", "quantity": 10, "price": 25000.00, "amount": 250000.00}
            ]
        })
        assert result["success"]
        quote_number = result.get("quote_number")
        print(f"  ✅ Quote generated: {quote_number}, total R{result.get('total')}")
        
        # Convert to sales order
        result = await bot_registry.execute_bot("sales_order_bot", {
            "action": "create_order",
            "quote_number": quote_number
        })
        assert result["success"]
        print(f"  ✅ Sales order created: {result.get('sales_order_number')}")

class TestUATDocumentBots:
    """UAT for 6 Document Bots"""
    
    @pytest.mark.asyncio
    async def test_document_processing_workflow(self):
        """Test document processing from email to archive"""
        print("\n🧪 Testing Document Processing Workflow...")
        
        # Process email
        result = await bot_registry.execute_bot("email_processing_bot", {
            "action": "process_email",
            "email_id": "EMAIL001"
        })
        assert result["success"]
        print(f"  ✅ Processed {result.get('emails_processed')} emails")
        
        # Extract data
        result = await bot_registry.execute_bot("data_extraction_bot", {
            "action": "extract",
            "document_id": "DOC001"
        })
        assert result["success"]
        print(f"  ✅ Data extracted: {result.get('confidence')}% confidence")
        
        # Classify document
        result = await bot_registry.execute_bot("document_classification_bot", {
            "action": "classify",
            "document_id": "DOC001"
        })
        assert result["success"]
        print(f"  ✅ Classified as: {result.get('document_type')}")
        
        # Validate data
        result = await bot_registry.execute_bot("data_validation_bot", {
            "action": "validate",
            "document_id": "DOC001"
        })
        assert result["success"]
        print(f"  ✅ Validation complete: {result.get('data_quality_score')}% quality")
        
        # Archive
        result = await bot_registry.execute_bot("archive_management_bot", {
            "action": "archive",
            "document_id": "DOC001"
        })
        assert result["success"]
        print(f"  ✅ Archived {result.get('documents_archived')} documents")

class TestUATManufacturingBots:
    """UAT for 8 Manufacturing Bots"""
    
    @pytest.mark.asyncio
    async def test_production_monitoring_cycle(self):
        """Test production monitoring and reporting"""
        print("\n🧪 Testing Manufacturing Production Monitoring...")
        
        # Check machine status
        result = await bot_registry.execute_bot("machine_monitoring_bot", {
            "action": "get_status",
            "machine_id": "MACH001"
        })
        assert result["success"]
        print(f"  ✅ Machine status: {result.get('status')}, utilization {result.get('utilization')}%")
        
        # Calculate OEE
        result = await bot_registry.execute_bot("oee_calculation_bot", {
            "action": "calculate_oee",
            "machine_id": "MACH001"
        })
        assert result["success"]
        print(f"  ✅ OEE calculated: {result.get('oee')}%")
        
        # Generate report
        result = await bot_registry.execute_bot("production_reporting_bot", {
            "action": "generate_report",
            "shift": "day"
        })
        assert result["success"]
        print(f"  ✅ Report generated: {result.get('units_produced')} units produced")

class TestUATComplianceBots:
    """UAT for 3 Compliance Bots"""
    
    @pytest.mark.asyncio
    async def test_audit_management_cycle(self):
        """Test audit management workflow"""
        print("\n🧪 Testing Audit Management Bot...")
        
        # Create audit
        result = await bot_registry.execute_bot("audit_management_bot", {
            "action": "create_audit",
            "audit_type": "Internal",
            "scope": "Financial Controls"
        })
        assert result["success"]
        audit_id = result.get("audit_id")
        print(f"  ✅ Audit created: {audit_id}")
        
        # Record finding
        result = await bot_registry.execute_bot("audit_management_bot", {
            "action": "record_finding",
            "audit_id": audit_id,
            "severity": "medium"
        })
        assert result["success"]
        print(f"  ✅ Finding recorded: {result.get('finding_id')}")
    
    @pytest.mark.asyncio
    async def test_risk_management_workflow(self):
        """Test risk management"""
        print("\n🧪 Testing Risk Management Bot...")
        
        # Create risk
        result = await bot_registry.execute_bot("risk_management_bot", {
            "action": "create_risk",
            "category": "Operational",
            "description": "Supply chain disruption"
        })
        assert result["success"]
        risk_id = result.get("risk_id")
        print(f"  ✅ Risk created: {risk_id}")
        
        # Assess risk
        result = await bot_registry.execute_bot("risk_management_bot", {
            "action": "assess_risk",
            "risk_id": risk_id,
            "likelihood": 3,
            "impact": 4
        })
        assert result["success"]
        print(f"  ✅ Risk assessed: Score {result.get('risk_score')}, Level {result.get('risk_level')}")

# Run all tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
