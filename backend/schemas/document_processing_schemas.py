from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum

# Enums
class ProcessingStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ProcessingType(str, Enum):
    OCR = "ocr"
    CLASSIFICATION = "classification"
    CONTENT_EXTRACTION = "content_extraction"
    METADATA_EXTRACTION = "metadata_extraction"
    CONVERSION = "conversion"
    AI_ANALYSIS = "ai_analysis"

class DocumentClassification(str, Enum):
    INVOICE = "invoice"
    CONTRACT = "contract"
    REPORT = "report"
    LETTER = "letter"
    FORM = "form"
    PRESENTATION = "presentation"
    SPREADSHEET = "spreadsheet"
    IMAGE = "image"
    OTHER = "other"

class ConversionFormat(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    XLSX = "xlsx"
    PPTX = "pptx"
    TXT = "txt"
    HTML = "html"
    MARKDOWN = "markdown"
    JSON = "json"

# Base schemas
class DocumentProcessingJobBase(BaseModel):
    document_id: int
    processing_type: ProcessingType
    priority: Optional[int] = Field(default=5, ge=1, le=10)
    configuration: Optional[Dict[str, Any]] = Field(default_factory=dict)

class DocumentProcessingJobCreate(DocumentProcessingJobBase):
    pass

class DocumentProcessingJobUpdate(BaseModel):
    status: Optional[ProcessingStatus] = None
    priority: Optional[int] = Field(None, ge=1, le=10)
    configuration: Optional[Dict[str, Any]] = None
    progress_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    current_step: Optional[str] = None
    total_steps: Optional[int] = None
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

class DocumentProcessingJobResponse(DocumentProcessingJobBase):
    id: int
    user_id: int
    status: ProcessingStatus
    progress_percentage: float
    current_step: Optional[str]
    total_steps: Optional[int]
    result_data: Dict[str, Any]
    error_message: Optional[str]
    processing_time_seconds: Optional[float]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# OCR schemas
class OCRResultBase(BaseModel):
    ocr_engine: Optional[str] = "tesseract"
    engine_version: Optional[str] = None
    language: Optional[str] = "eng"
    extracted_text: Optional[str] = None
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    page_results: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    text_regions: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    processing_time_seconds: Optional[float] = None
    image_preprocessing_applied: Optional[List[str]] = Field(default_factory=list)
    text_quality_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    image_quality_score: Optional[float] = Field(None, ge=0.0, le=1.0)

class OCRResultCreate(OCRResultBase):
    processing_job_id: int
    document_id: int

class OCRResultResponse(OCRResultBase):
    id: int
    processing_job_id: int
    document_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Classification schemas
class DocumentClassificationResultBase(BaseModel):
    predicted_class: Optional[DocumentClassification] = None
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    class_probabilities: Optional[Dict[str, float]] = Field(default_factory=dict)
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    features_used: Optional[List[str]] = Field(default_factory=list)
    feature_importance: Optional[Dict[str, float]] = Field(default_factory=dict)
    is_verified: Optional[bool] = False
    manual_classification: Optional[DocumentClassification] = None

class DocumentClassificationResultCreate(DocumentClassificationResultBase):
    processing_job_id: int
    document_id: int

class DocumentClassificationResultUpdate(BaseModel):
    is_verified: Optional[bool] = None
    manual_classification: Optional[DocumentClassification] = None

class DocumentClassificationResultResponse(DocumentClassificationResultBase):
    id: int
    processing_job_id: int
    document_id: int
    verified_by_user_id: Optional[int]
    verified_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Content extraction schemas
class ContentExtractionResultBase(BaseModel):
    extracted_content: Optional[Dict[str, Any]] = Field(default_factory=dict)
    tables: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    images: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    links: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    headers: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    key_value_pairs: Optional[Dict[str, Any]] = Field(default_factory=dict)
    entities: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    word_count: Optional[int] = None
    character_count: Optional[int] = None
    page_count: Optional[int] = None
    extraction_method: Optional[str] = None
    extraction_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)

class ContentExtractionResultCreate(ContentExtractionResultBase):
    processing_job_id: int
    document_id: int

class ContentExtractionResultResponse(ContentExtractionResultBase):
    id: int
    processing_job_id: int
    document_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Conversion schemas
class DocumentConversionResultBase(BaseModel):
    source_format: Optional[str] = None
    target_format: Optional[ConversionFormat] = None
    converted_file_path: Optional[str] = None
    converted_file_size: Optional[int] = None
    converted_file_hash: Optional[str] = None
    conversion_quality_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    pages_converted: Optional[int] = None
    conversion_warnings: Optional[List[str]] = Field(default_factory=list)
    conversion_errors: Optional[List[str]] = Field(default_factory=list)
    conversion_tool: Optional[str] = None
    tool_version: Optional[str] = None
    conversion_parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    conversion_time_seconds: Optional[float] = None

class DocumentConversionResultCreate(DocumentConversionResultBase):
    processing_job_id: int
    document_id: int

class DocumentConversionResultResponse(DocumentConversionResultBase):
    id: int
    processing_job_id: int
    document_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# AI Analysis schemas
