"""
Customer Service for Aria Controller
Handles customer creation without requiring HTTP authentication
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from models.transactions import Customer
from core.database import SessionLocal

logger = logging.getLogger(__name__)


def create_customer_from_aria(
    name: str,
    email: str,
    tenant_id: str = "default",
    phone: Optional[str] = None,
    additional_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create a customer in the database from Aria Controller
    
    Args:
        name: Customer name
        email: Customer email
        tenant_id: Tenant ID (default: "default")
        phone: Optional phone number
        additional_data: Optional additional customer data
    
    Returns:
        Dict with customer data including customer_id, customer_code, etc.
    """
    db: Session = SessionLocal()
    
    try:
        last_customer = db.query(Customer).filter(
            Customer.tenant_id == tenant_id
        ).order_by(Customer.id.desc()).first()
        
        next_number = 1 if not last_customer else (
            int(last_customer.customer_code.split('-')[-1]) + 1 
            if '-' in last_customer.customer_code 
            else 1
        )
        customer_code = f"CUST-{next_number:05d}"
        
        # Create customer
        db_customer = Customer(
            tenant_id=tenant_id,
            customer_code=customer_code,
            customer_name=name,
            email=email,
            phone=phone,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        if additional_data:
            for key, value in additional_data.items():
                if hasattr(db_customer, key):
                    setattr(db_customer, key, value)
        
        db.add(db_customer)
        db.commit()
        db.refresh(db_customer)
        
        logger.info(f"✅ Customer created: {customer_code} - {name}")
        
        return {
            "customer_id": db_customer.id,
            "customer_code": db_customer.customer_code,
            "customer_name": db_customer.customer_name,
            "email": db_customer.email,
            "phone": db_customer.phone,
            "created_at": db_customer.created_at.isoformat()
        }
    
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error creating customer: {e}")
        raise
    
    finally:
        db.close()
