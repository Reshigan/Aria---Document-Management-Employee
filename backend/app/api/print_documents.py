"""
Document Printing API
Provides endpoints to generate and download PDF documents
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
from app.dependencies import get_current_user
from app.services.pdf_generator import pdf_generator

router = APIRouter(prefix="/api/print", tags=["Document Printing"])


@router.get("/invoice/{invoice_id}")
async def print_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate and download invoice PDF"""
    try:
        company_id = current_user.get("organization_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Company ID not found")
        
        pdf_buffer = pdf_generator.generate_invoice_pdf(invoice_id, company_id)
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=invoice_{invoice_id}.pdf"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


@router.get("/quote/{quote_id}")
async def print_quote(
    quote_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate and download quote PDF"""
    try:
        company_id = current_user.get("organization_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Company ID not found")
        
        pdf_buffer = pdf_generator.generate_quote_pdf(quote_id, company_id)
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=quote_{quote_id}.pdf"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


@router.get("/purchase-order/{po_id}")
async def print_purchase_order(
    po_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate and download purchase order PDF"""
    try:
        company_id = current_user.get("organization_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Company ID not found")
        
        pdf_buffer = pdf_generator.generate_purchase_order_pdf(po_id, company_id)
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=purchase_order_{po_id}.pdf"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


@router.get("/sales-order/{so_id}")
async def print_sales_order(
    so_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate and download sales order PDF"""
    try:
        company_id = current_user.get("organization_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Company ID not found")
        
        pdf_buffer = pdf_generator.generate_quote_pdf(so_id, company_id)
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=sales_order_{so_id}.pdf"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


@router.get("/delivery/{delivery_id}")
async def print_delivery_note(
    delivery_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate and download delivery note PDF"""
    try:
        company_id = current_user.get("organization_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Company ID not found")
        
        pdf_buffer = pdf_generator.generate_quote_pdf(delivery_id, company_id)
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=delivery_{delivery_id}.pdf"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")
