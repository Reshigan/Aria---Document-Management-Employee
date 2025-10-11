#!/usr/bin/env python3
"""
Complete async conversion fix for all route files
"""
import os
import re
from pathlib import Path

def complete_async_fix(file_path):
    """Complete async conversion for a file"""
    print(f"Completing async fix for {file_path}...")
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Fix all remaining Session references
    content = re.sub(r'db: Session = Depends\(get_db\)', 'db: AsyncSession = Depends(get_db)', content)
    
    # Fix all db.query() patterns
    content = re.sub(r'db\.query\(([^)]+)\)', r'select(\1)', content)
    
    # Fix .filter( to .where(
    content = re.sub(r'\.filter\(', '.where(', content)
    
    # Fix simple query patterns
    # Pattern: var = query.first()
    content = re.sub(
        r'([a-zA-Z_][a-zA-Z0-9_]*) = ([^=\n]+)\.first\(\)',
        r'result = await db.execute(\2)\n    \1 = result.scalar_one_or_none()',
        content
    )
    
    # Pattern: var = query.all()
    content = re.sub(
        r'([a-zA-Z_][a-zA-Z0-9_]*) = ([^=\n]+)\.all\(\)',
        r'result = await db.execute(\2)\n    \1 = result.scalars().all()',
        content
    )
    
    # Pattern: var = query.count()
    content = re.sub(
        r'([a-zA-Z_][a-zA-Z0-9_]*) = ([^=\n]+)\.count\(\)',
        r'count_result = await db.execute(select(func.count()).select_from(\2))\n    \1 = count_result.scalar()',
        content
    )
    
    # Fix db operations
    content = re.sub(r'db\.commit\(\)', 'await db.commit()', content)
    content = re.sub(r'db\.refresh\(([^)]+)\)', r'await db.refresh(\1)', content)
    content = re.sub(r'db\.delete\(([^)]+)\)', r'await db.delete(\1)', content)
    
    # Fix auth_service calls
    content = re.sub(r'auth_service\._log_activity\(', 'await auth_service._log_activity_async(', content)
    
    # Fix specific query patterns that might be missed
    # Pattern: select(Model).where(...).first() -> proper async
    content = re.sub(
        r'([a-zA-Z_][a-zA-Z0-9_]*) = select\(([^)]+)\)\.where\(([^)]+)\)\.first\(\)',
        r'query = select(\2).where(\3)\n    result = await db.execute(query)\n    \1 = result.scalar_one_or_none()',
        content
    )
    
    # Pattern: select(Model).where(...).all() -> proper async
    content = re.sub(
        r'([a-zA-Z_][a-zA-Z0-9_]*) = select\(([^)]+)\)\.where\(([^)]+)\)\.all\(\)',
        r'query = select(\2).where(\3)\n    result = await db.execute(query)\n    \1 = result.scalars().all()',
        content
    )
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"  {file_path} completed successfully")

def main():
    """Fix all route files"""
    routes_dir = Path("backend/api/routes")
    
    # All route files that might need fixes
    files_to_fix = [
        "analytics.py",
        "api_keys.py", 
        "notifications.py",
        "search.py",
        "tags.py",
        "workflows.py"
    ]
    
    for filename in files_to_fix:
        file_path = routes_dir / filename
        if file_path.exists():
            complete_async_fix(file_path)
        else:
            print(f"File {file_path} not found, skipping...")

if __name__ == "__main__":
    main()