# ARIA v2.0.0 - Implementation Roadmap

## 🎯 Strategic Implementation Plan

**Goal**: Production-ready system in 8-10 weeks  
**Approach**: Agile sprints (2-week iterations)  
**Team Size**: 4-6 developers

---

## 📅 Sprint Planning

### Sprint 1 (Weeks 1-2): Foundation & Core Backend

**Goal**: Working backend with database and authentication

#### Priority 1: Database Models & Migrations
**Owner**: Backend Developer 1  
**Time**: 5 days

```python
# Create these files:
backend/models/
├── __init__.py
├── base.py           # Base model class
├── user.py           # User, Role models
├── document.py       # Document, DocumentMetadata
├── processing.py     # ProcessingJob, ValidationResult
├── sap.py           # SAPTransaction, SAPLog
├── chat.py          # Conversation, Message
└── audit.py         # AuditLog

# Alembic migrations:
backend/alembic/versions/
└── 001_initial_schema.py
```

**Acceptance Criteria**:
- ✅ All models created with relationships
- ✅ Migrations run successfully
- ✅ Can create/query all entities
- ✅ Indexes added for performance

#### Priority 2: User Authentication Complete
**Owner**: Backend Developer 1  
**Time**: 3 days

**Implementation**:
```python
# backend/core/auth.py
- Password hashing with bcrypt
- JWT token generation (access + refresh)
- Token validation middleware
- User CRUD operations

# backend/api/gateway/routers/auth.py
- Complete all auth endpoints
- Add password reset flow
- Add email verification
```

**Acceptance Criteria**:
- ✅ Users can register and login
- ✅ JWT tokens work correctly
- ✅ Password reset via email
- ✅ All endpoints protected

#### Priority 3: Basic Document CRUD
**Owner**: Backend Developer 2  
**Time**: 4 days

**Implementation**:
```python
# backend/api/gateway/routers/documents.py
- Upload to MinIO
- Store metadata in database
- List with pagination
- Get by ID
- Delete document
- Basic search

# backend/services/storage.py
class StorageService:
    async def upload_file(self, file: UploadFile) -> str
    async def download_file(self, file_id: str) -> bytes
    async def delete_file(self, file_id: str) -> bool
```

**Acceptance Criteria**:
- ✅ Can upload documents
- ✅ Files stored in MinIO
- ✅ Metadata in database
- ✅ Can list and retrieve documents

---

### Sprint 2 (Weeks 3-4): Document Processing & ML

**Goal**: Documents get processed with OCR and data extraction

#### Priority 1: OCR Service
**Owner**: ML Engineer  
**Time**: 6 days

**Implementation**:
```python
# backend/ml/services/ocr_service.py
class OCRService:
    def __init__(self):
        self.tesseract = TesseractOCR()
        self.paddle = PaddleOCR()
    
    async def extract_text(self, image_path: str) -> OCRResult:
        """Extract text from image using Tesseract"""
        # 1. Preprocess image (deskew, denoise)
        # 2. Detect text regions
        # 3. Run OCR
        # 4. Return structured text with confidence
        pass
    
    async def extract_handwriting(self, image_path: str) -> OCRResult:
        """Extract handwritten text using PaddleOCR"""
        pass

# backend/ml/services/preprocessing.py
class ImagePreprocessor:
    def deskew(self, image: np.ndarray) -> np.ndarray
    def denoise(self, image: np.ndarray) -> np.ndarray
    def enhance_contrast(self, image: np.ndarray) -> np.ndarray
```

**Setup Requirements**:
```bash
# Install Tesseract
apt-get install tesseract-ocr tesseract-ocr-eng

# Download language data
wget https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata

# Install PaddleOCR
pip install paddlepaddle paddleocr
```

**Acceptance Criteria**:
- ✅ Can extract text from PDF/images
- ✅ Handles scanned documents
- ✅ Returns confidence scores
- ✅ Processes multiple pages

#### Priority 2: Data Extraction Service
**Owner**: ML Engineer  
**Time**: 4 days

