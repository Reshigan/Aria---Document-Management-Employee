"""
ARIA - Bot Orchestrator
Intelligent routing and multi-bot workflow coordination
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import asyncio
from bots_advanced import ADVANCED_BOTS as BOT_REGISTRY


class BotOrchestrator:
    """
    Orchestrates bot execution, manages multi-bot workflows,
    and coordinates bot interactions with ERP systems
    """
    
    def __init__(self, erp_integration=None):
        self.bot_registry = BOT_REGISTRY
        self.erp_integration = erp_integration
        self.execution_history = []
    
    async def execute_bot(
        self, 
        bot_id: str, 
        parameters: Dict[str, Any],
        user_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a single bot with given parameters
        
        Args:
            bot_id: Bot identifier
            parameters: Bot execution parameters
            user_id: User requesting the execution
            context: Additional context (conversation, workflow, etc.)
            
        Returns:
            Bot execution result
        """
        # Check if bot exists
        if bot_id not in self.bot_registry:
            return {
                "status": "error",
                "error": f"Bot '{bot_id}' not found",
                "available_bots": list(self.bot_registry.keys())
            }
        
        bot_class = self.bot_registry[bot_id]
        
        try:
            # Enrich parameters with ERP data if needed
            if self.erp_integration and context and context.get("fetch_erp_data"):
                parameters = await self._enrich_with_erp_data(bot_id, parameters, context)
            
            # Execute the bot
            execution_start = datetime.now()
            result = bot_class.execute(parameters)
            execution_time = (datetime.now() - execution_start).total_seconds()
            
            # Record execution
            execution_record = {
                "bot_id": bot_id,
                "bot_name": bot_class.name,
                "user_id": user_id,
                "parameters": parameters,
                "result": result,
                "execution_time": execution_time,
                "timestamp": execution_start.isoformat(),
                "context": context
            }
            
            self.execution_history.append(execution_record)
            
            # Store result in ERP if configured
            if self.erp_integration and context and context.get("store_in_erp"):
                await self._store_result_in_erp(bot_id, result, context)
            
            return {
                "status": "success",
                "bot": bot_id,
                "bot_name": bot_class.name,
                "result": result,
                "execution_time": execution_time,
                "timestamp": execution_start.isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "bot": bot_id,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def execute_workflow(
        self,
        workflow: List[Dict[str, Any]],
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute a multi-bot workflow
        
        Args:
            workflow: List of bot execution steps
                [
                    {"bot": "bot_id", "params": {...}, "depends_on": []},
                    ...
                ]
            user_id: User requesting the workflow
            
        Returns:
            Workflow execution results
        """
        results = {}
        errors = []
        
        for step_idx, step in enumerate(workflow):
            bot_id = step.get("bot")
            params = step.get("params", {})
            depends_on = step.get("depends_on", [])
            
            # Check dependencies
            if depends_on:
                for dep in depends_on:
                    if dep not in results:
                        errors.append({
                            "step": step_idx,
                            "error": f"Dependency '{dep}' not satisfied"
                        })
                        continue
                    
                    # Merge results from dependencies
                    if "use_result" in step:
                        dep_result = results[dep].get("result", {})
                        params.update(dep_result)
            
            # Execute bot
            context = {
                "workflow_step": step_idx,
                "fetch_erp_data": step.get("fetch_erp_data", False),
                "store_in_erp": step.get("store_in_erp", False)
            }
            
            result = await self.execute_bot(
                bot_id=bot_id,
                parameters=params,
                user_id=user_id,
                context=context
            )
            
            step_name = step.get("name", f"step_{step_idx}")
            results[step_name] = result
            
            if result.get("status") == "error":
                errors.append({
                    "step": step_idx,
                    "step_name": step_name,
                    "error": result.get("error")
                })
        
        return {
            "status": "completed" if not errors else "completed_with_errors",
            "steps_executed": len(workflow),
            "results": results,
            "errors": errors,
            "timestamp": datetime.now().isoformat()
        }
    
    async def intelligent_route(
        self,
        intent: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Intelligently route request based on intent
        
        Args:
            intent: Intent recognition result from NLP engine
            user_id: User making the request
            
        Returns:
            Routing decision and execution result
        """
        bot_id = intent.get("bot")
        action = intent.get("action")
        extracted_params = intent.get("extracted_params", {})
        missing_params = intent.get("missing_params", [])
        
        # Check if all required parameters are present
        if missing_params:
            return {
                "status": "needs_clarification",
                "intent": intent.get("intent"),
                "bot": bot_id,
                "missing_params": missing_params,
                "message": f"I need more information to proceed. {', '.join(missing_params)}",
                "clarification_needed": True
            }
        
        # Route to ERP action if specified
        if action and action.startswith("create_"):
            return await self._route_to_erp_action(action, extracted_params, user_id)
        
        # Standard bot execution
        context = {
            "intent": intent.get("intent"),
            "confidence": intent.get("confidence"),
            "fetch_erp_data": True  # Auto-fetch ERP data when needed
        }
        
        return await self.execute_bot(
            bot_id=bot_id,
            parameters=extracted_params,
            user_id=user_id,
            context=context
        )
    
    async def suggest_workflow(
        self,
        intent: Dict[str, Any]
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Suggest a multi-bot workflow based on intent
        
        Args:
            intent: Intent recognition result
            
        Returns:
            Suggested workflow or None
        """
        intent_type = intent.get("intent")
        
        # Define common workflows
        workflows = {
            "production_planning": [
                {
                    "name": "check_inventory",
                    "bot": "inventory_optimizer",
                    "params": {"product": intent.get("extracted_params", {}).get("product")},
                    "fetch_erp_data": True
                },
                {
                    "name": "plan_materials",
                    "bot": "mrp_bot",
                    "params": {},
                    "depends_on": ["check_inventory"],
                    "fetch_erp_data": True,
                    "use_result": True
                },
                {
                    "name": "schedule_production",
                    "bot": "production_scheduler",
                    "params": {},
                    "depends_on": ["plan_materials"],
                    "store_in_erp": True,
                    "use_result": True
                }
            ],
            
            "quality_prediction": [
                {
                    "name": "predict_defects",
                    "bot": "quality_predictor",
                    "params": intent.get("extracted_params", {}),
                    "fetch_erp_data": True
                },
                {
                    "name": "schedule_inspection",
                    "bot": "erp_quality",
                    "params": {},
                    "depends_on": ["predict_defects"],
                    "store_in_erp": True
                }
            ],
            
            "patient_care": [
                {
                    "name": "schedule_appointment",
                    "bot": "patient_scheduling",
                    "params": intent.get("extracted_params", {})
                },
                {
                    "name": "retrieve_records",
                    "bot": "medical_records",
                    "params": {},
                    "depends_on": ["schedule_appointment"],
                    "use_result": True
                },
                {
                    "name": "check_prescriptions",
                    "bot": "prescription_management",
                    "params": {},
                    "depends_on": ["retrieve_records"]
                }
            ]
        }
        
        return workflows.get(intent_type)
    
    async def _enrich_with_erp_data(
        self,
        bot_id: str,
        parameters: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Enrich bot parameters with ERP data"""
        if not self.erp_integration:
            return parameters
        
        # Manufacturing bots might need BOMs
        if bot_id == "mrp_bot" and "bom" not in parameters:
            product = parameters.get("product") or parameters.get("product_name")
            if product:
                bom = await self.erp_integration.get_bom_by_product(product)
                if bom:
                    parameters["bom"] = bom
        
        # Quality bots might need work order data
        if bot_id == "quality_predictor":
            product = parameters.get("product")
            if product:
                work_orders = await self.erp_integration.get_work_orders_by_product(product)
                if work_orders:
                    parameters["work_orders"] = work_orders
        
        return parameters
    
    async def _store_result_in_erp(
        self,
        bot_id: str,
        result: Dict[str, Any],
        context: Dict[str, Any]
    ):
        """Store bot execution results in ERP system"""
        if not self.erp_integration:
            return
        
        # Store production schedules as work orders
        if bot_id == "production_scheduler" and result.get("status") == "success":
            schedule = result.get("schedule", {})
            await self.erp_integration.create_work_order_from_schedule(schedule)
        
        # Store quality predictions as inspections
        if bot_id == "quality_predictor" and result.get("status") == "success":
            prediction = result.get("prediction", {})
            if prediction.get("risk_level") == "high":
                await self.erp_integration.create_quality_inspection(prediction)
    
    async def _route_to_erp_action(
        self,
        action: str,
        parameters: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Route to ERP action (create BOM, work order, etc.)"""
        if not self.erp_integration:
            return {
                "status": "error",
                "error": "ERP integration not available"
            }
        
        try:
            if action == "create_bom":
                result = await self.erp_integration.create_bom(parameters)
            elif action == "create_work_order":
                result = await self.erp_integration.create_work_order(parameters)
            elif action == "create_inspection":
                result = await self.erp_integration.create_quality_inspection(parameters)
            else:
                return {
                    "status": "error",
                    "error": f"Unknown ERP action: {action}"
                }
            
            return {
                "status": "success",
                "action": action,
                "result": result,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "action": action,
                "error": str(e)
            }
    
    def get_execution_history(
        self,
        user_id: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get execution history"""
        history = self.execution_history
        
        if user_id:
            history = [h for h in history if h.get("user_id") == user_id]
        
        return history[-limit:]
    
    def get_bot_statistics(self) -> Dict[str, Any]:
        """Get bot usage statistics"""
        if not self.execution_history:
            return {
                "total_executions": 0,
                "bots": {}
            }
        
        stats = {
            "total_executions": len(self.execution_history),
            "bots": {},
            "average_execution_time": 0,
            "success_rate": 0
        }
        
        total_time = 0
        successful = 0
        
        for record in self.execution_history:
            bot_id = record["bot_id"]
            if bot_id not in stats["bots"]:
                stats["bots"][bot_id] = {
                    "executions": 0,
                    "successes": 0,
                    "failures": 0,
                    "avg_time": 0
                }
            
            stats["bots"][bot_id]["executions"] += 1
            
            if record.get("result", {}).get("status") == "success":
                stats["bots"][bot_id]["successes"] += 1
                successful += 1
            else:
                stats["bots"][bot_id]["failures"] += 1
            
            exec_time = record.get("execution_time", 0)
            total_time += exec_time
            
            # Calculate average time for this bot
            bot_execs = stats["bots"][bot_id]["executions"]
            stats["bots"][bot_id]["avg_time"] = (
                (stats["bots"][bot_id].get("avg_time", 0) * (bot_execs - 1) + exec_time) / bot_execs
            )
        
        if len(self.execution_history) > 0:
            stats["average_execution_time"] = total_time / len(self.execution_history)
            stats["success_rate"] = (successful / len(self.execution_history)) * 100
        
        return stats


# Singleton instance
_bot_orchestrator = None


def get_bot_orchestrator(erp_integration=None) -> BotOrchestrator:
    """Get singleton BotOrchestrator instance"""
    global _bot_orchestrator
    if _bot_orchestrator is None:
        _bot_orchestrator = BotOrchestrator(erp_integration)
    return _bot_orchestrator
