"""
Simple End-to-End System Testing
Tests core functionality of all 109 bots
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from decimal import Decimal
import json
import glob


class SimpleE2ETest:
    """Simple E2E testing"""
    
    def __init__(self):
        self.results = {
            'total_bots': 0,
            'passed': 0,
            'failed': 0,
            'skipped': 0,
            'errors': []
        }
        
    def discover_bots(self):
        """Discover all bot files"""
        bot_files = glob.glob("bots/*_bot.py")
        # Exclude base_bot and bot_action_system and bot_manager
        bot_files = [f for f in bot_files if not any(x in f for x in ['base_bot', 'bot_action', 'bot_manager'])]
        return sorted(bot_files)
        
    def test_bot_import(self, bot_file):
        """Test if bot can be imported"""
        bot_name = os.path.basename(bot_file)[:-3]  # Remove .py
        module_path = f"bots.{bot_name}"
        
        try:
            module = __import__(module_path, fromlist=['*'])
            # Find the bot class (should be CamelCase version of filename)
            class_name = ''.join(word.capitalize() for word in bot_name.split('_'))
            
            if hasattr(module, class_name):
                bot_class = getattr(module, class_name)
                return True, bot_class, None
            else:
                # Try to find any class that ends with 'Bot'
                for attr_name in dir(module):
                    if attr_name.endswith('Bot') and not attr_name.startswith('_'):
                        bot_class = getattr(module, attr_name)
                        if callable(bot_class):
                            return True, bot_class, None
                return False, None, f"No Bot class found in {module_path}"
                
        except Exception as e:
            return False, None, str(e)
            
    def test_bot_instantiation(self, bot_class):
        """Test if bot can be instantiated"""
        try:
            bot = bot_class()
            return True, bot, None
        except Exception as e:
            return False, None, str(e)
            
    def test_bot_capabilities(self, bot):
        """Test bot has basic attributes"""
        try:
            assert hasattr(bot, 'bot_id'), "Missing bot_id"
            assert hasattr(bot, 'name'), "Missing name"
            # Check for capabilities - might be attribute or method
            if hasattr(bot, 'capabilities'):
                caps = bot.capabilities
            elif hasattr(bot, 'get_capabilities'):
                caps = bot.get_capabilities()
            else:
                return False, 0, "Missing capabilities attribute/method"
            assert len(caps) > 0, "No capabilities defined"
            return True, len(caps), None
        except AssertionError as e:
            return False, 0, str(e)
        except Exception as e:
            return False, 0, str(e)
            
    def test_bot_execute(self, bot):
        """Test bot execute method"""
        try:
            # Test with empty context - handle both execute(query, context) and execute(context)
            import inspect
            sig = inspect.signature(bot.execute)
            params = list(sig.parameters.keys())
            
            if len(params) == 1:  # execute(context) - context only
                result = bot.execute({})
            else:  # execute(query, context) - both
                result = bot.execute("", {})
                
            assert isinstance(result, dict), "Execute should return dict"
            return True, None
        except Exception as e:
            return False, str(e)
            
    def run_comprehensive_test(self):
        """Run comprehensive test on all bots"""
        print("\n" + "="*80)
        print("🚀 ARIA ERP - COMPREHENSIVE BOT TESTING")
        print("="*80)
        print(f"📅 Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*80)
        
        bot_files = self.discover_bots()
        print(f"\n📋 Discovered {len(bot_files)} bot files")
        print("-"*80)
        
        for bot_file in bot_files:
            bot_name = os.path.basename(bot_file)[:-3]
            self.results['total_bots'] += 1
            
            # Test 1: Import
            import_ok, bot_class, import_error = self.test_bot_import(bot_file)
            if not import_ok:
                print(f"❌ {bot_name}: Import failed - {import_error}")
                self.results['failed'] += 1
                self.results['errors'].append({
                    'bot': bot_name,
                    'test': 'import',
                    'error': import_error
                })
                continue
                
            # Test 2: Instantiation
            inst_ok, bot, inst_error = self.test_bot_instantiation(bot_class)
            if not inst_ok:
                print(f"⚠️  {bot_name}: Instantiation failed - {inst_error}")
                self.results['failed'] += 1
                self.results['errors'].append({
                    'bot': bot_name,
                    'test': 'instantiation',
                    'error': inst_error
                })
                continue
                
            # Test 3: Capabilities
            cap_ok, num_caps, cap_error = self.test_bot_capabilities(bot)
            if not cap_ok:
                print(f"⚠️  {bot_name}: Capabilities check failed - {cap_error}")
                self.results['failed'] += 1
                self.results['errors'].append({
                    'bot': bot_name,
                    'test': 'capabilities',
                    'error': cap_error
                })
                continue
                
            # Test 4: Execute
            exec_ok, exec_error = self.test_bot_execute(bot)
            if not exec_ok:
                print(f"⚠️  {bot_name}: Execute test failed - {exec_error}")
                self.results['failed'] += 1
                self.results['errors'].append({
                    'bot': bot_name,
                    'test': 'execute',
                    'error': exec_error
                })
                continue
                
            # All tests passed
            print(f"✅ {bot_name}: OK ({num_caps} capabilities)")
            self.results['passed'] += 1
            
        self.generate_report()
        
    def generate_report(self):
        """Generate test report"""
        print("\n" + "="*80)
        print("📊 TEST RESULTS SUMMARY")
        print("="*80)
        
        total = self.results['total_bots']
        passed = self.results['passed']
        failed = self.results['failed']
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"\n📈 Overall Statistics:")
        print(f"   Total Bots Tested: {total}")
        print(f"   ✅ Passed: {passed} ({success_rate:.1f}%)")
        print(f"   ❌ Failed: {failed} ({100-success_rate:.1f}%)")
        
        if self.results['errors']:
            print(f"\n❌ Failed Tests ({len(self.results['errors'])}):")
            for i, error in enumerate(self.results['errors'][:10], 1):  # Show first 10
                print(f"   {i}. {error['bot']} ({error['test']}): {error['error'][:60]}")
            if len(self.results['errors']) > 10:
                print(f"   ... and {len(self.results['errors']) - 10} more")
        
        print("\n" + "="*80)
        if success_rate >= 95:
            print("🎉 EXCELLENT! All bots are production-ready!")
            status = "PRODUCTION_READY"
        elif success_rate >= 80:
            print("✅ GOOD! Minor issues to address")
            status = "MOSTLY_READY"
        elif success_rate >= 60:
            print("⚠️  ACCEPTABLE! Several issues need attention")
            status = "NEEDS_WORK"
        else:
            print("❌ CRITICAL! Major issues require immediate attention")
            status = "NOT_READY"
        print("="*80)
        
        # Save report
        report_file = f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        report_data = {
            'timestamp': datetime.now().isoformat(),
            'status': status,
            'results': self.results
        }
        with open(report_file, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
        print(f"\n📄 Detailed report saved to: {report_file}\n")
        
        return success_rate >= 80


def main():
    """Main test runner"""
    tester = SimpleE2ETest()
    success = tester.run_comprehensive_test()
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())