**Implementation**:
```python
# backend/ml/services/extraction_service.py
class DataExtractionService:
    def __init__(self):
        self.nlp_model = load_model("distilbert-base")
        self.ner_model = load_ner_model()
    
    async def extract_invoice_data(self, text: str) -> InvoiceData:
        """Extract structured invoice data"""
        return InvoiceData(
            invoice_number=self._extract_invoice_number(text),
            date=self._extract_date(text),
            total_amount=self._extract_amount(text),
            vendor=self._extract_vendor(text),
            line_items=self._extract_line_items(text)
        )
    
    def _extract_date(self, text: str) -> date:
        # Use regex + NER
        dates = self.ner_model.extract_dates(text)
        return self._validate_date(dates[0])
    
    def _extract_amount(self, text: str) -> Decimal:
        # Look for currency patterns
        amounts = re.findall(r'\$?\d+[.,]\d{2}', text)
        return self._validate_amount(amounts[-1])  # Usually last is total
```

**Extraction Patterns**:
```python
# backend/ml/patterns/invoice_patterns.py
PATTERNS = {
    'invoice_number': [
        r'Invoice\s*#?\s*(\d+)',
        r'INV[-\s]*(\d+)',
        r'Invoice\s*Number\s*:?\s*(\d+)'
    ],
    'date': [
        r'Date\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})',
        r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})'
    ],
    'total': [
        r'Total\s*:?\s*\$?(\d+[.,]\d{2})',
        r'Amount\s*Due\s*:?\s*\$?(\d+[.,]\d{2})'
    ]
}
```

**Acceptance Criteria**:
- ✅ Extracts invoice number, date, amount
- ✅ Extracts vendor information
- ✅ Extracts line items
- ✅ Handles different invoice formats
- ✅ Accuracy > 90% on test set

#### Priority 3: Celery Processing Tasks
**Owner**: Backend Developer 2  
**Time**: 4 days

**Implementation**:
```python
# backend/tasks/document_tasks.py
from celery import Task

class DocumentProcessingTask(Task):
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        # Update document status to failed
        # Send notification
        pass
    
    def on_success(self, retval, task_id, args, kwargs):
        # Update document status to completed
        # Send notification
        pass

@celery_app.task(bind=True, base=DocumentProcessingTask, max_retries=3)
def process_document(self, document_id: str):
    """Main document processing task"""
    try:
        # 1. Update status to processing
        doc = await Document.get(document_id)
        doc.status = DocumentStatus.PROCESSING
        await doc.save()
        
        # 2. Download from MinIO
        file_bytes = await storage_service.download_file(doc.file_path)
        
        # 3. Convert to images (if PDF)
        images = pdf_to_images(file_bytes)
        
        # 4. Run OCR on each page
        ocr_results = []
        for image in images:
            result = await ocr_service.extract_text(image)
            ocr_results.append(result)
        
        # 5. Extract structured data
        extracted_data = await extraction_service.extract_invoice_data(
            "\n".join([r.text for r in ocr_results])
        )
        
        # 6. Validate data
        validation = await validator.validate(extracted_data)
        
        # 7. Update document with results
        doc.extracted_data = extracted_data.dict()
        doc.validation_results = validation.dict()
        doc.status = DocumentStatus.COMPLETED if validation.is_valid else DocumentStatus.NEEDS_REVIEW
        doc.confidence_score = validation.confidence
        await doc.save()
        
        # 8. Send notification
        await notification_service.send_processing_complete(doc)
        
        return {"status": "success", "document_id": document_id}
        
    except Exception as exc:
        logger.error(f"Processing failed: {exc}")
        doc.status = DocumentStatus.FAILED
        doc.error_message = str(exc)
        await doc.save()
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))

@celery_app.task
def cleanup_old_documents():
    """Cleanup task for old documents"""
    pass
```

**Celery Configuration**:
```python
# backend/core/celery_app.py
from celery import Celery
from celery.schedules import crontab

celery_app = Celery(
    "aria",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=100,
)

# Periodic tasks
celery_app.conf.beat_schedule = {
    'cleanup-old-documents': {
        'task': 'tasks.document_tasks.cleanup_old_documents',
        'schedule': crontab(hour=2, minute=0),  # 2 AM daily
    },
}
```

