"""
Approval Workflow System
Provides approval workflow management for transactional documents
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException

class ApprovalWorkflow:
    """Centralized approval workflow management"""
    
    STATE_DRAFT = "draft"
    STATE_PENDING_APPROVAL = "pending_approval"
    STATE_APPROVED = "approved"
    STATE_REJECTED = "rejected"
    STATE_POSTED = "posted"
    
    APPROVAL_REQUIRED = {
        "sales_orders": {"threshold": 10000, "approver_role": "Sales Manager"},
        "purchase_orders": {"threshold": 5000, "approver_role": "Purchasing Officer"},
        "journal_entries": {"threshold": 50000, "approver_role": "Admin"},
        "customer_invoices": {"threshold": 20000, "approver_role": "Accountant"},
        "supplier_invoices": {"threshold": 10000, "approver_role": "Accountant"},
    }
    
    @staticmethod
    def submit_for_approval(
        db: Session,
        document_type: str,
        document_id: str,
        company_id: str,
        user_email: str
    ) -> Dict[str, Any]:
        """
        Submit a document for approval
        
        Args:
            db: Database session
            document_type: Type of document (sales_orders, purchase_orders, etc.)
            document_id: ID of the document
            company_id: Company context
            user_email: Email of user submitting
            
        Returns:
            Dict with status and message
        """
        try:
            query = text(f"""
                UPDATE {document_type}
                SET approval_status = :status, updated_at = NOW()
                WHERE id = :doc_id AND company_id = :company_id
                RETURNING id
            """)
            
            result = db.execute(query, {
                "status": ApprovalWorkflow.STATE_PENDING_APPROVAL,
                "doc_id": document_id,
                "company_id": company_id
            })
            
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Document not found")
            
            db.commit()
            
            return {
                "success": True,
                "message": f"Document submitted for approval",
                "approval_status": ApprovalWorkflow.STATE_PENDING_APPROVAL
            }
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to submit for approval: {str(e)}")
    
    @staticmethod
    def approve_document(
        db: Session,
        document_type: str,
        document_id: str,
        company_id: str,
        approver_email: str,
        comments: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Approve a document
        
        Args:
            db: Database session
            document_type: Type of document
            document_id: ID of the document
            company_id: Company context
            approver_email: Email of approver
            comments: Optional approval comments
            
        Returns:
            Dict with status and message
        """
        try:
            query = text(f"""
                UPDATE {document_type}
                SET approval_status = :status,
                    approved_by = :approver,
                    approved_at = NOW(),
                    updated_at = NOW()
                WHERE id = :doc_id 
                AND company_id = :company_id
                AND approval_status = :pending_status
                RETURNING id
            """)
            
            result = db.execute(query, {
                "status": ApprovalWorkflow.STATE_APPROVED,
                "approver": approver_email,
                "doc_id": document_id,
                "company_id": company_id,
                "pending_status": ApprovalWorkflow.STATE_PENDING_APPROVAL
            })
            
            if result.rowcount == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Document not found or not in pending approval state"
                )
            
            db.commit()
            
            return {
                "success": True,
                "message": f"Document approved successfully",
                "approval_status": ApprovalWorkflow.STATE_APPROVED,
                "approved_by": approver_email,
                "approved_at": datetime.now().isoformat()
            }
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to approve document: {str(e)}")
    
    @staticmethod
    def reject_document(
        db: Session,
        document_type: str,
        document_id: str,
        company_id: str,
        rejector_email: str,
        reason: str
    ) -> Dict[str, Any]:
        """
        Reject a document
        
        Args:
            db: Database session
            document_type: Type of document
            document_id: ID of the document
            company_id: Company context
            rejector_email: Email of person rejecting
            reason: Reason for rejection
            
        Returns:
            Dict with status and message
        """
        try:
            query = text(f"""
                UPDATE {document_type}
                SET approval_status = :status,
                    rejection_reason = :reason,
                    updated_at = NOW()
                WHERE id = :doc_id 
                AND company_id = :company_id
                AND approval_status = :pending_status
                RETURNING id
            """)
            
            result = db.execute(query, {
                "status": ApprovalWorkflow.STATE_REJECTED,
                "reason": reason,
                "doc_id": document_id,
                "company_id": company_id,
                "pending_status": ApprovalWorkflow.STATE_PENDING_APPROVAL
            })
            
            if result.rowcount == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Document not found or not in pending approval state"
                )
            
            db.commit()
            
            return {
                "success": True,
                "message": f"Document rejected",
                "approval_status": ApprovalWorkflow.STATE_REJECTED,
                "rejection_reason": reason
            }
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to reject document: {str(e)}")
    
    @staticmethod
    def get_pending_approvals(
        db: Session,
        company_id: str,
        document_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all documents pending approval
        
        Args:
            db: Database session
            company_id: Company context
            document_type: Optional filter by document type
            
        Returns:
            List of documents pending approval
        """
        try:
            if document_type:
                tables = [document_type]
            else:
                tables = list(ApprovalWorkflow.APPROVAL_REQUIRED.keys())
            
            all_pending = []
            
            for table in tables:
                query = text(f"""
                    SELECT id, approval_status, created_at, updated_at
                    FROM {table}
                    WHERE company_id = :company_id
                    AND approval_status = :pending_status
                    ORDER BY created_at DESC
                """)
                
                result = db.execute(query, {
                    "company_id": company_id,
                    "pending_status": ApprovalWorkflow.STATE_PENDING_APPROVAL
                })
                
                for row in result:
                    all_pending.append({
                        "document_type": table,
                        "document_id": str(row[0]),
                        "approval_status": row[1],
                        "created_at": row[2].isoformat() if row[2] else None,
                        "updated_at": row[3].isoformat() if row[3] else None
                    })
            
            return all_pending
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get pending approvals: {str(e)}")
