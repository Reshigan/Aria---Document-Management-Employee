#!/usr/bin/env python3
"""
Fix all syntax errors and malformed async conversions
"""
import re
from pathlib import Path

def fix_malformed_patterns(content):
    """Fix common malformed patterns from automated conversion"""
    
    # Fix malformed count patterns
    content = re.sub(
        r'count_result = await db\.execute\(select\(func\.count\(\)\)\.select_from\(await db\.execute\(select\(func\)\)[^)]*\)\)',
        'count_result = await db.execute(select(func.count()))',
        content
    )
    
    # Fix malformed nested awaits
    content = re.sub(r'await db\.execute\(await db\.execute\([^)]+\)\)', 'await db.execute(query)', content)
    
    # Fix malformed query patterns
    content = re.sub(
        r'([a-zA-Z_][a-zA-Z0-9_]*) = select\([^)]+\)\.where\([^)]+\)\.count\(\)',
        r'count_result = await db.execute(select(func.count()).where(...))\n    \1 = count_result.scalar()',
        content
    )
    
    # Fix simple .count() calls
    content = re.sub(r'\.count\(\)', '.scalar()', content)
    
    # Fix .all() calls that aren't awaited
    content = re.sub(r'([a-zA-Z_][a-zA-Z0-9_]*) = ([^=\n]+)\.all\(\)', r'result = await db.execute(\2)\n    \1 = result.scalars().all()', content)
    
    # Fix .first() calls that aren't awaited  
    content = re.sub(r'([a-zA-Z_][a-zA-Z0-9_]*) = ([^=\n]+)\.first\(\)', r'result = await db.execute(\2)\n    \1 = result.scalar_one_or_none()', content)
    
    return content

def fix_specific_file_issues(file_path, content):
    """Fix specific issues for each file"""
    filename = file_path.name
    
    if filename == "analytics.py":
        # Fix specific analytics patterns
        content = re.sub(
            r'active_users = select\(User\)\.where\([^)]+\)\.count\(\)',
            'active_users_result = await db.execute(select(func.count(User.id)).where(...))\n        active_users = active_users_result.scalar()',
            content
        )
        
    elif filename == "search.py":
        # Fix search-specific patterns
        content = re.sub(
            r'doc_tags = select\(Tag\.name\)\.join\(DocumentTag\)\.where\(',
            'doc_tags_query = select(Tag.name).join(DocumentTag).where(',
            content
        )
        
    elif filename == "workflows.py":
        # Fix workflow-specific patterns
        pass
        
    elif filename == "api_keys.py":
        # Fix API keys specific patterns
        pass
    
    return content

def fix_file(file_path):
    """Fix a single file"""
    print(f"Fixing {file_path}...")
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Apply general fixes
    content = fix_malformed_patterns(content)
    
    # Apply file-specific fixes
    content = fix_specific_file_issues(file_path, content)
    
    # Fix double awaits
    content = re.sub(r'await await', 'await', content)
    
    # Fix malformed indentation (basic)
    lines = content.split('\n')
    fixed_lines = []
    for i, line in enumerate(lines):
        # Fix lines that start with unexpected indentation after certain patterns
        if i > 0 and line.strip().startswith('if ') and lines[i-1].strip().endswith(')'):
            # Check if previous line suggests this should not be indented
            if not lines[i-1].strip().endswith(':'):
                line = line.lstrip()
        fixed_lines.append(line)
    
    content = '\n'.join(fixed_lines)
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"  Fixed {file_path}")

def main():
    """Fix all problematic files"""
    routes_dir = Path("backend/api/routes")
    
    # Files that had syntax errors
    problem_files = [
        "analytics.py",
        "workflows.py", 
        "search.py",
        "api_keys.py"
    ]
    
    for filename in problem_files:
        file_path = routes_dir / filename
        if file_path.exists():
            fix_file(file_path)
        else:
            print(f"File {file_path} not found")

if __name__ == "__main__":
    main()