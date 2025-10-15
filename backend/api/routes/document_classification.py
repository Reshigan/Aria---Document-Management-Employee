"""
Document Classification API Router
Advanced AI-powered document classification endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
import logging

from auth import get_db, get_current_user
from models import User, Document
from services.ai.enterprise_document_classifier import enterprise_classifier

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Document Classification"])

@router.post("/{document_id}/classify")
async def classify_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Classify a document using advanced AI models
    """
    try:
        logger.info(f"🤖 Classifying document {document_id} for user {current_user.id}")
        
        # Get document from database
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.uploaded_by == current_user.id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get document content (this would typically read from file storage)
        content = document.extracted_text or ""
        if not content:
            # Try to read content from file if available
            try:
                # In a real implementation, you'd read from the actual file
                content = f"Document: {document.filename}\nType: {document.document_type or 'Unknown'}"
            except Exception as e:
                logger.warning(f"Could not read document content: {e}")
                content = f"Document: {document.filename}"
        
        # Classify the document
        classification_result = await enterprise_classifier.classify_document(
            content=content,
            filename=document.filename,
            file_path=document.file_path,
            metadata={
                'document_id': document.id,
                'user_id': current_user.id,
                'upload_date': document.created_at.isoformat() if document.created_at else None
            }
        )
        
        # Update document with classification results
        if classification_result.get('final_classification'):
            final_class = classification_result['final_classification']
            document.document_type = final_class.get('document_type')
            document.document_category = final_class.get('category')
            
            # Store classification metadata
            if hasattr(document, 'metadata'):
                document.metadata = document.metadata or {}
                document.metadata['classification'] = classification_result
            
            db.commit()
        
        return classification_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Document classification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

@router.get("/")
async def get_documents(
    filter: str = Query("all", description="Filter documents by classification status"),
    sort_by: str = Query("created_at", description="Sort documents by field"),
    search: str = Query("", description="Search documents by filename"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get documents with optional filtering and sorting
    """
    try:
        logger.info(f"📄 Getting documents for user {current_user.id} with filter: {filter}")
        
        # Base query
        query = db.query(Document).filter(Document.uploaded_by == current_user.id)
        
        # Apply search filter
        if search:
            query = query.filter(Document.filename.contains(search))
        
        # Apply classification filter
        if filter == "classified":
            query = query.filter(Document.document_type.isnot(None))
        elif filter == "unclassified":
            query = query.filter(Document.document_type.is_(None))
        elif filter == "high_confidence":
            # This would require storing confidence scores in the database
            # For now, just return all classified documents
            query = query.filter(Document.document_type.isnot(None))
        elif filter == "low_confidence":
            # This would require storing confidence scores in the database
            # For now, return documents without classification
            query = query.filter(Document.document_type.is_(None))
        
        # Apply sorting
        if sort_by == "filename":
            query = query.order_by(Document.filename)
        elif sort_by == "document_type":
            query = query.order_by(Document.document_type)
        elif sort_by == "confidence":
            # Default to created_at since we don't have confidence in the model yet
            query = query.order_by(Document.created_at.desc())
        else:  # created_at
            query = query.order_by(Document.created_at.desc())
        
        documents = query.all()
        
        # Convert to dict format
        document_list = []
        for doc in documents:
            doc_dict = {
                'id': doc.id,
                'filename': doc.filename,
                'document_type': doc.document_type,
                'document_category': doc.document_category,
                'status': doc.status,
                'created_at': doc.created_at.isoformat() if doc.created_at else None,
                'file_path': doc.file_path,
                'extracted_text': doc.extracted_text[:200] + "..." if doc.extracted_text and len(doc.extracted_text) > 200 else doc.extracted_text
            }
            
            # Add classification result if available
            if hasattr(doc, 'metadata') and doc.metadata and 'classification' in doc.metadata:
                doc_dict['classification_result'] = doc.metadata['classification']
            
            document_list.append(doc_dict)
        
        return {
            "documents": document_list,
            "total": len(document_list),
            "filter": filter,
            "sort_by": sort_by,
            "search": search
        }
        
    except Exception as e:
        logger.error(f"❌ Get documents error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get documents: {str(e)}")

@router.get("/classification-stats")
async def get_classification_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get classification statistics and model information
    """
    try:
        logger.info(f"📊 Getting classification stats for user {current_user.id}")
        
        # Get document counts by type
        documents = db.query(Document).filter(Document.uploaded_by == current_user.id).all()
        
        total_documents = len(documents)
        classified_documents = len([d for d in documents if d.document_type])
        unclassified_documents = total_documents - classified_documents
        
        # Count by document type
        type_counts = {}
        
        for doc in documents:
            if doc.document_type:
                type_counts[doc.document_type] = type_counts.get(doc.document_type, 0) + 1
        
        # Get classifier stats
        classifier_stats = enterprise_classifier.get_classification_stats()
        
        return {
            "document_stats": {
                "total_documents": total_documents,
                "classified_documents": classified_documents,
                "unclassified_documents": unclassified_documents,
                "classification_rate": (classified_documents / max(total_documents, 1)) * 100
            },
            "type_distribution": type_counts,
            "classifier_info": classifier_stats,
            "supported_document_types": list(enterprise_classifier.ENTERPRISE_DOCUMENT_TYPES.keys())
        }
        
    except Exception as e:
        logger.error(f"❌ Classification stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get classification stats: {str(e)}")

@router.post("/batch-classify")
async def batch_classify_documents(
    document_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Classify multiple documents in batch
    """
    try:
        logger.info(f"🔄 Batch classifying {len(document_ids)} documents for user {current_user.id}")
        
        results = []
        errors = []
        
        for doc_id in document_ids:
            try:
                # Get document
                document = db.query(Document).filter(
                    Document.id == doc_id,
                    Document.user_id == current_user.id
                ).first()
                
                if not document:
                    errors.append(f"Document {doc_id} not found")
                    continue
                
                # Get content
                content = document.extracted_text or f"Document: {document.filename}"
                
                # Classify
                classification_result = await enterprise_classifier.classify_document(
                    content=content,
                    filename=document.filename,
                    file_path=document.file_path,
                    metadata={'document_id': document.id, 'user_id': current_user.id}
                )
                
                # Update document
                if classification_result.get('final_classification'):
                    final_class = classification_result['final_classification']
                    document.document_type = final_class.get('document_type')
                    document.document_category = final_class.get('category')
                
                results.append({
                    'document_id': doc_id,
                    'filename': document.filename,
                    'classification': classification_result
                })
                
            except Exception as e:
                errors.append(f"Document {doc_id}: {str(e)}")
        
        # Commit all changes
        db.commit()
        
        return {
            "success": True,
            "processed": len(results),
            "errors": len(errors),
            "results": results,
            "error_details": errors
        }
        
    except Exception as e:
        logger.error(f"❌ Batch classification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch classification failed: {str(e)}")

@router.delete("/classification-cache")
async def clear_classification_cache(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Clear classification cache
    """
    try:
        enterprise_classifier.clear_cache()
        
        return {
            "success": True,
            "message": "Classification cache cleared successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Cache clear error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Cache clear failed: {str(e)}")