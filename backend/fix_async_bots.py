"""
Fix async bots by adding sync execute() wrapper
"""

import glob
import re
import asyncio

ASYNC_BOTS = [
    'archive_management_bot',
    'audit_management_bot',
    'benefits_administration_bot',
    'category_management_bot',
    'contract_management_bot',
    'customer_service_bot',
    'data_extraction_bot',
    'data_validation_bot',
    'document_classification_bot',
    'downtime_tracking_bot',
    'email_processing_bot',
    'employee_self_service_bot',
    'financial_close_bot',
    'financial_reporting_bot',
    'general_ledger_bot',
    'goods_receipt_bot',
    'lead_management_bot',
    'learning_development_bot',
    'machine_monitoring_bot',
    'onboarding_bot',
    'operator_instructions_bot',
    'opportunity_management_bot',
    'payment_processing_bot',
    'performance_management_bot',
    'policy_management_bot',
    'procurement_analytics_bot',
    'production_reporting_bot',
    'production_scheduling_bot',
    'purchase_order_bot',
    'quote_generation_bot',
    'recruitment_bot',
    'risk_management_bot',
    'sales_analytics_bot',
    'sales_order_bot',
    'scrap_management_bot',
    'source_to_pay_bot',
    'spend_analysis_bot',
    'supplier_management_bot',
    'supplier_performance_bot',
    'supplier_risk_bot',
    'tax_compliance_bot',
    'time_attendance_bot',
    'tool_management_bot',
    'workflow_automation_bot'
]

def fix_async_bot(filepath):
    """Convert async execute() to sync with wrapper"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Check if it's already been fixed
    if 'def execute(self' in content and 'async def execute(self' not in content:
        return False
    
    # Check if async execute exists
    if 'async def execute(self' not in content:
        return False
    
    # Import asyncio if not present
    if 'import asyncio' not in content:
        # Add after other imports
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('import ') or line.startswith('from '):
                continue
            else:
                # Insert asyncio import before first non-import line
                lines.insert(i, 'import asyncio')
                break
        content = '\n'.join(lines)
    
    # Rename async execute to execute_async
    content = re.sub(
        r'async def execute\(self',
        'async def execute_async(self',
        content
    )
    
    # Find the class definition and add sync wrapper after __init__
    lines = content.split('\n')
    new_lines = []
    in_init = False
    added_wrapper = False
    
    for i, line in enumerate(lines):
        new_lines.append(line)
        
        # Find end of __init__ method
        if 'def __init__' in line:
            in_init = True
        elif in_init and line.strip() and not line.startswith(' ' * 8) and not line.startswith('\t'):
            # We're at the next method after __init__
            if not added_wrapper and 'def execute_async' in line:
                # Insert sync wrapper before execute_async
                indent = ' ' * 4
                wrapper = f'''
{indent}def execute(self, context: dict) -> dict:
{indent}    """Synchronous wrapper for async execute_async method"""
{indent}    return asyncio.run(self.execute_async(context))
'''
                new_lines.insert(-1, wrapper)
                added_wrapper = True
            in_init = False
    
    if added_wrapper:
        with open(filepath, 'w') as f:
            f.write('\n'.join(new_lines))
        return True
    
    return False

def main():
    fixed_count = 0
    
    for bot_name in ASYNC_BOTS:
        filepath = f'bots/{bot_name}.py'
        try:
            if fix_async_bot(filepath):
                print(f'✓ Fixed: {bot_name}')
                fixed_count += 1
            else:
                print(f'  Skipped: {bot_name} (already fixed or no async execute)')
        except FileNotFoundError:
            print(f'  Not found: {bot_name}')
        except Exception as e:
            print(f'❌ Error fixing {bot_name}: {e}')
    
    print(f'\n✅ Fixed {fixed_count} bots')

if __name__ == '__main__':
    main()
