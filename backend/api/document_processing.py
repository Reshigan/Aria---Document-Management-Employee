from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import and_, or_, desc, create_engine
from jose import JWTError, jwt
import logging

from models import User
from models.document_processing_models import (
    DocumentProcessingJob, OCRResult, DocumentClassificationResult,
    ContentExtractionResult, DocumentConversionResult, AIAnalysisResult,
    ProcessingTemplate, ProcessingStatus, ProcessingType
)
from schemas.document_processing_schemas import (
    DocumentProcessingJobCreate, DocumentProcessingJobUpdate, DocumentProcessingJobResponse,
    DocumentProcessingJobWithResults, OCRResultResponse, DocumentClassificationResultResponse,
    ContentExtractionResultResponse, DocumentConversionResultResponse, AIAnalysisResultResponse,
    ProcessingTemplateCreate, ProcessingTemplateUpdate, ProcessingTemplateResponse,
    BatchProcessingRequest, BatchProcessingResponse, ProcessingStatistics,
    OCRConfiguration, ClassificationConfiguration, ConversionConfiguration, AIAnalysisConfiguration
)
from services.document_processing_service import document_processing_service

# Database setup
DATABASE_URL = "sqlite:///./aria.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Auth setup
SECRET_KEY = "AriaJWT1730901994SecretKey"
ALGORITHM = "HS256"
security = HTTPBearer()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

router = APIRouter(prefix="/api/document-processing", tags=["Document Processing"])
logger = logging.getLogger(__name__)

