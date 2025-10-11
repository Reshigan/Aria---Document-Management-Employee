#!/usr/bin/env python3
"""
Script to fix all backend.* imports to relative imports
"""
import os
import re
from pathlib import Path

def fix_imports_in_file(file_path):
    """Fix backend.* imports in a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Replace backend.* imports with relative imports
        patterns = [
            (r'from backend\.models', 'from models'),
            (r'from backend\.core', 'from core'),
            (r'from backend\.api', 'from api'),
            (r'from backend\.services', 'from services'),
            (r'from backend\.schemas', 'from schemas'),
            (r'from backend\.utils', 'from utils'),
            (r'from backend\.tasks', 'from tasks'),
            (r'from backend\.processors', 'from processors'),
            (r'from backend\.communication', 'from communication'),
            (r'from backend\.ml', 'from ml'),
            (r'import backend\.', 'import '),
        ]
        
        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content)
        
        # Only write if content changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Fixed imports in {file_path}")
            return True
        else:
            return False
            
    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}")
        return False

def main():
    """Fix imports in all Python files"""
    backend_dir = Path('.')
    python_files = list(backend_dir.rglob('*.py'))
    
    fixed_count = 0
    total_count = len(python_files)
    
    print(f"Processing {total_count} Python files...")
    
    for file_path in python_files:
        # Skip __pycache__ and venv directories
        if '__pycache__' in str(file_path) or 'venv' in str(file_path):
            continue
            
        if fix_imports_in_file(file_path):
            fixed_count += 1
    
    print(f"\n✅ Fixed imports in {fixed_count} out of {total_count} files")

if __name__ == "__main__":
    main()