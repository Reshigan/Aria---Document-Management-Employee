"""
AI service schemas for request/response models.

This module defines Pydantic models for AI service operations
including document analysis, chat, and workflow suggestions.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# Base AI Models

class AIAnalysisRequest(BaseModel):
    """Request model for AI document analysis."""
    
    document_id: UUID = Field(..., description="Document ID to analyze")
    analysis_type: str = Field(default="comprehensive", description="Type of analysis to perform")
    options: Optional[Dict[str, Any]] = Field(default=None, description="Additional analysis options")


class DocumentInsight(BaseModel):
    """Model for document insights from AI analysis."""
    
    type: str = Field(..., description="Type of insight (anomaly, validation, suggestion, etc.)")
    description: str = Field(..., description="Human-readable description of the insight")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score for the insight")
    severity: str = Field(..., description="Severity level (low, medium, high, critical)")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional insight metadata")


class WorkflowSuggestion(BaseModel):
    """Model for AI-generated workflow suggestions."""
    
    action: str = Field(..., description="Suggested action or workflow step")
    description: str = Field(..., description="Description of the suggested action")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence in the suggestion")
    estimated_time_savings: int = Field(..., description="Estimated time savings in seconds")
    affected_documents: Optional[int] = Field(default=None, description="Number of documents affected")
    prerequisites: Optional[List[str]] = Field(default=None, description="Prerequisites for implementing suggestion")


class AIAnalysisResponse(BaseModel):
    """Response model for AI document analysis."""
    
    document_id: UUID = Field(..., description="Analyzed document ID")
    analysis_type: str = Field(..., description="Type of analysis performed")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Overall confidence in analysis")
    document_type: Optional[str] = Field(default=None, description="Detected document type")
    language: Optional[str] = Field(default=None, description="Detected document language")
    extracted_data: Dict[str, Any] = Field(..., description="Extracted structured data")
    insights: List[DocumentInsight] = Field(default=[], description="AI-generated insights")
    workflow_suggestions: List[WorkflowSuggestion] = Field(default=[], description="Workflow automation suggestions")
    processing_time: float = Field(..., description="Analysis processing time in seconds")
    created_at: datetime = Field(..., description="Analysis timestamp")


# Data Extraction Models

class FieldExtraction(BaseModel):
    """Model for extracted field data."""
    
    value: str = Field(..., description="Extracted field value")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Extraction confidence")
    location: Optional[Dict[str, int]] = Field(default=None, description="Field location in document (x, y, width, height)")
    alternatives: Optional[List[str]] = Field(default=None, description="Alternative extraction values")


class ExtractionResult(BaseModel):
    """Model for document data extraction results."""
    
    document_id: UUID = Field(..., description="Processed document ID")
    extracted_fields: Dict[str, FieldExtraction] = Field(..., description="Extracted field data")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Overall extraction confidence")
    processing_time: float = Field(..., description="Extraction processing time in seconds")
    ocr_text: Optional[str] = Field(default=None, description="Full OCR text if available")
    created_at: datetime = Field(..., description="Extraction timestamp")


# Chat and Conversation Models

class ChatMessage(BaseModel):
    """Model for chat messages."""
    
    role: str = Field(..., description="Message role (user, assistant, system)")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(..., description="Message timestamp")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional message metadata")


class ChatRequest(BaseModel):
    """Request model for AI chat."""
    
    message: str = Field(..., description="User message")
    context_documents: Optional[List[UUID]] = Field(default=None, description="Document IDs for context")
    conversation_id: Optional[str] = Field(default=None, description="Conversation ID for context")


class ChatResponse(BaseModel):
    """Response model for AI chat."""
    
    message: str = Field(..., description="AI response message")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Response confidence")
    context_used: bool = Field(..., description="Whether document context was used")
    suggested_actions: List[str] = Field(default=[], description="Suggested follow-up actions")
    processing_time: float = Field(..., description="Response processing time in seconds")
    created_at: datetime = Field(..., description="Response timestamp")


# Analytics and Insights Models

class DocumentTrend(BaseModel):
    """Model for document trend data."""
    
    date: str = Field(..., description="Date for the trend data point")
    count: int = Field(..., description="Document count for the date")
    value: Optional[float] = Field(default=None, description="Additional metric value")


class DocumentTypeStats(BaseModel):
    """Model for document type statistics."""
    
    type: str = Field(..., description="Document type")
    count: int = Field(..., description="Number of documents of this type")
    percentage: float = Field(..., description="Percentage of total documents")
    avg_processing_time: Optional[float] = Field(default=None, description="Average processing time")


class AnalyticsInsight(BaseModel):
    """Model for analytics insights."""
    
    type: str = Field(..., description="Insight type")
    description: str = Field(..., description="Insight description")
    severity: str = Field(..., description="Insight severity")
    value: Optional[float] = Field(default=None, description="Numeric value if applicable")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional insight data")


class DocumentAnalytics(BaseModel):
    """Model for comprehensive document analytics."""
    
    summary: Dict[str, Any] = Field(..., description="Summary statistics")
    trends: Dict[str, List[DocumentTrend]] = Field(..., description="Trend data")
    top_document_types: List[DocumentTypeStats] = Field(..., description="Top document types")
    anomalies: List[AnalyticsInsight] = Field(default=[], description="Detected anomalies")
    recommendations: List[str] = Field(default=[], description="AI recommendations")
    generated_at: datetime = Field(..., description="Analytics generation timestamp")


# Workflow Models

class WorkflowAnalysisRequest(BaseModel):
    """Request model for workflow analysis."""
    
    document_ids: List[UUID] = Field(..., description="Document IDs to analyze")
    analysis_period: Optional[int] = Field(default=30, description="Analysis period in days")
    include_suggestions: bool = Field(default=True, description="Include automation suggestions")


class WorkflowAnalysisResponse(BaseModel):
    """Response model for workflow analysis."""
    
    document_count: int = Field(..., description="Number of documents analyzed")
    suggestions: List[WorkflowSuggestion] = Field(..., description="Workflow suggestions")
    potential_savings: Dict[str, float] = Field(..., description="Potential time/cost savings")
    implementation_complexity: Dict[str, str] = Field(..., description="Implementation complexity ratings")
    processing_time: float = Field(..., description="Analysis processing time")
    created_at: datetime = Field(..., description="Analysis timestamp")


# Health and Status Models

class AIServiceHealth(BaseModel):
    """Model for AI service health status."""
    
    status: str = Field(..., description="Service health status")
    capabilities: List[str] = Field(..., description="Available AI capabilities")
    response_time: float = Field(..., description="Service response time")
    version: str = Field(..., description="AI service version")
    last_check: datetime = Field(..., description="Last health check timestamp")
    error: Optional[str] = Field(default=None, description="Error message if unhealthy")


# Configuration Models

class AIConfiguration(BaseModel):
    """Model for AI service configuration."""
    
    enabled_features: List[str] = Field(..., description="Enabled AI features")
    confidence_thresholds: Dict[str, float] = Field(..., description="Confidence thresholds for different operations")
    processing_limits: Dict[str, int] = Field(..., description="Processing limits and quotas")
    model_versions: Dict[str, str] = Field(..., description="AI model versions in use")
    last_updated: datetime = Field(..., description="Configuration last updated timestamp")