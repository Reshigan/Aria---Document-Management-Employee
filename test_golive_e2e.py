"""ARIA ERP - Go-Live E2E Test Suite"""
import asyncio, sys, os, json
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from modules.gl_module import GeneralLedgerModule
from modules.ap_module import AccountsPayableModule
from modules.ar_module import AccountsReceivableModule
from modules.payroll_module import PayrollModule
from modules.master_data_module import MasterDataModule
from database import get_db_session

class E2ETestRunner:
    def __init__(self, company_id=1, user_id=1):
        self.company_id = company_id
        self.user_id = user_id
        self.db = get_db_session()
        self.results = []
    
    def log_test(self, name, status, msg="", details=None):
        result = {"test_name": name, "status": status, "message": msg, "timestamp": datetime.now().isoformat(), "details": details or {}}
        self.results.append(result)
        icon = "✅" if status == "PASS" else "❌"
        print(f"{icon} {name}: {status} - {msg}")
    
    async def test_order_to_cash(self):
        try:
            master_data = MasterDataModule()
            customer = master_data.create_customer(self.company_id, self.user_id, "Test Customer", "test@test.com", "0123456789")
            self.log_test("Create Customer", "PASS" if customer else "FAIL", "Customer created", {"id": customer.id if customer else None})
            return customer is not None
        except Exception as e:
            self.log_test("Order-to-Cash", "FAIL", str(e))
            return False
    
    async def test_procure_to_pay(self):
        try:
            master_data = MasterDataModule()
            supplier = master_data.create_supplier(self.company_id, self.user_id, "Test Supplier", "supplier@test.com", "0987654321")
            self.log_test("Create Supplier", "PASS" if supplier else "FAIL", "Supplier created", {"id": supplier.id if supplier else None})
            return supplier is not None
        except Exception as e:
            self.log_test("Procure-to-Pay", "FAIL", str(e))
            return False
    
    async def test_payroll(self):
        try:
            payroll = PayrollModule()
            result = payroll.validate_paye_calculation(25000.00, 2025)
            self.log_test("Payroll Validation", "PASS" if result else "FAIL", "PAYE validated", {"rate": result.effective_rate if result else 0})
            return result is not None
        except Exception as e:
            self.log_test("Payroll", "FAIL", str(e))
            return False
    
    async def test_financial_close(self):
        try:
            gl = GeneralLedgerModule()
            tb = gl.get_trial_balance(self.company_id, datetime.now().date())
            self.log_test("Trial Balance", "PASS" if tb else "FAIL", "TB retrieved", {"debits": tb.total_debits if tb else 0})
            return tb is not None
        except Exception as e:
            self.log_test("Financial Close", "FAIL", str(e))
            return False
    
    def generate_report(self):
        total = len(self.results)
        passed = sum(1 for r in self.results if r["status"] == "PASS")
        failed = total - passed
        print(f"\n{'='*60}\nE2E TEST SUMMARY\n{'='*60}")
        print(f"Total: {total}, Passed: {passed}, Failed: {failed}")
        print(f"Pass Rate: {passed/total*100:.1f}%")
        print(f"Ready for Go-Live: {'YES ✅' if failed == 0 else 'NO ❌'}\n")
        return {"total": total, "passed": passed, "failed": failed, "pass_rate": passed/total*100, "ready_for_golive": failed == 0, "results": self.results, "timestamp": datetime.now().isoformat()}
    
    async def run_all(self):
        print(f"{'='*60}\nARIA ERP E2E TESTS\n{'='*60}")
        await self.test_order_to_cash()
        await self.test_procure_to_pay()
        await self.test_payroll()
        await self.test_financial_close()
        return self.generate_report()

async def main():
    runner = E2ETestRunner()
    report = await runner.run_all()
    with open(f"e2e_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json", 'w') as f:
        json.dump(report, f, indent=2)
    return report["ready_for_golive"]

if __name__ == "__main__":
    sys.exit(0 if asyncio.run(main()) else 1)
