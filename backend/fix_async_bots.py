"""Fix async bots that need sync wrapper"""
import re

BOTS_TO_FIX = ['mes_integration_bot', 'oee_calculation_bot', 'rfq_management_bot']

for bot_name in BOTS_TO_FIX:
    filepath = f'bots/{bot_name}.py'
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Check if it has async execute but no sync wrapper
    if 'async def execute(' in content and 'def execute(self, context' not in content:
        print(f"Fixing {bot_name}...")
        
        # Rename async execute to execute_async
        content = content.replace('async def execute(', 'async def execute_async(')
        
        # Find where to insert the sync wrapper (after __init__)
        lines = content.split('\n')
        new_lines = []
        
        for i, line in enumerate(lines):
            new_lines.append(line)
            
            # After __init__ ends, add sync wrapper
            if i > 0 and '"""' in line and 'super().__init__' in '\n'.join(lines[max(0,i-10):i]):
                # Check if next non-empty line is async def execute_async
                j = i + 1
                while j < len(lines) and lines[j].strip() == '':
                    j += 1
                if j < len(lines) and 'async def execute_async(' in lines[j]:
                    # Insert sync wrapper before it
                    new_lines.append('')
                    new_lines.append('    def execute(self, context: dict) -> dict:')
                    new_lines.append('        """Synchronous wrapper for async execute_async"""')
                    new_lines.append('        import asyncio')
                    new_lines.append('        return asyncio.run(self.execute_async(context))')
        
        with open(filepath, 'w') as f:
            f.write('\n'.join(new_lines))
        print(f"✅ Fixed {bot_name}")

print("Done!")
