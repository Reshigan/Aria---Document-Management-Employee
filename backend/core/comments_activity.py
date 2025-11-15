"""
Comments and Activity Feed System
Provides commenting and activity tracking for documents
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException

class CommentsActivityService:
    """Service for managing comments and activity feed"""
    
    @classmethod
    def add_comment(
        cls,
        db: Session,
        document_type: str,
        document_id: str,
        company_id: str,
        user_email: str,
        comment_text: str
    ) -> Dict[str, Any]:
        """
        Add a comment to a document
        
        Args:
            db: Database session
            document_type: Type of document
            document_id: ID of document
            company_id: Company context
            user_email: Email of commenter
            comment_text: Comment text
            
        Returns:
            Dict with comment details
        """
        try:
            comment_id = str(uuid.uuid4())
            
            query = text("""
                INSERT INTO document_comments (
                    id, company_id, document_type, document_id,
                    user_email, comment_text, created_at
                )
                VALUES (
                    :id, :company_id, :document_type, :document_id,
                    :user_email, :comment_text, NOW()
                )
                RETURNING id, created_at
            """)
            
            result = db.execute(query, {
                "id": comment_id,
                "company_id": company_id,
                "document_type": document_type,
                "document_id": document_id,
                "user_email": user_email,
                "comment_text": comment_text
            }).fetchone()
            
            db.commit()
            
            return {
                "id": str(result[0]),
                "user_email": user_email,
                "comment_text": comment_text,
                "created_at": result[1].isoformat() if result[1] else None
            }
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to add comment: {str(e)}")
    
    @classmethod
    def get_comments(
        cls,
        db: Session,
        document_type: str,
        document_id: str,
        company_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get all comments for a document
        
        Args:
            db: Database session
            document_type: Type of document
            document_id: ID of document
            company_id: Company context
            
        Returns:
            List of comments
        """
        try:
            query = text("""
                SELECT id, user_email, comment_text, created_at
                FROM document_comments
                WHERE document_type = :document_type
                AND document_id = :document_id
                AND company_id = :company_id
                ORDER BY created_at DESC
            """)
            
            result = db.execute(query, {
                "document_type": document_type,
                "document_id": document_id,
                "company_id": company_id
            })
            
            comments = []
            for row in result:
                comments.append({
                    "id": str(row[0]),
                    "user_email": row[1],
                    "comment_text": row[2],
                    "created_at": row[3].isoformat() if row[3] else None
                })
            
            return comments
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get comments: {str(e)}")
    
    @classmethod
    def delete_comment(
        cls,
        db: Session,
        comment_id: str,
        company_id: str,
        user_email: str
    ) -> Dict[str, Any]:
        """
        Delete a comment (only by original commenter)
        
        Args:
            db: Database session
            comment_id: ID of comment to delete
            company_id: Company context
            user_email: Email of user attempting deletion
            
        Returns:
            Success message
        """
        try:
            query = text("""
                DELETE FROM document_comments
                WHERE id = :comment_id
                AND company_id = :company_id
                AND user_email = :user_email
                RETURNING id
            """)
            
            result = db.execute(query, {
                "comment_id": comment_id,
                "company_id": company_id,
                "user_email": user_email
            })
            
            if result.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Comment not found or you don't have permission to delete it"
                )
            
            db.commit()
            
            return {"message": "Comment deleted successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to delete comment: {str(e)}")
    
    @classmethod
    def get_activity_feed(
        cls,
        db: Session,
        document_type: str,
        document_id: str,
        company_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get activity feed for a document (combines audit logs and comments)
        
        Args:
            db: Database session
            document_type: Type of document
            document_id: ID of document
            company_id: Company context
            
        Returns:
            List of activity items
        """
        try:
            activities = []
            
            audit_query = text("""
                SELECT user_email, action, timestamp, details
                FROM audit_logs
                WHERE resource = :resource
                ORDER BY timestamp DESC
                LIMIT 50
            """)
            
            audit_result = db.execute(audit_query, {
                "resource": f"{document_type}:{document_id}"
            })
            
            for row in audit_result:
                activities.append({
                    "type": "action",
                    "user_email": row[0],
                    "action": row[1],
                    "timestamp": row[2].isoformat() if row[2] else None,
                    "details": row[3]
                })
            
            comments_query = text("""
                SELECT user_email, comment_text, created_at
                FROM document_comments
                WHERE document_type = :document_type
                AND document_id = :document_id
                AND company_id = :company_id
                ORDER BY created_at DESC
                LIMIT 50
            """)
            
            comments_result = db.execute(comments_query, {
                "document_type": document_type,
                "document_id": document_id,
                "company_id": company_id
            })
            
            for row in comments_result:
                activities.append({
                    "type": "comment",
                    "user_email": row[0],
                    "comment_text": row[1],
                    "timestamp": row[2].isoformat() if row[2] else None
                })
            
            activities.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
            return activities[:50]  # Return top 50 most recent
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get activity feed: {str(e)}")
    
    @classmethod
    def get_user_activity(
        cls,
        db: Session,
        user_email: str,
        company_id: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get recent activity for a specific user
        
        Args:
            db: Database session
            user_email: Email of user
            company_id: Company context
            limit: Maximum number of items to return
            
        Returns:
            List of activity items
        """
        try:
            activities = []
            
            comments_query = text("""
                SELECT document_type, document_id, comment_text, created_at
                FROM document_comments
                WHERE user_email = :user_email
                AND company_id = :company_id
                ORDER BY created_at DESC
                LIMIT :limit
            """)
            
            comments_result = db.execute(comments_query, {
                "user_email": user_email,
                "company_id": company_id,
                "limit": limit
            })
            
            for row in comments_result:
                activities.append({
                    "type": "comment",
                    "document_type": row[0],
                    "document_id": str(row[1]),
                    "comment_text": row[2],
                    "timestamp": row[3].isoformat() if row[3] else None
                })
            
            audit_query = text("""
                SELECT action, resource, timestamp, details
                FROM audit_logs
                WHERE user_email = :user_email
                ORDER BY timestamp DESC
                LIMIT :limit
            """)
            
            audit_result = db.execute(audit_query, {
                "user_email": user_email,
                "limit": limit
            })
            
            for row in audit_result:
                activities.append({
                    "type": "action",
                    "action": row[0],
                    "resource": row[1],
                    "timestamp": row[2].isoformat() if row[2] else None,
                    "details": row[3]
                })
            
            activities.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
            return activities[:limit]
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get user activity: {str(e)}")
