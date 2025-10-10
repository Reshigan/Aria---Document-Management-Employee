import { api } from '../lib/api';

export interface ProcessingJob {
  id: number;
  document_id: number;
  processing_type: 'OCR' | 'CLASSIFICATION' | 'CONTENT_EXTRACTION' | 'CONVERSION' | 'AI_ANALYSIS';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: number;
  configuration: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  error_message?: string;
  document?: {
    id: number;
    filename: string;
    file_type: string;
    file_size: number;
  };
}

export interface OCRResult {
  id: number;
  job_id: number;
  extracted_text: string;
  confidence_score: number;
  language: string;
  text_regions: Array<{
    text: string;
    bbox: [number, number, number, number];
    confidence: number;
  }>;
  preprocessing_applied: string[];
  created_at: string;
}

export interface ClassificationResult {
  id: number;
  job_id: number;
  predicted_category: string;
  confidence_score: number;
  all_predictions: Array<{
    category: string;
    confidence: number;
  }>;
  features_used: string[];
  model_version: string;
  created_at: string;
}

export interface ContentExtractionResult {
  id: number;
  job_id: number;
  extracted_content: Record<string, any>;
  entities: Array<{
    text: string;
    label: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  key_phrases: string[];
  summary: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ConversionResult {
  id: number;
  job_id: number;
  target_format: string;
  output_file_path: string;
  conversion_settings: Record<string, any>;
  file_size_before: number;
  file_size_after: number;
  quality_metrics: Record<string, any>;
  created_at: string;
}

export interface AIAnalysisResult {
  id: number;
  job_id: number;
  analysis_type: string;
  results: Record<string, any>;
  insights: string[];
  recommendations: string[];
  confidence_score: number;
  model_used: string;
  created_at: string;
}

export interface ProcessingTemplate {
  id: number;
  name: string;
  description: string;
  processing_type: string;
  configuration: Record<string, any>;
  is_default: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface ProcessingStatistics {
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  pending_jobs: number;
  average_processing_time: number;
  success_rate: number;
  jobs_by_type: Record<string, number>;
  jobs_by_status: Record<string, number>;
  processing_time_by_type: Record<string, number>;
}

export interface BatchProcessingRequest {
  document_ids: number[];
  processing_type: string;
  configuration: Record<string, any>;
  template_id?: number;
}

export interface BatchProcessingResponse {
  batch_id: string;
  job_ids: number[];
  total_documents: number;
  estimated_completion_time: string;
}

class DocumentProcessingService {
  // Job Management
  async createProcessingJob(data: {
    document_id: number;
    processing_type: string;
    configuration?: Record<string, any>;
    template_id?: number;
  }): Promise<ProcessingJob> {
    const response = await api.post('/api/document-processing/jobs', data);
    return response.data;
  }

  async getProcessingJobs(params?: {
    document_id?: number;
    processing_type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ProcessingJob[]> {
    const response = await api.get('/api/document-processing/jobs', { params });
    return response.data;
  }

  async getProcessingJob(jobId: number): Promise<ProcessingJob> {
    const response = await api.get(`/api/document-processing/jobs/${jobId}`);
    return response.data;
  }

  async updateProcessingJob(jobId: number, data: {
    configuration?: Record<string, any>;
    status?: string;
  }): Promise<ProcessingJob> {
    const response = await api.put(`/api/document-processing/jobs/${jobId}`, data);
    return response.data;
  }

  async deleteProcessingJob(jobId: number): Promise<void> {
    await api.delete(`/api/document-processing/jobs/${jobId}`);
  }

  async cancelProcessingJob(jobId: number): Promise<ProcessingJob> {
    const response = await api.post(`/api/document-processing/jobs/${jobId}/cancel`);
    return response.data;
  }

  async retryProcessingJob(jobId: number): Promise<ProcessingJob> {
    const response = await api.post(`/api/document-processing/jobs/${jobId}/retry`);
    return response.data;
  }

  // OCR Operations
  async performOCR(jobId: number, config?: {
    language?: string;
    preprocessing_steps?: string[];
    confidence_threshold?: number;
  }): Promise<OCRResult> {
    const response = await api.post(`/api/document-processing/jobs/${jobId}/ocr`, config);
    return response.data;
  }

  async getOCRResult(jobId: number): Promise<OCRResult> {
    const response = await api.get(`/api/document-processing/jobs/${jobId}/ocr`);
    return response.data;
  }

  // Classification Operations
  async performClassification(jobId: number, config?: {
    model_name?: string;
    confidence_threshold?: number;
    return_all_predictions?: boolean;
  }): Promise<ClassificationResult> {
    const response = await api.post(`/api/document-processing/jobs/${jobId}/classify`, config);
    return response.data;
  }

  async getClassificationResult(jobId: number): Promise<ClassificationResult> {
    const response = await api.get(`/api/document-processing/jobs/${jobId}/classify`);
    return response.data;
  }

  // Content Extraction Operations
  async performContentExtraction(jobId: number, config?: {
    extract_entities?: boolean;
    extract_key_phrases?: boolean;
    generate_summary?: boolean;
    summary_length?: number;
  }): Promise<ContentExtractionResult> {
    const response = await api.post(`/api/document-processing/jobs/${jobId}/extract`, config);
    return response.data;
  }

  async getContentExtractionResult(jobId: number): Promise<ContentExtractionResult> {
    const response = await api.get(`/api/document-processing/jobs/${jobId}/extract`);
    return response.data;
  }

  // Conversion Operations
  async performConversion(jobId: number, config: {
    target_format: string;
    quality?: string;
    compression?: string;
    additional_settings?: Record<string, any>;
  }): Promise<ConversionResult> {
    const response = await api.post(`/api/document-processing/jobs/${jobId}/convert`, config);
    return response.data;
  }

  async getConversionResult(jobId: number): Promise<ConversionResult> {
    const response = await api.get(`/api/document-processing/jobs/${jobId}/convert`);
    return response.data;
  }

  // AI Analysis Operations
  async performAIAnalysis(jobId: number, config: {
    analysis_type: string;
    model_name?: string;
    parameters?: Record<string, any>;
  }): Promise<AIAnalysisResult> {
    const response = await api.post(`/api/document-processing/jobs/${jobId}/analyze`, config);
    return response.data;
  }

  async getAIAnalysisResult(jobId: number): Promise<AIAnalysisResult> {
    const response = await api.get(`/api/document-processing/jobs/${jobId}/analyze`);
    return response.data;
  }

  // Template Management
  async getProcessingTemplates(processingType?: string): Promise<ProcessingTemplate[]> {
    const response = await api.get('/api/document-processing/templates', {
      params: { processing_type: processingType }
    });
    return response.data;
  }

  async createProcessingTemplate(data: {
    name: string;
    description: string;
    processing_type: string;
    configuration: Record<string, any>;
    is_default?: boolean;
  }): Promise<ProcessingTemplate> {
    const response = await api.post('/api/document-processing/templates', data);
    return response.data;
  }

  async updateProcessingTemplate(templateId: number, data: {
    name?: string;
    description?: string;
    configuration?: Record<string, any>;
    is_default?: boolean;
  }): Promise<ProcessingTemplate> {
    const response = await api.put(`/api/document-processing/templates/${templateId}`, data);
    return response.data;
  }

  async deleteProcessingTemplate(templateId: number): Promise<void> {
    await api.delete(`/api/document-processing/templates/${templateId}`);
  }

  // Batch Processing
  async createBatchProcessing(data: BatchProcessingRequest): Promise<BatchProcessingResponse> {
    const response = await api.post('/api/document-processing/batch', data);
    return response.data;
  }

  async getBatchProcessingStatus(batchId: string): Promise<{
    batch_id: string;
    total_jobs: number;
    completed_jobs: number;
    failed_jobs: number;
    pending_jobs: number;
    progress: number;
    estimated_completion_time?: string;
  }> {
    const response = await api.get(`/api/document-processing/batch/${batchId}`);
    return response.data;
  }

  // Statistics
  async getProcessingStatistics(params?: {
    start_date?: string;
    end_date?: string;
    processing_type?: string;
  }): Promise<ProcessingStatistics> {
    const response = await api.get('/api/document-processing/statistics', { params });
    return response.data;
  }

  // Queue Management
  async getProcessingQueue(): Promise<{
    pending_jobs: ProcessingJob[];
    active_jobs: ProcessingJob[];
    queue_size: number;
    estimated_wait_time: number;
  }> {
    const response = await api.get('/api/document-processing/queue');
    return response.data;
  }

  async clearProcessingQueue(): Promise<void> {
    await api.post('/api/document-processing/queue/clear');
  }

  async pauseProcessingQueue(): Promise<void> {
    await api.post('/api/document-processing/queue/pause');
  }

  async resumeProcessingQueue(): Promise<void> {
    await api.post('/api/document-processing/queue/resume');
  }
}

export const documentProcessingService = new DocumentProcessingService();