"""Properly fix async bots - rename async execute to execute_async and add sync wrapper"""

ASYNC_BOTS = [
    'archive_management_bot', 'audit_management_bot', 'benefits_administration_bot',
    'category_management_bot', 'contract_management_bot', 'customer_service_bot',
    'data_extraction_bot', 'data_validation_bot', 'document_classification_bot',
    'downtime_tracking_bot', 'email_processing_bot', 'employee_self_service_bot',
    'financial_close_bot', 'financial_reporting_bot', 'general_ledger_bot',
    'goods_receipt_bot', 'lead_management_bot', 'learning_development_bot',
    'machine_monitoring_bot', 'onboarding_bot', 'operator_instructions_bot',
    'opportunity_management_bot', 'payment_processing_bot', 'performance_management_bot',
    'policy_management_bot', 'procurement_analytics_bot', 'production_reporting_bot',
    'production_scheduling_bot', 'purchase_order_bot', 'quote_generation_bot',
    'recruitment_bot', 'risk_management_bot', 'sales_analytics_bot',
    'sales_order_bot', 'scrap_management_bot', 'source_to_pay_bot',
    'spend_analysis_bot', 'supplier_management_bot', 'supplier_performance_bot',
    'supplier_risk_bot', 'tax_compliance_bot', 'time_attendance_bot',
    'tool_management_bot', 'workflow_automation_bot'
]

for bot_name in ASYNC_BOTS:
    filepath = f'bots/{bot_name}.py'
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Step 1: Rename async def execute to async def execute_async
        content = content.replace('async def execute(', 'async def execute_async(')
        
        # Step 2: Add sync wrapper after __init__
        lines = content.split('\n')
        new_lines = []
        for i, line in enumerate(lines):
            new_lines.append(line)
            if 'def __init__' in line:
                # Find end of __init__ (next line that doesn't start with spaces)
                j = i + 1
                while j < len(lines) and (lines[j].startswith('        ') or lines[j].strip() == ''):
                    new_lines.append(lines[j])
                    j += 1
                # Insert sync wrapper
                wrapper = '''
    def execute(self, context: dict) -> dict:
        """Synchronous wrapper for async execute_async"""
        import asyncio
        return asyncio.run(self.execute_async(context))
'''
                new_lines.append(wrapper)
                # Add rest of file
                new_lines.extend(lines[j:])
                break
        
        with open(filepath, 'w') as f:
            f.write('\n'.join(new_lines))
        
        print(f'✓ {bot_name}')
    except Exception as e:
        print(f'❌ {bot_name}: {e}')
