"""
Multi-Company Consolidation System
Provides consolidation with elimination entries
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from decimal import Decimal
import uuid
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException

class ConsolidationService:
    """Service for multi-company consolidation"""
    
    @classmethod
    def create_consolidation_group(
        cls,
        db: Session,
        name: str,
        parent_company_id: str,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a consolidation group
        
        Args:
            db: Database session
            name: Group name
            parent_company_id: ID of parent company
            description: Optional description
            
        Returns:
            Dict with group details
        """
        try:
            group_id = str(uuid.uuid4())
            
            query = text("""
                INSERT INTO consolidation_groups (
                    id, name, parent_company_id, description, created_at
                )
                VALUES (
                    :id, :name, :parent_company_id, :description, NOW()
                )
                RETURNING id, name
            """)
            
            result = db.execute(query, {
                "id": group_id,
                "name": name,
                "parent_company_id": parent_company_id,
                "description": description
            }).fetchone()
            
            db.commit()
            
            return {
                "id": str(result[0]),
                "name": result[1],
                "parent_company_id": parent_company_id,
                "description": description
            }
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create consolidation group: {str(e)}")
    
    @classmethod
    def add_member_to_group(
        cls,
        db: Session,
        group_id: str,
        company_id: str,
        ownership_percentage: Decimal = Decimal("100.00"),
        consolidation_method: str = "full"
    ) -> Dict[str, Any]:
        """
        Add a company to a consolidation group
        
        Args:
            db: Database session
            group_id: ID of consolidation group
            company_id: ID of company to add
            ownership_percentage: Ownership percentage (0-100)
            consolidation_method: Method (full, proportional, equity)
            
        Returns:
            Dict with member details
        """
        try:
            member_id = str(uuid.uuid4())
            
            query = text("""
                INSERT INTO consolidation_members (
                    id, group_id, company_id, ownership_percentage,
                    consolidation_method, created_at
                )
                VALUES (
                    :id, :group_id, :company_id, :ownership_percentage,
                    :consolidation_method, NOW()
                )
                RETURNING id
            """)
            
            result = db.execute(query, {
                "id": member_id,
                "group_id": group_id,
                "company_id": company_id,
                "ownership_percentage": float(ownership_percentage),
                "consolidation_method": consolidation_method
            }).fetchone()
            
            db.commit()
            
            return {
                "id": str(result[0]),
                "group_id": group_id,
                "company_id": company_id,
                "ownership_percentage": float(ownership_percentage),
                "consolidation_method": consolidation_method
            }
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to add member to group: {str(e)}")
    
    @classmethod
    def create_elimination_entry(
        cls,
        db: Session,
        group_id: str,
        description: str,
        entry_date: date,
        debit_account: str,
        credit_account: str,
        amount: Decimal
    ) -> Dict[str, Any]:
        """
        Create an elimination entry for consolidation
        
        Args:
            db: Database session
            group_id: ID of consolidation group
            description: Entry description
            entry_date: Date of entry
            debit_account: Debit account
            credit_account: Credit account
            amount: Entry amount
            
        Returns:
            Dict with entry details
        """
        try:
            entry_id = str(uuid.uuid4())
            
            query = text("""
                INSERT INTO elimination_entries (
                    id, group_id, description, entry_date,
                    debit_account, credit_account, amount, created_at
                )
                VALUES (
                    :id, :group_id, :description, :entry_date,
                    :debit_account, :credit_account, :amount, NOW()
                )
                RETURNING id
            """)
            
            result = db.execute(query, {
                "id": entry_id,
                "group_id": group_id,
                "description": description,
                "entry_date": entry_date,
                "debit_account": debit_account,
                "credit_account": credit_account,
                "amount": float(amount)
            }).fetchone()
            
            db.commit()
            
            return {
                "id": str(result[0]),
                "group_id": group_id,
                "description": description,
                "entry_date": entry_date.isoformat(),
                "debit_account": debit_account,
                "credit_account": credit_account,
                "amount": float(amount)
            }
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create elimination entry: {str(e)}")
    
    @classmethod
    def get_consolidated_balance_sheet(
        cls,
        db: Session,
        group_id: str,
        as_of_date: date
    ) -> Dict[str, Any]:
        """
        Generate consolidated balance sheet for a group
        
        Args:
            db: Database session
            group_id: ID of consolidation group
            as_of_date: Date for balance sheet
            
        Returns:
            Dict with consolidated balance sheet
        """
        try:
            members_query = text("""
                SELECT company_id, ownership_percentage, consolidation_method
                FROM consolidation_members
                WHERE group_id = :group_id
            """)
            
            members = db.execute(members_query, {"group_id": group_id}).fetchall()
            
            consolidated_balances = {}
            
            for member in members:
                company_id = str(member[0])
                ownership_pct = Decimal(str(member[1])) / Decimal("100")
                method = member[2]
                
                balances_query = text("""
                    SELECT 
                        coa.account_code,
                        coa.account_name,
                        coa.account_type,
                        SUM(jel.debit - jel.credit) as balance
                    FROM journal_entry_lines jel
                    JOIN chart_of_accounts coa ON jel.account_id = coa.id
                    JOIN journal_entries je ON jel.journal_entry_id = je.id
                    WHERE jel.company_id = :company_id
                    AND je.entry_date <= :as_of_date
                    AND je.status = 'posted'
                    GROUP BY coa.account_code, coa.account_name, coa.account_type
                """)
                
                balances = db.execute(balances_query, {
                    "company_id": company_id,
                    "as_of_date": as_of_date
                }).fetchall()
                
                for balance_row in balances:
                    account_code = balance_row[0]
                    account_name = balance_row[1]
                    account_type = balance_row[2]
                    balance = Decimal(str(balance_row[3]))
                    
                    if method == "full":
                        consolidated_amount = balance
                    elif method == "proportional":
                        consolidated_amount = balance * ownership_pct
                    else:  # equity method
                        consolidated_amount = balance * ownership_pct
                    
                    if account_code not in consolidated_balances:
                        consolidated_balances[account_code] = {
                            "account_code": account_code,
                            "account_name": account_name,
                            "account_type": account_type,
                            "balance": Decimal("0")
                        }
                    
                    consolidated_balances[account_code]["balance"] += consolidated_amount
            
            eliminations_query = text("""
                SELECT debit_account, credit_account, amount
                FROM elimination_entries
                WHERE group_id = :group_id
                AND entry_date <= :as_of_date
            """)
            
            eliminations = db.execute(eliminations_query, {
                "group_id": group_id,
                "as_of_date": as_of_date
            }).fetchall()
            
            for elim in eliminations:
                debit_account = elim[0]
                credit_account = elim[1]
                amount = Decimal(str(elim[2]))
                
                if debit_account in consolidated_balances:
                    consolidated_balances[debit_account]["balance"] += amount
                
                if credit_account in consolidated_balances:
                    consolidated_balances[credit_account]["balance"] -= amount
            
            balance_sheet = {
                "group_id": group_id,
                "as_of_date": as_of_date.isoformat(),
                "accounts": [
                    {
                        "account_code": acc["account_code"],
                        "account_name": acc["account_name"],
                        "account_type": acc["account_type"],
                        "balance": float(acc["balance"])
                    }
                    for acc in consolidated_balances.values()
                ]
            }
            
            return balance_sheet
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate consolidated balance sheet: {str(e)}")
    
    @classmethod
    def get_consolidation_groups(cls, db: Session) -> List[Dict[str, Any]]:
        """
        Get all consolidation groups
        
        Args:
            db: Database session
            
        Returns:
            List of consolidation groups
        """
        try:
            query = text("""
                SELECT id, name, parent_company_id, description, created_at
                FROM consolidation_groups
                ORDER BY name
            """)
            
            result = db.execute(query)
            
            groups = []
            for row in result:
                groups.append({
                    "id": str(row[0]),
                    "name": row[1],
                    "parent_company_id": str(row[2]),
                    "description": row[3],
                    "created_at": row[4].isoformat() if row[4] else None
                })
            
            return groups
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get consolidation groups: {str(e)}")
