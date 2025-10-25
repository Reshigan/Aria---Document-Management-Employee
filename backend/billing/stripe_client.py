"""
Stripe Billing Integration for ARIA
Handles subscriptions, payments, and billing for South African customers (ZAR)
"""
import os
import logging
import stripe
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_...")


class StripeClient:
    """Stripe billing client for ARIA"""
    
    # Pricing tiers (in ZAR cents)
    PRICING = {
        "starter": {
            "price": 1500000,  # R15,000 (in cents)
            "currency": "zar",
            "interval": "month",
            "name": "Starter Plan",
            "max_users": 5,
            "max_documents": 1000,
            "bot_requests_limit": 1000
        },
        "growth": {
            "price": 4500000,  # R45,000 (in cents)
            "currency": "zar",
            "interval": "month",
            "name": "Growth Plan",
            "max_users": 20,
            "max_documents": 10000,
            "bot_requests_limit": 10000
        },
        "pro": {
            "price": 13500000,  # R135,000 (in cents)
            "currency": "zar",
            "interval": "month",
            "name": "Pro Plan",
            "max_users": -1,  # Unlimited
            "max_documents": -1,  # Unlimited
            "bot_requests_limit": -1  # Unlimited
        }
    }
    
    def __init__(self):
        self.stripe = stripe
    
    async def create_customer(
        self,
        email: str,
        company_name: str,
        tenant_id: str,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Create a Stripe customer"""
        try:
            customer_metadata = {
                "tenant_id": tenant_id,
                "company_name": company_name,
                **(metadata or {})
            }
            
            customer = stripe.Customer.create(
                email=email,
                name=company_name,
                metadata=customer_metadata,
                preferred_locales=["en-ZA"]  # South Africa
            )
            
            logger.info(f"Created Stripe customer: {customer.id} for {email}")
            
            return {
                "customer_id": customer.id,
                "email": customer.email,
                "name": customer.name,
                "created": customer.created
            }
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating customer: {str(e)}")
            raise ValueError(f"Failed to create customer: {str(e)}")
    
    async def create_subscription(
        self,
        customer_id: str,
        plan: str,
        trial_days: int = 14
    ) -> Dict:
        """Create a subscription for a customer"""
        if plan not in self.PRICING:
            raise ValueError(f"Invalid plan: {plan}")
        
        try:
            # Create price if it doesn't exist
            price_id = await self._get_or_create_price(plan)
            
            # Calculate trial end
            trial_end = None
            if trial_days > 0:
                trial_end = int((datetime.utcnow() + timedelta(days=trial_days)).timestamp())
            
            # Create subscription
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{"price": price_id}],
                trial_end=trial_end,
                payment_behavior="default_incomplete",
                expand=["latest_invoice.payment_intent"],
                metadata={
                    "plan": plan,
                    "trial_days": trial_days
                }
            )
            
            logger.info(f"Created subscription: {subscription.id} for customer: {customer_id}")
            
            return {
                "subscription_id": subscription.id,
                "status": subscription.status,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "trial_end": subscription.trial_end,
                "plan": plan
            }
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating subscription: {str(e)}")
            raise ValueError(f"Failed to create subscription: {str(e)}")
    
    async def _get_or_create_price(self, plan: str) -> str:
        """Get or create a Stripe price for a plan"""
        plan_config = self.PRICING[plan]
        
        # Check if price already exists (search by metadata)
        try:
            prices = stripe.Price.list(
                active=True,
                currency=plan_config["currency"],
                type="recurring",
                limit=100
            )
            
            for price in prices.data:
                if (price.unit_amount == plan_config["price"] and
                    price.recurring.interval == plan_config["interval"] and
                    price.metadata.get("plan") == plan):
                    logger.info(f"Found existing price: {price.id} for plan: {plan}")
                    return price.id
        except stripe.error.StripeError as e:
            logger.warning(f"Error searching for price: {str(e)}")
        
        # Create new price
        try:
            # First, create a product
            product = stripe.Product.create(
                name=plan_config["name"],
                description=f"ARIA {plan_config['name']} - AI-powered ERP for South African businesses",
                metadata={"plan": plan}
            )
            
            # Then create the price
            price = stripe.Price.create(
                product=product.id,
                unit_amount=plan_config["price"],
                currency=plan_config["currency"],
                recurring={"interval": plan_config["interval"]},
                metadata={"plan": plan}
            )
            
            logger.info(f"Created price: {price.id} for plan: {plan}")
            return price.id
        
        except stripe.error.StripeError as e:
            logger.error(f"Error creating price: {str(e)}")
            raise ValueError(f"Failed to create price: {str(e)}")
    
    async def update_subscription(
        self,
        subscription_id: str,
        new_plan: str
    ) -> Dict:
        """Upgrade/downgrade a subscription"""
        if new_plan not in self.PRICING:
            raise ValueError(f"Invalid plan: {new_plan}")
        
        try:
            # Get current subscription
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            # Get new price
            new_price_id = await self._get_or_create_price(new_plan)
            
            # Update subscription
            updated_subscription = stripe.Subscription.modify(
                subscription_id,
                items=[{
                    "id": subscription["items"]["data"][0].id,
                    "price": new_price_id
                }],
                proration_behavior="create_prorations",  # Pro-rate the change
                metadata={"plan": new_plan}
            )
            
            logger.info(f"Updated subscription: {subscription_id} to plan: {new_plan}")
            
            return {
                "subscription_id": updated_subscription.id,
                "status": updated_subscription.status,
                "plan": new_plan,
                "current_period_start": updated_subscription.current_period_start,
                "current_period_end": updated_subscription.current_period_end
            }
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error updating subscription: {str(e)}")
            raise ValueError(f"Failed to update subscription: {str(e)}")
    
    async def cancel_subscription(
        self,
        subscription_id: str,
        at_period_end: bool = True
    ) -> Dict:
        """Cancel a subscription"""
        try:
            if at_period_end:
                # Cancel at end of current period
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
            else:
                # Cancel immediately
                subscription = stripe.Subscription.delete(subscription_id)
            
            logger.info(f"Cancelled subscription: {subscription_id} (at_period_end={at_period_end})")
            
            return {
                "subscription_id": subscription.id,
                "status": subscription.status,
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "canceled_at": subscription.canceled_at
            }
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error cancelling subscription: {str(e)}")
            raise ValueError(f"Failed to cancel subscription: {str(e)}")
    
    async def get_subscription(self, subscription_id: str) -> Dict:
        """Get subscription details"""
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            return {
                "subscription_id": subscription.id,
                "customer_id": subscription.customer,
                "status": subscription.status,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "trial_end": subscription.trial_end,
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "plan": subscription.metadata.get("plan")
            }
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error getting subscription: {str(e)}")
            raise ValueError(f"Failed to get subscription: {str(e)}")
    
    async def create_payment_intent(
        self,
        amount: int,
        currency: str = "zar",
        customer_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Create a payment intent for one-time payments"""
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency,
                customer=customer_id,
                metadata=metadata or {},
                automatic_payment_methods={"enabled": True}
            )
            
            logger.info(f"Created payment intent: {intent.id} for {amount} {currency}")
            
            return {
                "payment_intent_id": intent.id,
                "client_secret": intent.client_secret,
                "amount": intent.amount,
                "currency": intent.currency,
                "status": intent.status
            }
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payment intent: {str(e)}")
            raise ValueError(f"Failed to create payment intent: {str(e)}")
    
    async def get_invoices(
        self,
        customer_id: str,
        limit: int = 10
    ) -> List[Dict]:
        """Get customer invoices"""
        try:
            invoices = stripe.Invoice.list(
                customer=customer_id,
                limit=limit
            )
            
            return [
                {
                    "invoice_id": inv.id,
                    "amount_due": inv.amount_due,
                    "amount_paid": inv.amount_paid,
                    "currency": inv.currency,
                    "status": inv.status,
                    "invoice_pdf": inv.invoice_pdf,
                    "created": inv.created,
                    "due_date": inv.due_date
                }
                for inv in invoices.data
            ]
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error getting invoices: {str(e)}")
            raise ValueError(f"Failed to get invoices: {str(e)}")
    
    async def create_billing_portal_session(
        self,
        customer_id: str,
        return_url: str
    ) -> Dict:
        """Create a billing portal session for customer self-service"""
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url
            )
            
            logger.info(f"Created billing portal session for customer: {customer_id}")
            
            return {
                "session_id": session.id,
                "url": session.url
            }
        
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating billing portal: {str(e)}")
            raise ValueError(f"Failed to create billing portal: {str(e)}")
    
    async def handle_webhook(self, payload: bytes, signature: str) -> Dict:
        """Handle Stripe webhooks"""
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, webhook_secret
            )
            
            logger.info(f"Received webhook: {event['type']}")
            
            # Handle different event types
            if event["type"] == "customer.subscription.created":
                return await self._handle_subscription_created(event)
            elif event["type"] == "customer.subscription.updated":
                return await self._handle_subscription_updated(event)
            elif event["type"] == "customer.subscription.deleted":
                return await self._handle_subscription_deleted(event)
            elif event["type"] == "invoice.payment_succeeded":
                return await self._handle_payment_succeeded(event)
            elif event["type"] == "invoice.payment_failed":
                return await self._handle_payment_failed(event)
            else:
                logger.info(f"Unhandled webhook type: {event['type']}")
                return {"status": "ignored", "type": event["type"]}
        
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Webhook signature verification failed: {str(e)}")
            raise ValueError("Invalid webhook signature")
    
    async def _handle_subscription_created(self, event: Dict) -> Dict:
        """Handle subscription.created webhook"""
        subscription = event["data"]["object"]
        logger.info(f"Subscription created: {subscription['id']}")
        # TODO: Update tenant in database
        return {"status": "handled", "subscription_id": subscription["id"]}
    
    async def _handle_subscription_updated(self, event: Dict) -> Dict:
        """Handle subscription.updated webhook"""
        subscription = event["data"]["object"]
        logger.info(f"Subscription updated: {subscription['id']}")
        # TODO: Update tenant in database
        return {"status": "handled", "subscription_id": subscription["id"]}
    
    async def _handle_subscription_deleted(self, event: Dict) -> Dict:
        """Handle subscription.deleted webhook"""
        subscription = event["data"]["object"]
        logger.info(f"Subscription deleted: {subscription['id']}")
        # TODO: Deactivate tenant in database
        return {"status": "handled", "subscription_id": subscription["id"]}
    
    async def _handle_payment_succeeded(self, event: Dict) -> Dict:
        """Handle invoice.payment_succeeded webhook"""
        invoice = event["data"]["object"]
        logger.info(f"Payment succeeded: {invoice['id']}")
        # TODO: Update payment status in database
        return {"status": "handled", "invoice_id": invoice["id"]}
    
    async def _handle_payment_failed(self, event: Dict) -> Dict:
        """Handle invoice.payment_failed webhook"""
        invoice = event["data"]["object"]
        logger.error(f"Payment failed: {invoice['id']}")
        # TODO: Notify customer, update status in database
        return {"status": "handled", "invoice_id": invoice["id"]}


# Singleton instance
stripe_client = StripeClient()
