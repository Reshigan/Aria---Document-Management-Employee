"""
AI endpoints for intelligent document processing and bot capabilities.

This module provides REST API endpoints for AI services including
document analysis, chat, workflow suggestions, and analytics.
"""

from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from aria.core.database import get_db
from aria.core.logging import get_logger
from aria.dependencies.auth import get_current_user
from aria.schemas.ai import (
    AIAnalysisRequest,
    AIAnalysisResponse,
    AIServiceHealth,
    ChatRequest,
    ChatResponse,
    DocumentAnalytics,
    ExtractionResult,
    WorkflowAnalysisRequest,
    WorkflowAnalysisResponse,
)
from aria.schemas.user import UserResponse
from aria.services.ai_service import get_ai_service

# Create router
router = APIRouter()

# Logger
logger = get_logger(__name__)


# Document Analysis Endpoints

@router.post("/analyze", response_model=AIAnalysisResponse)
async def analyze_document(
    request: AIAnalysisRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AIAnalysisResponse:
    """
    Perform comprehensive AI analysis on a document.
    
    Args:
        request: Analysis request with document ID and options
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Comprehensive AI analysis results
    """
    logger.info(
        "Document analysis requested",
        document_id=str(request.document_id),
        analysis_type=request.analysis_type,
        username=current_user.username,
    )
    
    try:
        ai_service = await get_ai_service(db)
        result = await ai_service.analyze_document(
            document_id=request.document_id,
            analysis_type=request.analysis_type
        )
        
        logger.info(
            "Document analysis completed",
            document_id=str(request.document_id),
            confidence=result.confidence_score,
        )
        
        return result
        
    except Exception as e:
        logger.error(
            "Document analysis failed",
            document_id=str(request.document_id),
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document analysis failed",
        )


@router.post("/extract/{document_id}", response_model=ExtractionResult)
async def extract_document_data(
    document_id: UUID,
    extraction_template: Dict[str, Any] = None,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ExtractionResult:
    """
    Extract structured data from document using AI.
    
    Args:
        document_id: Document ID to process
        extraction_template: Optional template defining fields to extract
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Structured data extraction results
    """
    logger.info(
        "Data extraction requested",
        document_id=str(document_id),
        username=current_user.username,
    )
    
    try:
        ai_service = await get_ai_service(db)
        result = await ai_service.extract_document_data(
            document_id=document_id,
            extraction_template=extraction_template
        )
        
        logger.info(
            "Data extraction completed",
            document_id=str(document_id),
            confidence=result.confidence_score,
        )
        
        return result
        
    except Exception as e:
        logger.error(
            "Data extraction failed",
            document_id=str(document_id),
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Data extraction failed",
        )


@router.post("/categorize/{document_id}")
async def categorize_document(
    document_id: UUID,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Automatically categorize document using AI.
    
    Args:
        document_id: Document ID to categorize
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Document categorization results
    """
    logger.info(
        "Document categorization requested",
        document_id=str(document_id),
        username=current_user.username,
    )
    
    try:
        ai_service = await get_ai_service(db)
        result = await ai_service.categorize_document(document_id=document_id)
        
        logger.info(
            "Document categorization completed",
            document_id=str(document_id),
            category=result.get("primary_category"),
        )
        
        return result
        
    except Exception as e:
        logger.error(
            "Document categorization failed",
            document_id=str(document_id),
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document categorization failed",
        )


# Chat and Conversation Endpoints

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    """
    Chat with AI about documents and system capabilities.
    
    Args:
        request: Chat request with message and optional context
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        AI chat response
    """
    logger.info(
        "AI chat requested",
        message_length=len(request.message),
        context_docs=len(request.context_documents) if request.context_documents else 0,
        username=current_user.username,
    )
    
    try:
        ai_service = await get_ai_service(db)
        result = await ai_service.chat_with_documents(
            user_id=current_user.id,
            message=request.message,
            context_documents=request.context_documents
        )
        
        logger.info(
            "AI chat response generated",
            response_length=len(result.message),
            confidence=result.confidence,
        )
        
        return result
        
    except Exception as e:
        logger.error(
            "AI chat failed",
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI chat processing failed",
        )


# Workflow Intelligence Endpoints

@router.post("/workflow/analyze", response_model=WorkflowAnalysisResponse)
async def analyze_workflow(
    request: WorkflowAnalysisRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkflowAnalysisResponse:
    """
    Analyze documents and suggest workflow automations.
    
    Args:
        request: Workflow analysis request
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Workflow analysis and automation suggestions
    """
    logger.info(
        "Workflow analysis requested",
        document_count=len(request.document_ids),
        username=current_user.username,
    )
    
    try:
        ai_service = await get_ai_service(db)
        suggestions = await ai_service.suggest_workflow_automation(
            document_ids=request.document_ids
        )
        
        # Calculate potential savings
        total_time_savings = sum(s.estimated_time_savings for s in suggestions)
        
        result = WorkflowAnalysisResponse(
            document_count=len(request.document_ids),
            suggestions=suggestions,
            potential_savings={
                "time_seconds": total_time_savings,
                "time_hours": total_time_savings / 3600,
                "estimated_cost_savings": total_time_savings * 0.5  # $0.50 per minute saved
            },
            implementation_complexity={
                s.action: "medium" for s in suggestions  # Simplified complexity rating
            },
            processing_time=0.1,  # Would be actual processing time
            created_at=suggestions[0].created_at if suggestions else None
        )
        
        logger.info(
            "Workflow analysis completed",
            suggestion_count=len(suggestions),
            potential_savings=total_time_savings,
        )
        
        return result
        
    except Exception as e:
        logger.error(
            "Workflow analysis failed",
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Workflow analysis failed",
        )


# Analytics and Insights Endpoints

@router.get("/analytics", response_model=DocumentAnalytics)
async def get_document_analytics(
    days: int = 30,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentAnalytics:
    """
    Get comprehensive document analytics and insights.
    
    Args:
        days: Number of days to analyze (default: 30)
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Comprehensive document analytics
    """
    logger.info(
        "Document analytics requested",
        days=days,
        username=current_user.username,
    )
    
    try:
        ai_service = await get_ai_service(db)
        insights = await ai_service.generate_document_insights()
        
        # Convert to proper response model
        from aria.schemas.ai import DocumentTrend, DocumentTypeStats, AnalyticsInsight
        from datetime import datetime
        
        analytics = DocumentAnalytics(
            summary=insights["summary"],
            trends={
                "document_volume": [
                    DocumentTrend(**trend) for trend in insights["trends"]["document_volume"]
                ],
                "processing_efficiency": [
                    DocumentTrend(
                        date=trend["date"],
                        count=0,  # Not applicable for efficiency
                        value=trend["avg_time"]
                    ) for trend in insights["trends"]["processing_efficiency"]
                ]
            },
            top_document_types=[
                DocumentTypeStats(**doc_type) for doc_type in insights["top_document_types"]
            ],
            anomalies=[
                AnalyticsInsight(**anomaly) for anomaly in insights["anomalies"]
            ],
            recommendations=insights["recommendations"],
            generated_at=datetime.fromisoformat(insights["generated_at"])
        )
        
        logger.info("Document analytics generated")
        return analytics
        
    except Exception as e:
        logger.error(
            "Document analytics generation failed",
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Analytics generation failed",
        )


# Health and Status Endpoints

@router.get("/health", response_model=AIServiceHealth)
async def get_ai_health(
    db: AsyncSession = Depends(get_db),
) -> AIServiceHealth:
    """
    Get AI service health status and capabilities.
    
    Args:
        db: Database session
        
    Returns:
        AI service health information
    """
    try:
        ai_service = await get_ai_service(db)
        health_data = await ai_service.health_check()
        
        from datetime import datetime
        
        return AIServiceHealth(
            status=health_data["status"],
            capabilities=health_data["capabilities"],
            response_time=health_data["response_time"],
            version=health_data["version"],
            last_check=datetime.fromisoformat(health_data["last_check"]),
            error=health_data.get("error")
        )
        
    except Exception as e:
        logger.error("AI health check failed", error=str(e), exc_info=True)
        return AIServiceHealth(
            status="unhealthy",
            capabilities=[],
            response_time=0.0,
            version="unknown",
            last_check=datetime.utcnow(),
            error=str(e)
        )


# Batch Processing Endpoints

@router.post("/batch/analyze")
async def batch_analyze_documents(
    document_ids: List[UUID],
    analysis_type: str = "comprehensive",
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Perform batch analysis on multiple documents.
    
    Args:
        document_ids: List of document IDs to analyze
        analysis_type: Type of analysis to perform
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Batch analysis results
    """
    logger.info(
        "Batch analysis requested",
        document_count=len(document_ids),
        analysis_type=analysis_type,
        username=current_user.username,
    )
    
    try:
        ai_service = await get_ai_service(db)
        
        # Process documents in batches (simulate)
        results = []
        for doc_id in document_ids[:10]:  # Limit to 10 for demo
            try:
                result = await ai_service.analyze_document(doc_id, analysis_type)
                results.append({
                    "document_id": str(doc_id),
                    "status": "success",
                    "confidence": result.confidence_score,
                    "document_type": result.document_type
                })
            except Exception as e:
                results.append({
                    "document_id": str(doc_id),
                    "status": "error",
                    "error": str(e)
                })
        
        success_count = len([r for r in results if r["status"] == "success"])
        
        logger.info(
            "Batch analysis completed",
            total_documents=len(document_ids),
            successful=success_count,
        )
        
        return {
            "total_documents": len(document_ids),
            "processed_documents": len(results),
            "successful_analyses": success_count,
            "failed_analyses": len(results) - success_count,
            "results": results,
            "processing_time": len(results) * 0.1  # Simulated time
        }
        
    except Exception as e:
        logger.error(
            "Batch analysis failed",
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Batch analysis failed",
        )