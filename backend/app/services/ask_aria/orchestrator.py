"""
Ask Aria Orchestrator
Coordinates conversation flow, LLM calls, and tool execution
"""
import json
import re
from typing import Dict, List, Any, Optional, Tuple
import logging
from .ollama_client import ollama_client
from .conversation_manager import ConversationManager
from .tools import ERPTools, TOOL_DEFINITIONS

logger = logging.getLogger(__name__)


def detect_bot_intent(message: str) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """
    Detect if the user message is a bot-related command that should be handled directly.
    Returns (tool_name, tool_args) if a bot command is detected, otherwise (None, None).
    """
    message_lower = message.lower().strip()
    
    # List bots patterns
    if any(phrase in message_lower for phrase in [
        'list all available bots', 'list available bots', 'list bots', 'show bots',
        'what bots', 'which bots', 'available bots', 'all bots', 'show me bots',
        'list all bots', 'what automation', 'show automation'
    ]):
        # Check for category filter
        category = None
        for cat in ['financial', 'sales', 'purchasing', 'inventory', 'hr', 'manufacturing', 'compliance', 'analytics', 'documents', 'integration', 'service', 'workflow']:
            if cat in message_lower:
                category = cat
                break
        return ('list_available_bots', {'category': category})
    
    # Run reconciliation patterns
    if any(phrase in message_lower for phrase in [
        'run reconciliation', 'run invoice reconciliation', 'run sales reconciliation',
        'sales-to-invoice reconciliation', 'sales to invoice reconciliation',
        'reconcile sales', 'reconcile invoices', 'start reconciliation'
    ]):
        return ('run_sales_invoice_reconciliation', {})
    
    # Get reconciliation summary patterns
    if any(phrase in message_lower for phrase in [
        'reconciliation summary', 'reconciliation status', 'reconciliation results',
        'show reconciliation', 'get reconciliation'
    ]):
        return ('get_reconciliation_summary', {})
    
    # Execute specific bot patterns
    bot_execute_match = re.search(r'(?:run|execute|start|trigger)\s+(?:the\s+)?(\w+(?:\s+\w+)*)\s+bot', message_lower)
    if bot_execute_match:
        bot_name = bot_execute_match.group(1).replace(' ', '_')
        return ('execute_bot', {'bot_id': bot_name})
    
    # Get bot status patterns
    bot_status_match = re.search(r'(?:status|check)\s+(?:of\s+)?(?:the\s+)?(\w+(?:\s+\w+)*)\s+bot', message_lower)
    if bot_status_match:
        bot_name = bot_status_match.group(1).replace(' ', '_')
        return ('get_bot_status', {'bot_id': bot_name})
    
    return (None, None)


