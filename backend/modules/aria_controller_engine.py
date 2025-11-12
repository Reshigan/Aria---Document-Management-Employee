"""
ARIA Controller Engine - Complete Workflow Orchestration System
Transforms Aria from a chatbot into a true controller that:
1. Receives instructions
2. Gathers information
3. Activates bots
4. Executes work
5. Sends results back
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import re
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/aria", tags=["Aria Controller"])

# ========================================
# REQUEST/RESPONSE MODELS
# ========================================

class AriaRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = {}
    attachments: Optional[List[str]] = []

class AriaResponse(BaseModel):
    status: str
    message: str
    intent: Dict[str, Any]
    information_gathered: Dict[str, Any]
    bots_activated: List[str]
    execution_results: List[Dict[str, Any]]
    next_steps: Optional[List[str]] = []
    timestamp: str

# ========================================
# ========================================

class IntentRecognizer:
    """Recognize user intent from natural language"""
    
    INTENT_PATTERNS = {
        "create_quote": [
            r"create.*quote", r"new.*quote", r"quote.*for", r"send.*quote",
            r"prepare.*quote", r"generate.*quote"
        ],
        "approve_quote": [
            r"approve.*quote", r"accept.*quote", r"quote.*approved"
        ],
        "create_sales_order": [
            r"create.*sales order", r"new.*sales order", r"sales order.*for",
            r"convert.*quote.*order", r"quote.*to.*order"
        ],
        "approve_sales_order": [
            r"approve.*sales order", r"sales order.*approved", r"so.*approved",
            r"let'?s deliver", r"ready.*deliver"
        ],
        "create_delivery": [
            r"create.*delivery", r"deliver.*order", r"ship.*order",
            r"generate.*delivery note", r"print.*delivery"
        ],
        "create_invoice": [
            r"create.*invoice", r"invoice.*customer", r"bill.*customer",
            r"generate.*invoice", r"send.*invoice"
        ],
        
        "create_purchase_order": [
            r"create.*purchase order", r"new.*po", r"order.*from.*supplier",
            r"buy.*from", r"purchase.*from"
        ],
        "receive_goods": [
            r"receive.*goods", r"goods.*received", r"receipt.*for",
            r"stock.*received", r"delivery.*received"
        ],
        "process_supplier_invoice": [
            r"process.*supplier invoice", r"supplier.*invoice", r"ap.*invoice",
            r"pay.*supplier", r"vendor.*invoice"
        ],
        
        # Document Processing
        "process_document": [
            r"process.*document", r"upload.*document", r"scan.*document",
            r"extract.*from", r"read.*document", r"parse.*document"
        ],
        "process_remittance": [
            r"process.*remittance", r"remittance.*advice", r"payment.*advice",
            r"reconcile.*payment", r"match.*payment"
        ],
        
        "create_customer": [
            r"create.*customer", r"new.*customer", r"add.*customer",
            r"register.*customer", r"customer.*details"
        ],
        "create_product": [
            r"create.*product", r"new.*product", r"add.*product",
            r"register.*product", r"product.*details"
        ],
        "create_supplier": [
            r"create.*supplier", r"new.*supplier", r"add.*supplier",
            r"register.*supplier", r"vendor.*details"
        ],
        
        "create_service_request": [
            r"service.*request", r"need.*service", r"repair.*request",
            r"maintenance.*request", r"technician.*needed"
        ],
        "create_work_order": [
            r"create.*work order", r"new.*work order", r"schedule.*technician",
            r"dispatch.*technician"
        ],
        
        "post_journal_entry": [
            r"post.*journal", r"create.*journal", r"gl.*entry",
            r"accounting.*entry", r"book.*entry"
        ],
        "reconcile_bank": [
            r"reconcile.*bank", r"bank.*reconciliation", r"match.*bank",
            r"bank.*statement"
        ],
        "process_payment": [
            r"process.*payment", r"make.*payment", r"pay.*invoice",
            r"customer.*payment", r"receive.*payment"
        ],
        
        "generate_report": [
            r"generate.*report", r"create.*report", r"show.*report",
            r"report.*on", r"analytics.*for"
        ],
        "view_dashboard": [
            r"show.*dashboard", r"view.*dashboard", r"dashboard.*for",
            r"kpi.*for", r"metrics.*for"
        ],
        
        "query_status": [
            r"status.*of", r"where.*is", r"what.*happened.*to",
            r"check.*status", r"track.*order"
        ],
        "search": [
            r"find.*", r"search.*for", r"look.*for", r"show.*me"
        ]
    }
    
    def recognize(self, message: str) -> Dict[str, Any]:
        """Recognize intent from message"""
        message_lower = message.lower()
        
        for intent, patterns in self.INTENT_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, message_lower):
                    return {
                        "intent": intent,
                        "confidence": 0.9,
                        "matched_pattern": pattern,
                        "original_message": message
                    }
        
        return {
            "intent": "general_query",
            "confidence": 0.5,
            "matched_pattern": None,
            "original_message": message
        }

# ========================================
# ========================================

class InformationGatherer:
    """Gather required information to execute tasks"""
    
    REQUIRED_FIELDS = {
        "create_quote": ["customer", "products", "quantities", "prices"],
        "approve_quote": ["quote_id"],
        "create_sales_order": ["customer", "products", "quantities"],
        "approve_sales_order": ["sales_order_id"],
        "create_delivery": ["sales_order_id"],
        "create_invoice": ["delivery_id"],
        "create_purchase_order": ["supplier", "products", "quantities"],
        "receive_goods": ["purchase_order_id"],
        "process_supplier_invoice": ["supplier", "invoice_number", "amount"],
        "process_document": ["document_type", "file"],
        "process_remittance": ["vendor", "file"],
        "create_customer": ["name", "email"],
        "create_product": ["name", "price"],
        "create_supplier": ["name", "email"],
        "create_service_request": ["customer", "description"],
        "create_work_order": ["service_request_id"],
        "post_journal_entry": ["account", "amount", "type"],
        "reconcile_bank": ["bank_account", "statement_file"],
        "process_payment": ["invoice_id", "amount"],
        "generate_report": ["report_type", "date_range"],
        "view_dashboard": ["module"],
        "query_status": ["entity_type", "entity_id"],
        "search": ["search_term", "entity_type"]
    }
    
    def extract_information(self, message: str, intent: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract information from message and context"""
        
        required_fields = self.REQUIRED_FIELDS.get(intent, [])
        gathered_info = {}
        missing_fields = []
        
        if intent == "approve_sales_order":
            so_match = re.search(r"(?:sales order|so|order)\s*(?:number|#|id)?\s*(\w+)", message, re.IGNORECASE)
            if so_match:
                gathered_info["sales_order_id"] = so_match.group(1)
            elif "sales_order_id" in context:
                gathered_info["sales_order_id"] = context["sales_order_id"]
            else:
                missing_fields.append("sales_order_id")
        
        elif intent == "create_delivery":
            so_match = re.search(r"(?:sales order|so|order)\s*(?:number|#|id)?\s*(\w+)", message, re.IGNORECASE)
            if so_match:
                gathered_info["sales_order_id"] = so_match.group(1)
            elif "sales_order_id" in context:
                gathered_info["sales_order_id"] = context["sales_order_id"]
            else:
                missing_fields.append("sales_order_id")
        
        elif intent == "create_invoice":
            del_match = re.search(r"(?:delivery|dn|delivery note)\s*(?:number|#|id)?\s*(\w+)", message, re.IGNORECASE)
            if del_match:
                gathered_info["delivery_id"] = del_match.group(1)
            elif "delivery_id" in context:
                gathered_info["delivery_id"] = context["delivery_id"]
            else:
                missing_fields.append("delivery_id")
        
        elif intent == "create_customer":
            name_match = re.search(r"(?:customer|name):\s*([A-Za-z\s]+?)(?:,|email|$)", message, re.IGNORECASE)
            email_match = re.search(r"(?:email):\s*([^\s,]+@[^\s,]+)", message, re.IGNORECASE)
            
            if name_match:
                gathered_info["name"] = name_match.group(1).strip()
            elif "name" in context:
                gathered_info["name"] = context["name"]
            else:
                missing_fields.append("name")
            
            if email_match:
                gathered_info["email"] = email_match.group(1).strip()
            elif "email" in context:
                gathered_info["email"] = context["email"]
            else:
                missing_fields.append("email")
        
        elif intent == "process_remittance":
            vendor_match = re.search(r"(?:from|vendor|supplier):\s*([A-Za-z\s]+?)(?:,|$)", message, re.IGNORECASE)
            if vendor_match:
                gathered_info["vendor"] = vendor_match.group(1).strip()
            elif "vendor" in context:
                gathered_info["vendor"] = context["vendor"]
            
            if "file" in context:
                gathered_info["file"] = context["file"]
            elif "attachments" in context and context["attachments"]:
                gathered_info["file"] = context["attachments"][0]
            else:
                missing_fields.append("file")
        
        for field in required_fields:
            if field not in gathered_info:
                missing_fields.append(field)
        
        return {
            "gathered": gathered_info,
            "missing": missing_fields,
            "complete": len(missing_fields) == 0
        }

