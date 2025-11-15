"""
Multi-Currency Support System
Provides currency management, exchange rates, and FX revaluation
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from decimal import Decimal
import uuid
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException

class MultiCurrencyService:
    """Service for multi-currency operations"""
    
    BASE_CURRENCY = "ZAR"  # South African Rand as base currency
    
    @classmethod
    def get_exchange_rate(
        cls,
        db: Session,
        from_currency: str,
        to_currency: str,
        effective_date: Optional[date] = None
    ) -> Decimal:
        """
        Get exchange rate between two currencies
        
        Args:
            db: Database session
            from_currency: Source currency code
            to_currency: Target currency code
            effective_date: Date for exchange rate (defaults to today)
            
        Returns:
            Exchange rate as Decimal
        """
        if from_currency == to_currency:
            return Decimal("1.0")
        
        if effective_date is None:
            effective_date = date.today()
        
        try:
            query = text("""
                SELECT rate
                FROM exchange_rates
                WHERE from_currency = :from_currency
                AND to_currency = :to_currency
                AND effective_date <= :effective_date
                ORDER BY effective_date DESC
                LIMIT 1
            """)
            
            result = db.execute(query, {
                "from_currency": from_currency,
                "to_currency": to_currency,
                "effective_date": effective_date
            }).fetchone()
            
            if result:
                return Decimal(str(result[0]))
            
            inverse_query = text("""
                SELECT rate
                FROM exchange_rates
                WHERE from_currency = :to_currency
                AND to_currency = :from_currency
                AND effective_date <= :effective_date
                ORDER BY effective_date DESC
                LIMIT 1
            """)
            
            inverse_result = db.execute(inverse_query, {
                "from_currency": to_currency,
                "to_currency": from_currency,
                "effective_date": effective_date
            }).fetchone()
            
            if inverse_result:
                return Decimal("1.0") / Decimal(str(inverse_result[0]))
            
            raise HTTPException(
                status_code=404,
                detail=f"Exchange rate not found for {from_currency} to {to_currency}"
            )
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get exchange rate: {str(e)}")
    
    @classmethod
    def convert_amount(
        cls,
        db: Session,
        amount: Decimal,
        from_currency: str,
        to_currency: str,
        effective_date: Optional[date] = None
    ) -> Decimal:
        """
        Convert amount from one currency to another
        
        Args:
            db: Database session
            amount: Amount to convert
            from_currency: Source currency code
            to_currency: Target currency code
            effective_date: Date for exchange rate
            
        Returns:
            Converted amount as Decimal
        """
        rate = cls.get_exchange_rate(db, from_currency, to_currency, effective_date)
        return amount * rate
    
    @classmethod
    def add_exchange_rate(
        cls,
        db: Session,
        from_currency: str,
        to_currency: str,
        rate: Decimal,
        effective_date: date
    ) -> Dict[str, Any]:
        """
        Add or update exchange rate
        
        Args:
            db: Database session
            from_currency: Source currency code
            to_currency: Target currency code
            rate: Exchange rate
            effective_date: Effective date for rate
            
        Returns:
            Dict with rate details
        """
        try:
            rate_id = str(uuid.uuid4())
            
            query = text("""
                INSERT INTO exchange_rates (
                    id, from_currency, to_currency, rate, effective_date, created_at
                )
                VALUES (
                    :id, :from_currency, :to_currency, :rate, :effective_date, NOW()
                )
                ON CONFLICT (from_currency, to_currency, effective_date)
                DO UPDATE SET rate = :rate
                RETURNING id
            """)
            
            result = db.execute(query, {
                "id": rate_id,
                "from_currency": from_currency,
                "to_currency": to_currency,
                "rate": float(rate),
                "effective_date": effective_date
            }).fetchone()
            
            db.commit()
            
            return {
                "id": str(result[0]),
                "from_currency": from_currency,
                "to_currency": to_currency,
                "rate": float(rate),
                "effective_date": effective_date.isoformat()
            }
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to add exchange rate: {str(e)}")
    
    @classmethod
    def get_all_currencies(cls, db: Session) -> List[Dict[str, Any]]:
        """
        Get all active currencies
        
        Args:
            db: Database session
            
        Returns:
            List of currencies
        """
        try:
            query = text("""
                SELECT id, code, name, symbol, is_active
                FROM currencies
                WHERE is_active = true
                ORDER BY code
            """)
            
            result = db.execute(query)
            
            currencies = []
            for row in result:
                currencies.append({
                    "id": str(row[0]),
                    "code": row[1],
                    "name": row[2],
                    "symbol": row[3],
                    "is_active": row[4]
                })
            
            return currencies
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get currencies: {str(e)}")
    
    @classmethod
    def revalue_foreign_balances(
        cls,
        db: Session,
        company_id: str,
        revaluation_date: date
    ) -> Dict[str, Any]:
        """
        Perform FX revaluation of foreign currency balances
        
        Args:
            db: Database session
            company_id: Company context
            revaluation_date: Date for revaluation
            
        Returns:
            Dict with revaluation results
        """
        try:
            query = text("""
                SELECT 
                    account_id,
                    currency,
                    SUM(debit - credit) as balance
                FROM journal_entry_lines
                WHERE company_id = :company_id
                AND currency != :base_currency
                GROUP BY account_id, currency
                HAVING SUM(debit - credit) != 0
            """)
            
            result = db.execute(query, {
                "company_id": company_id,
                "base_currency": cls.BASE_CURRENCY
            })
            
            revaluation_entries = []
            total_gain_loss = Decimal("0")
            
            for row in result:
                account_id = row[0]
                currency = row[1]
                balance = Decimal(str(row[2]))
                
                current_rate = cls.get_exchange_rate(
                    db, currency, cls.BASE_CURRENCY, revaluation_date
                )
                
                revalued_balance = balance * current_rate
                
                original_query = text("""
                    SELECT SUM(debit - credit) as base_balance
                    FROM journal_entry_lines
                    WHERE company_id = :company_id
                    AND account_id = :account_id
                    AND currency = :base_currency
                """)
                
                original_result = db.execute(original_query, {
                    "company_id": company_id,
                    "account_id": account_id,
                    "base_currency": cls.BASE_CURRENCY
                }).fetchone()
                
                original_balance = Decimal(str(original_result[0])) if original_result[0] else Decimal("0")
                
                gain_loss = revalued_balance - original_balance
                
                if gain_loss != 0:
                    revaluation_entries.append({
                        "account_id": str(account_id),
                        "currency": currency,
                        "balance": float(balance),
                        "revalued_balance": float(revalued_balance),
                        "gain_loss": float(gain_loss)
                    })
                    
                    total_gain_loss += gain_loss
            
            return {
                "revaluation_date": revaluation_date.isoformat(),
                "base_currency": cls.BASE_CURRENCY,
                "total_gain_loss": float(total_gain_loss),
                "entries": revaluation_entries
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to revalue foreign balances: {str(e)}")
    
    @classmethod
    def get_exchange_rate_history(
        cls,
        db: Session,
        from_currency: str,
        to_currency: str,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        """
        Get exchange rate history for a currency pair
        
        Args:
            db: Database session
            from_currency: Source currency code
            to_currency: Target currency code
            start_date: Start date for history
            end_date: End date for history
            
        Returns:
            List of exchange rates with dates
        """
        try:
            query = text("""
                SELECT effective_date, rate
                FROM exchange_rates
                WHERE from_currency = :from_currency
                AND to_currency = :to_currency
                AND effective_date BETWEEN :start_date AND :end_date
                ORDER BY effective_date
            """)
            
            result = db.execute(query, {
                "from_currency": from_currency,
                "to_currency": to_currency,
                "start_date": start_date,
                "end_date": end_date
            })
            
            history = []
            for row in result:
                history.append({
                    "date": row[0].isoformat(),
                    "rate": float(row[1])
                })
            
            return history
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get exchange rate history: {str(e)}")
