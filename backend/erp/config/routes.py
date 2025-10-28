"""
ERP Configuration & Customization Engine
System settings, business rules, custom fields, workflows, permissions
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict, Any
from datetime import datetime

router = APIRouter(prefix="/api/erp/config", tags=["ERP-Configuration"])


# ============================================================================
# COMPANY CONFIGURATION
# ============================================================================

@router.get("/company")
async def get_company_config():
    """Get company configuration"""
    return {
        "company_name": "Aria Demo Company (Pty) Ltd",
        "registration_number": "2024/123456/07",
        "vat_number": "4123456789",
        "tax_year_start": "01-01",
        "fiscal_year_end": "12-31",
        "base_currency": "ZAR",
        "country": "ZA",
        "timezone": "Africa/Johannesburg",
        "language": "en_US",
        "address": {
            "street": "123 Business Street",
            "city": "Johannesburg",
            "province": "Gauteng",
            "postal_code": "2196",
            "country": "South Africa"
        },
        "contact": {
            "phone": "+27 11 123 4567",
            "email": "info@aria.com",
            "website": "www.aria.com"
        },
        "compliance": {
            "vat_registered": True,
            "vat_rate": 0.15,
            "paye_registered": True,
            "uif_registered": True,
            "coida_registered": True,
            "bbbee_level": 3
        }
    }


@router.put("/company")
async def update_company_config(config_data: dict):
    """Update company configuration"""
    return {
        "status": "updated",
        "message": "Company configuration updated successfully",
        "config": config_data
    }


# ============================================================================
# MODULE CONFIGURATION
# ============================================================================

@router.get("/modules")
async def get_module_config():
    """Get enabled modules and their configuration"""
    return {
        "modules": [
            {
                "id": "financial",
                "name": "Financial Management",
                "enabled": True,
                "features": {
                    "multi_currency": True,
                    "cost_centers": True,
                    "budgeting": True,
                    "bank_reconciliation": True,
                    "fixed_assets": True
                },
                "settings": {
                    "auto_post_journals": False,
                    "require_approval": True,
                    "lock_period_days": 5
                }
            },
            {
                "id": "manufacturing",
                "name": "Manufacturing",
                "enabled": True,
                "features": {
                    "mrp": True,
                    "work_orders": True,
                    "bom": True,
                    "routing": True,
                    "quality_control": True,
                    "costing": True
                },
                "settings": {
                    "default_costing_method": "standard",
                    "auto_reserve_materials": True,
                    "backflush_materials": False
                }
            },
            {
                "id": "inventory",
                "name": "Inventory Management",
                "enabled": True,
                "features": {
                    "multi_location": True,
                    "serial_numbers": True,
                    "batch_tracking": True,
                    "barcode_scanning": True,
                    "cycle_counting": True
                },
                "settings": {
                    "default_valuation": "FIFO",
                    "negative_inventory_allowed": False,
                    "auto_replenishment": True
                }
            },
            {
                "id": "procurement",
                "name": "Procurement",
                "enabled": True,
                "features": {
                    "purchase_requisitions": True,
                    "rfq_management": True,
                    "supplier_portal": True,
                    "three_way_matching": True
                },
                "settings": {
                    "require_approval": True,
                    "approval_threshold": 50000,
                    "auto_create_po_from_requisition": False
                }
            },
            {
                "id": "sales_crm",
                "name": "Sales & CRM",
                "enabled": True,
                "features": {
                    "opportunity_management": True,
                    "quote_management": True,
                    "customer_portal": True,
                    "commission_tracking": True
                },
                "settings": {
                    "auto_convert_quote_to_order": False,
                    "credit_limit_check": True,
                    "default_payment_terms": "30_days"
                }
            },
            {
                "id": "hr_payroll",
                "name": "HR & Payroll",
                "enabled": True,
                "features": {
                    "attendance_tracking": True,
                    "leave_management": True,
                    "performance_reviews": True,
                    "payroll_processing": True,
                    "recruitment": True
                },
                "settings": {
                    "payroll_frequency": "monthly",
                    "auto_calculate_tax": True,
                    "leave_carry_forward": True
                }
            },
            {
                "id": "quality",
                "name": "Quality Management",
                "enabled": True,
                "features": {
                    "inspection_plans": True,
                    "capa": True,
                    "non_conformance": True,
                    "supplier_quality": True
                },
                "settings": {
                    "require_inspection_before_receipt": True,
                    "auto_create_capa": True
                }
            },
            {
                "id": "maintenance",
                "name": "Maintenance Management",
                "enabled": True,
                "features": {
                    "preventive_maintenance": True,
                    "work_orders": True,
                    "downtime_tracking": True
                },
                "settings": {
                    "auto_schedule_pm": True,
                    "send_pm_reminders": True
                }
            }
        ]
    }


@router.put("/modules/{module_id}")
async def update_module_config(module_id: str, config_data: dict):
    """Update module configuration"""
    return {
        "status": "updated",
        "module_id": module_id,
        "message": f"Module {module_id} configuration updated",
        "config": config_data
    }


# ============================================================================
# BUSINESS RULES ENGINE
# ============================================================================

@router.get("/business-rules")
async def get_business_rules():
    """Get all business rules"""
    return {
        "rules": [
            {
                "id": 1,
                "name": "Purchase Order Approval",
                "module": "procurement",
                "trigger": "po_created",
                "conditions": [
                    {"field": "total_amount", "operator": "greater_than", "value": 50000}
                ],
                "actions": [
                    {"type": "require_approval", "approver_role": "procurement_manager"},
                    {"type": "send_notification", "recipient": "procurement_manager"}
                ],
                "enabled": True
            },
            {
                "id": 2,
                "name": "Low Stock Alert",
                "module": "inventory",
                "trigger": "stock_below_reorder",
                "conditions": [
                    {"field": "on_hand_quantity", "operator": "less_than_equal", "value": "reorder_point"}
                ],
                "actions": [
                    {"type": "create_purchase_requisition", "quantity": "reorder_quantity"},
                    {"type": "send_email", "recipient": "purchasing@company.com"}
                ],
                "enabled": True
            },
            {
                "id": 3,
                "name": "Journal Entry Approval",
                "module": "financial",
                "trigger": "journal_entry_posted",
                "conditions": [
                    {"field": "journal_type", "operator": "equals", "value": "adjustment"},
                    {"field": "total_amount", "operator": "greater_than", "value": 10000}
                ],
                "actions": [
                    {"type": "require_approval", "approver_role": "financial_controller"},
                    {"type": "lock_entry", "until": "approved"}
                ],
                "enabled": True
            },
            {
                "id": 4,
                "name": "Credit Limit Check",
                "module": "sales_crm",
                "trigger": "sales_order_created",
                "conditions": [
                    {"field": "customer_outstanding_balance", "operator": "greater_than", "value": "customer_credit_limit"}
                ],
                "actions": [
                    {"type": "block_order", "message": "Customer credit limit exceeded"},
                    {"type": "send_notification", "recipient": "credit_controller"}
                ],
                "enabled": True
            }
        ]
    }


@router.post("/business-rules")
async def create_business_rule(rule_data: dict):
    """Create new business rule"""
    return {
        "id": 5,
        "status": "created",
        "message": "Business rule created successfully",
        "rule": rule_data
    }


@router.put("/business-rules/{rule_id}")
async def update_business_rule(rule_id: int, rule_data: dict):
    """Update business rule"""
    return {
        "id": rule_id,
        "status": "updated",
        "message": "Business rule updated",
        "rule": rule_data
    }


@router.delete("/business-rules/{rule_id}")
async def delete_business_rule(rule_id: int):
    """Delete business rule"""
    return {
        "status": "deleted",
        "message": f"Business rule {rule_id} deleted"
    }


# ============================================================================
# CUSTOM FIELDS
# ============================================================================

@router.get("/custom-fields/{entity_type}")
async def get_custom_fields(entity_type: str):
    """Get custom fields for entity"""
    # Sample custom fields
    custom_fields = {
        "sales_order": [
            {"id": 1, "name": "delivery_instructions", "label": "Delivery Instructions", "type": "text", "required": False},
            {"id": 2, "name": "special_packaging", "label": "Special Packaging", "type": "checkbox", "required": False},
            {"id": 3, "name": "priority_level", "label": "Priority", "type": "select", "options": ["Low", "Medium", "High"], "required": True}
        ],
        "purchase_order": [
            {"id": 4, "name": "delivery_location", "label": "Delivery Location", "type": "select", "options": ["Warehouse A", "Warehouse B"], "required": True},
            {"id": 5, "name": "quality_requirements", "label": "Quality Requirements", "type": "textarea", "required": False}
        ]
    }
    
    return {
        "entity_type": entity_type,
        "custom_fields": custom_fields.get(entity_type, [])
    }


@router.post("/custom-fields/{entity_type}")
async def create_custom_field(entity_type: str, field_data: dict):
    """Create custom field for entity"""
    return {
        "id": 10,
        "entity_type": entity_type,
        "status": "created",
        "message": "Custom field created successfully",
        "field": field_data
    }


# ============================================================================
# APPROVAL WORKFLOWS
# ============================================================================

@router.get("/workflows")
async def get_workflows():
    """Get all approval workflows"""
    return {
        "workflows": [
            {
                "id": 1,
                "name": "Purchase Order Approval",
                "entity_type": "purchase_order",
                "enabled": True,
                "steps": [
                    {
                        "step": 1,
                        "name": "Department Manager Approval",
                        "condition": {"field": "amount", "operator": "greater_than", "value": 10000},
                        "approver_type": "role",
                        "approver": "department_manager",
                        "action_on_reject": "return_to_creator"
                    },
                    {
                        "step": 2,
                        "name": "Procurement Manager Approval",
                        "condition": {"field": "amount", "operator": "greater_than", "value": 50000},
                        "approver_type": "role",
                        "approver": "procurement_manager",
                        "action_on_reject": "cancel"
                    },
                    {
                        "step": 3,
                        "name": "CFO Approval",
                        "condition": {"field": "amount", "operator": "greater_than", "value": 100000},
                        "approver_type": "role",
                        "approver": "cfo",
                        "action_on_reject": "cancel"
                    }
                ]
            },
            {
                "id": 2,
                "name": "Leave Request Approval",
                "entity_type": "leave_request",
                "enabled": True,
                "steps": [
                    {
                        "step": 1,
                        "name": "Line Manager Approval",
                        "approver_type": "manager",
                        "approver": "line_manager",
                        "action_on_reject": "notify_employee"
                    },
                    {
                        "step": 2,
                        "name": "HR Approval",
                        "condition": {"field": "days", "operator": "greater_than", "value": 10},
                        "approver_type": "role",
                        "approver": "hr_manager",
                        "action_on_reject": "return_to_manager"
                    }
                ]
            },
            {
                "id": 3,
                "name": "Journal Entry Approval",
                "entity_type": "journal_entry",
                "enabled": True,
                "steps": [
                    {
                        "step": 1,
                        "name": "Accountant Review",
                        "condition": {"field": "journal_type", "operator": "equals", "value": "adjustment"},
                        "approver_type": "role",
                        "approver": "accountant",
                        "action_on_reject": "return_to_creator"
                    },
                    {
                        "step": 2,
                        "name": "Financial Controller Approval",
                        "condition": {"field": "amount", "operator": "greater_than", "value": 50000},
                        "approver_type": "role",
                        "approver": "financial_controller",
                        "action_on_reject": "cancel"
                    }
                ]
            }
        ]
    }


@router.post("/workflows")
async def create_workflow(workflow_data: dict):
    """Create new approval workflow"""
    return {
        "id": 4,
        "status": "created",
        "message": "Workflow created successfully",
        "workflow": workflow_data
    }


@router.put("/workflows/{workflow_id}")
async def update_workflow(workflow_id: int, workflow_data: dict):
    """Update workflow"""
    return {
        "id": workflow_id,
        "status": "updated",
        "message": "Workflow updated",
        "workflow": workflow_data
    }


# ============================================================================
# NUMBERING SEQUENCES
# ============================================================================

@router.get("/numbering")
async def get_numbering_config():
    """Get numbering sequence configuration"""
    return {
        "sequences": [
            {"entity": "sales_order", "prefix": "SO-", "format": "{prefix}{year}{month}{number:04d}", "next_number": 1245, "sample": "SO-20251028-1245"},
            {"entity": "purchase_order", "prefix": "PO-", "format": "{prefix}{year}{month}{number:04d}", "next_number": 568, "sample": "PO-20251028-0568"},
            {"entity": "invoice", "prefix": "INV-", "format": "{prefix}{year}{number:05d}", "next_number": 3421, "sample": "INV-2025-03421"},
            {"entity": "quote", "prefix": "QT-", "format": "{prefix}{year}{month}{number:03d}", "next_number": 156, "sample": "QT-20251028-156"},
            {"entity": "work_order", "prefix": "WO-", "format": "{prefix}{number:05d}", "next_number": 12345, "sample": "WO-12345"},
            {"entity": "journal_entry", "prefix": "JE-", "format": "{prefix}{year}{month}{day}{number:03d}", "next_number": 89, "sample": "JE-20251028-089"}
        ]
    }


@router.put("/numbering/{entity}")
async def update_numbering_config(entity: str, config_data: dict):
    """Update numbering sequence"""
    return {
        "entity": entity,
        "status": "updated",
        "message": "Numbering sequence updated",
        "config": config_data
    }


# ============================================================================
# INTEGRATIONS
# ============================================================================

@router.get("/integrations")
async def get_integrations():
    """Get integration configurations"""
    return {
        "integrations": [
            {
                "id": "sap_b1",
                "name": "SAP Business One",
                "type": "erp",
                "enabled": False,
                "config": {
                    "server_url": "",
                    "company_db": "",
                    "sync_interval": 3600
                }
            },
            {
                "id": "sage_300",
                "name": "Sage 300",
                "type": "accounting",
                "enabled": False,
                "config": {
                    "api_key": "",
                    "company_id": ""
                }
            },
            {
                "id": "shopify",
                "name": "Shopify",
                "type": "ecommerce",
                "enabled": False,
                "config": {
                    "store_url": "",
                    "api_key": "",
                    "auto_sync_orders": True
                }
            },
            {
                "id": "slack",
                "name": "Slack",
                "type": "communication",
                "enabled": True,
                "config": {
                    "webhook_url": "https://hooks.slack.com/services/...",
                    "default_channel": "#erp-notifications"
                }
            },
            {
                "id": "sendgrid",
                "name": "SendGrid",
                "type": "email",
                "enabled": True,
                "config": {
                    "api_key": "SG.***",
                    "from_email": "noreply@aria.com"
                }
            }
        ]
    }


@router.put("/integrations/{integration_id}")
async def update_integration(integration_id: str, config_data: dict):
    """Update integration configuration"""
    return {
        "integration_id": integration_id,
        "status": "updated",
        "message": "Integration configuration updated",
        "config": config_data
    }


# ============================================================================
# PERMISSIONS & ROLES
# ============================================================================

@router.get("/roles")
async def get_roles():
    """Get all roles and permissions"""
    return {
        "roles": [
            {
                "id": 1,
                "name": "System Administrator",
                "code": "sys_admin",
                "description": "Full system access",
                "permissions": ["*"]
            },
            {
                "id": 2,
                "name": "Financial Controller",
                "code": "fin_controller",
                "description": "Financial management",
                "permissions": [
                    "financial.view",
                    "financial.create",
                    "financial.edit",
                    "financial.approve",
                    "financial.reports"
                ]
            },
            {
                "id": 3,
                "name": "Production Manager",
                "code": "prod_manager",
                "description": "Manufacturing operations",
                "permissions": [
                    "manufacturing.view",
                    "manufacturing.create",
                    "manufacturing.edit",
                    "manufacturing.approve",
                    "inventory.view",
                    "quality.view"
                ]
            },
            {
                "id": 4,
                "name": "Procurement Manager",
                "code": "proc_manager",
                "description": "Procurement operations",
                "permissions": [
                    "procurement.view",
                    "procurement.create",
                    "procurement.edit",
                    "procurement.approve",
                    "suppliers.manage"
                ]
            },
            {
                "id": 5,
                "name": "Sales Representative",
                "code": "sales_rep",
                "description": "Sales operations",
                "permissions": [
                    "sales.view",
                    "sales.create",
                    "sales.edit",
                    "crm.view",
                    "crm.edit",
                    "customers.view"
                ]
            },
            {
                "id": 6,
                "name": "Warehouse Operator",
                "code": "warehouse_op",
                "description": "Inventory operations",
                "permissions": [
                    "inventory.view",
                    "inventory.receive",
                    "inventory.issue",
                    "inventory.transfer",
                    "wms.operate"
                ]
            }
        ]
    }


@router.post("/roles")
async def create_role(role_data: dict):
    """Create new role"""
    return {
        "id": 7,
        "status": "created",
        "message": "Role created successfully",
        "role": role_data
    }


@router.put("/roles/{role_id}")
async def update_role(role_id: int, role_data: dict):
    """Update role"""
    return {
        "id": role_id,
        "status": "updated",
        "message": "Role updated",
        "role": role_data
    }


# ============================================================================
# USER PREFERENCES
# ============================================================================

@router.get("/preferences/{user_id}")
async def get_user_preferences(user_id: int):
    """Get user preferences"""
    return {
        "user_id": user_id,
        "preferences": {
            "language": "en_US",
            "timezone": "Africa/Johannesburg",
            "date_format": "YYYY-MM-DD",
            "time_format": "24h",
            "number_format": "1,234.56",
            "currency_display": "symbol",
            "default_dashboard": "executive",
            "items_per_page": 50,
            "theme": "light",
            "email_notifications": True,
            "push_notifications": True,
            "default_module": "dashboard"
        }
    }


@router.put("/preferences/{user_id}")
async def update_user_preferences(user_id: int, preferences: dict):
    """Update user preferences"""
    return {
        "user_id": user_id,
        "status": "updated",
        "message": "Preferences updated successfully",
        "preferences": preferences
    }


# ============================================================================
# SYSTEM SETTINGS
# ============================================================================

@router.get("/system")
async def get_system_settings():
    """Get system-wide settings"""
    return {
        "settings": {
            "maintenance_mode": False,
            "allow_registrations": False,
            "require_email_verification": True,
            "session_timeout_minutes": 60,
            "password_policy": {
                "min_length": 8,
                "require_uppercase": True,
                "require_lowercase": True,
                "require_numbers": True,
                "require_special_chars": True,
                "password_expiry_days": 90
            },
            "backup": {
                "auto_backup": True,
                "backup_frequency": "daily",
                "backup_retention_days": 30,
                "backup_location": "s3://aria-backups/"
            },
            "audit_logging": {
                "enabled": True,
                "log_level": "INFO",
                "retention_days": 365
            },
            "api": {
                "rate_limit_per_minute": 60,
                "max_request_size_mb": 50,
                "enable_cors": True
            }
        }
    }


@router.put("/system")
async def update_system_settings(settings: dict):
    """Update system settings"""
    return {
        "status": "updated",
        "message": "System settings updated successfully",
        "settings": settings
    }


# ============================================================================
# REPORT BUILDER
# ============================================================================

@router.get("/report-builder/templates")
async def get_report_templates():
    """Get custom report templates"""
    return {
        "templates": [
            {
                "id": 1,
                "name": "Custom Sales Analysis",
                "type": "tabular",
                "source": "sales_orders",
                "columns": ["order_date", "customer_name", "product", "quantity", "total_amount"],
                "filters": [{"field": "order_date", "operator": "between", "value": ["start_date", "end_date"]}],
                "grouping": ["customer_name"],
                "sorting": [{"field": "total_amount", "order": "desc"}],
                "created_by": "admin",
                "created_at": "2025-10-01"
            }
        ]
    }


@router.post("/report-builder/templates")
async def create_report_template(template_data: dict):
    """Create custom report template"""
    return {
        "id": 2,
        "status": "created",
        "message": "Report template created successfully",
        "template": template_data
    }


@router.post("/report-builder/run/{template_id}")
async def run_custom_report(template_id: int, parameters: dict):
    """Run custom report"""
    return {
        "template_id": template_id,
        "status": "success",
        "data": [
            {"order_date": "2025-10-01", "customer_name": "Customer A", "product": "Widget A", "quantity": 10, "total_amount": 5000},
            {"order_date": "2025-10-02", "customer_name": "Customer B", "product": "Widget B", "quantity": 5, "total_amount": 3750}
        ],
        "summary": {
            "total_records": 2,
            "total_amount": 8750
        }
    }
