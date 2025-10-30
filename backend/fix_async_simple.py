"""Simple async bot fixer - adds sync wrapper"""
import glob

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

def add_sync_wrapper(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    # Check if already has sync wrapper
    content = ''.join(lines)
    if 'def execute(self, context' in content or 'def execute(self, query' in content:
        return False  # Already has sync method
    
    # Find where to insert (after __init__)
    new_lines = []
    inserted = False
    for i, line in enumerate(lines):
        new_lines.append(line)
        if 'def __init__' in line:
            # Find end of __init__
            j = i + 1
            while j < len(lines) and (lines[j].startswith('        ') or lines[j].strip() == ''):
                new_lines.append(lines[j])
                j += 1
            # Insert sync wrapper
            new_lines.append('\n')
            new_lines.append('    def execute(self, context: dict) -> dict:\n')
            new_lines.append('        """Synchronous wrapper"""\n')
            new_lines.append('        import asyncio\n')
            new_lines.append('        return asyncio.run(self.execute(context))\n')
            new_lines.append('\n')
            inserted = True
            # Continue with rest
            new_lines.extend(lines[j:])
            break
    
    if inserted:
        with open(filepath, 'w') as f:
            f.writelines(new_lines)
        return True
    return False

for bot_name in ASYNC_BOTS:
    filepath = f'bots/{bot_name}.py'
    try:
        if add_sync_wrapper(filepath):
            print(f'✓ {bot_name}')
    except Exception as e:
        print(f'❌ {bot_name}: {e}')
