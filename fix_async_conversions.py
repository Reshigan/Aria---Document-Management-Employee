#!/usr/bin/env python3
"""
Script to fix async conversion issues in API route files
"""
import os
import re
from pathlib import Path

def fix_file_async_issues(file_path):
    """Fix common async conversion issues in a file"""
    print(f"Fixing {file_path}...")
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Fix broken import lines
    content = re.sub(r'from sqlalchemy\.orm import Sessio, selectinloadn', 
                    'from sqlalchemy.orm import Session, selectinload', content)
    content = re.sub(r'from sqlalchemy import a, select, update, deletend_, or_, func', 
                    'from sqlalchemy import and_, or_, func, select, update, delete', content)
    
    # Fix query patterns that weren't converted properly
    # Pattern: query.count() -> proper async count
    content = re.sub(
        r'([a-zA-Z_][a-zA-Z0-9_]*) = select\(([^)]+)\)\.where\(([^)]+)\)\.count\(\)',
        r'count_query = select(func.count(\2.id)).where(\3)\n    count_result = await db.execute(count_query)\n    \1 = count_result.scalar()',
        content
    )
    
    # Pattern: query.all() -> proper async all
    content = re.sub(
        r'([a-zA-Z_][a-zA-Z0-9_]*) = select\(([^)]+)\)\.where\(([^)]+)\)\.all\(\)',
        r'query = select(\2).where(\3)\n    result = await db.execute(query)\n    \1 = result.scalars().all()',
        content
    )
    
    # Pattern: query.group_by().all() -> proper async group by
    content = re.sub(
        r'([a-zA-Z_][a-zA-Z0-9_]*) = select\(([^)]+)\)\.where\(([^)]+)\)\.group_by\(([^)]+)\)\.all\(\)',
        r'query = select(\2).where(\3).group_by(\4)\n    result = await db.execute(query)\n    \1 = result.all()',
        content
    )
    
    # Fix db.add() patterns
    content = re.sub(r'db\.add\(([^)]+)\)', r'db.add(\1)', content)
    
    # Fix db.delete() patterns  
    content = re.sub(r'db\.delete\(([^)]+)\)', r'await db.delete(\1)', content)
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"  {file_path} fixed successfully")

def main():
    """Fix all converted route files"""
    routes_dir = Path("backend/api/routes")
    
    # Files that were converted and might need fixes
    files_to_fix = [
        "analytics.py",
        "api_keys.py", 
        "search.py",
        "workflows.py"
    ]
    
    for filename in files_to_fix:
        file_path = routes_dir / filename
        if file_path.exists():
            fix_file_async_issues(file_path)
        else:
            print(f"File {file_path} not found, skipping...")

if __name__ == "__main__":
    main()