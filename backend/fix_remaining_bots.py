"""Fix the remaining 17 bot issues"""

# 1. Fix missing capabilities (4 bots)
MISSING_CAPS = {
    'bbbee_compliance_bot': ['compliance', 'reporting', 'calculation'],
    'expense_management_bot': ['expense_tracking', 'approval', 'reimbursement'],
    'invoice_reconciliation_bot': ['reconciliation', 'matching', 'reporting'],
    'payroll_sa_bot': ['payroll', 'compliance', 'reporting']
}

for bot_name, caps in MISSING_CAPS.items():
    filepath = f'bots/{bot_name}.py'
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Add get_capabilities if missing
        if 'def get_capabilities' not in content:
            # Find where to add it (after __init__)
            lines = content.split('\n')
            new_lines = []
            for i, line in enumerate(lines):
                new_lines.append(line)
                if 'def __init__' in line:
                    # Find end of __init__
                    j = i + 1
                    while j < len(lines) and (lines[j].startswith('        ') or lines[j].strip() == ''):
                        new_lines.append(lines[j])
                        j += 1
                    # Add get_capabilities
                    caps_str = ', '.join([f'"{c}"' for c in caps])
                    method = f'''
    def get_capabilities(self):
        """Return bot capabilities"""
        return [{caps_str}]
'''
                    new_lines.append(method)
                    new_lines.extend(lines[j:])
                    break
            
            with open(filepath, 'w') as f:
                f.write('\n'.join(new_lines))
            print(f'✓ Added capabilities to {bot_name}')
    except Exception as e:
        print(f'❌ {bot_name}: {e}')

# 2. Fix execute errors (3 bots) - add action handling
EXECUTE_FIXES = ['financial_close_bot', 'financial_reporting_bot', 'general_ledger_bot', 'tax_compliance_bot']

for bot_name in EXECUTE_FIXES:
    filepath = f'bots/{bot_name}.py'
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Fix execute method to handle empty context
        if 'async def execute_async(' in content:
            # Replace the execute_async to handle empty action
            old_pattern = 'async def execute_async(self, input_data: Dict[str, Any]) -> Dict[str, Any]:\n        action = input_data.get("action"'
            if old_pattern in content:
                content = content.replace(
                    old_pattern,
                    'async def execute_async(self, input_data: Dict[str, Any]) -> Dict[str, Any]:\n        action = input_data.get("action", "status"'
                )
                with open(filepath, 'w') as f:
                    f.write(content)
                print(f'✓ Fixed execute in {bot_name}')
    except Exception as e:
        print(f'❌ {bot_name}: {e}')

print('\n✅ Fixed remaining bot issues')
