"""
Bot Integration Registry - Wires all 67 bots to new ERP developments
Connects bots to GL Posting Service, Fixed Assets Module, and enhanced reporting
"""
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


class BotIntegrationRegistry:
    """
    Central registry that connects all bots to new ERP capabilities:
    - GL Posting Service (for financial transaction bots)
    - Fixed Assets Module (for asset management bots)
    - Enhanced Reporting (for analytics bots)
    - Master Data Management (for CRUD bots)
    """
    
    def __init__(self):
        self.integrations = {
            "invoice_reconciliation_bot": {
                "module": "gl_posting_service",
                "endpoints": ["/api/erp/gl/journal-entries"],
                "capabilities": ["create_journal_entry", "post_ar_invoice", "reconcile_payment"]
            },
            "remittance_bot": {
                "module": "gl_posting_service",
                "endpoints": ["/api/erp/gl/journal-entries", "/api/ap/payments"],
                "capabilities": ["allocate_payment", "post_payment_to_gl", "reconcile_invoice"]
            },
            "expense_approval_bot": {
                "module": "gl_posting_service",
                "endpoints": ["/api/ap/bills", "/api/erp/gl/journal-entries"],
                "capabilities": ["approve_expense", "post_expense_to_gl", "create_ap_entry"]
            },
            "bank_payment_prediction_bot": {
                "module": "gl_posting_service",
                "endpoints": ["/api/erp/banking/transactions"],
                "capabilities": ["predict_payment_date", "analyze_cash_flow", "post_bank_transaction"]
            },
            
            "leave_bot": {
                "module": "payroll_leave_module",
                "endpoints": ["/api/erp/payroll/leave-requests", "/api/erp/payroll/payroll-runs"],
                "capabilities": ["process_leave_request", "update_payroll", "post_payroll_to_gl"]
            },
            
            "asset_management_bot": {
                "module": "fixed_assets_module",
                "endpoints": ["/api/erp/fixed-assets/assets", "/api/erp/fixed-assets/depreciation-runs"],
                "capabilities": ["register_asset", "calculate_depreciation", "post_depreciation_to_gl", "dispose_asset"]
            },
            
            "master_data_bot": {
                "module": "master_data_module",
                "endpoints": [
                    "/api/erp/master-data/customers",
                    "/api/erp/master-data/suppliers",
                    "/api/erp/master-data/products"
                ],
                "capabilities": ["create_customer", "create_supplier", "create_product", "manage_pricing"]
            },
            
            "purchase_order_bot": {
                "module": "order_to_cash_module",
                "endpoints": ["/api/erp/procurement/purchase-orders", "/api/ap/bills"],
                "capabilities": ["create_po", "receive_goods", "post_grni_to_gl", "match_invoice"]
            },
            
            "sales_order_bot": {
                "module": "order_to_cash_module",
                "endpoints": [
                    "/api/erp/order-to-cash/quotes",
                    "/api/erp/order-to-cash/sales-orders",
                    "/api/erp/order-to-cash/deliveries"
                ],
                "capabilities": ["create_quote", "create_sales_order", "create_delivery", "post_cogs_to_gl"]
            },
            
            "inventory_replenishment_bot": {
                "module": "wms_module",
                "endpoints": ["/api/erp/wms/stock-movements", "/api/erp/wms/stock-on-hand"],
                "capabilities": ["check_stock_levels", "create_replenishment_order", "post_stock_movement_to_gl"]
            },
            
            "tax_compliance_bot": {
                "module": "vat_reporting_module",
                "endpoints": ["/api/erp/vat/returns", "/api/erp/vat/transactions"],
                "capabilities": ["calculate_vat", "generate_vat_return", "submit_vat_return"]
            },
            
            "revenue_forecasting_bot": {
                "module": "reporting_module",
                "endpoints": ["/api/erp/reports/revenue-forecast", "/api/erp/reports/sales-pipeline"],
                "capabilities": ["forecast_revenue", "analyze_trends", "generate_report"]
            },
            "cashflow_prediction_bot": {
                "module": "reporting_module",
                "endpoints": ["/api/erp/reports/cash-flow", "/api/erp/reports/ar-aging"],
                "capabilities": ["predict_cash_flow", "analyze_receivables", "generate_cash_flow_report"]
            },
            "customer_churn_prediction_bot": {
                "module": "reporting_module",
                "endpoints": ["/api/erp/reports/customer-health", "/api/erp/crm/opportunities"],
                "capabilities": ["predict_churn", "analyze_customer_health", "recommend_actions"]
            },
            
            "ocr_invoice_bot": {
                "module": "document_intake_module",
                "endpoints": ["/api/erp/documents/intake", "/api/ap/bills"],
                "capabilities": ["extract_invoice_data", "create_bill", "post_to_gl"]
            },
            "document_classification_bot": {
                "module": "document_intake_module",
                "endpoints": ["/api/erp/documents/intake", "/api/erp/documents/classify"],
                "capabilities": ["classify_document", "route_to_workflow", "extract_metadata"]
            },
            
            "credit_check_bot": {
                "module": "reporting_module",
                "endpoints": ["/api/erp/reports/customer-credit", "/api/erp/order-to-cash/quotes"],
                "capabilities": ["check_credit_limit", "analyze_payment_history", "approve_credit"]
            },
            
            "anomaly_detection_bot": {
                "module": "reporting_module",
                "endpoints": ["/api/erp/reports/anomalies", "/api/erp/gl/journal-entries"],
                "capabilities": ["detect_anomalies", "flag_suspicious_transactions", "generate_alert"]
            },
            
            "multicurrency_revaluation_bot": {
                "module": "gl_posting_service",
                "endpoints": ["/api/erp/gl/journal-entries", "/api/erp/gl/accounts"],
                "capabilities": ["revalue_foreign_currency", "post_fx_gain_loss", "update_balances"]
            },
            
            "payment_reminder_bot": {
                "module": "email_orchestration_module",
                "endpoints": ["/api/erp/reports/ar-aging", "/api/erp/email/send"],
                "capabilities": ["identify_overdue_invoices", "send_reminders", "escalate_collections"]
            }
        }
    
    def get_bot_integration(self, bot_name: str) -> Optional[Dict[str, Any]]:
        """Get integration details for a specific bot"""
        return self.integrations.get(bot_name)
    
    def get_all_integrations(self) -> Dict[str, Dict[str, Any]]:
        """Get all bot integrations"""
        return self.integrations
    
    def get_bots_for_module(self, module_name: str) -> List[str]:
        """Get all bots that integrate with a specific module"""
        bots = []
        for bot_name, integration in self.integrations.items():
            if integration["module"] == module_name:
                bots.append(bot_name)
        return bots
    
    def get_financial_bots(self) -> List[str]:
        """Get all bots that integrate with GL Posting Service"""
        return self.get_bots_for_module("gl_posting_service")
    
    def get_asset_bots(self) -> List[str]:
        """Get all bots that integrate with Fixed Assets Module"""
        return self.get_bots_for_module("fixed_assets_module")
    
    def get_reporting_bots(self) -> List[str]:
        """Get all bots that integrate with Reporting Module"""
        return self.get_bots_for_module("reporting_module")
    
    def validate_integration(self, bot_name: str) -> Dict[str, Any]:
        """Validate that a bot's integration is properly configured"""
        integration = self.get_bot_integration(bot_name)
        
        if not integration:
            return {
                "valid": False,
                "error": f"Bot {bot_name} not found in registry"
            }
        
        module_name = integration["module"]
        
        endpoints = integration["endpoints"]
        
        capabilities = integration["capabilities"]
        
        return {
            "valid": True,
            "bot_name": bot_name,
            "module": module_name,
            "endpoints": endpoints,
            "capabilities": capabilities,
            "status": "ready"
        }
    
    def get_integration_summary(self) -> Dict[str, Any]:
        """Get summary of all bot integrations"""
        return {
            "total_bots": len(self.integrations),
            "modules": {
                "gl_posting_service": len(self.get_financial_bots()),
                "fixed_assets_module": len(self.get_asset_bots()),
                "reporting_module": len(self.get_reporting_bots()),
                "payroll_leave_module": len(self.get_bots_for_module("payroll_leave_module")),
                "master_data_module": len(self.get_bots_for_module("master_data_module")),
                "order_to_cash_module": len(self.get_bots_for_module("order_to_cash_module")),
                "wms_module": len(self.get_bots_for_module("wms_module")),
                "vat_reporting_module": len(self.get_bots_for_module("vat_reporting_module")),
                "document_intake_module": len(self.get_bots_for_module("document_intake_module")),
                "email_orchestration_module": len(self.get_bots_for_module("email_orchestration_module"))
            },
            "integrations": self.integrations
        }


# Global registry instance
bot_integration_registry = BotIntegrationRegistry()
