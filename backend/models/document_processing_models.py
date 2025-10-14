from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON, ForeignKey, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from .base import Base

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

class DocumentProcessingJob(Base):
    __tablename__ = "document_processing_jobs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    processing_type = Column(SQLEnum(ProcessingType), nullable=False)
    status = Column(SQLEnum(ProcessingStatus), default=ProcessingStatus.PENDING)
    priority = Column(Integer, default=5)  # 1-10, 1 being highest priority
    
    # Configuration for the processing job
    configuration = Column(JSON, default=dict)
    
    # Progress tracking
    progress_percentage = Column(Float, default=0.0)
    current_step = Column(String(255))
    total_steps = Column(Integer)
    
    # Results and metadata
    result_data = Column(JSON, default=dict)
    error_message = Column(Text)
    processing_time_seconds = Column(Float)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    document = relationship("Document", back_populates="processing_jobs")
    user = relationship("User", back_populates="processing_jobs")
    ocr_results = relationship("OCRResult", back_populates="processing_job", cascade="all, delete-orphan")
    classification_results = relationship("DocumentClassificationResult", back_populates="processing_job", cascade="all, delete-orphan")
    extraction_results = relationship("ContentExtractionResult", back_populates="processing_job", cascade="all, delete-orphan")
    conversion_results = relationship("DocumentConversionResult", back_populates="processing_job", cascade="all, delete-orphan")
    ai_analysis_results = relationship("AIAnalysisResult", back_populates="processing_job", cascade="all, delete-orphan")