class AIAnalysisResultBase(BaseModel):
    analysis_type: Optional[str] = None
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    model_provider: Optional[str] = None
    analysis_results: Optional[Dict[str, Any]] = Field(default_factory=dict)
    confidence_scores: Optional[Dict[str, float]] = Field(default_factory=dict)
    sentiment_analysis: Optional[Dict[str, Any]] = Field(default_factory=dict)
    summary: Optional[str] = None
    keywords: Optional[List[str]] = Field(default_factory=list)
    topics: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    detected_language: Optional[str] = None
    language_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    readability_score: Optional[float] = None
    complexity_score: Optional[float] = None
    tokens_used: Optional[int] = None
    processing_cost: Optional[float] = None
    processing_time_seconds: Optional[float] = None

class AIAnalysisResultCreate(AIAnalysisResultBase):
    processing_job_id: int
    document_id: int

class AIAnalysisResultResponse(AIAnalysisResultBase):
    id: int
    processing_job_id: int
    document_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Processing template schemas
class ProcessingTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    processing_steps: List[ProcessingType] = Field(default_factory=list)
    default_configuration: Optional[Dict[str, Any]] = Field(default_factory=dict)
    is_public: Optional[bool] = False
    is_active: Optional[bool] = True

class ProcessingTemplateCreate(ProcessingTemplateBase):
    pass

class ProcessingTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    processing_steps: Optional[List[ProcessingType]] = None
    default_configuration: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None

class ProcessingTemplateResponse(ProcessingTemplateBase):
    id: int
    created_by_user_id: int
    usage_count: int
    success_rate: float
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Batch processing schemas
class BatchProcessingRequest(BaseModel):
    document_ids: List[int] = Field(..., min_items=1)
    processing_types: List[ProcessingType] = Field(..., min_items=1)
    template_id: Optional[int] = None
    configuration: Optional[Dict[str, Any]] = Field(default_factory=dict)
    priority: Optional[int] = Field(default=5, ge=1, le=10)

class BatchProcessingResponse(BaseModel):
    batch_id: str
    job_ids: List[int]
    total_jobs: int
    estimated_completion_time: Optional[int]  # in seconds

# Processing statistics schemas
class ProcessingStatistics(BaseModel):
    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    pending_jobs: int
    in_progress_jobs: int
    success_rate: float
    average_processing_time: Optional[float]
    jobs_by_type: Dict[ProcessingType, int]
    jobs_by_status: Dict[ProcessingStatus, int]

class ProcessingQueueStatus(BaseModel):
    queue_name: str
    pending_jobs: int
    in_progress_jobs: int
    estimated_wait_time: Optional[int]  # in seconds
    worker_count: int
    average_job_duration: Optional[float]

# OCR configuration schemas
class OCRConfiguration(BaseModel):
    language: str = Field(default="eng", description="OCR language code")
    engine: str = Field(default="tesseract", description="OCR engine to use")
    preprocessing_steps: List[str] = Field(default_factory=list, description="Image preprocessing steps")
    confidence_threshold: float = Field(default=0.5, ge=0.0, le=1.0)
    extract_regions: bool = Field(default=True, description="Extract text region coordinates")
    page_segmentation_mode: Optional[int] = Field(default=None, ge=0, le=13)

# Classification configuration schemas
class ClassificationConfiguration(BaseModel):
    model_name: str = Field(default="default", description="Classification model to use")
    confidence_threshold: float = Field(default=0.7, ge=0.0, le=1.0)
    use_content: bool = Field(default=True, description="Use document content for classification")
    use_filename: bool = Field(default=True, description="Use filename for classification")
    use_metadata: bool = Field(default=True, description="Use metadata for classification")

# Conversion configuration schemas
class ConversionConfiguration(BaseModel):
    target_format: ConversionFormat
    quality: Optional[str] = Field(default="high", description="Conversion quality: low, medium, high")
    preserve_formatting: bool = Field(default=True, description="Preserve original formatting")
    extract_images: bool = Field(default=False, description="Extract embedded images")
    compression_level: Optional[int] = Field(default=None, ge=0, le=9)

# AI Analysis configuration schemas
class AIAnalysisConfiguration(BaseModel):
    analysis_types: List[str] = Field(default_factory=list, description="Types of analysis to perform")
    model_provider: str = Field(default="openai", description="AI model provider")
    model_name: str = Field(default="gpt-3.5-turbo", description="Specific model to use")
    max_tokens: Optional[int] = Field(default=None, ge=1, le=4000)
    temperature: float = Field(default=0.3, ge=0.0, le=2.0)
    include_sentiment: bool = Field(default=True, description="Include sentiment analysis")
    include_summary: bool = Field(default=True, description="Include document summary")
    include_keywords: bool = Field(default=True, description="Extract keywords")
    include_topics: bool = Field(default=False, description="Perform topic modeling")

# Processing job with results
class DocumentProcessingJobWithResults(DocumentProcessingJobResponse):
    ocr_results: List[OCRResultResponse] = Field(default_factory=list)
    classification_results: List[DocumentClassificationResultResponse] = Field(default_factory=list)
    extraction_results: List[ContentExtractionResultResponse] = Field(default_factory=list)
    conversion_results: List[DocumentConversionResultResponse] = Field(default_factory=list)
    ai_analysis_results: List[AIAnalysisResultResponse] = Field(default_factory=list)