"""
Celery tasks for document processing.
"""
import logging
from pathlib import Path
from typing import Dict
from sqlalchemy import select
from backend.core.celery_app import celery_app
from backend.core.database import AsyncSessionLocal
from backend.models.document import Document, DocumentStatus as DBDocumentStatus
from backend.services.processing.ocr_service import ocr_service
from backend.services.processing.extraction_service import extraction_service
from backend.services.notifications.notification_service import notification_service

logger = logging.getLogger(__name__)


@celery_app.task(name='process_document', bind=True, max_retries=3)
def process_document_task(self, document_id: int):
    """
    Background task to process a document (OCR + extraction).
    
    Args:
        document_id: ID of the document to process
    """
    import asyncio
    
    async def _process():
        async with AsyncSessionLocal() as db:
            try:
                # Get document
                result = await db.execute(
                    select(Document).where(Document.id == document_id)
                )
                document = result.scalar_one_or_none()
                
                if not document:
                    logger.error(f"Document {document_id} not found")
                    return
                
                # Update status to processing
                document.status = DBDocumentStatus.PROCESSING
                await db.commit()
                
                logger.info(f"Starting OCR for document {document_id}")
                
                # Perform OCR
                ocr_result = ocr_service.process_document(document.file_path)
                full_text = ocr_result.get('full_text', '')
                
                # Extract structured data
                logger.info(f"Extracting data from document {document_id}")
                extracted_data = extraction_service.extract_invoice_data(full_text)
                
                # Update document with extracted data
                document.extracted_data = extracted_data
                document.confidence_score = extracted_data.get('confidence_score', 0.0)
                
                # Update specific fields if available
                if extracted_data.get('invoice_number'):
                    document.invoice_number = extracted_data['invoice_number']
                if extracted_data.get('invoice_date'):
                    document.invoice_date = extracted_data['invoice_date']
                if extracted_data.get('vendor_name'):
                    document.vendor_name = extracted_data['vendor_name']
                if extracted_data.get('total_amount'):
                    document.total_amount = extracted_data['total_amount']
                if extracted_data.get('currency'):
                    document.currency = extracted_data['currency']
                if extracted_data.get('purchase_order_number'):
                    document.purchase_order_number = extracted_data['purchase_order_number']
                
                # Update status
                if document.confidence_score >= 80:
                    document.status = DBDocumentStatus.COMPLETED
                elif document.confidence_score >= 50:
                    document.status = DBDocumentStatus.PENDING_VALIDATION
                else:
                    document.status = DBDocumentStatus.FAILED
                    document.error_message = "Low confidence score in data extraction"
                
                await db.commit()
                await db.refresh(document)
                
                logger.info(
                    f"Document {document_id} processed successfully. "
                    f"Status: {document.status}, Confidence: {document.confidence_score}"
                )
                
                # Send notification
                await notification_service.notify_document_processed(
                    document_id=document.id,
                    filename=document.filename,
                    status=document.status.value,
                    confidence=document.confidence_score
                )
                
                return {
                    'document_id': document.id,
                    'status': document.status.value,
                    'confidence_score': document.confidence_score,
                    'extracted_data': extracted_data
                }
                
            except Exception as e:
                logger.error(f"Error processing document {document_id}: {e}", exc_info=True)
                
                # Update document status to failed
                document.status = DBDocumentStatus.FAILED
                document.error_message = str(e)
                await db.commit()
                
                # Retry the task
                raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))
    
    # Run the async function
    return asyncio.run(_process())


@celery_app.task(name='reprocess_document')
def reprocess_document_task(document_id: int):
    """
    Reprocess a document that failed or needs re-extraction.
    
    Args:
        document_id: ID of the document to reprocess
    """
    return process_document_task(document_id)


@celery_app.task(name='batch_process_documents')
def batch_process_documents_task(document_ids: list):
    """
    Process multiple documents in batch.
    
    Args:
        document_ids: List of document IDs to process
    """
    results = []
    for doc_id in document_ids:
        try:
            result = process_document_task(doc_id)
            results.append({'document_id': doc_id, 'success': True, 'result': result})
        except Exception as e:
            logger.error(f"Error processing document {doc_id} in batch: {e}")
            results.append({'document_id': doc_id, 'success': False, 'error': str(e)})
    
    return results
