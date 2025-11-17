"""
Ask Aria Orchestrator
Coordinates conversation flow, LLM calls, and tool execution
"""
import json
from typing import Dict, List, Any, Optional
import logging
from .ollama_client import ollama_client
from .conversation_manager import ConversationManager
from .tools import ERPTools, TOOL_DEFINITIONS

logger = logging.getLogger(__name__)


class AskAriaOrchestrator:
    """Orchestrates Ask Aria conversational AI"""
    
    def __init__(self, db_connection_string: str):
        self.conversation_manager = ConversationManager(db_connection_string)
        self.erp_tools = ERPTools(db_connection_string)
        self.system_prompt = """You are Aria, an intelligent ERP assistant. You help users create and manage business documents like quotes, purchase orders, invoices, and more.

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

Always confirm with the user before finalizing any document."""
    
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
            
            messages = self._build_message_history(conversation_id)
            
            max_iterations = 10
            iteration = 0
            
            while iteration < max_iterations:
                iteration += 1
                
                response = ollama_client.chat(
                    messages=messages,
                    tools=None,
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
                        
                        self.conversation_manager.add_message(
                            conversation_id,
                            role="tool",
                            content=json.dumps(tool_result),
                            tool_name=tool_name,
                            tool_args=tool_args,
                            tool_result=tool_result
                        )
                        
                        messages.append({
                            "role": "tool",
                            "content": json.dumps(tool_result)
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
        """Build message history for LLM context"""
        messages = [{"role": "system", "content": self.system_prompt}]
        
        db_messages = self.conversation_manager.get_messages(conversation_id)
        
        for msg in db_messages:
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
    
    def _execute_tool(self, tool_name: str, tool_args: Dict[str, Any]) -> Any:
        """Execute a tool by name"""
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
        else:
            raise ValueError(f"Unknown tool: {tool_name}")