# Processing Jobs
@router.post("/jobs", response_model=DocumentProcessingJobResponse)
async def create_processing_job(
    job_data: DocumentProcessingJobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new document processing job"""
    job = await document_processing_service.create_processing_job(db, job_data, current_user.id)
    
    # Start processing in background
    background_tasks.add_task(process_job_in_background, job.id, db)
    
    return job

@router.get("/jobs", response_model=List[DocumentProcessingJobResponse])
async def get_processing_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[ProcessingStatus] = None,
    processing_type: Optional[ProcessingType] = None,
    document_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get processing jobs for current user"""
    query = db.query(DocumentProcessingJob).filter(DocumentProcessingJob.user_id == current_user.id)
    
    if status:
        query = query.filter(DocumentProcessingJob.status == status)
    if processing_type:
        query = query.filter(DocumentProcessingJob.processing_type == processing_type)
    if document_id:
        query = query.filter(DocumentProcessingJob.document_id == document_id)
    
    jobs = query.order_by(desc(DocumentProcessingJob.created_at)).offset(skip).limit(limit).all()
    return jobs

@router.get("/jobs/{job_id}", response_model=DocumentProcessingJobWithResults)
async def get_processing_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific processing job with results"""
    job = db.query(DocumentProcessingJob).filter(
        and_(
            DocumentProcessingJob.id == job_id,
            DocumentProcessingJob.user_id == current_user.id
        )
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found")
    
    return job

@router.put("/jobs/{job_id}", response_model=DocumentProcessingJobResponse)
async def update_processing_job(
    job_id: int,
    job_update: DocumentProcessingJobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update processing job"""
    job = db.query(DocumentProcessingJob).filter(
        and_(
            DocumentProcessingJob.id == job_id,
            DocumentProcessingJob.user_id == current_user.id
        )
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found")
    
    # Update fields
    for field, value in job_update.dict(exclude_unset=True).items():
        setattr(job, field, value)
    
    db.commit()
    db.refresh(job)
    return job

@router.delete("/jobs/{job_id}")
async def delete_processing_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete processing job"""
    job = db.query(DocumentProcessingJob).filter(
        and_(
            DocumentProcessingJob.id == job_id,
            DocumentProcessingJob.user_id == current_user.id
        )
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found")
    
    # Only allow deletion of completed or failed jobs
    if job.status in [ProcessingStatus.PENDING, ProcessingStatus.IN_PROGRESS]:
        raise HTTPException(status_code=400, detail="Cannot delete active processing job")
    
    db.delete(job)
    db.commit()
    return {"message": "Processing job deleted successfully"}

@router.post("/jobs/{job_id}/cancel")
async def cancel_processing_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel processing job"""
    job = await document_processing_service.update_job_status(
        db, job_id, ProcessingStatus.CANCELLED
    )
    return {"message": "Processing job cancelled", "job": job}

# OCR Processing
@router.post("/jobs/{job_id}/ocr", response_model=OCRResultResponse)
async def perform_ocr(
    job_id: int,
    config: Optional[OCRConfiguration] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Perform OCR on document"""
    # Verify job ownership
    job = db.query(DocumentProcessingJob).filter(
        and_(
            DocumentProcessingJob.id == job_id,
            DocumentProcessingJob.user_id == current_user.id,
            DocumentProcessingJob.processing_type == ProcessingType.OCR
        )
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="OCR job not found")
    
    result = await document_processing_service.perform_ocr(db, job_id, config)
    return result

@router.get("/jobs/{job_id}/ocr", response_model=List[OCRResultResponse])
async def get_ocr_results(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get OCR results for job"""
    # Verify job ownership
    job = db.query(DocumentProcessingJob).filter(
        and_(
            DocumentProcessingJob.id == job_id,
            DocumentProcessingJob.user_id == current_user.id
        )
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found")
    
    results = db.query(OCRResult).filter(OCRResult.processing_job_id == job_id).all()
    return results

# Document Classification
@router.post("/jobs/{job_id}/classify", response_model=DocumentClassificationResultResponse)
async def classify_document(
    job_id: int,
    config: Optional[ClassificationConfiguration] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Classify document"""
    # Verify job ownership
    job = db.query(DocumentProcessingJob).filter(
        and_(
            DocumentProcessingJob.id == job_id,
            DocumentProcessingJob.user_id == current_user.id,
            DocumentProcessingJob.processing_type == ProcessingType.CLASSIFICATION
        )
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Classification job not found")
    
    result = await document_processing_service.classify_document(db, job_id, config)
    return result

@router.get("/jobs/{job_id}/classification", response_model=List[DocumentClassificationResultResponse])
async def get_classification_results(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get classification results for job"""
    # Verify job ownership
    job = db.query(DocumentProcessingJob).filter(
        and_(
            DocumentProcessingJob.id == job_id,
            DocumentProcessingJob.user_id == current_user.id
        )
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found")
    
    results = db.query(DocumentClassificationResult).filter(
        DocumentClassificationResult.processing_job_id == job_id
    ).all()
    return results

@router.put("/classification/{result_id}/verify")
async def verify_classification(
    result_id: int,
    manual_classification: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Verify and optionally correct classification result"""
    result = db.query(DocumentClassificationResult).filter(
        DocumentClassificationResult.id == result_id
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Classification result not found")
    
    # Verify user has access to this result
    job = db.query(DocumentProcessingJob).filter(
        and_(
            DocumentProcessingJob.id == result.processing_job_id,
            DocumentProcessingJob.user_id == current_user.id
        )
    ).first()
    
    if not job:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result.is_verified = True
    result.verified_by_user_id = current_user.id
    result.verified_at = datetime.utcnow()
    
    if manual_classification:
        result.manual_classification = manual_classification
    
    db.commit()
    db.refresh(result)
    return result

# Content Extraction
@router.post("/jobs/{job_id}/extract", response_model=ContentExtractionResultResponse)
async def extract_content(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extract content from document"""
    # Verify job ownership
    job = db.query(DocumentProcessingJob).filter(
        and_(
            DocumentProcessingJob.id == job_id,
            DocumentProcessingJob.user_id == current_user.id,
            DocumentProcessingJob.processing_type == ProcessingType.CONTENT_EXTRACTION
        )
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Content extraction job not found")
    
    result = await document_processing_service.extract_content(db, job_id)
    return result

@router.get("/jobs/{job_id}/extraction", response_model=List[ContentExtractionResultResponse])
async def get_extraction_results(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get content extraction results for job"""
    # Verify job ownership
    job = db.query(DocumentProcessingJob).filter(
        and_(
            DocumentProcessingJob.id == job_id,
            DocumentProcessingJob.user_id == current_user.id
        )
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found")
    
    results = db.query(ContentExtractionResult).filter(
        ContentExtractionResult.processing_job_id == job_id
    ).all()
    return results

# Document Conversion
@router.post("/jobs/{job_id}/convert", response_model=DocumentConversionResultResponse)
async def convert_document(
    job_id: int,
    config: ConversionConfiguration,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Convert document to different format"""
    # Verify job ownership
    job = db.query(DocumentProcessingJob).filter(
        and_(
            DocumentProcessingJob.id == job_id,
            DocumentProcessingJob.user_id == current_user.id,
            DocumentProcessingJob.processing_type == ProcessingType.CONVERSION
        )
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Conversion job not found")
    
    result = await document_processing_service.convert_document(db, job_id, config)
    return result

@router.get("/jobs/{job_id}/conversion", response_model=List[DocumentConversionResultResponse])
async def get_conversion_results(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get conversion results for job"""
    # Verify job ownership
    job = db.query(DocumentProcessingJob).filter(
        and_(
            DocumentProcessingJob.id == job_id,
            DocumentProcessingJob.user_id == current_user.id
        )
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found")
    
    results = db.query(DocumentConversionResult).filter(
        DocumentConversionResult.processing_job_id == job_id
    ).all()
    return results

# AI Analysis
@router.post("/jobs/{job_id}/analyze", response_model=AIAnalysisResultResponse)
async def perform_ai_analysis(
    job_id: int,
    config: AIAnalysisConfiguration,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Perform AI analysis on document"""
    # Verify job ownership
    job = db.query(DocumentProcessingJob).filter(
        and_(
            DocumentProcessingJob.id == job_id,
            DocumentProcessingJob.user_id == current_user.id,
            DocumentProcessingJob.processing_type == ProcessingType.AI_ANALYSIS
        )
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="AI analysis job not found")
    
    result = await document_processing_service.perform_ai_analysis(db, job_id, config)
    return result

@router.get("/jobs/{job_id}/analysis", response_model=List[AIAnalysisResultResponse])
async def get_ai_analysis_results(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI analysis results for job"""
    # Verify job ownership
    job = db.query(DocumentProcessingJob).filter(
        and_(
            DocumentProcessingJob.id == job_id,
            DocumentProcessingJob.user_id == current_user.id
        )
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found")
    
    results = db.query(AIAnalysisResult).filter(
        AIAnalysisResult.processing_job_id == job_id
    ).all()
    return results

# Batch Processing
@router.post("/batch", response_model=BatchProcessingResponse)
async def create_batch_processing(
    batch_request: BatchProcessingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create batch processing jobs"""
    jobs = await document_processing_service.create_batch_processing_jobs(
        db=db,
        document_ids=batch_request.document_ids,
        processing_types=batch_request.processing_types,
        user_id=current_user.id,
        template_id=batch_request.template_id,
        configuration=batch_request.configuration,
        priority=batch_request.priority
    )
    
    # Start processing jobs in background
    for job in jobs:
        background_tasks.add_task(process_job_in_background, job.id, db)
    
    batch_id = f"batch_{current_user.id}_{len(jobs)}_{int(datetime.utcnow().timestamp())}"
    
    return BatchProcessingResponse(
        batch_id=batch_id,
        job_ids=[job.id for job in jobs],
        total_jobs=len(jobs),
        estimated_completion_time=len(jobs) * 30  # Rough estimate: 30 seconds per job
    )

# Processing Templates
@router.post("/templates", response_model=ProcessingTemplateResponse)
async def create_processing_template(
    template_data: ProcessingTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create processing template"""
    template = ProcessingTemplate(
        name=template_data.name,
        description=template_data.description,
        processing_steps=template_data.processing_steps,
        default_configuration=template_data.default_configuration,
        created_by_user_id=current_user.id,
        is_public=template_data.is_public,
        is_active=template_data.is_active
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    return template

@router.get("/templates", response_model=List[ProcessingTemplateResponse])
async def get_processing_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    include_public: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get processing templates"""
    query = db.query(ProcessingTemplate).filter(ProcessingTemplate.is_active == True)
    
    if include_public:
        query = query.filter(
            or_(
                ProcessingTemplate.created_by_user_id == current_user.id,
                ProcessingTemplate.is_public == True
            )
        )
    else:
        query = query.filter(ProcessingTemplate.created_by_user_id == current_user.id)
    
    templates = query.order_by(desc(ProcessingTemplate.created_at)).offset(skip).limit(limit).all()
    return templates

@router.get("/templates/{template_id}", response_model=ProcessingTemplateResponse)
async def get_processing_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific processing template"""
    template = db.query(ProcessingTemplate).filter(
        and_(
            ProcessingTemplate.id == template_id,
            ProcessingTemplate.is_active == True,
            or_(
                ProcessingTemplate.created_by_user_id == current_user.id,
                ProcessingTemplate.is_public == True
            )
        )
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Processing template not found")
    
    return template

@router.put("/templates/{template_id}", response_model=ProcessingTemplateResponse)
async def update_processing_template(
    template_id: int,
    template_update: ProcessingTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update processing template"""
    template = db.query(ProcessingTemplate).filter(
        and_(
            ProcessingTemplate.id == template_id,
            ProcessingTemplate.created_by_user_id == current_user.id
        )
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Processing template not found")
    
    # Update fields
    for field, value in template_update.dict(exclude_unset=True).items():
        setattr(template, field, value)
    
    db.commit()
    db.refresh(template)
    return template

@router.delete("/templates/{template_id}")
async def delete_processing_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete processing template"""
    template = db.query(ProcessingTemplate).filter(
        and_(
            ProcessingTemplate.id == template_id,
            ProcessingTemplate.created_by_user_id == current_user.id
        )
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Processing template not found")
    
    # Soft delete
    template.is_active = False
    db.commit()
    return {"message": "Processing template deleted successfully"}

# Statistics and Monitoring
@router.get("/statistics", response_model=ProcessingStatistics)
async def get_processing_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get processing statistics for current user"""
    stats = document_processing_service.get_processing_statistics(db, current_user.id)
    return ProcessingStatistics(**stats)

@router.get("/queue/status")
async def get_queue_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get processing queue status"""
    # Get queue statistics
    pending_jobs = db.query(DocumentProcessingJob).filter(
        and_(
            DocumentProcessingJob.user_id == current_user.id,
            DocumentProcessingJob.status == ProcessingStatus.PENDING
        )
    ).count()
    
    in_progress_jobs = db.query(DocumentProcessingJob).filter(
        and_(
            DocumentProcessingJob.user_id == current_user.id,
            DocumentProcessingJob.status == ProcessingStatus.IN_PROGRESS
        )
    ).count()
    
    return {
        "queue_name": "default",
        "pending_jobs": pending_jobs,
        "in_progress_jobs": in_progress_jobs,
        "estimated_wait_time": pending_jobs * 30,  # Rough estimate
        "worker_count": 1,  # Would be dynamic in real implementation
        "average_job_duration": 30.0
    }

# Background task function
async def process_job_in_background(job_id: int, db: Session):
    """Process job in background"""
    try:
        job = db.query(DocumentProcessingJob).filter(DocumentProcessingJob.id == job_id).first()
        if not job:
            return
        
        # Route to appropriate processing function based on type
        if job.processing_type == ProcessingType.OCR:
            await document_processing_service.perform_ocr(db, job_id)
        elif job.processing_type == ProcessingType.CLASSIFICATION:
            await document_processing_service.classify_document(db, job_id)
        elif job.processing_type == ProcessingType.CONTENT_EXTRACTION:
            await document_processing_service.extract_content(db, job_id)
        elif job.processing_type == ProcessingType.CONVERSION:
            # Would need conversion config from job configuration
            pass
        elif job.processing_type == ProcessingType.AI_ANALYSIS:
            # Would need AI config from job configuration
            pass
        
    except Exception as e:
        logger.error(f"Background processing failed for job {job_id}: {str(e)}")
        await document_processing_service.update_job_status(
            db, job_id, ProcessingStatus.FAILED, error_message=str(e)
        )