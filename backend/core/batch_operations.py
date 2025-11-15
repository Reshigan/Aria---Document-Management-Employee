"""
Batch Operations System
Provides bulk approve, bulk post, bulk export functionality
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException
import csv
import io

class BatchOperations:
    """Service for batch operations on multiple documents"""
    
    @classmethod
    def bulk_approve(
        cls,
        db: Session,
        document_type: str,
        document_ids: List[str],
        company_id: str,
        approver_email: str
    ) -> Dict[str, Any]:
        """
        Approve multiple documents in a single operation
        
        Args:
            db: Database session
            document_type: Type of documents (sales_orders, purchase_orders, etc.)
            document_ids: List of document IDs to approve
            company_id: Company context
            approver_email: Email of approver
            
        Returns:
            Dict with success/failure counts and details
        """
        results = {
            "total": len(document_ids),
            "successful": 0,
            "failed": 0,
            "errors": []
        }
        
        try:
            for doc_id in document_ids:
                try:
                    query = text(f"""
                        UPDATE {document_type}
                        SET approval_status = 'approved',
                            approved_by = :approver,
                            approved_at = NOW(),
                            updated_at = NOW()
                        WHERE id = :doc_id
                        AND company_id = :company_id
                        AND approval_status = 'pending_approval'
                        RETURNING id
                    """)
                    
                    result = db.execute(query, {
                        "approver": approver_email,
                        "doc_id": doc_id,
                        "company_id": company_id
                    })
                    
                    if result.rowcount > 0:
                        results["successful"] += 1
                    else:
                        results["failed"] += 1
                        results["errors"].append({
                            "document_id": doc_id,
                            "error": "Document not found or not in pending approval state"
                        })
                        
                except Exception as e:
                    results["failed"] += 1
                    results["errors"].append({
                        "document_id": doc_id,
                        "error": str(e)
                    })
            
            db.commit()
            
            return results
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Batch approve failed: {str(e)}")
    
    @classmethod
    def bulk_post(
        cls,
        db: Session,
        document_type: str,
        document_ids: List[str],
        company_id: str,
        user_email: str
    ) -> Dict[str, Any]:
        """
        Post multiple documents in a single operation
        
        Args:
            db: Database session
            document_type: Type of documents
            document_ids: List of document IDs to post
            company_id: Company context
            user_email: Email of user posting
            
        Returns:
            Dict with success/failure counts and details
        """
        results = {
            "total": len(document_ids),
            "successful": 0,
            "failed": 0,
            "errors": []
        }
        
        try:
            for doc_id in document_ids:
                try:
                    query = text(f"""
                        UPDATE {document_type}
                        SET status = 'posted',
                            posted_at = NOW(),
                            posted_by = :user_email,
                            updated_at = NOW()
                        WHERE id = :doc_id
                        AND company_id = :company_id
                        AND status IN ('draft', 'approved')
                        RETURNING id
                    """)
                    
                    result = db.execute(query, {
                        "user_email": user_email,
                        "doc_id": doc_id,
                        "company_id": company_id
                    })
                    
                    if result.rowcount > 0:
                        results["successful"] += 1
                    else:
                        results["failed"] += 1
                        results["errors"].append({
                            "document_id": doc_id,
                            "error": "Document not found or not in postable state"
                        })
                        
                except Exception as e:
                    results["failed"] += 1
                    results["errors"].append({
                        "document_id": doc_id,
                        "error": str(e)
                    })
            
            db.commit()
            
            return results
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Batch post failed: {str(e)}")
    
    @classmethod
    def bulk_export(
        cls,
        db: Session,
        document_type: str,
        document_ids: List[str],
        company_id: str,
        export_format: str = "csv"
    ) -> str:
        """
        Export multiple documents to CSV or Excel
        
        Args:
            db: Database session
            document_type: Type of documents
            document_ids: List of document IDs to export
            company_id: Company context
            export_format: Format for export (csv or excel)
            
        Returns:
            CSV string or file path
        """
        try:
            placeholders = ','.join([f':id{i}' for i in range(len(document_ids))])
            query = text(f"""
                SELECT *
                FROM {document_type}
                WHERE id IN ({placeholders})
                AND company_id = :company_id
                ORDER BY created_at DESC
            """)
            
            params = {"company_id": company_id}
            for i, doc_id in enumerate(document_ids):
                params[f"id{i}"] = doc_id
            
            result = db.execute(query, params)
            rows = result.fetchall()
            
            if not rows:
                raise HTTPException(status_code=404, detail="No documents found")
            
            columns = result.keys()
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            writer.writerow(columns)
            
            for row in rows:
                writer.writerow([str(val) if val is not None else '' for val in row])
            
            csv_content = output.getvalue()
            output.close()
            
            return csv_content
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Batch export failed: {str(e)}")
    
    @classmethod
    def bulk_delete(
        cls,
        db: Session,
        document_type: str,
        document_ids: List[str],
        company_id: str
    ) -> Dict[str, Any]:
        """
        Delete multiple documents in a single operation
        
        Args:
            db: Database session
            document_type: Type of documents
            document_ids: List of document IDs to delete
            company_id: Company context
            
        Returns:
            Dict with success/failure counts and details
        """
        results = {
            "total": len(document_ids),
            "successful": 0,
            "failed": 0,
            "errors": []
        }
        
        try:
            for doc_id in document_ids:
                try:
                    query = text(f"""
                        DELETE FROM {document_type}
                        WHERE id = :doc_id
                        AND company_id = :company_id
                        AND status = 'draft'
                        RETURNING id
                    """)
                    
                    result = db.execute(query, {
                        "doc_id": doc_id,
                        "company_id": company_id
                    })
                    
                    if result.rowcount > 0:
                        results["successful"] += 1
                    else:
                        results["failed"] += 1
                        results["errors"].append({
                            "document_id": doc_id,
                            "error": "Document not found or not in draft status"
                        })
                        
                except Exception as e:
                    results["failed"] += 1
                    results["errors"].append({
                        "document_id": doc_id,
                        "error": str(e)
                    })
            
            db.commit()
            
            return results
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")
    
    @classmethod
    def bulk_update_status(
        cls,
        db: Session,
        document_type: str,
        document_ids: List[str],
        company_id: str,
        new_status: str
    ) -> Dict[str, Any]:
        """
        Update status of multiple documents
        
        Args:
            db: Database session
            document_type: Type of documents
            document_ids: List of document IDs to update
            company_id: Company context
            new_status: New status to set
            
        Returns:
            Dict with success/failure counts and details
        """
        results = {
            "total": len(document_ids),
            "successful": 0,
            "failed": 0,
            "errors": []
        }
        
        try:
            for doc_id in document_ids:
                try:
                    query = text(f"""
                        UPDATE {document_type}
                        SET status = :new_status,
                            updated_at = NOW()
                        WHERE id = :doc_id
                        AND company_id = :company_id
                        RETURNING id
                    """)
                    
                    result = db.execute(query, {
                        "new_status": new_status,
                        "doc_id": doc_id,
                        "company_id": company_id
                    })
                    
                    if result.rowcount > 0:
                        results["successful"] += 1
                    else:
                        results["failed"] += 1
                        results["errors"].append({
                            "document_id": doc_id,
                            "error": "Document not found"
                        })
                        
                except Exception as e:
                    results["failed"] += 1
                    results["errors"].append({
                        "document_id": doc_id,
                        "error": str(e)
                    })
            
            db.commit()
            
            return results
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")
