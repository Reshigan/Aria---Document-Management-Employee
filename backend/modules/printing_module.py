"""
Printing Module - Priority 4
Automatic printing integration with PrintNode and QZ Tray support
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncpg
import logging
import os
import httpx
import base64

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/erp/printing", tags=["Printing"])


# ============================================================================
# Pydantic Models
# ============================================================================

class PrintJobCreate(BaseModel):
    company_id: str
    document_id: Optional[str] = None
    document_type: str
    source_id: str
    printer_name: Optional[str] = None
    pdf_data: Optional[str] = None  # Base64 encoded PDF

class PrintJobResponse(BaseModel):
    id: str
    company_id: str
    document_type: str
    source_id: str
    printer_name: Optional[str]
    provider: str
    status: str
    attempts: int
    created_at: datetime

class PrinterCreate(BaseModel):
    company_id: str
    name: str
    provider: str
    provider_printer_id: Optional[str] = None
    location: Optional[str] = None
    is_default: bool = False

class PrinterResponse(BaseModel):
    id: str
    company_id: str
    name: str
    provider: str
    location: Optional[str]
    is_default: bool
    is_active: bool


# ============================================================================
# ============================================================================

async def get_db_connection():
    """Get PostgreSQL database connection"""
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

class PrintNodeAdapter:
    """Adapter for PrintNode cloud printing service"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.printnode.com"
    
    async def print_document(self, printer_id: str, pdf_data: bytes, title: str) -> Dict[str, Any]:
        """
        Send print job to PrintNode
        
        Args:
            printer_id: PrintNode printer ID
            pdf_data: PDF bytes
            title: Print job title
            
        Returns:
            Print job response from PrintNode
        """
        try:
            async with httpx.AsyncClient() as client:
                pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')
                
                response = await client.post(
                    f"{self.base_url}/printjobs",
                    auth=(self.api_key, ""),
                    json={
                        "printerId": int(printer_id),
                        "title": title,
                        "contentType": "pdf_base64",
                        "content": pdf_base64,
                        "source": "ARIA ERP"
                    }
                )
                
                if response.status_code != 201:
                    raise Exception(f"PrintNode API error: {response.status_code} - {response.text}")
                
                return response.json()
        
        except Exception as e:
            logger.error(f"PrintNode print failed: {e}")
            raise


class QZTrayAdapter:
    """Adapter for QZ Tray local printing"""
    
    async def print_document(self, printer_name: str, pdf_data: bytes, title: str) -> Dict[str, Any]:
        """
        Prepare print job for QZ Tray (client-side)
        
        QZ Tray requires client-side JavaScript to execute the print.
        This method returns the payload that the frontend should send to QZ Tray.
        
        Args:
            printer_name: Local printer name
            pdf_data: PDF bytes
            title: Print job title
            
        Returns:
            QZ Tray print payload
        """
        pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')
        
        return {
            "printer": printer_name,
            "data": [
                {
                    "type": "pdf",
                    "format": "base64",
                    "data": pdf_base64
                }
            ],
            "options": {
                "jobName": title
            }
        }


# ============================================================================
# ============================================================================

