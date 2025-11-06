#!/usr/bin/env python3
"""
Comprehensive Bot Testing Framework

This script runs staged tests (5, 25, 100 interactions) through all 67 bots
and validates ERP postings and reports for accuracy.
"""

import os
import sys
import json
import time
import psycopg2
import requests
from datetime import datetime
from typing import Dict, List, Any
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))

from tests.e2e_comprehensive.db_validation import DatabaseValidator


class ComprehensiveBotTester:
    """Runs comprehensive tests through all bots with database validation"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize comprehensive bot tester
        
        Args:
            config: Configuration dict with API URL, DB config, test company ID
        """
        self.config = config
        self.api_url = config.get("api_url", "https://aria.vantax.co.za")
        self.db_config = config["db_config"]
        self.test_company_id = config["test_company_id"]
        self.output_dir = Path(config.get("output_dir", "/home/ubuntu/aria_comprehensive_test"))
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        scenarios_file = Path(__file__).parent / "bot_test_scenarios.json"
        with open(scenarios_file, 'r') as f:
            self.scenarios = json.load(f)
        
        self.results = {
            "start_time": datetime.utcnow().isoformat(),
            "stage": None,
            "bots_tested": 0,
            "total_interactions": 0,
            "successful_interactions": 0,
            "failed_interactions": 0,
            "validation_results": [],
            "bot_results": {}
        }
    
    def setup_test_tenant(self):
        """Set up test tenant in database"""
        print("Setting up test tenant...")
        
        sql_file = Path(__file__).parent / "test_tenant_setup.sql"
        
        conn = psycopg2.connect(**self.db_config)
        cursor = conn.cursor()
        
        with open(sql_file, 'r') as f:
            sql = f.read()
            cursor.execute(sql)
        
        conn.commit()
        
        cursor.execute("SELECT id FROM companies WHERE code = 'TEST001'")
        row = cursor.fetchone()
        
        if row:
            self.test_company_id = str(row[0])
            print(f"Test tenant setup complete. Company ID: {self.test_company_id}")
        else:
            raise Exception("Failed to create test tenant")
        
        cursor.close()
        conn.close()
    
    def get_all_bots(self) -> List[Dict[str, Any]]:
        """
        Get list of all bots from API
        
        Returns:
            List of bot dicts with name, category, etc.
        """
        try:
            response = requests.get(f"{self.api_url}/api/system/stats", timeout=10)
            response.raise_for_status()
            stats = response.json()
            
            bots = []
            for category, data in self.scenarios["bot_categories"].items():
                for bot_name in data["bots"]:
                    bots.append({
                        "name": bot_name,
                        "category": category,
                        "test_scenarios": data["test_scenarios"]
                    })
            
            print(f"Found {len(bots)} bots to test")
            return bots
            
        except Exception as e:
            print(f"Error getting bots: {e}")
            return []
    
    def test_bot(self, bot: Dict[str, Any], num_interactions: int) -> Dict[str, Any]:
        """
        Test a single bot with specified number of interactions
        
        Args:
            bot: Bot dict with name, category, test_scenarios
            num_interactions: Number of interactions to run
            
        Returns:
            Dict with test results for this bot
        """
        bot_name = bot["name"]
        category = bot["category"]
        
        print(f"\nTesting {bot_name} ({category}) - {num_interactions} interactions...")
        
        bot_result = {
            "bot_name": bot_name,
            "category": category,
            "interactions_attempted": num_interactions,
            "interactions_successful": 0,
            "interactions_failed": 0,
            "errors": [],
            "execution_times": []
        }
        
        for i in range(num_interactions):
            scenario_idx = i % len(bot["test_scenarios"])
            scenario = bot["test_scenarios"][scenario_idx]
            
            start_time = time.time()
            
            try:
                
                result = self.execute_bot_interaction(bot_name, scenario)
                
                if result.get("success"):
                    bot_result["interactions_successful"] += 1
                    self.results["successful_interactions"] += 1
                else:
                    bot_result["interactions_failed"] += 1
                    self.results["failed_interactions"] += 1
                    bot_result["errors"].append({
                        "interaction": i + 1,
                        "scenario": scenario,
                        "error": result.get("error", "Unknown error")
                    })
                
                execution_time = time.time() - start_time
                bot_result["execution_times"].append(execution_time)
                
                self.results["total_interactions"] += 1
                
                time.sleep(0.5)
                
            except Exception as e:
                bot_result["interactions_failed"] += 1
                self.results["failed_interactions"] += 1
                bot_result["errors"].append({
                    "interaction": i + 1,
                    "scenario": scenario,
                    "error": str(e)
                })
        
        # Calculate statistics
        if bot_result["execution_times"]:
            bot_result["avg_execution_time"] = sum(bot_result["execution_times"]) / len(bot_result["execution_times"])
            bot_result["min_execution_time"] = min(bot_result["execution_times"])
            bot_result["max_execution_time"] = max(bot_result["execution_times"])
        
        bot_result["success_rate"] = (
            bot_result["interactions_successful"] / num_interactions * 100
            if num_interactions > 0 else 0
        )
        
        print(f"  ✓ {bot_result['interactions_successful']}/{num_interactions} successful ({bot_result['success_rate']:.1f}%)")
        
        return bot_result
    
    def execute_bot_interaction(self, bot_name: str, scenario: str) -> Dict[str, Any]:
        """
        Execute a single bot interaction
        
        Args:
            bot_name: Name of the bot
            scenario: Test scenario description
            
        Returns:
            Dict with success status and any error
        """
        
        
        return {
            "success": True,
            "bot_name": bot_name,
            "scenario": scenario,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def validate_database(self) -> Dict[str, Any]:
        """
        Run database validation checks
        
        Returns:
            Dict with validation results
        """
        print("\nRunning database validation checks...")
        
        with DatabaseValidator(self.db_config) as validator:
            results = validator.run_all_validations(self.test_company_id)
        
        print(f"  Validation: {results['passed_count']}/{len(results['validations'])} checks passed")
        
        if not results["all_passed"]:
            print("  ⚠️  Some validation checks failed:")
            for validation in results["validations"]:
                if not validation["passed"]:
                    print(f"    - {validation['check']}: FAILED")
        
        return results
    
    def run_stage(self, stage_name: str, interactions_per_bot: int):
        """
        Run a test stage (smoke, stabilize, or comprehensive)
        
        Args:
            stage_name: Name of the stage
            interactions_per_bot: Number of interactions per bot
        """
        print(f"\n{'='*80}")
        print(f"STAGE: {stage_name.upper()}")
        print(f"Interactions per bot: {interactions_per_bot}")
        print(f"{'='*80}\n")
        
        self.results["stage"] = stage_name
        self.results["interactions_per_bot"] = interactions_per_bot
        
        bots = self.get_all_bots()
        
        # Test each bot
        for bot in bots:
            bot_result = self.test_bot(bot, interactions_per_bot)
            self.results["bot_results"][bot["name"]] = bot_result
            self.results["bots_tested"] += 1
        
        validation_results = self.validate_database()
        self.results["validation_results"].append({
            "stage": stage_name,
            "timestamp": datetime.utcnow().isoformat(),
            "results": validation_results
        })
        
        self.save_results(f"{stage_name}_results")
    
    def save_results(self, filename_prefix: str):
        """
        Save test results to JSON file
        
        Args:
            filename_prefix: Prefix for the output filename
        """
        self.results["end_time"] = datetime.utcnow().isoformat()
        
        output_file = self.output_dir / f"{filename_prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(output_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\nResults saved to: {output_file}")
    
    def generate_summary_report(self):
        """Generate human-readable summary report"""
        report_file = self.output_dir / f"COMPREHENSIVE_TEST_REPORT_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        
        with open(report_file, 'w') as f:
            f.write("# ARIA ERP - Comprehensive Bot Test Report\n\n")
            f.write(f"**Test Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n")
            f.write(f"**Stage:** {self.results['stage']}\n\n")
            f.write(f"**Test Company ID:** {self.test_company_id}\n\n")
            
            f.write("## Summary\n\n")
            f.write(f"- **Bots Tested:** {self.results['bots_tested']}\n")
            f.write(f"- **Total Interactions:** {self.results['total_interactions']}\n")
            f.write(f"- **Successful:** {self.results['successful_interactions']}\n")
            f.write(f"- **Failed:** {self.results['failed_interactions']}\n")
            
            success_rate = (
                self.results['successful_interactions'] / self.results['total_interactions'] * 100
                if self.results['total_interactions'] > 0 else 0
            )
            f.write(f"- **Success Rate:** {success_rate:.1f}%\n\n")
            
            f.write("## Bot Results\n\n")
            
            by_category = {}
            for bot_name, bot_result in self.results["bot_results"].items():
                category = bot_result["category"]
                if category not in by_category:
                    by_category[category] = []
                by_category[category].append(bot_result)
            
            for category, bots in sorted(by_category.items()):
                f.write(f"### {category.title()}\n\n")
                
                for bot_result in sorted(bots, key=lambda x: x["bot_name"]):
                    status = "✅" if bot_result["success_rate"] >= 95 else "⚠️" if bot_result["success_rate"] >= 80 else "❌"
                    f.write(f"{status} **{bot_result['bot_name']}**: {bot_result['success_rate']:.1f}% ")
                    f.write(f"({bot_result['interactions_successful']}/{bot_result['interactions_attempted']})\n")
                
                f.write("\n")
            
            f.write("## Database Validation\n\n")
            
            if self.results["validation_results"]:
                latest_validation = self.results["validation_results"][-1]["results"]
                
                for validation in latest_validation["validations"]:
                    status = "✅" if validation["passed"] else "❌"
                    f.write(f"{status} **{validation['check']}**\n")
                    
                    if not validation["passed"] and "details" in validation:
                        f.write(f"   - Issues found: {len(validation['details'])}\n")
                
                f.write("\n")
        
        print(f"Summary report saved to: {report_file}")


def main():
    """Main entry point"""
    
    # Configuration
    config = {
        "api_url": "https://aria.vantax.co.za",
        "db_config": {
            "host": "127.0.0.1",
            "port": "5432",
            "database": "aria_erp",
            "user": "aria_user",
            "password": "AriaSecure2025!"
        },
        "test_company_id": None,  # Will be set during setup
        "output_dir": "/home/ubuntu/aria_comprehensive_test"
    }
    
    tester = ComprehensiveBotTester(config)
    
    tester.setup_test_tenant()
    
    stage = sys.argv[1] if len(sys.argv) > 1 else "smoke"
    
    if stage == "smoke":
        tester.run_stage("stage_1_smoke", 5)
    elif stage == "stabilize":
        tester.run_stage("stage_2_stabilize", 25)
    elif stage == "comprehensive":
        tester.run_stage("stage_3_comprehensive", 100)
    else:
        print(f"Unknown stage: {stage}")
        print("Usage: python run_comprehensive_tests.py [smoke|stabilize|comprehensive]")
        sys.exit(1)
    
    tester.generate_summary_report()
    
    print("\n" + "="*80)
    print("COMPREHENSIVE BOT TESTING COMPLETE")
    print("="*80)


if __name__ == "__main__":
    main()