**Acceptance Criteria**:
- ✅ Documents queued for processing
- ✅ Celery tasks execute successfully
- ✅ Status updates in database
- ✅ Error handling and retries work
- ✅ Can monitor with Flower

---

### Sprint 3 (Weeks 5-6): SAP Integration & Frontend Core

**Goal**: Complete SAP integration and working frontend

#### Priority 1: SAP RFC Integration
**Owner**: Backend Developer 1 + SAP Consultant  
**Time**: 8 days

**Implementation**:
```python
# backend/api/sap/connectors/rfc_connector.py
from pyrfc import Connection, ABAPApplicationError, ABAPRuntimeError
from typing import Dict, List
import logging

class SAPConnector:
    def __init__(self):
        self.connection_params = {
            'ashost': settings.SAP_ASHOST,
            'sysnr': settings.SAP_SYSNR,
            'client': settings.SAP_CLIENT,
            'user': settings.SAP_USER,
            'passwd': settings.SAP_PASSWORD,
            'lang': settings.SAP_LANG or 'EN'
        }
        self.conn = None
    
    def connect(self):
        """Establish SAP connection"""
        try:
            self.conn = Connection(**self.connection_params)
            logger.info("SAP connection established")
            return True
        except Exception as e:
            logger.error(f"SAP connection failed: {e}")
            raise
    
    def disconnect(self):
        """Close SAP connection"""
        if self.conn:
            self.conn.close()
            self.conn = None
    
    async def post_invoice(self, invoice_data: InvoiceData) -> SAPResponse:
        """Post invoice to SAP using BAPI_ACC_INVOICE_POST"""
        try:
            self.connect()
            
            # Prepare header data
            header = {
                'DOC_DATE': invoice_data.document_date.strftime('%Y%m%d'),
                'PSTNG_DATE': invoice_data.posting_date.strftime('%Y%m%d'),
                'DOC_TYPE': 'KR',  # Vendor invoice
                'COMP_CODE': invoice_data.company_code,
                'CURRENCY': invoice_data.currency,
                'REF_DOC_NO': invoice_data.invoice_number
            }
            
            # Prepare line items
            account_gl = []
            account_payable = []
            
            # GL line items
            for item in invoice_data.line_items:
                account_gl.append({
                    'ITEMNO_ACC': item.line_number,
                    'GL_ACCOUNT': item.gl_account,
                    'ITEM_AMOUNT': item.amount,
                    'ITEM_TEXT': item.description,
                    'COSTCENTER': item.cost_center
                })
            
            # Vendor line (payable)
            account_payable.append({
                'ITEMNO_ACC': len(account_gl) + 1,
                'VENDOR_NO': invoice_data.vendor_code,
                'ITEM_AMOUNT': -invoice_data.total_amount,
                'PMNT_TERM': invoice_data.payment_terms
            })
            
            # Call BAPI
            result = self.conn.call(
                'BAPI_ACC_INVOICE_POST',
                DOCUMENTHEADER=header,
                ACCOUNTGL=account_gl,
                ACCOUNTPAYABLE=account_payable
            )
            
            # Check for errors
            if result['RETURN']['TYPE'] in ['E', 'A']:
                error_msg = result['RETURN']['MESSAGE']
                logger.error(f"SAP posting failed: {error_msg}")
                return SAPResponse(
                    success=False,
                    error_message=error_msg,
                    sap_doc_number=None
                )
            
            # Commit the transaction
            commit_result = self.conn.call('BAPI_TRANSACTION_COMMIT', WAIT='X')
            
            sap_doc_number = result.get('DOCUMENTNUMBER')
            logger.info(f"Invoice posted successfully. SAP Doc: {sap_doc_number}")
            
            return SAPResponse(
                success=True,
                sap_doc_number=sap_doc_number,
                fiscal_year=result.get('FISCALYEAR'),
                message=result['RETURN']['MESSAGE']
            )
            
        except ABAPApplicationError as e:
            logger.error(f"ABAP Application Error: {e}")
            return SAPResponse(success=False, error_message=str(e))
        except ABAPRuntimeError as e:
            logger.error(f"ABAP Runtime Error: {e}")
            return SAPResponse(success=False, error_message=str(e))
        except Exception as e:
            logger.error(f"SAP connection error: {e}")
            return SAPResponse(success=False, error_message=str(e))
        finally:
            self.disconnect()
    
    async def get_vendor_details(self, vendor_code: str) -> Dict:
        """Get vendor master data"""
        try:
            self.connect()
            result = self.conn.call(
                'BAPI_VENDOR_GETDETAIL',
                VENDORNO=vendor_code
            )
            return result
        finally:
            self.disconnect()
    
    async def validate_gl_account(self, gl_account: str, company_code: str) -> bool:
        """Validate GL account exists"""
        try:
            self.connect()
            result = self.conn.call(
                'BAPI_GL_ACC_GETDETAIL',
                GLACCT=gl_account,
                COMPANYCODE=company_code
            )
            return result['RETURN']['TYPE'] not in ['E', 'A']
        finally:
            self.disconnect()

# backend/api/sap/mappers/invoice_mapper.py
class InvoiceToSAPMapper:
    """Map extracted invoice data to SAP format"""
    
    def map_invoice(self, extracted: ExtractedData, config: MappingConfig) -> InvoiceData:
        """Map extracted data to SAP invoice structure"""
        return InvoiceData(
            document_date=extracted.invoice_date,
            posting_date=date.today(),
            invoice_number=extracted.invoice_number,
            vendor_code=self._lookup_vendor_code(extracted.vendor_name),
            company_code=config.default_company_code,
            currency=extracted.currency or config.default_currency,
            total_amount=extracted.total_amount,
            line_items=self._map_line_items(extracted.line_items, config),
            payment_terms=config.default_payment_terms
        )
    
    def _lookup_vendor_code(self, vendor_name: str) -> str:
        """Look up vendor code from name"""
        # Query database or SAP
        vendor = VendorMapping.get_by_name(vendor_name)
        if not vendor:
            raise ValueError(f"Vendor not found: {vendor_name}")
        return vendor.sap_code
    
    def _map_line_items(self, items: List, config: MappingConfig) -> List[LineItem]:
        """Map line items to SAP format"""
        mapped_items = []
        for idx, item in enumerate(items, start=1):
            mapped_items.append(LineItem(
                line_number=idx,
                gl_account=self._determine_gl_account(item, config),
                amount=item.amount,
                description=item.description,
                cost_center=config.default_cost_center
            ))
        return mapped_items
```

