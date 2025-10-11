#!/usr/bin/env python3
"""
Test runner script for ARIA Document Management System
Provides comprehensive testing capabilities with various options
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

def run_command(command, description=""):
    """Run a command and return the result"""
    print(f"\n{'='*60}")
    print(f"Running: {description or command}")
    print(f"{'='*60}")
    
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    
    if result.stdout:
        print("STDOUT:")
        print(result.stdout)
    
    if result.stderr:
        print("STDERR:")
        print(result.stderr)
    
    print(f"Exit code: {result.returncode}")
    return result.returncode == 0

def main():
    parser = argparse.ArgumentParser(description="ARIA Test Runner")
    parser.add_argument("--unit", action="store_true", help="Run unit tests only")
    parser.add_argument("--integration", action="store_true", help="Run integration tests only")
    parser.add_argument("--api", action="store_true", help="Run API tests only")
    parser.add_argument("--mobile", action="store_true", help="Run mobile tests only")
    parser.add_argument("--performance", action="store_true", help="Run performance tests")
    parser.add_argument("--slow", action="store_true", help="Include slow tests")
    parser.add_argument("--coverage", action="store_true", help="Run with coverage report")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--parallel", "-n", type=int, help="Run tests in parallel (number of workers)")
    parser.add_argument("--file", "-f", help="Run specific test file")
    parser.add_argument("--test", "-t", help="Run specific test function")
    parser.add_argument("--html-report", action="store_true", help="Generate HTML coverage report")
    parser.add_argument("--xml-report", action="store_true", help="Generate XML test report")
    
    args = parser.parse_args()
    
    # Base pytest command
    cmd_parts = ["python", "-m", "pytest"]
    
    # Add test selection based on markers
    markers = []
    if args.unit:
        markers.append("unit")
    if args.integration:
        markers.append("integration")
    if args.api:
        markers.append("api")
    if args.mobile:
        markers.append("mobile")
    if args.performance:
        markers.append("performance")
    
    if markers:
        cmd_parts.extend(["-m", " or ".join(markers)])
    
    # Include slow tests if requested
    if not args.slow:
        if markers:
            cmd_parts[-1] += " and not slow"
        else:
            cmd_parts.extend(["-m", "not slow"])
    
    # Specific file or test
    if args.file:
        cmd_parts.append(args.file)
        if args.test:
            cmd_parts[-1] += f"::{args.test}"
    elif args.test:
        cmd_parts.extend(["-k", args.test])
    
    # Coverage options
    if args.coverage:
        cmd_parts.extend([
            "--cov=app",
            "--cov-report=term-missing",
            "--cov-fail-under=80"
        ])
        
        if args.html_report:
            cmd_parts.append("--cov-report=html:htmlcov")
        
        if args.xml_report:
            cmd_parts.append("--cov-report=xml")
    
    # Parallel execution
    if args.parallel:
        cmd_parts.extend(["-n", str(args.parallel)])
    
    # Verbose output
    if args.verbose:
        cmd_parts.append("-vv")
    
    # XML report for CI/CD
    if args.xml_report:
        cmd_parts.append("--junit-xml=test-results.xml")
    
    # Additional options
    cmd_parts.extend([
        "--tb=short",
        "--strict-markers",
        "--color=yes"
    ])
    
    # Run the tests
    command = " ".join(cmd_parts)
    success = run_command(command, "Running tests")
    
    if args.coverage and args.html_report:
        print(f"\nCoverage HTML report generated in: {Path.cwd() / 'htmlcov' / 'index.html'}")
    
    # Run additional checks if all tests passed
    if success and not any([args.unit, args.integration, args.api, args.mobile, args.performance, args.file, args.test]):
        print("\n" + "="*60)
        print("All tests passed! Running additional quality checks...")
        print("="*60)
        
        # Type checking with mypy (if available)
        try:
            mypy_result = run_command("python -m mypy app --ignore-missing-imports", "Type checking with mypy")
            if not mypy_result:
                print("Warning: Type checking found issues")
        except:
            print("Mypy not available, skipping type checking")
        
        # Code formatting check with black (if available)
        try:
            black_result = run_command("python -m black --check app", "Code formatting check with black")
            if not black_result:
                print("Warning: Code formatting issues found")
        except:
            print("Black not available, skipping formatting check")
        
        # Import sorting check with isort (if available)
        try:
            isort_result = run_command("python -m isort --check-only app", "Import sorting check with isort")
            if not isort_result:
                print("Warning: Import sorting issues found")
        except:
            print("isort not available, skipping import sorting check")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())