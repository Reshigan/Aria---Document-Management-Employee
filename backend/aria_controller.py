"""
ARIA - AI Controller
The intelligent brain that orchestrates all bots and ERP interactions
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from nlp_engine import get_intent_recognizer, get_conversation_manager
from bot_orchestrator import get_bot_orchestrator
from erp_integration import ERPIntegration


class AriaController:
    """
    Main AI Controller for the ARIA system
    
    Aria acts as the intelligent interface between users and the bot/ERP ecosystem.
    She understands natural language, routes to appropriate bots, orchestrates
    multi-bot workflows, and integrates with ERP systems seamlessly.
    """
    
    def __init__(self, erp_integration: Optional[ERPIntegration] = None):
        self.nlp_engine = get_intent_recognizer()
        self.conversation_manager = get_conversation_manager()
        self.bot_orchestrator = get_bot_orchestrator(erp_integration)
        self.erp_integration = erp_integration
        
    async def process_request(
        self,
        message: str,
        user_id: str,
        conversation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a natural language request from user
        
        This is the main entry point for interacting with Aria.
        
        Args:
            message: Natural language message from user
            user_id: User identifier
            conversation_id: Optional conversation ID for multi-turn dialogues
            context: Optional context information
            
        Returns:
            Response with results, clarifications, or suggestions
        """
        # Step 1: Recognize intent from natural language
        intent_result = self.nlp_engine.recognize_intent(message)
        
        # Step 2: Handle unknown intents
        if intent_result.get("intent") == "unknown":
            return {
                "status": "unknown_intent",
                "message": intent_result.get("message"),
                "suggestions": intent_result.get("suggestions"),
                "aria_says": "I'm not sure I understood that. Here are some things I can help you with:",
                "timestamp": datetime.now().isoformat()
            }
        
        # Step 3: Check if we need clarification
        if intent_result.get("missing_params"):
            clarification = self.nlp_engine.get_clarification_question(intent_result)
            
            # Start or continue conversation
            if not conversation_id:
                conversation_id = self.conversation_manager.start_conversation(
                    user_id=user_id,
                    intent_result=intent_result
                )
            
            self.conversation_manager.add_message(
                conversation_id=conversation_id,
                role="user",
                message=message
            )
            
            self.conversation_manager.add_message(
                conversation_id=conversation_id,
                role="aria",
                message=clarification
            )
            
            return {
                "status": "needs_clarification",
                "intent": intent_result.get("intent"),
                "bot": intent_result.get("bot_name"),
                "missing_params": intent_result.get("missing_params"),
                "clarification": clarification,
                "conversation_id": conversation_id,
                "aria_says": clarification,
                "timestamp": datetime.now().isoformat()
            }
        
        # Step 4: Check if we should suggest a workflow
        workflow = await self.bot_orchestrator.suggest_workflow(intent_result)
        
        if workflow and context and context.get("auto_execute_workflows"):
            # Execute multi-bot workflow
            result = await self.bot_orchestrator.execute_workflow(
                workflow=workflow,
                user_id=user_id
            )
            
            response = self._format_workflow_response(result, intent_result)
            
            if conversation_id:
                self.conversation_manager.add_message(
                    conversation_id=conversation_id,
                    role="aria",
                    message=response.get("aria_says")
                )
            
            return response
        
        # Step 5: Execute single bot
        execution_result = await self.bot_orchestrator.intelligent_route(
            intent=intent_result,
            user_id=user_id
        )
        
        # Step 6: Format response for user
        response = self._format_bot_response(execution_result, intent_result)
        
        # Step 7: Update conversation
        if conversation_id:
            self.conversation_manager.add_message(
                conversation_id=conversation_id,
                role="user",
                message=message
            )
            self.conversation_manager.add_message(
                conversation_id=conversation_id,
                role="aria",
                message=response.get("aria_says")
            )
            self.conversation_manager.end_conversation(conversation_id)
        
        return response
    
    def _format_bot_response(
        self,
        execution_result: Dict[str, Any],
        intent_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Format bot execution result into user-friendly response"""
        
        if execution_result.get("status") == "needs_clarification":
            return {
                "status": "needs_clarification",
                "intent": intent_result.get("intent"),
                "bot": intent_result.get("bot_name"),
                "missing_params": execution_result.get("missing_params"),
                "aria_says": execution_result.get("message"),
                "timestamp": datetime.now().isoformat()
            }
        
        if execution_result.get("status") == "error":
            return {
                "status": "error",
                "error": execution_result.get("error"),
                "aria_says": f"I encountered an error: {execution_result.get('error')}. Let me try to help you in another way.",
                "timestamp": datetime.now().isoformat()
            }
        
        # Success response
        bot_result = execution_result.get("result", {})
        
        aria_message = self._generate_aria_response(
            intent=intent_result.get("intent"),
            bot_name=intent_result.get("bot_name"),
            result=bot_result
        )
        
        return {
            "status": "success",
            "intent": intent_result.get("intent"),
            "bot": intent_result.get("bot"),
            "bot_name": intent_result.get("bot_name"),
            "confidence": intent_result.get("confidence"),
            "result": bot_result,
            "execution_time": execution_result.get("execution_time"),
            "aria_says": aria_message,
            "timestamp": datetime.now().isoformat()
        }
    
    def _format_workflow_response(
        self,
        workflow_result: Dict[str, Any],
        intent_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Format multi-bot workflow result"""
        
        aria_message = f"I've completed a multi-step workflow for {intent_result.get('intent').replace('_', ' ')}:\n\n"
        
        for step_name, step_result in workflow_result.get("results", {}).items():
            if step_result.get("status") == "success":
                aria_message += f"✅ {step_name.replace('_', ' ').title()}: Complete\n"
            else:
                aria_message += f"❌ {step_name.replace('_', ' ').title()}: {step_result.get('error', 'Failed')}\n"
        
        if workflow_result.get("errors"):
            aria_message += f"\n⚠️ {len(workflow_result['errors'])} steps had issues."
        else:
            aria_message += "\n✨ All steps completed successfully!"
        
        return {
            "status": workflow_result.get("status"),
            "intent": intent_result.get("intent"),
            "workflow": True,
            "steps_executed": workflow_result.get("steps_executed"),
            "results": workflow_result.get("results"),
            "errors": workflow_result.get("errors"),
            "aria_says": aria_message,
            "timestamp": datetime.now().isoformat()
        }
    
    def _generate_aria_response(
        self,
        intent: str,
        bot_name: str,
        result: Dict[str, Any]
    ) -> str:
        """Generate natural language response from Aria"""
        
        # Production planning responses
        if intent == "production_planning":
            if "materials" in result:
                return (
                    f"I've created a production plan using the {bot_name}! "
                    f"Production order {result.get('production_order')} is ready. "
                    f"Timeline: {result.get('timeline', 'N/A')}. "
                    f"Total cost: ${result.get('total_cost', 0):.2f}."
                )
        
        # Quality prediction responses
        if intent == "quality_prediction":
            if "prediction" in result:
                prediction = result.get("prediction", {})
                risk = prediction.get("risk_level", "unknown")
                emoji = "🟢" if risk == "low" else "🟡" if risk == "medium" else "🔴"
                return (
                    f"{emoji} Quality prediction complete! "
                    f"Risk level: {risk.upper()}. "
                    f"Predicted defect rate: {prediction.get('predicted_defect_rate', 'N/A')}. "
                    f"Recommendation: {prediction.get('recommendation', 'Monitor production')}"
                )
        
        # Inventory management responses
        if intent == "inventory_management":
            if "reorder_recommendations" in result:
                reorders = result.get("reorder_recommendations", [])
                if reorders:
                    return (
                        f"📦 Inventory analysis complete! "
                        f"I found {len(reorders)} items that need reordering. "
                        f"Total investment needed: ${result.get('total_cost', 0):.2f}. "
                        f"Would you like me to create purchase orders?"
                    )
                else:
                    return "✅ All inventory levels are healthy! No immediate reorders needed."
        
        # Demand forecasting responses
        if intent == "demand_forecasting":
            if "forecast" in result:
                forecast = result.get("forecast", {})
                return (
                    f"📈 Demand forecast ready! "
                    f"Predicted demand: {forecast.get('predicted_demand', 'N/A')} units. "
                    f"Trend: {forecast.get('trend', 'stable').upper()}. "
                    f"Confidence: {forecast.get('confidence', 'N/A')}"
                )
        
        # Generic success response
        return (
            f"✅ Task completed successfully using {bot_name}! "
            f"Status: {result.get('status', 'completed')}"
        )
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Get ARIA system status and statistics"""
        
        # Bot statistics
        bot_stats = self.bot_orchestrator.get_bot_statistics()
        
        # ERP statistics
        erp_stats = {}
        if self.erp_integration:
            erp_stats = {
                "production": await self.erp_integration.get_production_summary(),
                "quality": await self.erp_integration.get_quality_summary(),
                "bot_activity": await self.erp_integration.get_bot_erp_activity()
            }
        
        return {
            "status": "operational",
            "aria_version": "2.0.0",
            "capabilities": {
                "natural_language_processing": True,
                "bot_orchestration": True,
                "erp_integration": self.erp_integration is not None,
                "multi_bot_workflows": True,
                "conversational_ai": True
            },
            "bots": bot_stats,
            "erp": erp_stats,
            "timestamp": datetime.now().isoformat()
        }
    
    async def help(self, category: Optional[str] = None) -> Dict[str, Any]:
        """Get help information about what Aria can do"""
        
        capabilities = {
            "manufacturing": [
                "Plan production and material requirements",
                "Schedule production orders",
                "Predict quality issues and defects",
                "Forecast equipment maintenance needs",
                "Optimize inventory levels",
                "Create bills of materials (BOMs)",
                "Generate work orders"
            ],
            "healthcare": [
                "Schedule patient appointments",
                "Access and manage medical records",
                "Process insurance claims",
                "Analyze lab results",
                "Manage prescriptions and medications"
            ],
            "retail": [
                "Forecast product demand",
                "Optimize pricing strategies",
                "Segment customers by behavior",
                "Analyze store performance",
                "Manage loyalty programs and rewards"
            ],
            "general": [
                "Understand natural language requests",
                "Execute multi-bot workflows automatically",
                "Integrate with ERP systems",
                "Provide conversational responses",
                "Learn from interactions"
            ]
        }
        
        if category and category in capabilities:
            return {
                "category": category,
                "capabilities": capabilities[category],
                "aria_says": f"Here's what I can do for {category}:"
            }
        
        return {
            "categories": list(capabilities.keys()),
            "all_capabilities": capabilities,
            "aria_says": "I'm Aria, your intelligent AI assistant! I can help you with manufacturing, healthcare, retail operations, and more. Just tell me what you need in plain English!"
        }


# Singleton instance
_aria_controller = None


def get_aria_controller(erp_integration: Optional[ERPIntegration] = None) -> AriaController:
    """Get singleton AriaController instance"""
    global _aria_controller
    if _aria_controller is None:
        _aria_controller = AriaController(erp_integration)
    return _aria_controller
