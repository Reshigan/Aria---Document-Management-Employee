
@app.delete("/api/documents/{document_id}")
async def delete_document(
    document_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a document and its associated files"""
    logger.info(f"Delete request for document {document_id} by user {current_user.get('username', 'unknown')}")
    
    try:
        # Get document details first
        result = db.execute(
            text("SELECT * FROM documents WHERE id = :id AND owner_id = :owner_id"),
            {"id": document_id, "owner_id": current_user["id"]}
        )
        document = result.fetchone()
        
        if not document:
            logger.warning(f"Document {document_id} not found for user {current_user.get('username')}")
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Delete physical file if it exists
        if document.file_path and os.path.exists(document.file_path):
            try:
                os.remove(document.file_path)
                logger.info(f"Deleted physical file: {document.file_path}")
            except OSError as e:
                logger.warning(f"Could not delete physical file {document.file_path}: {e}")
        
        # Delete from database
        db.execute(
            text("DELETE FROM documents WHERE id = :id AND owner_id = :owner_id"),
            {"id": document_id, "owner_id": current_user["id"]}
        )
        db.commit()
        
        logger.info(f"Successfully deleted document {document_id} ({document.filename})")
        
        return {
            "success": True,
            "message": f"Document '{document.filename}' deleted successfully",
            "deleted_document": {
                "id": document.id,
                "filename": document.filename,
                "deleted_at": datetime.utcnow().isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete document")

