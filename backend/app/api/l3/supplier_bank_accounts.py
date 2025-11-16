from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

try:
    from app.auth import get_db, get_current_user
except ImportError:
    try:
        from auth_integrated import get_db, get_current_user
    except ImportError:
        from app.database import SessionLocal
        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        from auth_integrated import get_current_user

router = APIRouter()


class SupplierBankAccountCreate(BaseModel):
    supplier_id: int
    bank_name: str
    account_number: str
    account_holder_name: str
    branch_code: Optional[str] = None
    swift_code: Optional[str] = None
    iban: Optional[str] = None
    currency: str = "USD"
    is_default: bool = False


@router.get("/supplier/{supplier_id}/bank-accounts")
async def get_supplier_bank_accounts(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all bank accounts for a supplier"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                sba.id,
                sba.bank_name,
                sba.account_number,
                sba.account_holder_name,
                sba.branch_code,
                sba.swift_code,
                sba.iban,
                sba.currency,
                sba.is_default,
                sba.is_active,
                sba.created_at
            FROM supplier_bank_accounts sba
            JOIN suppliers s ON sba.supplier_id = s.id
            WHERE sba.supplier_id = :supplier_id AND s.company_id = :company_id
            ORDER BY sba.is_default DESC, sba.created_at DESC
        """)
        
        result = db.execute(query, {"supplier_id": supplier_id, "company_id": company_id})
        rows = result.fetchall()
        
        accounts = []
        for row in rows:
            accounts.append({
                "id": row[0],
                "bank_name": row[1],
                "account_number": row[2],
                "account_holder_name": row[3],
                "branch_code": row[4],
                "swift_code": row[5],
                "iban": row[6],
                "currency": row[7],
                "is_default": row[8],
                "is_active": row[9],
                "created_at": str(row[10]) if row[10] else None
            })
        
        return {"bank_accounts": accounts, "total_count": len(accounts)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/supplier/{supplier_id}/bank-account")
async def create_supplier_bank_account(
    supplier_id: int,
    account: SupplierBankAccountCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a bank account for a supplier"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        supplier_query = text("""
            SELECT id FROM suppliers WHERE id = :supplier_id AND company_id = :company_id
        """)
        
        supplier_result = db.execute(supplier_query, {
            "supplier_id": supplier_id,
            "company_id": company_id
        }).fetchone()
        
        if not supplier_result:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        if account.is_default:
            unset_query = text("""
                UPDATE supplier_bank_accounts sba
                SET is_default = false, updated_at = NOW()
                FROM suppliers s
                WHERE sba.supplier_id = s.id
                    AND sba.supplier_id = :supplier_id 
                    AND s.company_id = :company_id
            """)
            
            db.execute(unset_query, {"supplier_id": supplier_id, "company_id": company_id})
        
        insert_query = text("""
            INSERT INTO supplier_bank_accounts (
                supplier_id, bank_name, account_number, account_holder_name,
                branch_code, swift_code, iban, currency, is_default,
                company_id, created_by, created_at
            ) VALUES (
                :supplier_id, :bank_name, :account_number, :account_holder_name,
                :branch_code, :swift_code, :iban, :currency, :is_default,
                :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "supplier_id": supplier_id,
            "bank_name": account.bank_name,
            "account_number": account.account_number,
            "account_holder_name": account.account_holder_name,
            "branch_code": account.branch_code,
            "swift_code": account.swift_code,
            "iban": account.iban,
            "currency": account.currency,
            "is_default": account.is_default,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        account_id = result.fetchone()[0]
        
        return {"id": account_id, "message": "Bank account created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/supplier-bank-account/{account_id}")
async def update_supplier_bank_account(
    account_id: int,
    bank_name: Optional[str] = None,
    account_number: Optional[str] = None,
    account_holder_name: Optional[str] = None,
    branch_code: Optional[str] = None,
    swift_code: Optional[str] = None,
    iban: Optional[str] = None,
    is_default: Optional[bool] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a supplier bank account"""
    try:
        company_id = current_user.get("company_id", "default")
        
        if is_default:
            get_supplier_query = text("""
                SELECT sba.supplier_id
                FROM supplier_bank_accounts sba
                JOIN suppliers s ON sba.supplier_id = s.id
                WHERE sba.id = :account_id AND s.company_id = :company_id
            """)
            
            supplier_result = db.execute(get_supplier_query, {
                "account_id": account_id,
                "company_id": company_id
            }).fetchone()
            
            if supplier_result:
                unset_query = text("""
                    UPDATE supplier_bank_accounts sba
                    SET is_default = false, updated_at = NOW()
                    FROM suppliers s
                    WHERE sba.supplier_id = s.id
                        AND sba.supplier_id = :supplier_id 
                        AND s.company_id = :company_id
                        AND sba.id != :account_id
                """)
                
                db.execute(unset_query, {
                    "supplier_id": supplier_result[0],
                    "company_id": company_id,
                    "account_id": account_id
                })
        
        updates = []
        params = {"account_id": account_id, "company_id": company_id}
        
        if bank_name is not None:
            updates.append("bank_name = :bank_name")
            params["bank_name"] = bank_name
        
        if account_number is not None:
            updates.append("account_number = :account_number")
            params["account_number"] = account_number
        
        if account_holder_name is not None:
            updates.append("account_holder_name = :account_holder_name")
            params["account_holder_name"] = account_holder_name
        
        if branch_code is not None:
            updates.append("branch_code = :branch_code")
            params["branch_code"] = branch_code
        
        if swift_code is not None:
            updates.append("swift_code = :swift_code")
            params["swift_code"] = swift_code
        
        if iban is not None:
            updates.append("iban = :iban")
            params["iban"] = iban
        
        if is_default is not None:
            updates.append("is_default = :is_default")
            params["is_default"] = is_default
        
        if is_active is not None:
            updates.append("is_active = :is_active")
            params["is_active"] = is_active
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = NOW()")
        update_clause = ", ".join(updates)
        
        query = text(f"""
            UPDATE supplier_bank_accounts sba
            SET {update_clause}
            FROM suppliers s
            WHERE sba.supplier_id = s.id
                AND sba.id = :account_id
                AND s.company_id = :company_id
        """)
        
        db.execute(query, params)
        db.commit()
        
        return {"message": "Bank account updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/supplier-bank-account/{account_id}")
async def delete_supplier_bank_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a supplier bank account"""
    try:
        company_id = current_user.get("company_id", "default")
        
        check_query = text("""
            SELECT COUNT(*)
            FROM supplier_payments sp
            JOIN suppliers s ON sp.supplier_id = s.id
            WHERE sp.bank_account_id = :account_id AND s.company_id = :company_id
        """)
        
        check_result = db.execute(check_query, {
            "account_id": account_id,
            "company_id": company_id
        }).fetchone()
        
        if check_result and check_result[0] > 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete bank account that has been used in payments"
            )
        
        delete_query = text("""
            DELETE FROM supplier_bank_accounts sba
            USING suppliers s
            WHERE sba.supplier_id = s.id
                AND sba.id = :account_id
                AND s.company_id = :company_id
        """)
        
        db.execute(delete_query, {"account_id": account_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Bank account deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/supplier-bank-account/{account_id}/payment-history")
async def get_bank_account_payment_history(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get payment history for a bank account"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                sp.id,
                sp.payment_number,
                sp.payment_date,
                sp.amount,
                sp.currency,
                sp.payment_method,
                sp.status,
                sp.reference_number
            FROM supplier_payments sp
            JOIN suppliers s ON sp.supplier_id = s.id
            WHERE sp.bank_account_id = :account_id AND s.company_id = :company_id
            ORDER BY sp.payment_date DESC
            LIMIT 100
        """)
        
        result = db.execute(query, {"account_id": account_id, "company_id": company_id})
        rows = result.fetchall()
        
        payments = []
        total_amount = 0
        
        for row in rows:
            amount = float(row[3]) if row[3] else 0
            total_amount += amount
            
            payments.append({
                "id": row[0],
                "payment_number": row[1],
                "payment_date": str(row[2]) if row[2] else None,
                "amount": amount,
                "currency": row[4],
                "payment_method": row[5],
                "status": row[6],
                "reference_number": row[7]
            })
        
        return {
            "payments": payments,
            "total_payments": len(payments),
            "total_amount": total_amount
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