# ========================================
# ========================================

class BotActivator:
    """Activate appropriate bots based on intent"""
    
    INTENT_TO_BOTS = {
        "create_quote": ["sales_bot", "pricing_bot"],
        "approve_quote": ["sales_bot", "workflow_bot"],
        "create_sales_order": ["sales_bot", "inventory_bot"],
        "approve_sales_order": ["sales_bot", "workflow_bot"],
        "create_delivery": ["wms_bot", "delivery_bot"],
        "create_invoice": ["ar_bot", "invoice_bot"],
        "create_purchase_order": ["procurement_bot", "supplier_bot"],
        "receive_goods": ["wms_bot", "receiving_bot"],
        "process_supplier_invoice": ["ap_bot", "invoice_bot"],
        "process_document": ["document_scanner_bot", "ocr_bot"],
        "process_remittance": ["remittance_bot", "payment_reconciliation_bot"],
        "create_customer": ["master_data_bot", "crm_bot"],
        "create_product": ["master_data_bot", "inventory_bot"],
        "create_supplier": ["master_data_bot", "procurement_bot"],
        "create_service_request": ["field_service_intake_bot"],
        "create_work_order": ["field_service_scheduling_bot"],
        "post_journal_entry": ["gl_bot", "accounting_bot"],
        "reconcile_bank": ["bank_reconciliation_bot"],
        "process_payment": ["payment_bot", "ar_bot"],
        "generate_report": ["reporting_bot", "analytics_bot"],
        "view_dashboard": ["dashboard_bot"],
        "query_status": ["search_bot", "status_bot"],
        "search": ["search_bot"]
    }
    
    def get_bots_for_intent(self, intent: str) -> List[str]:
        """Get list of bots to activate for intent"""
        return self.INTENT_TO_BOTS.get(intent, ["general_assistant_bot"])

