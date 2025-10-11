import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface ComplianceFramework {
  id: number;
  name: string;
  description: string;
  version: string;
  status: string;
  compliance_score: number;
  last_assessment: string;
  next_assessment: string;
  requirements_count: number;
  implemented_count: number;
  retention_period_days: number;
  created_at: string;
  updated_at: string;
}

export interface CompliancePolicy {
  id: number;
  framework_id: number;
  title: string;
  description: string;
  policy_type: string;
  implementation_status: string;
  priority: string;
  owner: string;
  review_date: string;
  approval_date?: string;
  version: string;
  policy_document_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceViolation {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  framework_id: number;
  framework_name: string;
  policy_id?: number;
  detected_at: string;
  resolved_at?: string;
  assigned_to?: string;
  remediation_plan?: string;
  evidence?: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceAssessment {
  id: number;
  framework_id: number;
  assessment_type: string;
  status: string;
  score: number;
  assessor: string;
  assessment_date: string;
  completion_date?: string;
  findings: string;
  recommendations: string;
  evidence_collected: string;
  next_assessment_date: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceMetric {
  id: number;
  metric_name: string;
  metric_value: number;
  target_value: number;
  unit: string;
  status: string;
  framework_id?: number;
  measurement_date: string;
  last_updated: string;
  trend: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  event_type: string;
  event_category: string;
  event_description: string;
  user_id?: number;
  username?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_url?: string;
  request_headers?: string;
  request_body?: string;
  response_status?: number;
  response_time_ms?: number;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  old_values?: string;
  new_values?: string;
  risk_level: string;
  compliance_relevant: boolean;
  retention_until?: string;
  country?: string;
  region?: string;
  city?: string;
  timestamp: string;
  created_at: string;
}

export interface ComplianceReport {
  id: number;
  framework_id: number;
  report_type: string;
  title: string;
  description: string;
  generated_by: string;
  generation_date: string;
  report_period_start: string;
  report_period_end: string;
  status: string;
  file_path?: string;
  file_size?: number;
  summary: string;
  recommendations: string;
  created_at: string;
  updated_at: string;
}

class ComplianceService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Frameworks
  async getFrameworks(): Promise<ComplianceFramework[]> {
    const response = await axios.get(`${API_BASE_URL}/api/compliance/frameworks`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async getFramework(id: number): Promise<ComplianceFramework> {
    const response = await axios.get(`${API_BASE_URL}/api/compliance/frameworks/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async createFramework(framework: Partial<ComplianceFramework>): Promise<ComplianceFramework> {
    const response = await axios.post(`${API_BASE_URL}/api/compliance/frameworks`, framework, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async updateFramework(id: number, framework: Partial<ComplianceFramework>): Promise<ComplianceFramework> {
    const response = await axios.put(`${API_BASE_URL}/api/compliance/frameworks/${id}`, framework, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async deleteFramework(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/compliance/frameworks/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Policies
  async getPolicies(frameworkId?: number): Promise<CompliancePolicy[]> {
    const params = frameworkId ? { framework_id: frameworkId } : {};
    const response = await axios.get(`${API_BASE_URL}/api/compliance/policies`, {
      headers: this.getAuthHeaders(),
      params,
    });
    return response.data;
  }

  async getPolicy(id: number): Promise<CompliancePolicy> {
    const response = await axios.get(`${API_BASE_URL}/api/compliance/policies/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async createPolicy(policy: Partial<CompliancePolicy>): Promise<CompliancePolicy> {
    const response = await axios.post(`${API_BASE_URL}/api/compliance/policies`, policy, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async updatePolicy(id: number, policy: Partial<CompliancePolicy>): Promise<CompliancePolicy> {
    const response = await axios.put(`${API_BASE_URL}/api/compliance/policies/${id}`, policy, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async deletePolicy(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/compliance/policies/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Violations
  async getViolations(frameworkId?: number): Promise<ComplianceViolation[]> {
    const params = frameworkId ? { framework_id: frameworkId } : {};
    const response = await axios.get(`${API_BASE_URL}/api/compliance/violations`, {
      headers: this.getAuthHeaders(),
      params,
    });
    return response.data;
  }

  async getViolation(id: number): Promise<ComplianceViolation> {
    const response = await axios.get(`${API_BASE_URL}/api/compliance/violations/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async createViolation(violation: Partial<ComplianceViolation>): Promise<ComplianceViolation> {
    const response = await axios.post(`${API_BASE_URL}/api/compliance/violations`, violation, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async updateViolation(id: number, violation: Partial<ComplianceViolation>): Promise<ComplianceViolation> {
    const response = await axios.put(`${API_BASE_URL}/api/compliance/violations/${id}`, violation, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async resolveViolation(id: number, resolution: string): Promise<ComplianceViolation> {
    const response = await axios.post(`${API_BASE_URL}/api/compliance/violations/${id}/resolve`, {
      resolution,
    }, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async deleteViolation(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/compliance/violations/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Assessments
  async getAssessments(frameworkId?: number): Promise<ComplianceAssessment[]> {
    const params = frameworkId ? { framework_id: frameworkId } : {};
    const response = await axios.get(`${API_BASE_URL}/api/compliance/assessments`, {
      headers: this.getAuthHeaders(),
      params,
    });
    return response.data;
  }

  async getAssessment(id: number): Promise<ComplianceAssessment> {
    const response = await axios.get(`${API_BASE_URL}/api/compliance/assessments/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async startAssessment(frameworkId: number): Promise<ComplianceAssessment> {
    const response = await axios.post(`${API_BASE_URL}/api/compliance/assessments`, {
      framework_id: frameworkId,
      assessment_type: 'comprehensive',
      status: 'in_progress',
    }, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async completeAssessment(id: number, findings: string, recommendations: string, score: number): Promise<ComplianceAssessment> {
    const response = await axios.put(`${API_BASE_URL}/api/compliance/assessments/${id}`, {
      status: 'completed',
      findings,
      recommendations,
      score,
      completion_date: new Date().toISOString(),
    }, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  // Metrics
  async getMetrics(frameworkId?: number): Promise<ComplianceMetric[]> {
    const params = frameworkId ? { framework_id: frameworkId } : {};
    const response = await axios.get(`${API_BASE_URL}/api/compliance/metrics`, {
      headers: this.getAuthHeaders(),
      params,
    });
    return response.data;
  }

  async getMetric(id: number): Promise<ComplianceMetric> {
    const response = await axios.get(`${API_BASE_URL}/api/compliance/metrics/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async updateMetric(id: number, value: number): Promise<ComplianceMetric> {
    const response = await axios.put(`${API_BASE_URL}/api/compliance/metrics/${id}`, {
      metric_value: value,
      measurement_date: new Date().toISOString(),
    }, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  // Audit Logs
  async getAuditLogs(filters?: {
    event_type?: string;
    user_id?: number;
    start_date?: string;
    end_date?: string;
    risk_level?: string;
    compliance_relevant?: boolean;
  }): Promise<AuditLog[]> {
    const response = await axios.get(`${API_BASE_URL}/api/compliance/audit-logs`, {
      headers: this.getAuthHeaders(),
      params: filters,
    });
    return response.data;
  }

  async getAuditLog(id: number): Promise<AuditLog> {
    const response = await axios.get(`${API_BASE_URL}/api/compliance/audit-logs/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async createAuditLog(log: Partial<AuditLog>): Promise<AuditLog> {
    const response = await axios.post(`${API_BASE_URL}/api/compliance/audit-logs`, log, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  // Reports
  async getReports(frameworkId?: number): Promise<ComplianceReport[]> {
    const params = frameworkId ? { framework_id: frameworkId } : {};
    const response = await axios.get(`${API_BASE_URL}/api/compliance/reports`, {
      headers: this.getAuthHeaders(),
      params,
    });
    return response.data;
  }

  async generateReport(frameworkId: number, reportType: string = 'comprehensive'): Promise<ComplianceReport> {
    const response = await axios.post(`${API_BASE_URL}/api/compliance/reports/generate`, {
      framework_id: frameworkId,
      report_type: reportType,
    }, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async downloadReport(reportId: number): Promise<Blob> {
    const response = await axios.get(`${API_BASE_URL}/api/compliance/reports/${reportId}/download`, {
      headers: this.getAuthHeaders(),
      responseType: 'blob',
    });
    return response.data;
  }

  // Dashboard Statistics
  async getDashboardStats(): Promise<{
    overall_compliance_score: number;
    active_frameworks: number;
    open_violations: number;
    critical_violations: number;
    recent_assessments: number;
    compliance_trends: Array<{
      date: string;
      score: number;
    }>;
  }> {
    const response = await axios.get(`${API_BASE_URL}/api/compliance/dashboard/stats`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  // Data Classification
  async getDataClassifications(): Promise<Array<{
    id: number;
    name: string;
    description: string;
    sensitivity_level: number;
    retention_period_days: number;
    access_controls: string;
  }>> {
    const response = await axios.get(`${API_BASE_URL}/api/compliance/data-classifications`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  // Document Compliance
  async getDocumentCompliance(documentId: number): Promise<{
    document_id: number;
    classification_id: number;
    compliance_status: string;
    last_reviewed: string;
    review_notes: string;
    retention_date: string;
  }> {
    const response = await axios.get(`${API_BASE_URL}/api/compliance/documents/${documentId}`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async updateDocumentCompliance(documentId: number, data: {
    classification_id?: number;
    compliance_status?: string;
    review_notes?: string;
  }): Promise<void> {
    await axios.put(`${API_BASE_URL}/api/compliance/documents/${documentId}`, data, {
      headers: this.getAuthHeaders(),
    });
  }
}

export const complianceService = new ComplianceService();
export default complianceService;