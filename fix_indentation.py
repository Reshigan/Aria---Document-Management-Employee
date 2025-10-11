#!/usr/bin/env python3
"""
Fix indentation issues in Python files
"""
import ast
from pathlib import Path

def fix_indentation(content):
    """Fix common indentation issues"""
    lines = content.split('\n')
    fixed_lines = []
    
    for i, line in enumerate(lines):
        # Skip empty lines
        if not line.strip():
            fixed_lines.append(line)
            continue
            
        # Get the expected indentation level based on context
        expected_indent = 0
        
        # Look at previous non-empty lines to determine context
        for j in range(i-1, -1, -1):
            prev_line = lines[j].strip()
            if not prev_line:
                continue
                
            prev_indent = len(lines[j]) - len(lines[j].lstrip())
            
            # If previous line ends with :, increase indent
            if prev_line.endswith(':'):
                expected_indent = prev_indent + 4
                break
            # If previous line is a continuation, maintain indent
            elif prev_line.endswith(('(', '[', '{', ',', '\\')) or prev_line.startswith(('and ', 'or ')):
                expected_indent = prev_indent
                break
            # If current line is a continuation of previous
            elif line.strip().startswith((')', ']', '}', '.', 'and ', 'or ')):
                expected_indent = prev_indent
                break
            # Normal case - same level as previous
            else:
                expected_indent = prev_indent
                break
        
        # Special cases for dedenting
        current_stripped = line.strip()
        if current_stripped.startswith(('except', 'elif', 'else', 'finally')):
            # These should be at the same level as their corresponding if/try
            for j in range(i-1, -1, -1):
                check_line = lines[j].strip()
                if check_line.startswith(('if ', 'try:', 'for ', 'while ', 'with ')):
                    expected_indent = len(lines[j]) - len(lines[j].lstrip())
                    break
        elif current_stripped.startswith(('def ', 'class ', 'async def ')):
            # Functions and classes at module level or class level
            expected_indent = 0
            for j in range(i-1, -1, -1):
                check_line = lines[j].strip()
                if check_line.startswith('class '):
                    expected_indent = 4
                    break
        
        # Apply the expected indentation
        current_indent = len(line) - len(line.lstrip())
        if current_indent != expected_indent and line.strip():
            line = ' ' * expected_indent + line.lstrip()
        
        fixed_lines.append(line)
    
    return '\n'.join(fixed_lines)

def fix_file_indentation(file_path):
    """Fix indentation in a specific file"""
    print(f"Fixing indentation in {file_path}...")
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Try to parse first to see if there are syntax errors
    try:
        ast.parse(content)
        print(f"  {file_path} already has correct syntax")
        return True
    except SyntaxError as e:
        print(f"  Syntax error in {file_path}: {e}")
    
    # Apply indentation fixes
    fixed_content = fix_indentation(content)
    
    # Test if the fix worked
    try:
        ast.parse(fixed_content)
        with open(file_path, 'w') as f:
            f.write(fixed_content)
        print(f"  ✓ Fixed {file_path}")
        return True
    except SyntaxError as e:
        print(f"  ✗ Still has syntax error after fix: {e}")
        return False

def main():
    """Fix indentation in problematic files"""
    routes_dir = Path("backend/api/routes")
    problem_files = ["workflows.py", "search.py", "api_keys.py"]
    
    success_count = 0
    for filename in problem_files:
        file_path = routes_dir / filename
        if file_path.exists():
            if fix_file_indentation(file_path):
                success_count += 1
        else:
            print(f"File {file_path} not found")
    
    print(f"\nFixed {success_count}/{len(problem_files)} files")

if __name__ == "__main__":
    main()