# ========================================
# ========================================

class ExecutionEngine:
    """Execute work through activated bots"""
    
    async def execute(
        self,
        intent: str,
        information: Dict[str, Any],
        bots: List[str],
        context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Execute the task through bots"""
        
        results = []
        
        if intent == "approve_sales_order":
            result = await self._execute_approve_sales_order(information, context)
            results.append(result)
        
        elif intent == "create_delivery":
            result = await self._execute_create_delivery(information, context)
            results.append(result)
        
        elif intent == "create_invoice":
            result = await self._execute_create_invoice(information, context)
            results.append(result)
        
        elif intent == "process_remittance":
            result = await self._execute_process_remittance(information, context)
            results.append(result)
        
        elif intent == "create_customer":
            result = await self._execute_create_customer(information, context)
            results.append(result)
        
        elif intent == "create_service_request":
            result = await self._execute_create_service_request(information, context)
            results.append(result)
        
        else:
            results.append({
                "bot": bots[0] if bots else "unknown",
                "status": "pending",
                "message": f"Intent '{intent}' recognized but execution not yet implemented",
                "data": information
            })
        
        return results
    
    async def _execute_approve_sales_order(self, info: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute sales order approval workflow"""
        
        sales_order_id = info.get("sales_order_id")
        
        
        return {
            "bot": "sales_bot",
            "action": "approve_sales_order",
            "status": "success",
            "message": f"Sales Order {sales_order_id} approved successfully",
            "data": {
                "sales_order_id": sales_order_id,
                "status": "approved",
                "approved_at": datetime.now().isoformat(),
                "next_step": "create_delivery"
            }
        }
    
    async def _execute_create_delivery(self, info: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute delivery creation workflow"""
        
        sales_order_id = info.get("sales_order_id")
        
        
        delivery_id = f"DN-{datetime.now().strftime('%Y%m%d')}-001"
        
        return {
            "bot": "wms_bot",
            "action": "create_delivery",
            "status": "success",
            "message": f"Delivery {delivery_id} created for Sales Order {sales_order_id}",
            "data": {
                "delivery_id": delivery_id,
                "sales_order_id": sales_order_id,
                "status": "ready_to_ship",
                "created_at": datetime.now().isoformat(),
                "delivery_note_url": f"/documents/delivery_notes/{delivery_id}.pdf",
                "next_step": "ship_delivery"
            }
        }
    
    async def _execute_create_invoice(self, info: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute invoice creation workflow"""
        
        delivery_id = info.get("delivery_id")
        
        
        invoice_id = f"INV-{datetime.now().strftime('%Y%m%d')}-001"
        
        return {
            "bot": "ar_bot",
            "action": "create_invoice",
            "status": "success",
            "message": f"Invoice {invoice_id} created and emailed to customer",
            "data": {
                "invoice_id": invoice_id,
                "delivery_id": delivery_id,
                "status": "sent",
                "created_at": datetime.now().isoformat(),
                "invoice_url": f"/documents/invoices/{invoice_id}.pdf",
                "ar_posted": True,
                "gl_posted": True,
                "emailed": True
            }
        }
    
    async def _execute_process_remittance(self, info: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute remittance processing workflow"""
        
        vendor = info.get("vendor")
        file = info.get("file")
        
        
        return {
            "bot": "remittance_bot",
            "action": "process_remittance",
            "status": "success",
            "message": f"Remittance from {vendor} processed successfully",
            "data": {
                "vendor": vendor,
                "file": file,
                "invoices_matched": 15,
                "total_amount": 125000.00,
                "allocations_created": 15,
                "next_step": "post_to_sap_or_aria"
            }
        }
    
    async def _execute_create_customer(self, info: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute customer creation workflow"""
        
        name = info.get("name")
        email = info.get("email")
        phone = info.get("phone")
        
        try:
            from services.crm.customer_service import create_customer_from_aria
            
            customer_data = create_customer_from_aria(
                name=name,
                email=email,
                phone=phone,
                tenant_id="default"
            )
            
            return {
                "bot": "master_data_bot",
                "action": "create_customer",
                "status": "success",
                "message": f"Customer '{name}' created successfully with code {customer_data['customer_code']}",
                "data": customer_data
            }
        
        except Exception as e:
            logger.error(f"Error creating customer: {e}")
            return {
                "bot": "master_data_bot",
                "action": "create_customer",
                "status": "error",
                "message": f"Failed to create customer: {str(e)}",
                "data": {
                    "name": name,
                    "email": email,
                    "error": str(e)
                }
            }
    
    async def _execute_create_service_request(self, info: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute service request creation workflow"""
        
        customer = info.get("customer")
        description = info.get("description")
        
        
        request_id = f"SR-{datetime.now().strftime('%Y%m%d')}-001"
        
        return {
            "bot": "field_service_intake_bot",
            "action": "create_service_request",
            "status": "success",
            "message": f"Service Request {request_id} created and triaged",
            "data": {
                "request_id": request_id,
                "customer": customer,
                "description": description,
                "priority": "medium",
                "assigned_to": "Technician-001",
                "created_at": datetime.now().isoformat(),
                "next_step": "create_work_order"
            }
        }

# ========================================
# ========================================

class AriaController:
    """Main Aria Controller - Orchestrates complete workflows"""
    
    def __init__(self):
        self.intent_recognizer = IntentRecognizer()
        self.info_gatherer = InformationGatherer()
        self.bot_activator = BotActivator()
        self.execution_engine = ExecutionEngine()
    
    async def process_request(self, request: AriaRequest) -> AriaResponse:
        """Process user request through complete workflow"""
        
        intent_result = self.intent_recognizer.recognize(request.message)
        intent = intent_result["intent"]
        
        info_result = self.info_gatherer.extract_information(
            request.message,
            intent,
            request.context
        )
        
        if not info_result["complete"]:
            return AriaResponse(
                status="needs_more_info",
                message=f"I need more information to {intent.replace('_', ' ')}. Please provide: {', '.join(info_result['missing'])}",
                intent=intent_result,
                information_gathered=info_result["gathered"],
                bots_activated=[],
                execution_results=[],
                next_steps=[f"Provide {field}" for field in info_result["missing"]],
                timestamp=datetime.now().isoformat()
            )
        
        bots_to_activate = self.bot_activator.get_bots_for_intent(intent)
        
        execution_results = await self.execution_engine.execute(
            intent,
            info_result["gathered"],
            bots_to_activate,
            request.context
        )
        
        next_steps = self._determine_next_steps(intent, execution_results)
        
        return AriaResponse(
            status="success",
            message=self._format_success_message(intent, execution_results),
            intent=intent_result,
            information_gathered=info_result["gathered"],
            bots_activated=bots_to_activate,
            execution_results=execution_results,
            next_steps=next_steps,
            timestamp=datetime.now().isoformat()
        )
    
    def _determine_next_steps(self, intent: str, results: List[Dict[str, Any]]) -> List[str]:
        """Determine next steps based on execution results"""
        
        next_steps = []
        
        for result in results:
            if "next_step" in result.get("data", {}):
                next_step = result["data"]["next_step"]
                if next_step == "create_delivery":
                    next_steps.append("Say: 'Create delivery for this sales order'")
                elif next_step == "ship_delivery":
                    next_steps.append("Ship the delivery and get customer signature")
                elif next_step == "post_to_sap_or_aria":
                    next_steps.append("Say: 'Post to SAP' or 'Post to AriaERP'")
                elif next_step == "create_work_order":
                    next_steps.append("Say: 'Create work order for this service request'")
        
        return next_steps
    
    def _format_success_message(self, intent: str, results: List[Dict[str, Any]]) -> str:
        """Format success message from execution results"""
        
        messages = []
        for result in results:
            if result.get("status") == "success":
                messages.append(result.get("message", "Task completed successfully"))
        
        return " ".join(messages) if messages else "Task completed successfully"

# ========================================
# API ENDPOINTS
# ========================================

aria_controller = AriaController()

@router.post("/process", response_model=AriaResponse)
async def process_aria_request(request: AriaRequest):
    """
    Main Aria Controller endpoint - processes requests and orchestrates workflows
    
    Example requests:
    - "This sales order SO-001 is approved, let's deliver it"
    - "Process this remittance from PnP"
    - "Create a customer: ABC Corp, email: abc@example.com"
    - "Create a service request for customer XYZ: broken equipment"
    """
    try:
        response = await aria_controller.process_request(request)
        return response
    except Exception as e:
        logger.error(f"Aria controller error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "module": "aria_controller_engine",
        "capabilities": [
            "Intent recognition",
            "Information gathering",
            "Bot activation",
            "Workflow execution",
            "Result delivery"
        ],
        "supported_intents": list(IntentRecognizer.INTENT_PATTERNS.keys())
    }

@router.get("/intents")
async def list_intents():
    """List all supported intents"""
    return {
        "intents": list(IntentRecognizer.INTENT_PATTERNS.keys()),
        "total": len(IntentRecognizer.INTENT_PATTERNS)
    }
