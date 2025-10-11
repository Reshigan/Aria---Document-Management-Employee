#!/usr/bin/env python3
"""
Script to convert remaining folder endpoints to async
"""

import re

def convert_folders_to_async():
    """Convert the remaining folder endpoints to async operations"""
    
    # Read the current file
    with open('backend/api/routes/folders.py', 'r') as f:
        content = f.read()
    
    # Replace remaining sync patterns with async patterns
    replacements = [
        # Database session dependency
        (r'db: Session = Depends\(get_db\)', 'db: AsyncSession = Depends(get_async_db)'),
        
        # Query patterns
        (r'db\.query\(([^)]+)\)\.filter\(([^)]+)\)\.first\(\)', r'(await db.execute(select(\1).where(\2))).scalar_one_or_none()'),
        (r'db\.query\(([^)]+)\)\.filter\(([^)]+)\)\.all\(\)', r'(await db.execute(select(\1).where(\2))).scalars().all()'),
        (r'db\.query\(([^)]+)\)\.filter\(([^)]+)\)\.count\(\)', r'len((await db.execute(select(\1).where(\2))).fetchall())'),
        (r'db\.query\(([^)]+)\)\.filter\(([^)]+)\)\.delete\(\)', r'await db.execute(delete(\1).where(\2))'),
        (r'db\.query\(([^)]+)\)\.filter\(([^)]+)\)\.update\(([^)]+)\)', r'await db.execute(update(\1).where(\2).values(\3))'),
        
        # Simple queries
        (r'db\.query\(([^)]+)\)\.first\(\)', r'(await db.execute(select(\1))).scalar_one_or_none()'),
        (r'db\.query\(([^)]+)\)\.all\(\)', r'(await db.execute(select(\1))).scalars().all()'),
        (r'db\.query\(([^)]+)\)\.count\(\)', r'len((await db.execute(select(\1))).fetchall())'),
        
        # Database operations
        (r'db\.add\(([^)]+)\)', r'db.add(\1)'),
        (r'db\.delete\(([^)]+)\)', r'await db.delete(\1)'),
        (r'db\.commit\(\)', r'await db.commit()'),
        (r'db\.refresh\(([^)]+)\)', r'await db.refresh(\1)'),
        
        # Function calls
        (r'check_folder_permission\(db,', r'await check_folder_permission(db,'),
        (r'auth_service\._log_activity\(', r'await auth_service._log_activity_async('),
    ]
    
    # Apply replacements
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)
    
    # Write back the file
    with open('backend/api/routes/folders.py', 'w') as f:
        f.write(content)
    
    print("Folder endpoints converted to async operations")

if __name__ == "__main__":
    convert_folders_to_async()