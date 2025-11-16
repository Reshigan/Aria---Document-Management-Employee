from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import date

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


class ExchangeRateCreate(BaseModel):
    from_currency: str
    to_currency: str
    rate: float
    effective_date: str
    rate_type: str = "SPOT"


@router.get("/exchange-rates")
async def get_exchange_rates(
    from_currency: Optional[str] = None,
    to_currency: Optional[str] = None,
    effective_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get exchange rates with optional filters"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["er.company_id = :company_id"]
        params = {"company_id": company_id}
        
        if from_currency:
            where_clauses.append("er.from_currency = :from_currency")
            params["from_currency"] = from_currency
        
        if to_currency:
            where_clauses.append("er.to_currency = :to_currency")
            params["to_currency"] = to_currency
        
        if effective_date:
            where_clauses.append("er.effective_date = :effective_date")
            params["effective_date"] = effective_date
        else:
            where_clauses.append("""
                er.effective_date = (
                    SELECT MAX(effective_date)
                    FROM exchange_rates er2
                    WHERE er2.from_currency = er.from_currency
                        AND er2.to_currency = er.to_currency
                        AND er2.company_id = er.company_id
                )
            """)
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                er.id,
                er.from_currency,
                er.to_currency,
                er.rate,
                er.effective_date,
                er.rate_type,
                er.source,
                er.is_active,
                er.created_at
            FROM exchange_rates er
            WHERE {where_clause}
            ORDER BY er.from_currency, er.to_currency, er.effective_date DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        rates = []
        for row in rows:
            rates.append({
                "id": row[0],
                "from_currency": row[1],
                "to_currency": row[2],
                "rate": float(row[3]) if row[3] else 0,
                "effective_date": str(row[4]) if row[4] else None,
                "rate_type": row[5],
                "source": row[6],
                "is_active": row[7],
                "created_at": str(row[8]) if row[8] else None
            })
        
        return {"exchange_rates": rates, "total_count": len(rates)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exchange-rate/{from_currency}/{to_currency}")
async def get_exchange_rate(
    from_currency: str,
    to_currency: str,
    effective_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get specific exchange rate for a currency pair"""
    try:
        company_id = current_user.get("company_id", "default")
        
        if not effective_date:
            effective_date = str(date.today())
        
        query = text("""
            SELECT 
                er.id,
                er.rate,
                er.effective_date,
                er.rate_type,
                er.source
            FROM exchange_rates er
            WHERE er.from_currency = :from_currency
                AND er.to_currency = :to_currency
                AND er.effective_date <= :effective_date
                AND er.company_id = :company_id
                AND er.is_active = true
            ORDER BY er.effective_date DESC
            LIMIT 1
        """)
        
        result = db.execute(query, {
            "from_currency": from_currency,
            "to_currency": to_currency,
            "effective_date": effective_date,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            reverse_query = text("""
                SELECT 
                    er.id,
                    1.0 / er.rate as rate,
                    er.effective_date,
                    er.rate_type,
                    er.source
                FROM exchange_rates er
                WHERE er.from_currency = :to_currency
                    AND er.to_currency = :from_currency
                    AND er.effective_date <= :effective_date
                    AND er.company_id = :company_id
                    AND er.is_active = true
                ORDER BY er.effective_date DESC
                LIMIT 1
            """)
            
            result = db.execute(reverse_query, {
                "from_currency": from_currency,
                "to_currency": to_currency,
                "effective_date": effective_date,
                "company_id": company_id
            }).fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=404,
                    detail=f"No exchange rate found for {from_currency} to {to_currency}"
                )
        
        return {
            "id": result[0],
            "from_currency": from_currency,
            "to_currency": to_currency,
            "rate": float(result[1]) if result[1] else 0,
            "effective_date": str(result[2]) if result[2] else None,
            "rate_type": result[3],
            "source": result[4]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/exchange-rate")
async def create_exchange_rate(
    rate: ExchangeRateCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new exchange rate"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        check_query = text("""
            SELECT id
            FROM exchange_rates
            WHERE from_currency = :from_currency
                AND to_currency = :to_currency
                AND effective_date = :effective_date
                AND company_id = :company_id
        """)
        
        existing = db.execute(check_query, {
            "from_currency": rate.from_currency,
            "to_currency": rate.to_currency,
            "effective_date": rate.effective_date,
            "company_id": company_id
        }).fetchone()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Exchange rate already exists for this date"
            )
        
        insert_query = text("""
            INSERT INTO exchange_rates (
                from_currency, to_currency, rate, effective_date,
                rate_type, company_id, created_by, created_at
            ) VALUES (
                :from_currency, :to_currency, :rate, :effective_date,
                :rate_type, :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "from_currency": rate.from_currency,
            "to_currency": rate.to_currency,
            "rate": rate.rate,
            "effective_date": rate.effective_date,
            "rate_type": rate.rate_type,
            "company_id": company_id,
            "created_by": user_email
        })
        
        reverse_insert_query = text("""
            INSERT INTO exchange_rates (
                from_currency, to_currency, rate, effective_date,
                rate_type, company_id, created_by, created_at
            ) VALUES (
                :from_currency, :to_currency, :rate, :effective_date,
                :rate_type, :company_id, :created_by, NOW()
            )
        """)
        
        db.execute(reverse_insert_query, {
            "from_currency": rate.to_currency,
            "to_currency": rate.from_currency,
            "rate": 1.0 / rate.rate,
            "effective_date": rate.effective_date,
            "rate_type": rate.rate_type,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        rate_id = result.fetchone()[0]
        
        return {"id": rate_id, "message": "Exchange rate created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/exchange-rate/convert")
async def convert_amount(
    from_currency: str,
    to_currency: str,
    amount: float,
    effective_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Convert an amount from one currency to another"""
    try:
        company_id = current_user.get("company_id", "default")
        
        if from_currency == to_currency:
            return {
                "from_currency": from_currency,
                "to_currency": to_currency,
                "from_amount": amount,
                "to_amount": amount,
                "rate": 1.0,
                "effective_date": effective_date or str(date.today())
            }
        
        if not effective_date:
            effective_date = str(date.today())
        
        rate_query = text("""
            SELECT rate, effective_date
            FROM exchange_rates
            WHERE from_currency = :from_currency
                AND to_currency = :to_currency
                AND effective_date <= :effective_date
                AND company_id = :company_id
                AND is_active = true
            ORDER BY effective_date DESC
            LIMIT 1
        """)
        
        rate_result = db.execute(rate_query, {
            "from_currency": from_currency,
            "to_currency": to_currency,
            "effective_date": effective_date,
            "company_id": company_id
        }).fetchone()
        
        if not rate_result:
            raise HTTPException(
                status_code=404,
                detail=f"No exchange rate found for {from_currency} to {to_currency}"
            )
        
        rate = float(rate_result[0]) if rate_result[0] else 1
        converted_amount = amount * rate
        
        return {
            "from_currency": from_currency,
            "to_currency": to_currency,
            "from_amount": amount,
            "to_amount": converted_amount,
            "rate": rate,
            "effective_date": str(rate_result[1]) if rate_result[1] else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exchange-rates/history/{from_currency}/{to_currency}")
async def get_exchange_rate_history(
    from_currency: str,
    to_currency: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get historical exchange rates for a currency pair"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = [
            "er.from_currency = :from_currency",
            "er.to_currency = :to_currency",
            "er.company_id = :company_id"
        ]
        params = {
            "from_currency": from_currency,
            "to_currency": to_currency,
            "company_id": company_id
        }
        
        if start_date:
            where_clauses.append("er.effective_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("er.effective_date <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                er.effective_date,
                er.rate,
                er.rate_type,
                er.source
            FROM exchange_rates er
            WHERE {where_clause}
            ORDER BY er.effective_date DESC
            LIMIT 365
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        history = []
        for row in rows:
            history.append({
                "effective_date": str(row[0]) if row[0] else None,
                "rate": float(row[1]) if row[1] else 0,
                "rate_type": row[2],
                "source": row[3]
            })
        
        return {"history": history, "total_count": len(history)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/currencies/list")
async def list_currencies(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get list of all currencies in the system"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT DISTINCT from_currency as currency
            FROM exchange_rates
            WHERE company_id = :company_id
            UNION
            SELECT DISTINCT to_currency as currency
            FROM exchange_rates
            WHERE company_id = :company_id
            ORDER BY currency
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        currencies = [row[0] for row in rows]
        
        return {"currencies": currencies, "total_count": len(currencies)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