class OCRResult(Base):
    __tablename__ = "ocr_results"

    id = Column(Integer, primary_key=True, index=True)
    processing_job_id = Column(Integer, ForeignKey("document_processing_jobs.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    
    # OCR Engine information
    ocr_engine = Column(String(100), default="tesseract")
    engine_version = Column(String(50))
    language = Column(String(10), default="eng")
    
    # Extracted text content
    extracted_text = Column(Text)
    confidence_score = Column(Float)  # Overall confidence score
    
    # Page-level results for multi-page documents
    page_results = Column(JSON, default=list)  # List of page-level OCR results
    
    # Bounding box information for text regions
    text_regions = Column(JSON, default=list)  # List of text regions with coordinates
    
    # Processing metadata
    processing_time_seconds = Column(Float)
    image_preprocessing_applied = Column(JSON, default=list)  # List of preprocessing steps
    
    # Quality metrics
    text_quality_score = Column(Float)  # Estimated text quality
    image_quality_score = Column(Float)  # Input image quality
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    processing_job = relationship("DocumentProcessingJob", back_populates="ocr_results")
    document = relationship("Document", back_populates="ocr_results")

class DocumentClassificationResult(Base):
    __tablename__ = "document_classification_results"

    id = Column(Integer, primary_key=True, index=True)
    processing_job_id = Column(Integer, ForeignKey("document_processing_jobs.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    
    # Classification results
    predicted_class = Column(SQLEnum(DocumentClassification))
    confidence_score = Column(Float)
    
    # All class probabilities
    class_probabilities = Column(JSON, default=dict)  # {class_name: probability}
    
    # Model information
    model_name = Column(String(100))
    model_version = Column(String(50))
    
    # Features used for classification
    features_used = Column(JSON, default=list)
    feature_importance = Column(JSON, default=dict)
    
    # Manual verification
    is_verified = Column(Boolean, default=False)
    verified_by_user_id = Column(Integer, ForeignKey("users.id"))
    verified_at = Column(DateTime(timezone=True))
    manual_classification = Column(SQLEnum(DocumentClassification))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    processing_job = relationship("DocumentProcessingJob", back_populates="classification_results")
    document = relationship("Document", back_populates="classification_results")
    verified_by = relationship("User", foreign_keys=[verified_by_user_id])

class ContentExtractionResult(Base):
    __tablename__ = "content_extraction_results"

    id = Column(Integer, primary_key=True, index=True)
    processing_job_id = Column(Integer, ForeignKey("document_processing_jobs.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    
    # Extracted content
    extracted_content = Column(JSON, default=dict)  # Structured content extraction
    
    # Content type specific extractions
    tables = Column(JSON, default=list)  # Extracted tables
    images = Column(JSON, default=list)  # Extracted images metadata
    links = Column(JSON, default=list)  # Extracted links
    headers = Column(JSON, default=list)  # Document headers/sections
    
    # Key-value pairs extraction (for forms, invoices, etc.)
    key_value_pairs = Column(JSON, default=dict)
    
    # Named entities
    entities = Column(JSON, default=list)  # Named entity recognition results
    
    # Content statistics
    word_count = Column(Integer)
    character_count = Column(Integer)
    page_count = Column(Integer)
    
    # Extraction method
    extraction_method = Column(String(100))  # Method used for extraction
    extraction_confidence = Column(Float)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    processing_job = relationship("DocumentProcessingJob", back_populates="extraction_results")
    document = relationship("Document", back_populates="extraction_results")

class DocumentConversionResult(Base):
    __tablename__ = "document_conversion_results"

    id = Column(Integer, primary_key=True, index=True)
    processing_job_id = Column(Integer, ForeignKey("document_processing_jobs.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    
    # Conversion details
    source_format = Column(String(10))
    target_format = Column(SQLEnum(ConversionFormat))
    
    # Output file information
    converted_file_path = Column(String(500))
    converted_file_size = Column(Integer)
    converted_file_hash = Column(String(64))  # SHA-256 hash
    
    # Conversion quality metrics
    conversion_quality_score = Column(Float)
    pages_converted = Column(Integer)
    conversion_warnings = Column(JSON, default=list)
    conversion_errors = Column(JSON, default=list)
    
    # Conversion tool information
    conversion_tool = Column(String(100))
    tool_version = Column(String(50))
    conversion_parameters = Column(JSON, default=dict)
    
    # Processing time
    conversion_time_seconds = Column(Float)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    processing_job = relationship("DocumentProcessingJob", back_populates="conversion_results")
    document = relationship("Document", back_populates="conversion_results")

class AIAnalysisResult(Base):
    __tablename__ = "ai_analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    processing_job_id = Column(Integer, ForeignKey("document_processing_jobs.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    
    # AI Analysis type
    analysis_type = Column(String(100))  # sentiment, summary, keywords, etc.
    
    # AI Model information
    model_name = Column(String(100))
    model_version = Column(String(50))
    model_provider = Column(String(100))  # OpenAI, Hugging Face, etc.
    
    # Analysis results
    analysis_results = Column(JSON, default=dict)
    confidence_scores = Column(JSON, default=dict)
    
    # Specific analysis types
    sentiment_analysis = Column(JSON, default=dict)  # Sentiment scores
    summary = Column(Text)  # Document summary
    keywords = Column(JSON, default=list)  # Extracted keywords
    topics = Column(JSON, default=list)  # Topic modeling results
    
    # Language detection
    detected_language = Column(String(10))
    language_confidence = Column(Float)
    
    # Content insights
    readability_score = Column(Float)
    complexity_score = Column(Float)
    
    # Processing metadata
    tokens_used = Column(Integer)  # For API-based models
    processing_cost = Column(Float)  # Cost in USD
    processing_time_seconds = Column(Float)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    processing_job = relationship("DocumentProcessingJob", back_populates="ai_analysis_results")
    document = relationship("Document", back_populates="ai_analysis_results")

class ProcessingTemplate(Base):
    __tablename__ = "processing_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Template configuration
    processing_steps = Column(JSON, default=list)  # Ordered list of processing steps
    default_configuration = Column(JSON, default=dict)
    
    # Template metadata
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_public = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Usage statistics
    usage_count = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    created_by = relationship("User", back_populates="processing_templates")

class ProcessingQueue(Base):
    __tablename__ = "processing_queue"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("document_processing_jobs.id"), nullable=False)
    
    # Queue management
    queue_name = Column(String(100), default="default")
    priority = Column(Integer, default=5)
    
    # Scheduling
    scheduled_at = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True))
    
    # Worker information
    worker_id = Column(String(100))
    worker_hostname = Column(String(255))
    
    # Retry logic
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Status tracking
    status = Column(SQLEnum(ProcessingStatus), default=ProcessingStatus.PENDING)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    job = relationship("DocumentProcessingJob")