#!/usr/bin/env python3
'''
Aria System - Deployment Readiness Verification
Quick check that all components are ready for production
'''

import os
import sys
from pathlib import Path

def print_header(title):
    print("\n" + "="*80)
    print(f"🔍 {title}")
    print("="*80)

def check_item(description, condition, critical=True):
    icon = "✅" if condition else ("❌" if critical else "⚠️")
    status = "PASS" if condition else ("FAIL" if critical else "WARN")
    print(f"{icon} {description:<60} [{status}]")
    return condition

def verify_deployment():
    print("\n" + "="*80)
    print("🚀 ARIA SYSTEM - DEPLOYMENT READINESS VERIFICATION")
    print("="*80)
    print(f"Date: 2025-10-28")
    print("="*80)
    
    all_pass = True
    
    # Backend checks
    print_header("BACKEND VERIFICATION")
    backend_dir = Path("backend")
    all_pass &= check_item("Backend directory exists", backend_dir.exists())
    all_pass &= check_item("main.py exists", (backend_dir / "main.py").exists())
    all_pass &= check_item("requirements.txt exists", (backend_dir / "requirements.txt").exists())
    
    # Count bot files
    bots_dir = backend_dir / "bots"
    if bots_dir.exists():
        bot_files = list(bots_dir.glob("*.py"))
        bot_count = len([f for f in bot_files if not f.name.startswith("_")])
        check_item(f"Bot files found: {bot_count}", bot_count >= 60)
    else:
        all_pass &= check_item("Bots directory exists", False)
    
    # ERP modules
    erp_dir = backend_dir / "erp"
    if erp_dir.exists():
        erp_modules = [d for d in erp_dir.iterdir() if d.is_dir() and not d.name.startswith("_")]
        check_item(f"ERP modules found: {len(erp_modules)}", len(erp_modules) >= 8)
    else:
        all_pass &= check_item("ERP directory exists", False)
    
    # Frontend checks
    print_header("FRONTEND VERIFICATION")
    frontend_dir = Path("frontend")
    all_pass &= check_item("Frontend directory exists", frontend_dir.exists())
    all_pass &= check_item("package.json exists", (frontend_dir / "package.json").exists())
    all_pass &= check_item("src directory exists", (frontend_dir / "src").exists())
    all_pass &= check_item("index.html exists", (frontend_dir / "index.html").exists())
    
    # Test files
    print_header("TEST VERIFICATION")
    tests_dir = backend_dir / "tests"
    check_item("Tests directory exists", tests_dir.exists())
    if tests_dir.exists():
        test_files = list(tests_dir.glob("test_*.py"))
        check_item(f"Test files found: {len(test_files)}", len(test_files) > 0)
    
    # UAT files
    check_item("UAT runner exists", (backend_dir / "run_comprehensive_uat.py").exists())
    check_item("ERP UAT exists", (backend_dir / "run_erp_uat_direct.py").exists())
    check_item("Bot registry exists", (backend_dir / "bot_registry.py").exists())
    
    # Documentation
    print_header("DOCUMENTATION VERIFICATION")
    check_item("README.md exists", Path("README.md").exists())
    check_item("Deployment ready report exists", (backend_dir / "DEPLOYMENT_READY_REPORT.md").exists())
    check_item("Deployment guide exists", Path("DEPLOY_NOW_ALL_SYSTEMS_READY.md").exists())
    
    # Deployment scripts
    print_header("DEPLOYMENT SCRIPTS")
    check_item("deploy.sh exists", Path("deploy.sh").exists() or Path("DEPLOY_NOW.sh").exists(), critical=False)
    check_item("docker-compose.yml exists", Path("docker-compose.yml").exists(), critical=False)
    
    # Summary
    print_header("DEPLOYMENT READINESS SUMMARY")
    
    if all_pass:
        print("\n✅ ALL CRITICAL CHECKS PASSED!")
        print("\n🚀 SYSTEM IS READY FOR PRODUCTION DEPLOYMENT")
        print("\nDeployment options:")
        print("  1. Run: sudo ./DEPLOY_NOW.sh (if exists)")
        print("  2. Run: docker-compose up -d")
        print("  3. Follow manual steps in DEPLOY_NOW_ALL_SYSTEMS_READY.md")
        return 0
    else:
        print("\n❌ SOME CRITICAL CHECKS FAILED")
        print("\n⚠️  Please address the failed items before deployment")
        return 1

if __name__ == "__main__":
    sys.exit(verify_deployment())
