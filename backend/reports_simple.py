# Simple reports endpoints that return mock data

@app.get("/api/reports/document-status")
async def get_document_status_report(current_user: dict = Depends(get_current_user)):
    """Get document status report"""
    return {
        "report": {
            "total_documents": 25,
            "processed": 20,
            "pending": 3,
            "error": 2,
            "processing_rate": 80.0
        },
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/reports/sap-posting")
async def get_sap_posting_report(current_user: dict = Depends(get_current_user)):
    """Get SAP posting report"""
    return {
        "report": {
            "total_postings": 18,
            "successful_postings": 16,
            "failed_postings": 2,
            "success_rate": 88.9
        },
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/reports/processing-stats")
async def get_processing_stats_report(current_user: dict = Depends(get_current_user)):
    """Get processing statistics report"""
    return {
        "report": {
            "total_documents": 25,
            "avg_processing_time": 2.5,
            "first_document": "2024-09-01T10:00:00",
            "latest_document": "2024-10-13T15:30:00",
            "documents_per_day": 0.83
        },
        "timestamp": datetime.utcnow().isoformat()
    }
