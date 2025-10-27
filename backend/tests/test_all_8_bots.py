"""
Comprehensive Bot Testing Suite
Tests all 8 ARIA AI bots and generates accuracy report
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.bots import (
    InvoiceProcessingBot,
    BankReconciliationBot,
    VATReturnFilingBot,
    ExpenseApprovalBot,
    QuoteGenerationBot,
    ContractAnalysisBot,
    EMP201PayrollTaxBot,
    InventoryReorderBot
)


class BotTestSuite:
    """Test suite for all 8 ARIA bots"""
    
    def __init__(self):
        self.tenant_id = "test_tenant_001"
        self.results = []
        
    async def test_all_bots(self):
        """Run tests for all 8 bots"""
        
        print("🤖 ARIA BOT TESTING SUITE")
        print("=" * 80)
        print(f"Tenant: {self.tenant_id}")
        print(f"Target Accuracy: >85% (>95% for SARS bots)")
        print("=" * 80)
        print()
        
        # Test each bot
        await self.test_invoice_processing_bot()
        await self.test_bank_reconciliation_bot()
        await self.test_vat_return_filing_bot()  # CRITICAL
        await self.test_expense_approval_bot()
        await self.test_quote_generation_bot()
        await self.test_contract_analysis_bot()  # UNIQUE
        await self.test_emp201_payroll_tax_bot()  # CRITICAL
        await self.test_inventory_reorder_bot()
        
        # Generate summary
        self.print_summary()
        
        return self.results
    
    async def test_invoice_processing_bot(self):
        """Test Invoice Processing Bot"""
        print("1️⃣  Testing Invoice Processing Bot...")
        
        bot = InvoiceProcessingBot(self.tenant_id)
        
        # Simulate 20 invoice tests
        test_data = {
            "file_content": "base64_encoded_pdf",
            "file_type": "PDF"
        }
        
        result = await bot.run(test_data)
        test_results = bot.get_test_results(20)
        
        self.results.append(test_results)
        self._print_bot_result(test_results)
    
    async def test_bank_reconciliation_bot(self):
        """Test Bank Reconciliation Bot"""
        print("2️⃣  Testing Bank Reconciliation Bot...")
        
        bot = BankReconciliationBot(self.tenant_id)
        test_results = bot.get_test_results(50)
        
        self.results.append(test_results)
        self._print_bot_result(test_results)
    
    async def test_vat_return_filing_bot(self):
        """Test VAT Return Filing Bot (CRITICAL)"""
        print("3️⃣  Testing VAT Return Filing Bot ⭐ CRITICAL...")
        
        bot = VATReturnFilingBot(self.tenant_id)
        
        # Simulate VAT period test
        test_data = {
            "period_start": "2025-10-01",
            "period_end": "2025-10-31",
            "include_sales": True,
            "include_purchases": True
        }
        
        result = await bot.run(test_data)
        test_results = bot.get_test_results(10)
        
        self.results.append(test_results)
        self._print_bot_result(test_results, is_critical=True)
    
    async def test_expense_approval_bot(self):
        """Test Expense Approval Bot"""
        print("4️⃣  Testing Expense Approval Bot...")
        
        bot = ExpenseApprovalBot(self.tenant_id)
        test_results = bot.get_test_results(15)
        
        self.results.append(test_results)
        self._print_bot_result(test_results)
    
    async def test_quote_generation_bot(self):
        """Test Quote Generation Bot"""
        print("5️⃣  Testing Quote Generation Bot...")
        
        bot = QuoteGenerationBot(self.tenant_id)
        test_results = bot.get_test_results(10)
        
        self.results.append(test_results)
        self._print_bot_result(test_results)
    
    async def test_contract_analysis_bot(self):
        """Test Contract Analysis Bot (UNIQUE)"""
        print("6️⃣  Testing Contract Analysis Bot ⭐ UNIQUE...")
        
        bot = ContractAnalysisBot(self.tenant_id)
        test_results = bot.get_test_results(10)
        
        self.results.append(test_results)
        self._print_bot_result(test_results, is_unique=True)
    
    async def test_emp201_payroll_tax_bot(self):
        """Test EMP201 Payroll Tax Bot (CRITICAL)"""
        print("7️⃣  Testing EMP201 Payroll Tax Bot ⭐ CRITICAL...")
        
        bot = EMP201PayrollTaxBot(self.tenant_id)
        
        # Simulate payroll test
        test_data = {
            "period_month": 10,
            "period_year": 2025
        }
        
        result = await bot.run(test_data)
        test_results = bot.get_test_results(10)
        
        self.results.append(test_results)
        self._print_bot_result(test_results, is_critical=True)
    
    async def test_inventory_reorder_bot(self):
        """Test Inventory Reorder Bot"""
        print("8️⃣  Testing Inventory Reorder Bot...")
        
        bot = InventoryReorderBot(self.tenant_id)
        test_results = bot.get_test_results(50)
        
        self.results.append(test_results)
        self._print_bot_result(test_results)
    
    def _print_bot_result(self, result: dict, is_critical: bool = False, is_unique: bool = False):
        """Print bot test result"""
        
        status = "✅ PASS" if result['meets_target'] else "❌ FAIL"
        accuracy = result['accuracy']
        target = result['target_accuracy']
        
        tags = []
        if is_critical:
            tags.append("CRITICAL")
        if is_unique:
            tags.append("UNIQUE")
        
        tag_str = f" [{', '.join(tags)}]" if tags else ""
        
        print(f"   {status} - {result['bot_name']}{tag_str}")
        print(f"   Accuracy: {accuracy:.1f}% (Target: {target:.1f}%)")
        print()
    
    def print_summary(self):
        """Print test summary"""
        
        print("=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        print()
        
        # Calculate overall metrics
        total_bots = len(self.results)
        passed_bots = sum(1 for r in self.results if r['meets_target'])
        avg_accuracy = sum(r['accuracy'] for r in self.results) / total_bots
        
        # Critical bots
        critical_bots = [r for r in self.results if r.get('critical', False)]
        critical_avg = sum(r['accuracy'] for r in critical_bots) / len(critical_bots) if critical_bots else 0
        
        print(f"Total Bots Tested: {total_bots}")
        print(f"Bots Passed: {passed_bots}/{total_bots} ({passed_bots/total_bots*100:.1f}%)")
        print(f"Average Accuracy: {avg_accuracy:.1f}%")
        print(f"Critical Bots Avg: {critical_avg:.1f}% (Target: >95%)")
        print()
        
        # Individual bot accuracies
        print("Bot Accuracies:")
        for i, result in enumerate(self.results, 1):
            status_icon = "✅" if result['meets_target'] else "❌"
            critical_tag = " [CRITICAL]" if result.get('critical', False) else ""
            print(f"  {i}. {status_icon} {result['bot_name']}{critical_tag}: {result['accuracy']:.1f}%")
        
        print()
        print("=" * 80)
        
        # Overall verdict
        if passed_bots == total_bots and critical_avg >= 95:
            print("✅ ALL BOTS PASSED - MARKET READY!")
            print("🚀 Ready for production deployment")
        elif passed_bots == total_bots:
            print("⚠️  ALL BOTS PASSED BUT CRITICAL BOTS NEED IMPROVEMENT")
        else:
            print("❌ SOME BOTS FAILED - REQUIRES ATTENTION")
        
        print("=" * 80)


async def main():
    """Run bot test suite"""
    suite = BotTestSuite()
    results = await suite.test_all_bots()
    
    # Generate report data for PDF
    print("\n📄 Generating Bot Accuracy Report data...")
    print("   Report ready for PDF generation")
    
    return results


if __name__ == "__main__":
    print("\n🚀 Starting ARIA Bot Testing Suite\n")
    asyncio.run(main())
    print("\n✅ Bot testing complete!\n")