**SAP Testing**:
```python
# backend/tests/integration/test_sap_integration.py
import pytest

@pytest.mark.integration
@pytest.mark.sap
async def test_sap_connection():
    """Test SAP connection"""
    connector = SAPConnector()
    assert connector.connect() == True
    connector.disconnect()

@pytest.mark.integration
@pytest.mark.sap
async def test_post_invoice():
    """Test invoice posting"""
    invoice = InvoiceData(
        document_date=date(2024, 1, 15),
        posting_date=date.today(),
        invoice_number="TEST-001",
        vendor_code="1000",
        company_code="1000",
        currency="USD",
        total_amount=1000.00,
        line_items=[
            LineItem(line_number=1, gl_account="410000", amount=1000.00)
        ]
    )
    
    connector = SAPConnector()
    response = await connector.post_invoice(invoice)
    
    assert response.success == True
    assert response.sap_doc_number is not None
```

**Acceptance Criteria**:
- ✅ Can connect to SAP system
- ✅ Can post invoices successfully
- ✅ Error handling works
- ✅ Vendor lookup works
- ✅ GL account validation works
- ✅ Transactions logged in database

#### Priority 2: Frontend Authentication & Layout
**Owner**: Frontend Developer  
**Time**: 4 days

**Implementation**:
```typescript
// frontend/src/features/auth/authSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '@/services/api';

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest) => {
    const response = await authAPI.login(credentials);
    localStorage.setItem('access_token', response.access_token);
    return response;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('access_token');
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

// frontend/src/services/api/auth.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const authAPI = {
  login: async (credentials: LoginRequest) => {
    const formData = new FormData();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);
    
    const response = await axios.post(`${API_URL}/api/v1/auth/login`, formData);
    return response.data;
  },
  
  register: async (data: RegisterRequest) => {
    const response = await axios.post(`${API_URL}/api/v1/auth/register`, data);
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await axios.get(`${API_URL}/api/v1/auth/me`);
    return response.data;
  }
};

// frontend/src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/hooks/redux';
import { login } from '@/features/auth/authSlice';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await dispatch(login(values)).unwrap();
      message.success('Login successful!');
      router.push('/dashboard');
    } catch (error) {
      message.error('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-96">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">ARIA</h1>
          <p className="text-gray-500">Document Processing AI</p>
        </div>
        
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Please input your email!' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email"
              size="large"
            />
          </Form.Item>
          
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>
          
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
            >
              Log In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
```

