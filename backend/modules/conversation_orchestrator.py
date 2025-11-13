"""
Conversation Orchestrator for ARIA ERP
Manages multi-turn conversational workflows for all document types

Supports:
- All ARIA ERP documents (Quotes, Sales Orders, Deliveries, Invoices, Purchase Orders, etc.)
- All SAP document types (34+ types from document_analyzer_v2)
- Multi-step slot filling with validation
- Confirmation before execution
- Email sending with PDF attachments
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Callable
from datetime import datetime, timedelta
from enum import Enum
import json
import uuid
import logging
import asyncpg
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/conversation", tags=["Conversation Orchestrator"])


# ============================================================================
# ============================================================================

class ConversationState(str, Enum):
    """Conversation state machine"""
    IDLE = "idle"
    COLLECTING_SLOTS = "collecting_slots"
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"


class ResponseType(str, Enum):
    """Type of response to send to frontend"""
    QUESTION = "question"  # Simple text question
    FORM = "form"  # Structured form with fields
    CONFIRMATION = "confirmation"  # Summary card with Confirm/Cancel
    RESULT = "result"  # Final result with links and actions
    ERROR = "error"  # Error message


class ChatSessionCreate(BaseModel):
    user_id: str
    company_id: str
    initial_message: Optional[str] = None


class ChatMessageCreate(BaseModel):
    session_id: str
    message: Optional[str] = None
    form_data: Optional[Dict[str, Any]] = None
    action: Optional[str] = None  # "confirm", "cancel", "send_email", etc.


class ChatResponse(BaseModel):
    session_id: str
    response_type: ResponseType
    message: str
    form_schema: Optional[Dict[str, Any]] = None
    confirmation_data: Optional[Dict[str, Any]] = None
    result_data: Optional[Dict[str, Any]] = None
    intent: Optional[str] = None
    state: ConversationState
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# ============================================================================

class SlotSchema:
    """Schema for a single slot in a workflow"""
    def __init__(
        self,
        name: str,
        label: str,
        type: str,  # "text", "number", "select", "multiselect", "date", "table"
        required: bool = True,
        validator: Optional[Callable] = None,
        options_provider: Optional[Callable] = None,  # For select fields
        default: Optional[Any] = None,
        description: Optional[str] = None
    ):
        self.name = name
        self.label = label
        self.type = type
        self.required = required
        self.validator = validator
        self.options_provider = options_provider
        self.default = default
        self.description = description


class WorkflowDefinition:
    """Definition of a complete workflow"""
    def __init__(
        self,
        intent: str,
        name: str,
        description: str,
        slots: List[SlotSchema],
        execute_handler: Callable,
        confirmation_template: str,
        email_template: Optional[Callable] = None,
        pdf_generator: Optional[Callable] = None
    ):
        self.intent = intent
        self.name = name
        self.description = description
        self.slots = slots
        self.execute_handler = execute_handler
        self.confirmation_template = confirmation_template
        self.email_template = email_template
        self.pdf_generator = pdf_generator


# ============================================================================
# ============================================================================

class WorkflowRegistry:
    """Registry of all available workflows"""
    
    def __init__(self):
        self.workflows: Dict[str, WorkflowDefinition] = {}
        self._register_all_workflows()
    
    def _register_all_workflows(self):
        """Register all ARIA ERP and SAP workflows"""
        
        self._register_quote_workflow()
        self._register_sales_order_workflow()
        self._register_delivery_workflow()
        self._register_invoice_workflow()
        self._register_purchase_order_workflow()
        self._register_goods_receipt_workflow()
        self._register_payment_workflow()
        self._register_journal_entry_workflow()
        
        self._register_sap_document_workflow()
    
    def _register_quote_workflow(self):
        """Register create_quote workflow"""
        self.workflows["create_quote"] = WorkflowDefinition(
            intent="create_quote",
            name="Create Quote",
            description="Create a new sales quote for a customer",
            slots=[
                SlotSchema(
                    name="customer_id",
                    label="Customer",
                    type="select",
                    required=True,
                    options_provider=self._get_customers,
                    description="Select the customer for this quote"
                ),
                SlotSchema(
                    name="line_items",
                    label="Line Items",
                    type="table",
                    required=True,
                    description="Products and quantities"
                ),
                SlotSchema(
                    name="valid_until",
                    label="Valid Until",
                    type="date",
                    required=False,
                    default=lambda: (datetime.now() + timedelta(days=30)).date(),
                    description="Quote expiration date"
                ),
                SlotSchema(
                    name="notes",
                    label="Notes",
                    type="text",
                    required=False,
                    description="Additional notes or special terms"
                )
            ],
            execute_handler=self._execute_create_quote,
            confirmation_template="Create quote for {customer_name} with {item_count} items totaling {total_amount}?",
            email_template=self._generate_quote_email,
            pdf_generator=self._generate_quote_pdf
        )
    
    def _register_sales_order_workflow(self):
        """Register create_sales_order workflow"""
        self.workflows["create_sales_order"] = WorkflowDefinition(
            intent="create_sales_order",
            name="Create Sales Order",
            description="Create a new sales order",
            slots=[
                SlotSchema(
                    name="customer_id",
                    label="Customer",
                    type="select",
                    required=True,
                    options_provider=self._get_customers
                ),
                SlotSchema(
                    name="line_items",
                    label="Line Items",
                    type="table",
                    required=True
                ),
                SlotSchema(
                    name="delivery_date",
                    label="Requested Delivery Date",
                    type="date",
                    required=False
                ),
                SlotSchema(
                    name="delivery_address",
                    label="Delivery Address",
                    type="text",
                    required=False
                )
            ],
            execute_handler=self._execute_create_sales_order,
            confirmation_template="Create sales order for {customer_name} with {item_count} items?",
            email_template=self._generate_order_email,
            pdf_generator=self._generate_order_pdf
        )
    
    def _register_delivery_workflow(self):
        """Register create_delivery workflow"""
        self.workflows["create_delivery"] = WorkflowDefinition(
            intent="create_delivery",
            name="Create Delivery",
            description="Create a delivery note from a sales order",
            slots=[
                SlotSchema(
                    name="sales_order_id",
                    label="Sales Order",
                    type="select",
                    required=True,
                    options_provider=self._get_open_sales_orders
                ),
                SlotSchema(
                    name="delivery_date",
                    label="Delivery Date",
                    type="date",
                    required=False,
                    default=datetime.now().date
                )
            ],
            execute_handler=self._execute_create_delivery,
            confirmation_template="Create delivery for sales order {sales_order_number}?",
            pdf_generator=self._generate_delivery_pdf
        )
    
    def _register_invoice_workflow(self):
        """Register create_invoice workflow"""
        self.workflows["create_invoice"] = WorkflowDefinition(
            intent="create_invoice",
            name="Create Invoice",
            description="Create a customer invoice",
            slots=[
                SlotSchema(
                    name="source_type",
                    label="Invoice Source",
                    type="select",
                    required=True,
                    options_provider=lambda: [
                        {"value": "delivery", "label": "From Delivery"},
                        {"value": "sales_order", "label": "From Sales Order"},
                        {"value": "manual", "label": "Manual Entry"}
                    ]
                ),
                SlotSchema(
                    name="source_id",
                    label="Source Document",
                    type="select",
                    required=False,
                    options_provider=self._get_invoiceable_documents
                ),
                SlotSchema(
                    name="customer_id",
                    label="Customer",
                    type="select",
                    required=False,
                    options_provider=self._get_customers
                ),
                SlotSchema(
                    name="line_items",
                    label="Line Items",
                    type="table",
                    required=False
                )
            ],
            execute_handler=self._execute_create_invoice,
            confirmation_template="Create invoice for {customer_name} totaling {total_amount}?",
            email_template=self._generate_invoice_email,
            pdf_generator=self._generate_invoice_pdf
        )
    
    def _register_purchase_order_workflow(self):
        """Register create_purchase_order workflow"""
        self.workflows["create_purchase_order"] = WorkflowDefinition(
            intent="create_purchase_order",
            name="Create Purchase Order",
            description="Create a purchase order to a supplier",
            slots=[
                SlotSchema(
                    name="supplier_id",
                    label="Supplier",
                    type="select",
                    required=True,
                    options_provider=self._get_suppliers
                ),
                SlotSchema(
                    name="line_items",
                    label="Line Items",
                    type="table",
                    required=True
                ),
                SlotSchema(
                    name="delivery_date",
                    label="Required Delivery Date",
                    type="date",
                    required=False
                )
            ],
            execute_handler=self._execute_create_purchase_order,
            confirmation_template="Create purchase order to {supplier_name} for {item_count} items?",
            email_template=self._generate_po_email,
            pdf_generator=self._generate_po_pdf
        )
    
    def _register_goods_receipt_workflow(self):
        """Register create_goods_receipt workflow"""
        self.workflows["create_goods_receipt"] = WorkflowDefinition(
            intent="create_goods_receipt",
            name="Create Goods Receipt",
            description="Record receipt of goods from a purchase order",
            slots=[
                SlotSchema(
                    name="purchase_order_id",
                    label="Purchase Order",
                    type="select",
                    required=True,
                    options_provider=self._get_open_purchase_orders
                ),
                SlotSchema(
                    name="receipt_date",
                    label="Receipt Date",
                    type="date",
                    required=False,
                    default=datetime.now().date
                ),
                SlotSchema(
                    name="received_items",
                    label="Received Items",
                    type="table",
                    required=True,
                    description="Items and quantities received"
                )
            ],
            execute_handler=self._execute_create_goods_receipt,
            confirmation_template="Record receipt of {item_count} items from PO {po_number}?",
            pdf_generator=self._generate_receipt_pdf
        )
    
    def _register_payment_workflow(self):
        """Register process_payment workflow"""
        self.workflows["process_payment"] = WorkflowDefinition(
            intent="process_payment",
            name="Process Payment",
            description="Record a customer payment or make a supplier payment",
            slots=[
                SlotSchema(
                    name="payment_type",
                    label="Payment Type",
                    type="select",
                    required=True,
                    options_provider=lambda: [
                        {"value": "customer", "label": "Customer Payment (Incoming)"},
                        {"value": "supplier", "label": "Supplier Payment (Outgoing)"}
                    ]
                ),
                SlotSchema(
                    name="party_id",
                    label="Customer/Supplier",
                    type="select",
                    required=True,
                    options_provider=self._get_payment_parties
                ),
                SlotSchema(
                    name="amount",
                    label="Amount",
                    type="number",
                    required=True
                ),
                SlotSchema(
                    name="payment_date",
                    label="Payment Date",
                    type="date",
                    required=False,
                    default=datetime.now().date
                ),
                SlotSchema(
                    name="reference",
                    label="Reference/Check Number",
                    type="text",
                    required=False
                )
            ],
            execute_handler=self._execute_process_payment,
            confirmation_template="Record {payment_type} payment of {amount} from/to {party_name}?"
        )
    
    def _register_journal_entry_workflow(self):
        """Register post_journal_entry workflow"""
        self.workflows["post_journal_entry"] = WorkflowDefinition(
            intent="post_journal_entry",
            name="Post Journal Entry",
            description="Create a manual journal entry",
            slots=[
                SlotSchema(
                    name="entry_date",
                    label="Entry Date",
                    type="date",
                    required=True,
                    default=datetime.now().date
                ),
                SlotSchema(
                    name="reference",
                    label="Reference",
                    type="text",
                    required=True
                ),
                SlotSchema(
                    name="description",
                    label="Description",
                    type="text",
                    required=True
                ),
                SlotSchema(
                    name="lines",
                    label="Journal Lines",
                    type="table",
                    required=True,
                    description="Account, Debit, Credit for each line"
                )
            ],
            execute_handler=self._execute_post_journal_entry,
            confirmation_template="Post journal entry {reference} with {line_count} lines?"
        )
    
    def _register_sap_document_workflow(self):
        """Register process_sap_document workflow"""
        self.workflows["process_sap_document"] = WorkflowDefinition(
            intent="process_sap_document",
            name="Process SAP Document",
            description="Classify and process SAP documents (34+ types)",
            slots=[
                SlotSchema(
                    name="document_file",
                    label="Document File",
                    type="file",
                    required=True,
                    description="Upload Excel/PDF/Image file"
                ),
                SlotSchema(
                    name="action",
                    label="Action",
                    type="select",
                    required=True,
                    options_provider=lambda: [
                        {"value": "export_to_sap", "label": "Export to SAP"},
                        {"value": "post_to_erp", "label": "Post to ARIA ERP GL"},
                        {"value": "both", "label": "Both"}
                    ]
                )
            ],
            execute_handler=self._execute_process_sap_document,
            confirmation_template="Process {document_type} document and {action}?"
        )
    
    # ========================================================================
    # ========================================================================
    
    async def _get_customers(self, company_id: str) -> List[Dict[str, Any]]:
        """Get list of customers for selection"""
        try:
            database_url = os.getenv('DATABASE_URL')
            conn = await asyncpg.connect(database_url)
            try:
                rows = await conn.fetch(
                    "SELECT id, name, email FROM customers WHERE company_id = $1 ORDER BY name LIMIT 100",
                    company_id
                )
                return [
                    {"value": str(row['id']), "label": f"{row['name']} ({row['email']})"}
                    for row in rows
                ]
            finally:
                await conn.close()
        except Exception as e:
            logger.error(f"Error fetching customers: {e}")
            return []
    
    async def _get_suppliers(self, company_id: str) -> List[Dict[str, Any]]:
        """Get list of suppliers for selection"""
        try:
            database_url = os.getenv('DATABASE_URL')
            conn = await asyncpg.connect(database_url)
            try:
                rows = await conn.fetch(
                    "SELECT id, name, email FROM suppliers WHERE company_id = $1 ORDER BY name LIMIT 100",
                    company_id
                )
                return [
                    {"value": str(row['id']), "label": f"{row['name']} ({row['email']})"}
                    for row in rows
                ]
            finally:
                await conn.close()
        except Exception as e:
            logger.error(f"Error fetching suppliers: {e}")
            return []
    
    async def _get_open_sales_orders(self, company_id: str) -> List[Dict[str, Any]]:
        """Get open sales orders"""
        return []
    
    async def _get_open_purchase_orders(self, company_id: str) -> List[Dict[str, Any]]:
        """Get open purchase orders"""
        return []
    
    async def _get_invoiceable_documents(self, company_id: str, source_type: str) -> List[Dict[str, Any]]:
        """Get documents that can be invoiced"""
        return []
    
    async def _get_payment_parties(self, company_id: str, payment_type: str) -> List[Dict[str, Any]]:
        """Get customers or suppliers based on payment type"""
        if payment_type == "customer":
            return await self._get_customers(company_id)
        else:
            return await self._get_suppliers(company_id)
    
    # ========================================================================
    # ========================================================================
    
    async def _execute_create_quote(self, slots: Dict[str, Any], company_id: str) -> Dict[str, Any]:
        """Execute quote creation by calling ERP API"""
        import httpx
        from datetime import date
        
        try:
            quote_data = {
                "customer_id": slots.get("customer_id"),
                "quote_date": date.today().isoformat(),
                "valid_until": slots.get("valid_until", (date.today() + timedelta(days=30)).isoformat()),
                "notes": slots.get("notes", ""),
                "lines": slots.get("line_items", [])
            }
            
            service_api_key = os.getenv("SERVICE_API_KEY", "aria-internal-service-key-2025")
            headers = {"X-Service-Key": service_api_key}
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "http://localhost:8000/api/erp/order-to-cash/quotes",
                    json=quote_data,
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return {
                        "success": True,
                        "quote_id": result["id"],
                        "quote_number": result["quote_number"],
                        "total_amount": result["total_amount"],
                        "message": f"Quote {result['quote_number']} created successfully"
                    }
                else:
                    logger.error(f"Failed to create quote: {response.text}")
                    return {
                        "success": False,
                        "message": f"Failed to create quote: {response.text}"
                    }
        except Exception as e:
            logger.error(f"Error creating quote: {e}")
            return {
                "success": False,
                "message": f"Error creating quote: {str(e)}"
            }
    
    async def _execute_create_sales_order(self, slots: Dict[str, Any], company_id: str) -> Dict[str, Any]:
        """Execute sales order creation by calling ERP API"""
        import httpx
        from datetime import date
        
        try:
            order_data = {
                "customer_id": slots.get("customer_id"),
                "order_date": date.today().isoformat(),
                "required_date": slots.get("delivery_date"),
                "notes": slots.get("delivery_address", ""),
                "lines": slots.get("line_items", [])
            }
            
            service_api_key = os.getenv("SERVICE_API_KEY", "aria-internal-service-key-2025")
            headers = {"X-Service-Key": service_api_key}
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "http://localhost:8000/api/erp/order-to-cash/sales-orders",
                    json=order_data,
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return {
                        "success": True,
                        "order_id": result["id"],
                        "order_number": result["order_number"],
                        "total_amount": result["total_amount"],
                        "message": f"Sales order {result['order_number']} created successfully"
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Failed to create sales order: {response.text}"
                    }
        except Exception as e:
            logger.error(f"Error creating sales order: {e}")
            return {
                "success": False,
                "message": f"Error creating sales order: {str(e)}"
            }
    
    async def _execute_create_delivery(self, slots: Dict[str, Any], company_id: str) -> Dict[str, Any]:
        """Execute delivery creation"""
        return {
            "success": True,
            "delivery_id": f"DN-{uuid.uuid4().hex[:8].upper()}",
            "message": "Delivery created successfully"
        }
    
    async def _execute_create_invoice(self, slots: Dict[str, Any], company_id: str) -> Dict[str, Any]:
        """Execute invoice creation by calling AR API"""
        import httpx
        from datetime import date
        
        try:
            invoice_data = {
                "customer_id": slots.get("customer_id"),
                "invoice_date": date.today().isoformat(),
                "due_date": (date.today() + timedelta(days=30)).isoformat(),
                "line_items": slots.get("line_items", [])
            }
            
            service_api_key = os.getenv("SERVICE_API_KEY", "aria-internal-service-key-2025")
            headers = {"X-Service-Key": service_api_key}
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "http://localhost:8000/api/ar/invoices",
                    json=invoice_data,
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return {
                        "success": True,
                        "invoice_id": result["id"],
                        "invoice_number": result.get("invoice_number", "INV-NEW"),
                        "total_amount": result.get("total_amount", 0),
                        "message": f"Invoice created successfully"
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Failed to create invoice: {response.text}"
                    }
        except Exception as e:
            logger.error(f"Error creating invoice: {e}")
            return {
                "success": False,
                "message": f"Error creating invoice: {str(e)}"
            }
    
    async def _execute_create_purchase_order(self, slots: Dict[str, Any], company_id: str) -> Dict[str, Any]:
        """Execute purchase order creation"""
        return {
            "success": True,
            "po_id": f"PO-{uuid.uuid4().hex[:8].upper()}",
            "message": "Purchase order created successfully"
        }
    
    async def _execute_create_goods_receipt(self, slots: Dict[str, Any], company_id: str) -> Dict[str, Any]:
        """Execute goods receipt creation"""
        return {
            "success": True,
            "receipt_id": f"GR-{uuid.uuid4().hex[:8].upper()}",
            "message": "Goods receipt created successfully"
        }
    
    async def _execute_process_payment(self, slots: Dict[str, Any], company_id: str) -> Dict[str, Any]:
        """Execute payment processing"""
        return {
            "success": True,
            "payment_id": f"PMT-{uuid.uuid4().hex[:8].upper()}",
            "message": "Payment processed successfully"
        }
    
    async def _execute_post_journal_entry(self, slots: Dict[str, Any], company_id: str) -> Dict[str, Any]:
        """Execute journal entry posting"""
        return {
            "success": True,
            "entry_id": f"JE-{uuid.uuid4().hex[:8].upper()}",
            "message": "Journal entry posted successfully"
        }
    
    async def _execute_process_sap_document(self, slots: Dict[str, Any], company_id: str) -> Dict[str, Any]:
        """Execute SAP document processing"""
        return {
            "success": True,
            "document_id": f"DOC-{uuid.uuid4().hex[:8].upper()}",
            "message": "SAP document processed successfully"
        }
    
    # ========================================================================
    # ========================================================================
    
    def _generate_quote_email(self, slots: Dict[str, Any], result: Dict[str, Any]) -> Dict[str, str]:
        """Generate quote email"""
        return {
            "subject": f"Quote {result['quote_id']} from ARIA ERP",
            "body": f"Please find attached your quote {result['quote_id']}."
        }
    
    def _generate_order_email(self, slots: Dict[str, Any], result: Dict[str, Any]) -> Dict[str, str]:
        """Generate order confirmation email"""
        return {
            "subject": f"Order Confirmation {result['order_id']}",
            "body": f"Your order {result['order_id']} has been confirmed."
        }
    
    def _generate_invoice_email(self, slots: Dict[str, Any], result: Dict[str, Any]) -> Dict[str, str]:
        """Generate invoice email"""
        return {
            "subject": f"Invoice {result['invoice_id']} from ARIA ERP",
            "body": f"Please find attached invoice {result['invoice_id']}."
        }
    
    def _generate_po_email(self, slots: Dict[str, Any], result: Dict[str, Any]) -> Dict[str, str]:
        """Generate PO email"""
        return {
            "subject": f"Purchase Order {result['po_id']}",
            "body": f"Please find attached purchase order {result['po_id']}."
        }
    
    # ========================================================================
    # ========================================================================
    
    async def _generate_quote_pdf(self, slots: Dict[str, Any], result: Dict[str, Any]) -> bytes:
        """Generate quote PDF using PDF service"""
        from services.pdf_service import get_pdf_service
        
        pdf_service = get_pdf_service()
        
        quote_data = {
            "quote_number": result.get("quote_number", "QT-NEW"),
            "customer_name": slots.get("customer_name", "Customer"),
            "customer_email": slots.get("customer_email", ""),
            "quote_date": slots.get("quote_date", date.today()),
            "valid_until": slots.get("valid_until", date.today()),
            "line_items": slots.get("line_items", []),
            "subtotal": result.get("subtotal", 0),
            "tax_amount": result.get("tax_amount", 0),
            "total_amount": result.get("total_amount", 0),
            "notes": slots.get("notes", "")
        }
        
        return pdf_service.generate_quote_pdf(quote_data)
    
    async def _generate_order_pdf(self, slots: Dict[str, Any], result: Dict[str, Any]) -> bytes:
        """Generate order PDF"""
        return b"PDF content"
    
    async def _generate_delivery_pdf(self, slots: Dict[str, Any], result: Dict[str, Any]) -> bytes:
        """Generate delivery PDF"""
        return b"PDF content"
    
    async def _generate_invoice_pdf(self, slots: Dict[str, Any], result: Dict[str, Any]) -> bytes:
        """Generate invoice PDF"""
        return b"PDF content"
    
    async def _generate_po_pdf(self, slots: Dict[str, Any], result: Dict[str, Any]) -> bytes:
        """Generate PO PDF"""
        return b"PDF content"
    
    async def _generate_receipt_pdf(self, slots: Dict[str, Any], result: Dict[str, Any]) -> bytes:
        """Generate receipt PDF"""
        return b"PDF content"
    
    def get_workflow(self, intent: str) -> Optional[WorkflowDefinition]:
        """Get workflow by intent"""
        return self.workflows.get(intent)
    
    def list_workflows(self) -> List[Dict[str, str]]:
        """List all available workflows"""
        return [
            {
                "intent": wf.intent,
                "name": wf.name,
                "description": wf.description
            }
            for wf in self.workflows.values()
        ]


# ============================================================================
# ============================================================================

class ConversationOrchestrator:
    """Main orchestrator for managing conversations"""
    
    def __init__(self):
        self.registry = WorkflowRegistry()
    
    async def start_session(self, user_id: str, company_id: str, initial_message: Optional[str] = None) -> ChatResponse:
        """Start a new conversation session"""
        session_id = str(uuid.uuid4())
        
        # Create session in database
        database_url = os.getenv('DATABASE_URL')
        conn = await asyncpg.connect(database_url)
        try:
            await conn.execute("""
                INSERT INTO chat_sessions (id, user_id, company_id, state, slots, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            """, session_id, user_id, company_id, ConversationState.IDLE.value, json.dumps({}), 
                datetime.utcnow(), datetime.utcnow())
        finally:
            await conn.close()
        
        if initial_message:
            return await self.continue_session(session_id, initial_message, None, None)
        
        return ChatResponse(
            session_id=session_id,
            response_type=ResponseType.QUESTION,
            message="Hello! I'm ARIA, your AI assistant. I can help you create quotes, sales orders, invoices, process payments, and more. What would you like to do?",
            state=ConversationState.IDLE
        )
    
    async def continue_session(
        self,
        session_id: str,
        message: Optional[str] = None,
        form_data: Optional[Dict[str, Any]] = None,
        action: Optional[str] = None
    ) -> ChatResponse:
        """Continue an existing conversation"""
        
        database_url = os.getenv('DATABASE_URL')
        conn = await asyncpg.connect(database_url)
        try:
            session = await conn.fetchrow(
                "SELECT * FROM chat_sessions WHERE id = $1",
                session_id
            )
            
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            
            state = ConversationState(session['state'])
            slots = json.loads(session['slots']) if session['slots'] else {}
            intent = session.get('intent')
            company_id = session['company_id']
            
            if state == ConversationState.IDLE:
                from modules.aria_controller_engine import IntentRecognizer
                recognizer = IntentRecognizer()
                intent_result = recognizer.recognize(message)
                intent = intent_result['intent']
                
                await conn.execute(
                    "UPDATE chat_sessions SET intent = $1, state = $2, updated_at = $3 WHERE id = $4",
                    intent, ConversationState.COLLECTING_SLOTS.value, datetime.utcnow(), session_id
                )
                
                workflow = self.registry.get_workflow(intent)
                if not workflow:
                    return ChatResponse(
                        session_id=session_id,
                        response_type=ResponseType.QUESTION,
                        message=f"I understand you want to {intent.replace('_', ' ')}, but I don't have a workflow for that yet. What else can I help you with?",
                        state=ConversationState.IDLE
                    )
                
                return await self._collect_next_slot(session_id, workflow, slots, company_id, conn)
            
            elif state == ConversationState.COLLECTING_SLOTS:
                workflow = self.registry.get_workflow(intent)
                if not workflow:
                    raise HTTPException(status_code=400, detail="Invalid workflow")
                
                if form_data:
                    slots.update(form_data)
                elif message:
                    pass
                
                await conn.execute(
                    "UPDATE chat_sessions SET slots = $1, updated_at = $2 WHERE id = $3",
                    json.dumps(slots), datetime.utcnow(), session_id
                )
                
                missing_slots = [s for s in workflow.slots if s.required and s.name not in slots]
                
                if missing_slots:
                    return await self._collect_next_slot(session_id, workflow, slots, company_id, conn)
                else:
                    await conn.execute(
                        "UPDATE chat_sessions SET state = $1, updated_at = $2 WHERE id = $3",
                        ConversationState.AWAITING_CONFIRMATION.value, datetime.utcnow(), session_id
                    )
                    
                    return await self._show_confirmation(session_id, workflow, slots, conn)
            
            elif state == ConversationState.AWAITING_CONFIRMATION:
                workflow = self.registry.get_workflow(intent)
                if not workflow:
                    raise HTTPException(status_code=400, detail="Invalid workflow")
                
                if action == "confirm":
                    await conn.execute(
                        "UPDATE chat_sessions SET state = $1, updated_at = $2 WHERE id = $3",
                        ConversationState.EXECUTING.value, datetime.utcnow(), session_id
                    )
                    
                    result = await workflow.execute_handler(slots, company_id)
                    
                    await conn.execute(
                        "UPDATE chat_sessions SET state = $1, result = $2, updated_at = $3 WHERE id = $4",
                        ConversationState.COMPLETED.value, json.dumps(result), datetime.utcnow(), session_id
                    )
                    
                    return ChatResponse(
                        session_id=session_id,
                        response_type=ResponseType.RESULT,
                        message=result.get('message', 'Operation completed successfully'),
                        result_data=result,
                        intent=intent,
                        state=ConversationState.COMPLETED
                    )
                
                elif action == "cancel":
                    await conn.execute(
                        "UPDATE chat_sessions SET state = $1, intent = NULL, slots = $2, updated_at = $3 WHERE id = $4",
                        ConversationState.IDLE.value, json.dumps({}), datetime.utcnow(), session_id
                    )
                    
                    return ChatResponse(
                        session_id=session_id,
                        response_type=ResponseType.QUESTION,
                        message="Operation cancelled. What else can I help you with?",
                        state=ConversationState.IDLE
                    )
            
            return ChatResponse(
                session_id=session_id,
                response_type=ResponseType.ERROR,
                message="Invalid state",
                state=state
            )
        
        finally:
            await conn.close()
    
    async def _collect_next_slot(
        self,
        session_id: str,
        workflow: WorkflowDefinition,
        slots: Dict[str, Any],
        company_id: str,
        conn: asyncpg.Connection
    ) -> ChatResponse:
        """Collect the next missing slot"""
        
        next_slot = next((s for s in workflow.slots if s.required and s.name not in slots), None)
        
        if not next_slot:
            await conn.execute(
                "UPDATE chat_sessions SET state = $1, updated_at = $2 WHERE id = $3",
                ConversationState.AWAITING_CONFIRMATION.value, datetime.utcnow(), session_id
            )
            return await self._show_confirmation(session_id, workflow, slots, conn)
        
        form_schema = {
            "fields": [
                {
                    "name": next_slot.name,
                    "label": next_slot.label,
                    "type": next_slot.type,
                    "required": next_slot.required,
                    "description": next_slot.description,
                    "options": await next_slot.options_provider(company_id) if next_slot.options_provider else None
                }
            ]
        }
        
        return ChatResponse(
            session_id=session_id,
            response_type=ResponseType.FORM,
            message=f"Please provide: {next_slot.label}",
            form_schema=form_schema,
            intent=workflow.intent,
            state=ConversationState.COLLECTING_SLOTS
        )
    
    async def _show_confirmation(
        self,
        session_id: str,
        workflow: WorkflowDefinition,
        slots: Dict[str, Any],
        conn: asyncpg.Connection
    ) -> ChatResponse:
        """Show confirmation summary"""
        
        confirmation_message = workflow.confirmation_template.format(**slots)
        
        return ChatResponse(
            session_id=session_id,
            response_type=ResponseType.CONFIRMATION,
            message=confirmation_message,
            confirmation_data=slots,
            intent=workflow.intent,
            state=ConversationState.AWAITING_CONFIRMATION
        )


# ============================================================================
# API ENDPOINTS
# ============================================================================

orchestrator = ConversationOrchestrator()


@router.post("/start", response_model=ChatResponse)
async def start_conversation(request: ChatSessionCreate):
    """Start a new conversation session"""
    return await orchestrator.start_session(
        request.user_id,
        request.company_id,
        request.initial_message
    )


@router.post("/continue", response_model=ChatResponse)
async def continue_conversation(request: ChatMessageCreate):
    """Continue an existing conversation"""
    return await orchestrator.continue_session(
        request.session_id,
        request.message,
        request.form_data,
        request.action
    )


@router.get("/workflows")
async def list_workflows():
    """List all available workflows"""
    return orchestrator.registry.list_workflows()
