"""
Bot Adapter - Compatibility layer for BotERPIntegration

Wraps BotManager to provide the interface expected by WorkflowOrchestrator.
This allows the workflow orchestrator to work in production environments
where BotERPIntegration doesn't exist.
"""

from typing import Any, Dict, Optional
from uuid import UUID
import json
import logging

try:
    from app.bots.bot_manager import BotManager
except ImportError:
    raise ImportError("BotManager not available in production environment")

logger = logging.getLogger(__name__)

BOT_ID_MAP: Dict[str, str] = {
    "quote_generation": "quote_generation",
    "sales_order": "order_processing",
    "invoice_processing": "accounts_payable",  # AP bot handles invoice processing
    "document_generation": "document_generation",
    "email_integration": "email_integration",
    "warehouse_management": "inventory_management",
    "shipping": "shipping",
}


def _build_query(bot_id: str, action: str, params: Dict[str, Any]) -> str:
    """Build a readable query string for BotManager."""
    try:
        redacted = json.dumps(params)[:300]
    except Exception:
        redacted = str(params)[:300]
    return f"{action} via {bot_id} with params: {redacted}"


def _build_context(company_id: UUID, user_id: UUID, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Build context dict for BotManager with IDs and params."""
    ctx = dict(params or {})
    ctx["company_id"] = str(company_id)
    ctx["user_id"] = str(user_id)
    ctx["action"] = action
    return ctx


class BotERPIntegration:
    """
    Compatibility adapter that exposes the methods the orchestrator expects,
    delegating to BotManager.execute_bot under the hood.
    """

    def __init__(self, *args, **kwargs) -> None:
        """
        Initialize adapter. Accepts any args/kwargs for compatibility
        with orchestrator's BotERPIntegration(db) call.
        """
        self.bot_manager = BotManager()

    async def _exec(
        self,
        bot_name: str,
        action: str,
        company_id: UUID,
        user_id: UUID,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute bot via BotManager."""
        bot_id = BOT_ID_MAP.get(bot_name, bot_name)
        query = _build_query(bot_id, action, params)
        context = _build_context(company_id, user_id, action, params)

        try:
            result = await self.bot_manager.execute_bot(bot_id, query, context=context)
            return result
        except Exception as e:
            logger.exception(f"Error executing bot_id={bot_id}, action={action}: {e}")
            return {
                "bot_id": bot_id,
                "action": action,
                "error": str(e),
                "success": False,
            }

    async def create_quote(self, company_id: UUID, user_id: UUID, **params) -> Dict[str, Any]:
        """Create a quote via quote_generation bot."""
        return await self._exec("quote_generation", "create_quote", company_id, user_id, params)

    async def create_sales_order(self, company_id: UUID, user_id: UUID, **params) -> Dict[str, Any]:
        """Create a sales order via order_processing bot."""
        return await self._exec("sales_order", "create_sales_order", company_id, user_id, params)

    async def create_invoice(self, company_id: UUID, user_id: UUID, **params) -> Dict[str, Any]:
        """Create an invoice via accounts_payable bot."""
        return await self._exec("invoice_processing", "create_invoice", company_id, user_id, params)

    async def generate_document_pdf(self, company_id: UUID, user_id: UUID, **params) -> Dict[str, Any]:
        """Generate a PDF document via document_generation bot."""
        return await self._exec("document_generation", "generate_document_pdf", company_id, user_id, params)

    async def send_email(self, company_id: UUID, user_id: UUID, **params) -> Dict[str, Any]:
        """Send an email via email_integration bot."""
        return await self._exec("email_integration", "send_email", company_id, user_id, params)

    async def warehouse_management(self, company_id: UUID, user_id: UUID, **params) -> Dict[str, Any]:
        """Execute warehouse management action."""
        return await self._exec("warehouse_management", "warehouse_management", company_id, user_id, params)

    async def shipping(self, company_id: UUID, user_id: UUID, **params) -> Dict[str, Any]:
        """Execute shipping action."""
        return await self._exec("shipping", "shipping", company_id, user_id, params)