**Acceptance Criteria**:
- ✅ Login page works
- ✅ User can register
- ✅ Token stored in localStorage
- ✅ Protected routes redirect to login
- ✅ Logout works

#### Priority 3: Document Upload Interface
**Owner**: Frontend Developer  
**Time**: 4 days

**Implementation** in next message due to length...

**Acceptance Criteria**:
- ✅ Drag-and-drop upload
- ✅ File validation
- ✅ Upload progress
- ✅ Document list with status
- ✅ Can view document details

---

### Sprint 4 (Weeks 7-8): Testing, Security & Optimization

**Goal**: Production-ready system with comprehensive testing

#### Priority 1: Comprehensive Testing
**Owner**: QA Engineer + All Developers  
**Time**: 8 days

- Unit tests (500+ tests)
- Integration tests (100+ tests)
- E2E tests (50+ scenarios)
- Load testing
- Security testing

#### Priority 2: Security Hardening
**Owner**: DevOps + Backend Developer  
**Time**: 4 days

- SSL/TLS setup
- Rate limiting
- Security headers
- Dependency audit
- Penetration testing

#### Priority 3: Performance Optimization
**Owner**: All Developers  
**Time**: 3 days

- Database indexing
- Query optimization
- Caching implementation
- Frontend optimization

---

### Sprint 5 (Weeks 9-10): UAT & Go-Live

**Goal**: User acceptance testing and production deployment

#### Week 9: User Acceptance Testing
- Deploy to staging
- Beta user testing
- Bug fixes
- Documentation finalization
- Training materials

#### Week 10: Production Deployment
- Final code freeze
- Security audit
- Deploy to production
- Monitor closely
- Support team ready

---

## 🎯 Quick Wins (Can Start Immediately)

### Week 0 Tasks (Before Sprint 1)

1. **Set up Development Environment** (1 day)
   ```bash
   docker-compose up -d postgres redis minio
   ```

2. **Create Database Models** (2 days)
   - Start with User and Document models
   - Run first migration

3. **Complete User Auth Flow** (2 days)
   - Register, login, logout
   - Password reset

4. **Basic Upload/Download** (1 day)
   - Upload file to MinIO
   - Download file

---

## 📊 Progress Tracking

### Key Metrics
- Code coverage: Target 80%
- API tests passing: Target 100%
- Performance: < 500ms response time
- Error rate: < 1%

### Weekly Checkpoints
- Monday: Sprint planning
- Wednesday: Mid-week sync
- Friday: Demo + retrospective

---

## 🚨 Risk Management

### Top Risks
1. **SAP Integration Complexity**
   - Mitigation: Involve SAP consultant early
   
2. **ML Model Accuracy**
   - Mitigation: Use pre-trained models, extensive testing
   
3. **Performance Issues**
   - Mitigation: Load testing early, optimize queries
   
4. **Scope Creep**
   - Mitigation: Stick to MVP features

---

**Next Action**: Choose Sprint 1 tasks and start development! 🚀