class AskAriaOrchestrator:
    """Orchestrates Ask Aria conversational AI"""
    
    def __init__(self, db_connection_string: str):
        self.conversation_manager = ConversationManager(db_connection_string)
        self.erp_tools = ERPTools(db_connection_string)
        self.system_prompt = """You are Aria, an intelligent ERP assistant. You help users create and manage business documents like quotes, purchase orders, invoices, and more. You also have access to 67+ automation bots that can automate various business processes.

When a user asks to create a document:
1. Ask for required information if not provided (customer, products, quantities, etc.)
2. Use the available tools to search for customers, products, suppliers
3. Create draft documents and show summaries for user confirmation
4. Only finalize documents after explicit user confirmation
5. Be conversational, helpful, and professional

Available tools:
- list_customers: Search for customers
- list_products: Search for products
- list_suppliers: Search for suppliers
- create_quote_draft: Create a new quote
- add_quote_line: Add products to a quote
- get_quote_summary: Show quote details
- finalize_quote: Finalize quote after confirmation
- create_purchase_order_draft: Create a new purchase order

Bot Controller Tools:
- list_available_bots: List all automation bots (can filter by category: financial, sales, purchasing, inventory, hr, manufacturing, documents, compliance, integration, analytics, service, workflow)
- execute_bot: Execute a specific automation bot
- get_bot_status: Get status and recent activity of a bot

Sales-to-Invoice Reconciliation Tools:
- run_sales_invoice_reconciliation: Run reconciliation to match sales orders with invoices
- get_reconciliation_summary: Get current reconciliation summary
- approve_reconciliation_exception: Approve a reconciliation variance
- post_reconciliation_variance: Post approved variance to general ledger

Always confirm with the user before finalizing any document or posting to the general ledger."""
    
    def process_message(
        self,
        conversation_id: str,
        user_message: str,
        company_id: str,
        user_id: str
    ) -> str:
        """
        Process a user message and return assistant response
        
        Args:
            conversation_id: UUID of the conversation
            user_message: User's message text
            company_id: Company ID for scoping
            user_id: User ID
            
        Returns:
            Assistant's response text
        """
        try:
            self.conversation_manager.add_message(
                conversation_id,
                role="user",
                content=user_message
            )
            
            # Check for bot-related commands that should be handled directly
            tool_name, tool_args = detect_bot_intent(user_message)
            if tool_name:
                logger.info(f"Detected bot intent: {tool_name} with args: {tool_args}")
                tool_args = tool_args or {}
                tool_args["company_id"] = company_id
                
                try:
                    tool_result = self._execute_tool(tool_name, tool_args)
                    response = self._format_bot_response(tool_name, tool_result)
                    
                    self.conversation_manager.add_message(
                        conversation_id,
                        role="assistant",
                        content=response
                    )
                    
                    return response
                except Exception as e:
                    logger.error(f"Bot tool execution failed: {str(e)}")
                    # Fall through to LLM if tool execution fails
            
            messages = self._build_message_history(conversation_id)
            
            max_iterations = 4  # Reduced from 10 to limit latency
            iteration = 0
            
            while iteration < max_iterations:
                iteration += 1
                
                response = ollama_client.chat(
                    messages=messages,
                    tools=TOOL_DEFINITIONS,
                    temperature=0.7
                )
                
                assistant_message = response.get("message", {})
                
                if not assistant_message.get("tool_calls"):
                    content = assistant_message.get("content", "")
                    
                    self.conversation_manager.add_message(
                        conversation_id,
                        role="assistant",
                        content=content
                    )
                    
                    return content
                
                for tool_call in assistant_message.get("tool_calls", []):
                    tool_name = tool_call.get("function", {}).get("name")
                    tool_args = tool_call.get("function", {}).get("arguments", {})
                    
                    if isinstance(tool_args, str):
                        tool_args = json.loads(tool_args)
                    
                    tool_args["company_id"] = company_id
                    
                    logger.info(f"Executing tool: {tool_name} with args: {tool_args}")
                    
                    try:
                        tool_result = self._execute_tool(tool_name, tool_args)
                        
                        # Truncate tool results to prevent huge prompts
                        tool_result_for_llm = self._summarize_tool_result(tool_result)
                        
                        self.conversation_manager.add_message(
                            conversation_id,
                            role="tool",
                            content=json.dumps(tool_result_for_llm),
                            tool_name=tool_name,
                            tool_args=tool_args,
                            tool_result=tool_result_for_llm
                        )
                        
                        messages.append({
                            "role": "tool",
                            "content": json.dumps(tool_result_for_llm)
                        })
                        
                    except Exception as e:
                        error_msg = f"Tool execution failed: {str(e)}"
                        logger.error(error_msg)
                        
                        messages.append({
                            "role": "tool",
                            "content": json.dumps({"error": str(e)})
                        })
            
            return "I apologize, but I'm having trouble processing your request. Could you please try rephrasing?"
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            return f"I encountered an error: {str(e)}. Please try again."
    
    def _build_message_history(self, conversation_id: str) -> List[Dict[str, str]]:
        """Build message history for LLM context (truncated to last 6 turns to reduce prompt size)"""
        messages = [{"role": "system", "content": self.system_prompt}]
        
        db_messages = self.conversation_manager.get_messages(conversation_id)
        
        # Reduced from 16 to 6 messages to prevent prompt truncation and timeouts
        recent_messages = db_messages[-6:] if len(db_messages) > 6 else db_messages
        
        for msg in recent_messages:
            if msg['role'] in ['user', 'assistant']:
                messages.append({
                    "role": msg['role'],
                    "content": msg['content'] or ""
                })
            elif msg['role'] == 'tool' and msg['tool_result']:
                messages.append({
                    "role": "tool",
                    "content": json.dumps(msg['tool_result'])
                })
        
        return messages
    
    def _summarize_tool_result(self, tool_result: Any) -> Any:
        """
        Truncate tool results to prevent huge prompts that cause Ollama timeouts.
        Keep only first 8 items from lists to reduce token count.
        """
        if isinstance(tool_result, list):
            if len(tool_result) > 8:
                logger.info(f"Truncating tool result list from {len(tool_result)} to 8 items")
                return tool_result[:8]
            return tool_result
        
        if isinstance(tool_result, dict):
            # If dict has a 'data' key with a list, truncate that list
            if "data" in tool_result and isinstance(tool_result["data"], list):
                if len(tool_result["data"]) > 8:
                    logger.info(f"Truncating tool result data list from {len(tool_result['data'])} to 8 items")
                    result_copy = dict(tool_result)
                    result_copy["data"] = tool_result["data"][:8]
                    result_copy["truncated"] = True
                    result_copy["total_count"] = len(tool_result["data"])
                    return result_copy
            return tool_result
        
        return tool_result
    
    def _format_bot_response(self, tool_name: str, tool_result: Any) -> str:
        """Format bot tool results as a human-readable response"""
        
        if tool_name == "list_available_bots":
            bots = tool_result if isinstance(tool_result, list) else []
            if not bots:
                return "No bots found matching your criteria."
            
            # Group bots by category
            categories = {}
            for bot in bots:
                cat = bot.get("category", "other")
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(bot)
            
            response = f"**Found {len(bots)} automation bots:**\n\n"
            
            category_names = {
                "financial": "Financial",
                "sales": "Sales & CRM",
                "purchasing": "Purchasing & Procurement",
                "inventory": "Inventory & Warehouse",
                "hr": "HR & Payroll",
                "manufacturing": "Manufacturing",
                "documents": "Document Management",
                "compliance": "Compliance & Audit",
                "integration": "Integration",
                "analytics": "Analytics",
                "service": "Service & Support",
                "workflow": "Workflow & Automation"
            }
            
            for cat, cat_bots in categories.items():
                cat_name = category_names.get(cat, cat.title())
                response += f"**{cat_name} ({len(cat_bots)} bots):**\n"
                for bot in cat_bots[:5]:  # Show first 5 per category
                    response += f"- {bot['name']}: {bot['description']}\n"
                if len(cat_bots) > 5:
                    response += f"  ...and {len(cat_bots) - 5} more\n"
                response += "\n"
            
            response += "Click the **Bots** button to see all categories and quick prompts!"
            return response
        
        elif tool_name == "run_sales_invoice_reconciliation":
            result = tool_result if isinstance(tool_result, dict) else {}
            status = result.get("status", "unknown")
            
            if status == "success":
                data = result.get("result", {})
                return f"""**Sales-to-Invoice Reconciliation Complete!**

**Summary:**
- Total Sales Orders: {data.get('total_sales_orders', 0)}
- Matched Invoices: {data.get('matched_invoices', 0)}
- Exceptions Found: {data.get('exceptions_found', 0)}
- Match Rate: {data.get('match_rate', 0):.1f}%

**Exceptions by Type:**
- Quantity Variances: {data.get('quantity_variances', 0)}
- Price Variances: {data.get('price_variances', 0)}
- Missing Invoices: {data.get('missing_invoices', 0)}

Navigate to **Financial > Sales Reconciliation** to view and resolve exceptions."""
            else:
                return f"Reconciliation encountered an issue: {result.get('error', 'Unknown error')}"
        
        elif tool_name == "get_reconciliation_summary":
            result = tool_result if isinstance(tool_result, dict) else {}
            return f"""**Reconciliation Summary:**

- Total Sales Orders: {result.get('total_sales_orders', 0)}
- Matched Invoices: {result.get('matched_invoices', 0)}
- Pending Exceptions: {result.get('pending_exceptions', 0)}
- Match Rate: {result.get('match_rate', 0):.1f}%

Navigate to **Financial > Sales Reconciliation** to view details."""
        
        elif tool_name == "execute_bot":
            result = tool_result if isinstance(tool_result, dict) else {}
            status = result.get("status", "unknown")
            bot_name = result.get("bot_name", result.get("bot_id", "Bot"))
            
            if status == "success":
                exec_result = result.get("result", {})
                return f"""**{bot_name} Executed Successfully!**

**Results:**
- Processed Items: {exec_result.get('processed_items', 0)}
- Successful: {exec_result.get('success_count', 0)}
- Errors: {exec_result.get('error_count', 0)}
- Execution Time: {exec_result.get('execution_time_seconds', 0):.1f}s"""
            else:
                return f"Bot execution failed: {result.get('error', 'Unknown error')}"
        
        elif tool_name == "get_bot_status":
            result = tool_result if isinstance(tool_result, dict) else {}
            return f"""**Bot Status: {result.get('bot_id', 'Unknown')}**

- Status: {result.get('status', 'unknown').title()}
- Last Execution: {result.get('last_execution', 'Never')}
- Success Rate: {result.get('success_rate', 0):.1f}%
- Executions Today: {result.get('total_executions_today', 0)}"""
        
        # Default: return JSON representation
        return f"Tool result: {json.dumps(tool_result, indent=2, default=str)}"
    
    def _execute_tool(self, tool_name: str, tool_args: Dict[str, Any]) -> Any:
        """Execute a tool by name"""
        # ERP Document Tools
        if tool_name == "list_customers":
            return self.erp_tools.list_customers(**tool_args)
        elif tool_name == "list_products":
            return self.erp_tools.list_products(**tool_args)
        elif tool_name == "create_quote_draft":
            return self.erp_tools.create_quote_draft(**tool_args)
        elif tool_name == "add_quote_line":
            return self.erp_tools.add_quote_line(**tool_args)
        elif tool_name == "get_quote_summary":
            return self.erp_tools.get_quote_summary(**tool_args)
        elif tool_name == "finalize_quote":
            return self.erp_tools.finalize_quote(**tool_args)
        elif tool_name == "list_suppliers":
            return self.erp_tools.list_suppliers(**tool_args)
        elif tool_name == "create_purchase_order_draft":
            return self.erp_tools.create_purchase_order_draft(**tool_args)
        
        # Workflow Tools
        elif tool_name == "start_quote_to_cash_workflow":
            return self.erp_tools.start_quote_to_cash_workflow(**tool_args)
        elif tool_name == "get_workflow_status":
            return self.erp_tools.get_workflow_status(**tool_args)
        elif tool_name == "approve_workflow_step":
            return self.erp_tools.approve_workflow_step(**tool_args)
        elif tool_name == "reject_workflow_step":
            return self.erp_tools.reject_workflow_step(**tool_args)
        
        # Bot Controller Tools
        elif tool_name == "list_available_bots":
            return self.erp_tools.list_available_bots(**tool_args)
        elif tool_name == "execute_bot":
            return self.erp_tools.execute_bot(**tool_args)
        elif tool_name == "get_bot_status":
            return self.erp_tools.get_bot_status(**tool_args)
        
        # Sales-to-Invoice Reconciliation Tools
        elif tool_name == "run_sales_invoice_reconciliation":
            return self.erp_tools.run_sales_invoice_reconciliation(**tool_args)
        elif tool_name == "get_reconciliation_summary":
            return self.erp_tools.get_reconciliation_summary(**tool_args)
        elif tool_name == "approve_reconciliation_exception":
            return self.erp_tools.approve_reconciliation_exception(**tool_args)
        elif tool_name == "post_reconciliation_variance":
            return self.erp_tools.post_reconciliation_variance(**tool_args)
        
        else:
            raise ValueError(f"Unknown tool: {tool_name}")
