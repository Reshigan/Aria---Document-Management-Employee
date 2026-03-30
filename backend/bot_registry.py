'''Bot Registry - Central registry for all 67 bots'''
from typing import Dict, List, Any, Optional
from datetime import datetime
import importlib
import sys
from pathlib import Path

class BotRegistry:
    """Central registry for all ARIA bots"""
    
    def __init__(self):
        self.bots: Dict[str, Any] = {}
        self.categories: Dict[str, List[str]] = {
            "financial": [],
            "erp_core": [],
            "procurement": [],
            "hr": [],
            "sales_crm": [],
            "document": [],
            "manufacturing": [],
            "compliance": [],
            "existing": []
        }
        self._load_all_bots()
    
    def _load_all_bots(self):
        """Load all bot modules"""
        bot_modules = {
            # Phase 1: Financial (5)
            "financial": [
                "general_ledger_bot",
                "financial_close_bot",
                "tax_compliance_bot",
                "financial_reporting_bot",
                "payment_processing_bot"
            ],
            
            # Phase 2: ERP Core (8)
            "erp_core": [
                "purchase_order_bot",
                "production_scheduling_bot",
                "bom_management_bot",
                "work_order_bot",
                "quality_control_bot",
                "inventory_optimization_bot",
                "document_scanner_bot",
                "sap_integration_bot"
            ],
            
            # Phase 3: Procurement (10)
            "procurement": [
                "supplier_management_bot",
                "rfq_management_bot",
                "contract_management_bot",
                "goods_receipt_bot",
                "supplier_performance_bot",
                "procurement_analytics_bot",
                "spend_analysis_bot",
                "category_management_bot",
                "source_to_pay_bot",
                "supplier_risk_bot"
            ],
            
            # Phase 4: HR (7)
            "hr": [
                "recruitment_bot",
                "onboarding_bot",
                "performance_management_bot",
                "learning_development_bot",
                "benefits_administration_bot",
                "time_attendance_bot",
                "employee_self_service_bot"
            ],
            
            # Phase 5: Sales/CRM (6)
            "sales_crm": [
                "lead_management_bot",
                "opportunity_management_bot",
                "quote_generation_bot",
                "sales_order_bot",
                "customer_service_bot",
                "sales_analytics_bot"
            ],
            
            # Phase 6: Document (6)
            "document": [
                "email_processing_bot",
                "data_extraction_bot",
                "document_classification_bot",
                "data_validation_bot",
                "archive_management_bot",
                "workflow_automation_bot"
            ],
            
            # Phase 7: Manufacturing (8)
            "manufacturing": [
                "mes_integration_bot",
                "machine_monitoring_bot",
                "downtime_tracking_bot",
                "oee_calculation_bot",
                "production_reporting_bot",
                "scrap_management_bot",
                "tool_management_bot",
                "operator_instructions_bot",
                "mrp_bot",
                "production_scheduler_bot"
            ],
            
            # Phase 8: Compliance (3)
            "compliance": [
                "audit_management_bot",
                "policy_management_bot",
                "risk_management_bot",
                "bbbee_compliance_bot"
            ],
            
            # Existing bots (14)
            "existing": [
                "document_management_bot",
                "expense_bot",
                "invoice_bot",
                "employee_bot",
                "integration_bot"
            ]
        }
        
        # Load each bot
        for category, bot_list in bot_modules.items():
            for bot_name in bot_list:
                try:
                    # Try to import the bot module
                    module_path = f"bots.{bot_name}"
                    module = importlib.import_module(module_path)
                    
                    # Get the bot instance (assumes module has a bot instance with same name)
                    bot_instance_name = bot_name  # e.g., "general_ledger_bot"
                    if hasattr(module, bot_instance_name):
                        bot_instance = getattr(module, bot_instance_name)
                        self.bots[bot_name] = bot_instance
                        self.categories[category].append(bot_name)
                        print(f"✅ Loaded: {bot_name} ({category})")
                    elif hasattr(module, bot_name.replace('_bot', 'Bot')):
                        # Try alternate naming convention (e.g., mrp_bot -> MRPPBot)
                        bot_instance = getattr(module, bot_name.replace('_bot', 'Bot'))
                        self.bots[bot_name] = bot_instance
                        self.categories[category].append(bot_name)
                        print(f"✅ Loaded: {bot_name} ({category}) - Alternate naming")
                    else:
                        print(f"⚠️  Module {bot_name} has no instance variable")
                except ImportError as e:
                    # Bot file doesn't exist yet - this is okay for planned bots
                    print(f"⏭️  Planned bot not yet implemented: {bot_name}")
                    continue
                except Exception as e:
                    print(f"❌ Failed to load {bot_name}: {str(e)}")
    
    def get_bot(self, bot_name: str) -> Optional[Any]:
        """Get a bot by name"""
        return self.bots.get(bot_name)
    
    def get_category_bots(self, category: str) -> List[str]:
        """Get all bots in a category"""
        return self.categories.get(category, [])
    
    def get_all_bots(self) -> Dict[str, Any]:
        """Get all registered bots"""
        return self.bots
    
    def get_bot_info(self, bot_name: str) -> Dict[str, Any]:
        """Get bot information"""
        bot = self.get_bot(bot_name)
        if not bot:
            return {"error": "Bot not found"}
        
        return {
            "name": getattr(bot, "name", bot_name),
            "bot_id": getattr(bot, "bot_id", "unknown"),
            "description": getattr(bot, "description", "No description"),
            "capabilities": [cap.value for cap in getattr(bot, "get_capabilities", lambda: [])()],
            "status": "active"
        }
    
    def list_all_bots(self) -> Dict[str, Any]:
        """List all bots with categories"""
        result = {
            "total_bots": len(self.bots),
            "categories": {}
        }
        
        for category, bot_list in self.categories.items():
            result["categories"][category] = {
                "count": len(bot_list),
                "bots": [self.get_bot_info(bot_name) for bot_name in bot_list]
            }
        
        return result
    
    async def execute_bot(self, bot_name: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a bot with input data"""
        bot = self.get_bot(bot_name)
        if not bot:
            return {"success": False, "error": f"Bot '{bot_name}' not found"}
        
        try:
            # Validate input
            is_valid, error_msg = bot.validate(input_data)
            if not is_valid:
                return {"success": False, "error": f"Validation failed: {error_msg}"}
            
            # Execute bot
            result = await bot.execute(input_data)
            result["bot_name"] = bot_name
            result["executed_at"] = datetime.now().isoformat()
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "bot_name": bot_name,
                "executed_at": datetime.now().isoformat()
            }

# Global registry instance
bot_registry = BotRegistry()
