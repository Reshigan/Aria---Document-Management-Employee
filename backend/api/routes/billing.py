"""
Billing API Routes - Stripe integration
Manage subscriptions, payments, and billing for tenants
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field

from backend.auth.jwt_auth import get_current_user, require_role
from backend.billing.stripe_client import stripe_client

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models
class CreateSubscriptionRequest(BaseModel):
    """Request to create a subscription"""
    plan: str = Field(..., description="Subscription plan (starter/growth/pro)")
    trial_days: int = Field(14, description="Trial period in days", ge=0, le=30)


class UpdateSubscriptionRequest(BaseModel):
    """Request to update a subscription"""
    new_plan: str = Field(..., description="New subscription plan")


class CancelSubscriptionRequest(BaseModel):
    """Request to cancel a subscription"""
    at_period_end: bool = Field(True, description="Cancel at end of billing period")


class CreatePaymentIntentRequest(BaseModel):
    """Request to create a payment intent"""
    amount: int = Field(..., description="Amount in cents", gt=0)
    currency: str = Field("zar", description="Currency code")
    metadata: Optional[dict] = Field(None, description="Additional metadata")


@router.post("/subscription", status_code=status.HTTP_201_CREATED)
async def create_subscription(
    request: CreateSubscriptionRequest,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(require_role("admin"))
):
    """
    Create a new subscription for the tenant
    Requires admin role
    """
    try:
        tenant_id = current_user["tenant_id"]
        
        # Get or create Stripe customer
        # TODO: Fetch tenant from database to get stripe_customer_id
        customer_id = "cus_..."  # Placeholder
        
        if not customer_id:
            # Create customer
            customer = await stripe_client.create_customer(
                email=current_user["email"],
                company_name="Company Name",  # TODO: Get from tenant
                tenant_id=tenant_id
            )
            customer_id = customer["customer_id"]
            # TODO: Save customer_id to tenant in database
        
        # Create subscription
        subscription = await stripe_client.create_subscription(
            customer_id=customer_id,
            plan=request.plan,
            trial_days=request.trial_days
        )
        
        # TODO: Update tenant in database with subscription details
        
        logger.info(f"Created subscription for tenant: {tenant_id}")
        
        return {
            "success": True,
            "subscription": subscription,
            "message": f"Subscription created successfully with {request.trial_days}-day trial"
        }
    
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create subscription")


@router.get("/subscription")
async def get_subscription(
    current_user: dict = Depends(get_current_user)
):
    """Get current subscription details"""
    try:
        # TODO: Fetch tenant from database to get stripe_subscription_id
        subscription_id = "sub_..."  # Placeholder
        
        if not subscription_id:
            return {
                "success": True,
                "subscription": None,
                "message": "No active subscription"
            }
        
        subscription = await stripe_client.get_subscription(subscription_id)
        
        return {
            "success": True,
            "subscription": subscription
        }
    
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting subscription: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get subscription")


@router.put("/subscription")
async def update_subscription(
    request: UpdateSubscriptionRequest,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(require_role("admin"))
):
    """
    Update subscription plan (upgrade/downgrade)
    Requires admin role
    """
    try:
        # TODO: Fetch tenant from database to get stripe_subscription_id
        subscription_id = "sub_..."  # Placeholder
        
        if not subscription_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active subscription")
        
        subscription = await stripe_client.update_subscription(
            subscription_id=subscription_id,
            new_plan=request.new_plan
        )
        
        # TODO: Update tenant in database with new plan
        
        logger.info(f"Updated subscription for tenant: {current_user['tenant_id']}")
        
        return {
            "success": True,
            "subscription": subscription,
            "message": f"Subscription updated to {request.new_plan} plan"
        }
    
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating subscription: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update subscription")


@router.delete("/subscription")
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(require_role("admin"))
):
    """
    Cancel subscription
    Requires admin role
    """
    try:
        # TODO: Fetch tenant from database to get stripe_subscription_id
        subscription_id = "sub_..."  # Placeholder
        
        if not subscription_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active subscription")
        
        subscription = await stripe_client.cancel_subscription(
            subscription_id=subscription_id,
            at_period_end=request.at_period_end
        )
        
        # TODO: Update tenant in database
        
        logger.info(f"Cancelled subscription for tenant: {current_user['tenant_id']}")
        
        cancel_message = (
            "Subscription will be cancelled at the end of the billing period"
            if request.at_period_end
            else "Subscription cancelled immediately"
        )
        
        return {
            "success": True,
            "subscription": subscription,
            "message": cancel_message
        }
    
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error cancelling subscription: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to cancel subscription")


@router.get("/invoices")
async def get_invoices(
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get billing invoices"""
    try:
        # TODO: Fetch tenant from database to get stripe_customer_id
        customer_id = "cus_..."  # Placeholder
        
        if not customer_id:
            return {
                "success": True,
                "invoices": [],
                "message": "No invoices found"
            }
        
        invoices = await stripe_client.get_invoices(
            customer_id=customer_id,
            limit=limit
        )
        
        return {
            "success": True,
            "invoices": invoices,
            "total": len(invoices)
        }
    
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting invoices: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get invoices")


