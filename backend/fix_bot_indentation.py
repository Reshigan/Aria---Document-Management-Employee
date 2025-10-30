"""
Fix indentation errors in bot files
"""

import glob
import re

def fix_bot_file(filepath):
    """Fix indentation in a single bot file"""
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    fixed_lines = []
    in_execute = False
    needs_fix = False
    
    for i, line in enumerate(lines):
        # Check if we're in execute method
        if 'def execute' in line:
            in_execute = True
        elif in_execute and line.strip().startswith('def '):
            in_execute = False
            
        # Fix over-indented if/elif statements in execute
        if in_execute and line.startswith('            ') and (
            line.strip().startswith('if ') or 
            line.strip().startswith('elif ') or
            line.strip().startswith('else:')
        ):
            # Remove extra indent (8 spaces)
            fixed_line = line[8:]
            fixed_lines.append(fixed_line)
            needs_fix = True
        else:
            fixed_lines.append(line)
    
    if needs_fix:
        with open(filepath, 'w') as f:
            f.writelines(fixed_lines)
        return True
    return False

def main():
    bot_files = glob.glob('app/bots/*_bot.py')
    fixed_count = 0
    
    print(f"Checking {len(bot_files)} bot files for indentation errors...")
    
    for bot_file in bot_files:
        if fix_bot_file(bot_file):
            print(f"✓ Fixed: {bot_file}")
            fixed_count += 1
    
    print(f"\n✅ Fixed {fixed_count} files")

if __name__ == '__main__':
    main()
