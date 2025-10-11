#!/usr/bin/env python3
"""
Script to convert sync database operations to async in API route files
"""
import os
import re
from pathlib import Path

def convert_file_to_async(file_path):
    """Convert a single file from sync to async database operations"""
    print(f"Converting {file_path}...")
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Skip if already converted (has AsyncSession import)
    if 'from sqlalchemy.ext.asyncio import AsyncSession' in content:
        print(f"  {file_path} already converted, skipping...")
        return
    
    # Replace imports
    content = re.sub(
        r'from sqlalchemy\.orm import Session',
        'from sqlalchemy.ext.asyncio import AsyncSession\nfrom sqlalchemy.orm import Session',
        content
    )
    
    # Add necessary imports
    if 'from sqlalchemy import' in content and 'select' not in content:
        content = re.sub(
            r'from sqlalchemy import ([^\\n]+)',
            r'from sqlalchemy import \1, select, update, delete',
            content
        )
    
    if 'selectinload' not in content and 'from sqlalchemy.orm import' in content:
        content = re.sub(
            r'from sqlalchemy\.orm import ([^\\n]+)',
            r'from sqlalchemy.orm import \1, selectinload',
            content
        )
    
    # Replace Session with AsyncSession in function parameters
    content = re.sub(
        r'db: Session = Depends\(get_db\)',
        'db: AsyncSession = Depends(get_db)',
        content
    )
    
    # Replace query patterns
    content = re.sub(
        r'db\.query\(([^)]+)\)',
        r'select(\1)',
        content
    )
    
    # Replace filter with where
    content = re.sub(
        r'\.filter\(',
        '.where(',
        content
    )
    
    # Replace .first() with async pattern
    content = re.sub(
        r'([a-zA-Z_][a-zA-Z0-9_]*) = ([^\\n]+)\.first\(\)',
        r'result = await db.execute(\2)\n    \1 = result.scalar_one_or_none()',
        content
    )
    
    # Replace .all() with async pattern
    content = re.sub(
        r'([a-zA-Z_][a-zA-Z0-9_]*) = ([^\\n]+)\.all\(\)',
        r'result = await db.execute(\2)\n    \1 = result.scalars().all()',
        content
    )
    
    # Replace .count() with async pattern
    content = re.sub(
        r'([a-zA-Z_][a-zA-Z0-9_]*) = ([^\\n]+)\.count\(\)',
        r'count_result = await db.execute(select(func.count()).select_from(\2))\n    \1 = count_result.scalar()',
        content
    )
    
    # Replace db.commit() and db.refresh()
    content = re.sub(r'db\.commit\(\)', 'await db.commit()', content)
    content = re.sub(r'db\.refresh\(([^)]+)\)', r'await db.refresh(\1)', content)
    
    # Replace auth_service._log_activity with async version
    content = re.sub(
        r'auth_service\._log_activity\(',
        'await auth_service._log_activity_async(',
        content
    )
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"  {file_path} converted successfully")

def main():
    """Convert all route files to async"""
    routes_dir = Path("backend/api/routes")
    
    # Files to convert (excluding already converted ones)
    files_to_convert = [
        "analytics.py",
        "api_keys.py", 
        "notifications.py",
        "search.py",
        "tags.py",
        "workflows.py"
    ]
    
    for filename in files_to_convert:
        file_path = routes_dir / filename
        if file_path.exists():
            convert_file_to_async(file_path)
        else:
            print(f"File {file_path} not found, skipping...")

if __name__ == "__main__":
    main()