async def process_print_job(job_id: str):
    """
    Background task to process a print job
    
    Args:
        job_id: Print job ID to process
    """
    conn = await get_db_connection()
    
    try:
        job = await conn.fetchrow(
            """
            SELECT pj.*, pc.api_key, pc.provider as config_provider
            FROM print_jobs pj
            LEFT JOIN print_provider_config pc ON pj.company_id = pc.company_id AND pj.provider = pc.provider
            WHERE pj.id = $1
            """,
            job_id
        )
        
        if not job:
            logger.error(f"Print job {job_id} not found")
            return
        
        if job['attempts'] >= job['max_attempts']:
            await conn.execute(
                """
                UPDATE print_jobs
                SET status = 'failed', last_error = 'Max attempts reached', updated_at = NOW()
                WHERE id = $1
                """,
                job_id
            )
            logger.warning(f"Print job {job_id} failed after {job['attempts']} attempts")
            return
        
        await conn.execute(
            """
            UPDATE print_jobs
            SET attempts = attempts + 1, status = 'printing', updated_at = NOW()
            WHERE id = $1
            """,
            job_id
        )
        
        pdf_data = job['pdf_data']
        if not pdf_data:
            raise Exception("No PDF data available")
        
        provider = job['provider']
        
        if provider == 'printnode':
            if not job['api_key']:
                raise Exception("PrintNode API key not configured")
            
            adapter = PrintNodeAdapter(job['api_key'])
            result = await adapter.print_document(
                job['printer_name'],
                bytes(pdf_data),
                f"{job['document_type']}_{job['source_id']}"
            )
            
            await conn.execute(
                """
                UPDATE print_jobs
                SET status = 'completed', printed_at = NOW(), updated_at = NOW()
                WHERE id = $1
                """,
                job_id
            )
            logger.info(f"Print job {job_id} completed successfully")
        
        elif provider == 'qz_tray':
            await conn.execute(
                """
                UPDATE print_jobs
                SET status = 'queued', updated_at = NOW()
                WHERE id = $1
                """,
                job_id
            )
            logger.info(f"Print job {job_id} queued for QZ Tray client")
        
        else:
            await conn.execute(
                """
                UPDATE print_jobs
                SET status = 'queued', updated_at = NOW()
                WHERE id = $1
                """,
                job_id
            )
            logger.info(f"Print job {job_id} queued for manual printing")
    
    except Exception as e:
        logger.error(f"Error processing print job {job_id}: {e}")
        
        await conn.execute(
            """
            UPDATE print_jobs
            SET status = 'failed', last_error = $2, updated_at = NOW()
            WHERE id = $1
            """,
            job_id,
            str(e)
        )
    
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/jobs")
async def create_print_job(job: PrintJobCreate, background_tasks: BackgroundTasks):
    """
    Create a new print job
    
    If printer_name is not specified, uses the default printer for the company.
    If pdf_data is not provided, fetches from document_id.
    """
    conn = await get_db_connection()
    
    try:
        if job.printer_name:
            printer = await conn.fetchrow(
                """
                SELECT * FROM printers
                WHERE company_id = $1 AND name = $2 AND is_active = true
                """,
                job.company_id,
                job.printer_name
            )
        else:
            printer = await conn.fetchrow(
                """
                SELECT * FROM printers
                WHERE company_id = $1 AND is_default = true AND is_active = true
                LIMIT 1
                """,
                job.company_id
            )
        
        if not printer:
            raise HTTPException(
                status_code=404,
                detail="No printer configured. Please configure a printer first."
            )
        
        pdf_data = None
        if job.pdf_data:
            pdf_data = base64.b64decode(job.pdf_data)
        elif job.document_id:
            pass
        
        new_job = await conn.fetchrow(
            """
            INSERT INTO print_jobs 
            (company_id, document_id, document_type, source_id, printer_name, provider, pdf_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, company_id, document_type, source_id, printer_name, provider, status, attempts, created_at
            """,
            job.company_id,
            job.document_id,
            job.document_type,
            job.source_id,
            printer['name'],
            printer['provider'],
            pdf_data
        )
        
        background_tasks.add_task(process_print_job, str(new_job['id']))
        
        return {
            "status": "success",
            "message": "Print job created successfully",
            "job": PrintJobResponse(
                id=str(new_job['id']),
                company_id=str(new_job['company_id']),
                document_type=new_job['document_type'],
                source_id=str(new_job['source_id']),
                printer_name=new_job['printer_name'],
                provider=new_job['provider'],
                status=new_job['status'],
                attempts=new_job['attempts'],
                created_at=new_job['created_at']
            )
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating print job: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create print job: {str(e)}")
    finally:
        await conn.close()


@router.get("/jobs")
async def list_print_jobs(
    company_id: str,
    status: Optional[str] = None,
    limit: int = 50
):
    """List print jobs for a company"""
    conn = await get_db_connection()
    
    try:
        if status:
            jobs = await conn.fetch(
                """
                SELECT id, company_id, document_type, source_id, printer_name, 
                       provider, status, attempts, created_at, printed_at
                FROM print_jobs
                WHERE company_id = $1 AND status = $2
                ORDER BY created_at DESC
                LIMIT $3
                """,
                company_id,
                status,
                limit
            )
        else:
            jobs = await conn.fetch(
                """
                SELECT id, company_id, document_type, source_id, printer_name, 
                       provider, status, attempts, created_at, printed_at
                FROM print_jobs
                WHERE company_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                """,
                company_id,
                limit
            )
        
        return {
            "jobs": [
                {
                    "id": str(job['id']),
                    "company_id": str(job['company_id']),
                    "document_type": job['document_type'],
                    "source_id": str(job['source_id']),
                    "printer_name": job['printer_name'],
                    "provider": job['provider'],
                    "status": job['status'],
                    "attempts": job['attempts'],
                    "created_at": job['created_at'].isoformat(),
                    "printed_at": job['printed_at'].isoformat() if job['printed_at'] else None
                }
                for job in jobs
            ],
            "total": len(jobs)
        }
    
    except Exception as e:
        logger.error(f"Error listing print jobs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list print jobs: {str(e)}")
    finally:
        await conn.close()


@router.post("/jobs/{job_id}/retry")
async def retry_print_job(job_id: str, background_tasks: BackgroundTasks):
    """Retry a failed print job"""
    conn = await get_db_connection()
    
    try:
        job = await conn.fetchrow(
            "SELECT id, status FROM print_jobs WHERE id = $1",
            job_id
        )
        
        if not job:
            raise HTTPException(status_code=404, detail=f"Print job {job_id} not found")
        
        if job['status'] not in ['failed', 'queued']:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot retry job with status '{job['status']}'"
            )
        
        await conn.execute(
            """
            UPDATE print_jobs
            SET status = 'queued', attempts = 0, last_error = NULL, updated_at = NOW()
            WHERE id = $1
            """,
            job_id
        )
        
        background_tasks.add_task(process_print_job, job_id)
        
        return {
            "status": "success",
            "message": f"Print job {job_id} queued for retry"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying print job: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retry print job: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.get("/printers")
async def list_printers(company_id: str):
    """List all printers for a company"""
    conn = await get_db_connection()
    
    try:
        printers = await conn.fetch(
            """
            SELECT id, company_id, name, provider, location, is_default, is_active
            FROM printers
            WHERE company_id = $1
            ORDER BY is_default DESC, name
            """,
            company_id
        )
        
        return {
            "printers": [
                PrinterResponse(
                    id=str(p['id']),
                    company_id=str(p['company_id']),
                    name=p['name'],
                    provider=p['provider'],
                    location=p['location'],
                    is_default=p['is_default'],
                    is_active=p['is_active']
                )
                for p in printers
            ],
            "total": len(printers)
        }
    
    except Exception as e:
        logger.error(f"Error listing printers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list printers: {str(e)}")
    finally:
        await conn.close()


@router.post("/printers")
async def create_printer(printer: PrinterCreate):
    """Create a new printer configuration"""
    conn = await get_db_connection()
    
    try:
        if printer.is_default:
            await conn.execute(
                """
                UPDATE printers
                SET is_default = false
                WHERE company_id = $1
                """,
                printer.company_id
            )
        
        new_printer = await conn.fetchrow(
            """
            INSERT INTO printers 
            (company_id, name, provider, provider_printer_id, location, is_default)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, company_id, name, provider, location, is_default, is_active
            """,
            printer.company_id,
            printer.name,
            printer.provider,
            printer.provider_printer_id,
            printer.location,
            printer.is_default
        )
        
        return {
            "status": "success",
            "message": f"Printer '{printer.name}' created successfully",
            "printer": PrinterResponse(
                id=str(new_printer['id']),
                company_id=str(new_printer['company_id']),
                name=new_printer['name'],
                provider=new_printer['provider'],
                location=new_printer['location'],
                is_default=new_printer['is_default'],
                is_active=new_printer['is_active']
            )
        }
    
    except Exception as e:
        logger.error(f"Error creating printer: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create printer: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check endpoint for printing module"""
    conn = await get_db_connection()
    
    try:
        job_count = await conn.fetchval("SELECT COUNT(*) FROM print_jobs")
        printer_count = await conn.fetchval("SELECT COUNT(*) FROM printers WHERE is_active = true")
        queued_count = await conn.fetchval("SELECT COUNT(*) FROM print_jobs WHERE status = 'queued'")
        
        return {
            "status": "healthy",
            "module": "printing",
            "total_jobs": job_count,
            "active_printers": printer_count,
            "queued_jobs": queued_count,
            "providers_available": ["printnode", "qz_tray", "manual"]
        }
    
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "module": "printing",
            "error": str(e)
        }
    finally:
        await conn.close()
