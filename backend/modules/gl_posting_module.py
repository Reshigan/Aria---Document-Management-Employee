"""
GL Posting Engine Module - Priority 1
Implements real GL posting with double-entry validation, audit trail, and idempotency
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal
import hashlib
import logging
import asyncpg

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/erp/gl", tags=["GL Posting"])


# ============================================================================
# Pydantic Models
# ============================================================================

class JournalLineCreate(BaseModel):
    """Journal entry line item"""
    line_number: int
    account_code: str
    debit_amount: Decimal = Decimal('0.00')
    credit_amount: Decimal = Decimal('0.00')
    description: Optional[str] = None
    cost_center: Optional[str] = None
    department: Optional[str] = None
    
    @validator('debit_amount', 'credit_amount')
    def validate_amounts(cls, v):
        if v < 0:
            raise ValueError('Amounts cannot be negative')
        return v
    
    @validator('line_number')
    def validate_line_number(cls, v):
        if v < 1:
            raise ValueError('Line number must be positive')
        return v


class JournalEntryCreate(BaseModel):
    """Create journal entry request"""
    company_id: str
    reference: str
    entry_date: date
    posting_date: date
    description: str
    source: str = "MANUAL"  # MANUAL, AP, AR, DOCUMENT_UPLOAD, etc.
    source_document_hash: Optional[str] = None  # For idempotency
    source_document_name: Optional[str] = None
    lines: List[JournalLineCreate]
    
    @validator('lines')
    def validate_lines(cls, v):
        if len(v) < 2:
            raise ValueError('Journal entry must have at least 2 lines')
        
        total_debit = sum(line.debit_amount for line in v)
        total_credit = sum(line.credit_amount for line in v)
        
        if abs(total_debit - total_credit) > Decimal('0.01'):
            raise ValueError(
                f'Journal entry is not balanced: '
                f'Debits={total_debit}, Credits={total_credit}, '
                f'Difference={abs(total_debit - total_credit)}'
            )
        
        return v


class JournalEntryResponse(BaseModel):
    """Journal entry response"""
    id: str
    company_id: str
    reference: str
    entry_date: date
    posting_date: date
    description: str
    source: str
    status: str
    total_debit: Decimal
    total_credit: Decimal
    created_by: Optional[str]
    created_at: datetime
    posted_by: Optional[str]
    posted_at: Optional[datetime]
    lines: List[Dict[str, Any]]


class PostJournalEntryRequest(BaseModel):
    """Post journal entry to GL"""
    posted_by: str


# ============================================================================
# ============================================================================

async def get_db_connection():
    """Get PostgreSQL database connection"""
    import os
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured")
    
    try:
        conn = await asyncpg.connect(database_url)
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")


# ============================================================================
# ============================================================================

@router.post("/journal-entries", response_model=JournalEntryResponse)
async def create_journal_entry(entry: JournalEntryCreate):
    """
    Create a new journal entry (DRAFT status)
    
    Features:
    - Double-entry validation (debits = credits)
    - Idempotency check (prevents duplicate postings from same file)
    - Audit trail (user, timestamp, source file)
    - Account validation
    """
    conn = await get_db_connection()
    
    try:
        if entry.source_document_hash:
            existing = await conn.fetchrow(
                """
                SELECT id, reference, status 
                FROM journal_entries 
                WHERE source_document_hash = $1 AND company_id = $2
                """,
                entry.source_document_hash,
                entry.company_id
            )
            
            if existing:
                raise HTTPException(
                    status_code=409,
                    detail=f"Document already posted: {existing['reference']} (Status: {existing['status']})"
                )
        
        for line in entry.lines:
            logger.info(f"Validating account: code={line.account_code}, company_id={entry.company_id}")
            account = await conn.fetchrow(
                "SELECT code, name, is_active FROM chart_of_accounts WHERE code = $1 AND company_id = $2",
                line.account_code,
                entry.company_id
            )
            logger.info(f"Account query result: {account}")
            
            if not account:
                raise HTTPException(
                    status_code=400,
                    detail=f"Account code {line.account_code} not found in chart of accounts"
                )
            
            if not account['is_active']:
                raise HTTPException(
                    status_code=400,
                    detail=f"Account {line.account_code} ({account['name']}) is inactive"
                )
        
        # Calculate totals
        total_debit = sum(line.debit_amount for line in entry.lines)
        total_credit = sum(line.credit_amount for line in entry.lines)
        
        journal_entry = await conn.fetchrow(
            """
            INSERT INTO journal_entries (
                company_id, reference, entry_date, posting_date, description,
                source, source_document_hash, source_document_name,
                status, total_debit, total_credit, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, company_id, reference, entry_date, posting_date, description,
                      source, status, total_debit, total_credit, created_at
            """,
            entry.company_id,
            entry.reference,
            entry.entry_date,
            entry.posting_date,
            entry.description,
            entry.source,
            entry.source_document_hash,
            entry.source_document_name,
            'DRAFT',
            total_debit,
            total_credit,
            datetime.now()
        )
        
        lines_data = []
        for line in entry.lines:
            line_record = await conn.fetchrow(
                """
                INSERT INTO journal_entry_lines (
                    journal_entry_id, line_number, account_code,
                    debit_amount, credit_amount, description,
                    cost_center, department
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, line_number, account_code, debit_amount, credit_amount, description
                """,
                journal_entry['id'],
                line.line_number,
                line.account_code,
                line.debit_amount,
                line.credit_amount,
                line.description,
                line.cost_center,
                line.department
            )
            lines_data.append(dict(line_record))
        
        return JournalEntryResponse(
            id=str(journal_entry['id']),
            company_id=str(journal_entry['company_id']),
            reference=journal_entry['reference'],
            entry_date=journal_entry['entry_date'],
            posting_date=journal_entry['posting_date'],
            description=journal_entry['description'],
            source=journal_entry['source'],
            status=journal_entry['status'],
            total_debit=journal_entry['total_debit'],
            total_credit=journal_entry['total_credit'],
            created_by=None,
            created_at=journal_entry['created_at'],
            posted_by=None,
            posted_at=None,
            lines=lines_data
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating journal entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create journal entry: {str(e)}")
    finally:
        await conn.close()


@router.post("/journal-entries/{entry_id}/post")
async def post_journal_entry(entry_id: str, request: PostJournalEntryRequest):
    """
    Post journal entry to GL (change status from DRAFT to POSTED)
    
    Once posted:
    - Entry cannot be edited
    - Entry can only be reversed (not deleted)
    - Account balances are updated
    """
    conn = await get_db_connection()
    
    try:
        entry = await conn.fetchrow(
            """
            SELECT id, company_id, reference, status, total_debit, total_credit
            FROM journal_entries
            WHERE id = $1
            """,
            entry_id
        )
        
        if not entry:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        if entry['status'] == 'POSTED':
            raise HTTPException(status_code=400, detail="Journal entry already posted")
        
        if entry['status'] == 'REVERSED':
            raise HTTPException(status_code=400, detail="Cannot post reversed entry")
        
        if abs(entry['total_debit'] - entry['total_credit']) > Decimal('0.01'):
            raise HTTPException(
                status_code=400,
                detail="Journal entry is not balanced and cannot be posted"
            )
        
        await conn.execute(
            """
            UPDATE journal_entries
            SET status = 'POSTED',
                posted_by = $1,
                posted_at = $2
            WHERE id = $3
            """,
            request.posted_by,
            datetime.now(),
            entry_id
        )
        
        lines = await conn.fetch(
            """
            SELECT account_code, debit_amount, credit_amount
            FROM journal_entry_lines
            WHERE journal_entry_id = $1
            """,
            entry_id
        )
        
        for line in lines:
            account = await conn.fetchrow(
                """
                SELECT account_type, current_balance
                FROM chart_of_accounts
                WHERE code = $1 AND company_id = $2
                """,
                line['account_code'],
                entry['company_id']
            )
            
            if account:
                balance_change = Decimal('0')
                
                if account['account_type'] in ['asset', 'expense']:
                    balance_change = line['debit_amount'] - line['credit_amount']
                else:  # liability, equity, revenue
                    balance_change = line['credit_amount'] - line['debit_amount']
                
                new_balance = (account['current_balance'] or Decimal('0')) + balance_change
                
                await conn.execute(
                    """
                    UPDATE chart_of_accounts
                    SET current_balance = $1
                    WHERE code = $2 AND company_id = $3
                    """,
                    new_balance,
                    line['account_code'],
                    entry['company_id']
                )
        
        return {
            "status": "success",
            "message": f"Journal entry {entry['reference']} posted successfully",
            "entry_id": entry_id,
            "posted_at": datetime.now().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error posting journal entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to post journal entry: {str(e)}")
    finally:
        await conn.close()


@router.get("/journal-entries")
async def get_journal_entries(
    company_id: str,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """
    Get journal entries for a company
    
    Filters:
    - status: DRAFT, POSTED, REVERSED
    - limit/offset: pagination
    """
    conn = await get_db_connection()
    
    try:
        query = """
            SELECT id, company_id, reference, entry_date, posting_date, description,
                   source, status, total_debit, total_credit,
                   created_at, posted_by, posted_at
            FROM journal_entries
            WHERE company_id = $1
        """
        params = [company_id]
        
        if status:
            query += " AND status = $2"
            params.append(status)
        
        query += " ORDER BY entry_date DESC, created_at DESC LIMIT $" + str(len(params) + 1) + " OFFSET $" + str(len(params) + 2)
        params.extend([limit, offset])
        
        entries = await conn.fetch(query, *params)
        
        result = []
        for entry in entries:
            lines = await conn.fetch(
                """
                SELECT line_number, account_code, debit_amount, credit_amount, description
                FROM journal_entry_lines
                WHERE journal_entry_id = $1
                ORDER BY line_number
                """,
                entry['id']
            )
            
            result.append({
                "id": str(entry['id']),
                "company_id": str(entry['company_id']),
                "reference": entry['reference'],
                "entry_date": entry['entry_date'].isoformat(),
                "posting_date": entry['posting_date'].isoformat(),
                "description": entry['description'],
                "source": entry['source'],
                "status": entry['status'],
                "total_debit": float(entry['total_debit']),
                "total_credit": float(entry['total_credit']),
                "created_at": entry['created_at'].isoformat(),
                "posted_by": entry['posted_by'],
                "posted_at": entry['posted_at'].isoformat() if entry['posted_at'] else None,
                "lines": [dict(line) for line in lines]
            })
        
        return {
            "entries": result,
            "total": len(result),
            "limit": limit,
            "offset": offset
        }
    
    except Exception as e:
        logger.error(f"Error fetching journal entries: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch journal entries: {str(e)}")
    finally:
        await conn.close()


@router.get("/journal-entries/{entry_id}")
async def get_journal_entry(entry_id: str):
    """Get a specific journal entry with all lines"""
    conn = await get_db_connection()
    
    try:
        entry = await conn.fetchrow(
            """
            SELECT id, company_id, reference, entry_date, posting_date, description,
                   source, source_document_name, status, total_debit, total_credit,
                   created_at, posted_by, posted_at
            FROM journal_entries
            WHERE id = $1
            """,
            entry_id
        )
        
        if not entry:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        lines = await conn.fetch(
            """
            SELECT jel.line_number, jel.account_code, coa.name as account_name,
                   jel.debit_amount, jel.credit_amount, jel.description,
                   jel.cost_center, jel.department
            FROM journal_entry_lines jel
            LEFT JOIN chart_of_accounts coa ON jel.account_code = coa.code
            WHERE jel.journal_entry_id = $1
            ORDER BY jel.line_number
            """,
            entry_id
        )
        
        return {
            "id": str(entry['id']),
            "company_id": str(entry['company_id']),
            "reference": entry['reference'],
            "entry_date": entry['entry_date'].isoformat(),
            "posting_date": entry['posting_date'].isoformat(),
            "description": entry['description'],
            "source": entry['source'],
            "source_document_name": entry['source_document_name'],
            "status": entry['status'],
            "total_debit": float(entry['total_debit']),
            "total_credit": float(entry['total_credit']),
            "created_at": entry['created_at'].isoformat(),
            "posted_by": entry['posted_by'],
            "posted_at": entry['posted_at'].isoformat() if entry['posted_at'] else None,
            "lines": [dict(line) for line in lines]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching journal entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch journal entry: {str(e)}")
    finally:
        await conn.close()


@router.delete("/journal-entries/{entry_id}")
async def delete_journal_entry(entry_id: str):
    """
    Delete a journal entry (only if DRAFT status)
    Posted entries cannot be deleted, only reversed
    """
    conn = await get_db_connection()
    
    try:
        entry = await conn.fetchrow(
            "SELECT id, reference, status FROM journal_entries WHERE id = $1",
            entry_id
        )
        
        if not entry:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        if entry['status'] != 'DRAFT':
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete {entry['status']} entry. Posted entries must be reversed."
            )
        
        await conn.execute(
            "DELETE FROM journal_entry_lines WHERE journal_entry_id = $1",
            entry_id
        )
        
        await conn.execute(
            "DELETE FROM journal_entries WHERE id = $1",
            entry_id
        )
        
        return {
            "status": "success",
            "message": f"Journal entry {entry['reference']} deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting journal entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete journal entry: {str(e)}")
    finally:
        await conn.close()


@router.get("/health")
async def health_check():
    """Check GL posting module health"""
    try:
        conn = await get_db_connection()
        
        tables = await conn.fetch(
            """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('journal_entries', 'journal_entry_lines', 'chart_of_accounts')
            """
        )
        
        await conn.close()
        
        table_names = [t['table_name'] for t in tables]
        
        return {
            "status": "healthy",
            "module": "gl_posting",
            "tables_found": table_names,
            "tables_required": ["journal_entries", "journal_entry_lines", "chart_of_accounts"],
            "all_tables_exist": len(table_names) == 3
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "module": "gl_posting",
            "error": str(e)
        }


# ============================================================================
# ============================================================================

def calculate_file_hash(file_content: bytes) -> str:
    """Calculate SHA256 hash of file content for idempotency"""
    return hashlib.sha256(file_content).hexdigest()