@router.post("/payment-intent")
async def create_payment_intent(
    request: CreatePaymentIntentRequest,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(require_role("admin"))
):
    """
    Create a payment intent for one-time payments
    Requires admin role
    """
    try:
        # TODO: Fetch tenant from database to get stripe_customer_id
        customer_id = "cus_..."  # Placeholder
        
        payment_intent = await stripe_client.create_payment_intent(
            amount=request.amount,
            currency=request.currency,
            customer_id=customer_id,
            metadata=request.metadata
        )
        
        logger.info(f"Created payment intent for tenant: {current_user['tenant_id']}")
        
        return {
            "success": True,
            "payment_intent": payment_intent
        }
    
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating payment intent: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create payment intent")


@router.get("/portal")
async def get_billing_portal(
    return_url: str,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(require_role("admin"))
):
    """
    Get Stripe billing portal URL for customer self-service
    Requires admin role
    """
    try:
        # TODO: Fetch tenant from database to get stripe_customer_id
        customer_id = "cus_..."  # Placeholder
        
        if not customer_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No Stripe customer found")
        
        session = await stripe_client.create_billing_portal_session(
            customer_id=customer_id,
            return_url=return_url
        )
        
        return {
            "success": True,
            "url": session["url"]
        }
    
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating billing portal: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create billing portal")


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhooks
    No authentication required (verified by Stripe signature)
    """
    try:
        payload = await request.body()
        signature = request.headers.get("stripe-signature")
        
        if not signature:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing stripe-signature header")
        
        result = await stripe_client.handle_webhook(payload, signature)
        
        return {"success": True, "result": result}
    
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error handling webhook: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook handling failed")


@router.get("/plans")
async def get_pricing_plans():
    """
    Get available pricing plans
    Public endpoint (no authentication required)
    """
    return {
        "success": True,
        "plans": [
            {
                "id": "starter",
                "name": "Starter",
                "price": 15000,  # R15,000
                "currency": "ZAR",
                "interval": "month",
                "features": {
                    "max_users": 5,
                    "max_documents": 1000,
                    "bot_requests_limit": 1000,
                    "bbbee_enabled": False,
                    "sars_payroll_enabled": False
                },
                "description": "Perfect for small businesses getting started with AI automation"
            },
            {
                "id": "growth",
                "name": "Growth",
                "price": 45000,  # R45,000
                "currency": "ZAR",
                "interval": "month",
                "features": {
                    "max_users": 20,
                    "max_documents": 10000,
                    "bot_requests_limit": 10000,
                    "bbbee_enabled": True,
                    "sars_payroll_enabled": True
                },
                "description": "For growing businesses that need BBBEE and SARS compliance"
            },
            {
                "id": "pro",
                "name": "Pro",
                "price": 135000,  # R135,000
                "currency": "ZAR",
                "interval": "month",
                "features": {
                    "max_users": -1,  # Unlimited
                    "max_documents": -1,  # Unlimited
                    "bot_requests_limit": -1,  # Unlimited
                    "bbbee_enabled": True,
                    "sars_payroll_enabled": True
                },
                "description": "Enterprise-grade AI ERP with unlimited everything"
            }
        ]
    }
