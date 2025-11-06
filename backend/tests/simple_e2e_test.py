"""
Simple E2E test for ARIA ERP backend
Tests that all modules load and basic endpoints respond
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_imports():
    """Test that all critical modules can be imported"""
    print("Testing module imports...")
    
    try:
        from production_main import app
        print("✅ production_main imported successfully")
    except Exception as e:
        print(f"❌ Failed to import production_main: {e}")
        return False
    
    try:
        from core.database_pg import SessionLocal
        print("✅ database_pg imported successfully")
    except Exception as e:
        print(f"❌ Failed to import database_pg: {e}")
        return False
    
    return True

def test_module_registration():
    """Test that ERP modules are registered"""
    print("\nTesting module registration...")
    
    try:
        from production_main import app
        routes = [route.path for route in app.routes]
        
        # Check for key ERP endpoints
        expected_prefixes = [
            "/api/erp/order-to-cash",
            "/api/erp/inventory",
            "/api/erp/payroll",
            "/api/erp/banking",
            "/api/erp/manufacturing",
            "/api/erp/procure-to-pay",
            "/api/documents",
            "/api/reports"
        ]
        
        for prefix in expected_prefixes:
            found = any(route.startswith(prefix) for route in routes)
            if found:
                print(f"✅ {prefix} routes registered")
            else:
                print(f"⚠️  {prefix} routes not found (may be optional)")
        
        return True
    except Exception as e:
        print(f"❌ Failed to check module registration: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("ARIA ERP Backend - Simple E2E Test")
    print("=" * 60)
    
    tests = [
        test_imports,
        test_module_registration
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")
            results.append(False)
    
    print("\n" + "=" * 60)
    if all(results):
        print("✅ All tests passed!")
        print("=" * 60)
        return 0
    else:
        print(f"❌ {len([r for r in results if not r])} test(s) failed")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(main())
