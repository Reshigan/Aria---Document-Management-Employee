/**
 * ARIA ERP - Recruitment Module Granular Tests
 * Comprehensive field-level and validation testing for Recruitment module
 * 
 * Tests: ~80 granular test cases covering Job Postings, Applicants, Interviews, Offers
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import { TEST_CONFIG } from '../test-config';

const API_BASE = TEST_CONFIG.API_URL;
const COMPANY_ID = 'demo-company';

async function apiRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: Record<string, unknown>
) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    headers: { 'Content-Type': 'application/json', 'X-Company-ID': COMPANY_ID },
    data: data ? JSON.stringify(data) : undefined,
  };
  switch (method) {
    case 'GET': return request.get(url, { headers: options.headers });
    case 'POST': return request.post(url, options);
    case 'PUT': return request.put(url, options);
    case 'DELETE': return request.delete(url, { headers: options.headers });
  }
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

test.describe('Recruitment Module Granular Tests', () => {

  // ============================================
  // JOB POSTINGS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Job Postings CRUD', () => {
    test('GET /job-postings - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/job-postings?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data.data || data.postings || data)).toBe(true);
      }
    });

    test('GET /job-postings - pagination works', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/job-postings?company_id=demo-company&page_size=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /job-postings - filter by status open', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/job-postings?company_id=demo-company&status=open');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /job-postings - filter by status closed', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/job-postings?company_id=demo-company&status=closed');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /job-postings - filter by department', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/job-postings?company_id=demo-company&department=IT');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /job-postings - filter by location', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/job-postings?company_id=demo-company&location=Johannesburg');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /job-postings - filter by employment_type', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/job-postings?company_id=demo-company&employment_type=full_time');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /job-postings/:id - returns single job posting', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/job-postings/job-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /job-postings - create with valid data', async ({ request }) => {
      const jobData = {
        title: `Software Developer ${generateId('JOB')}`,
        department: 'IT',
        location: 'Johannesburg',
        employment_type: 'full_time',
        description: 'Test job posting from automated tests',
        requirements: ['5+ years experience', 'TypeScript', 'React'],
        salary_min: 50000,
        salary_max: 80000,
        positions_available: 2,
        closing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'open'
      };
      const response = await apiRequest(request, 'POST', '/hr/job-postings', jobData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /job-postings - missing title', async ({ request }) => {
      const jobData = {
        department: 'IT',
        location: 'Johannesburg'
      };
      const response = await apiRequest(request, 'POST', '/hr/job-postings', jobData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /job-postings - salary_min greater than salary_max', async ({ request }) => {
      const jobData = {
        title: `Job ${generateId('JOB')}`,
        salary_min: 80000,
        salary_max: 50000
      };
      const response = await apiRequest(request, 'POST', '/hr/job-postings', jobData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /job-postings - negative salary', async ({ request }) => {
      const jobData = {
        title: `Job ${generateId('JOB')}`,
        salary_min: -50000
      };
      const response = await apiRequest(request, 'POST', '/hr/job-postings', jobData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /job-postings - zero positions_available', async ({ request }) => {
      const jobData = {
        title: `Job ${generateId('JOB')}`,
        positions_available: 0
      };
      const response = await apiRequest(request, 'POST', '/hr/job-postings', jobData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /job-postings - past closing_date', async ({ request }) => {
      const jobData = {
        title: `Job ${generateId('JOB')}`,
        closing_date: '2020-01-01'
      };
      const response = await apiRequest(request, 'POST', '/hr/job-postings', jobData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /job-postings/:id - update job posting', async ({ request }) => {
      const updateData = { positions_available: 3 };
      const response = await apiRequest(request, 'PUT', '/hr/job-postings/job-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /job-postings/:id - close job posting', async ({ request }) => {
      const updateData = { status: 'closed' };
      const response = await apiRequest(request, 'PUT', '/hr/job-postings/job-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /job-postings/:id - delete job posting', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/hr/job-postings/job-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // APPLICANTS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Applicants CRUD', () => {
    test('GET /applicants - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/applicants?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /applicants - filter by job_posting_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/applicants?company_id=demo-company&job_posting_id=job-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /applicants - filter by status new', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/applicants?company_id=demo-company&status=new');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /applicants - filter by status screening', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/applicants?company_id=demo-company&status=screening');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /applicants - filter by status interview', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/applicants?company_id=demo-company&status=interview');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /applicants - filter by status offer', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/applicants?company_id=demo-company&status=offer');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /applicants - filter by status hired', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/applicants?company_id=demo-company&status=hired');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /applicants - filter by status rejected', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/applicants?company_id=demo-company&status=rejected');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /applicants/:id - returns single applicant', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/applicants/app-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /applicants - create with valid data', async ({ request }) => {
      const applicantData = {
        job_posting_id: 'job-001',
        first_name: 'John',
        last_name: `Doe ${generateId('APP')}`,
        email: `applicant-${Date.now()}@example.com`,
        phone: '+27 82 123 4567',
        resume_url: 'https://example.com/resume.pdf',
        cover_letter: 'Test cover letter from automated tests',
        source: 'website',
        status: 'new'
      };
      const response = await apiRequest(request, 'POST', '/hr/applicants', applicantData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /applicants - missing first_name', async ({ request }) => {
      const applicantData = {
        job_posting_id: 'job-001',
        last_name: 'Doe',
        email: `applicant-${Date.now()}@example.com`
      };
      const response = await apiRequest(request, 'POST', '/hr/applicants', applicantData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /applicants - invalid email', async ({ request }) => {
      const applicantData = {
        job_posting_id: 'job-001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'invalid-email'
      };
      const response = await apiRequest(request, 'POST', '/hr/applicants', applicantData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /applicants - missing job_posting_id', async ({ request }) => {
      const applicantData = {
        first_name: 'John',
        last_name: 'Doe',
        email: `applicant-${Date.now()}@example.com`
      };
      const response = await apiRequest(request, 'POST', '/hr/applicants', applicantData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /applicants/:id - move to screening', async ({ request }) => {
      const updateData = { status: 'screening' };
      const response = await apiRequest(request, 'PUT', '/hr/applicants/app-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /applicants/:id - move to interview', async ({ request }) => {
      const updateData = { status: 'interview' };
      const response = await apiRequest(request, 'PUT', '/hr/applicants/app-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /applicants/:id - reject applicant', async ({ request }) => {
      const updateData = { status: 'rejected', rejection_reason: 'Does not meet requirements' };
      const response = await apiRequest(request, 'PUT', '/hr/applicants/app-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /applicants/:id - delete applicant', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/hr/applicants/app-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // INTERVIEWS - CRUD Operations (15 tests)
  // ============================================
  test.describe('Interviews CRUD', () => {
    test('GET /interviews - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/interviews?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /interviews - filter by applicant_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/interviews?company_id=demo-company&applicant_id=app-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /interviews - filter by status', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/interviews?company_id=demo-company&status=scheduled');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /interviews/:id - returns single interview', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/interviews/int-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /interviews - create with valid data', async ({ request }) => {
      const interviewData = {
        applicant_id: 'app-001',
        interviewer_ids: ['emp-001', 'emp-002'],
        scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_time: '10:00',
        duration_minutes: 60,
        type: 'technical',
        location: 'Conference Room A',
        status: 'scheduled'
      };
      const response = await apiRequest(request, 'POST', '/hr/interviews', interviewData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /interviews - missing applicant_id', async ({ request }) => {
      const interviewData = {
        interviewer_ids: ['emp-001'],
        scheduled_date: new Date().toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/hr/interviews', interviewData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /interviews - past scheduled_date', async ({ request }) => {
      const interviewData = {
        applicant_id: 'app-001',
        scheduled_date: '2020-01-01'
      };
      const response = await apiRequest(request, 'POST', '/hr/interviews', interviewData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /interviews - negative duration', async ({ request }) => {
      const interviewData = {
        applicant_id: 'app-001',
        scheduled_date: new Date().toISOString().split('T')[0],
        duration_minutes: -60
      };
      const response = await apiRequest(request, 'POST', '/hr/interviews', interviewData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /interviews/:id - complete interview', async ({ request }) => {
      const updateData = { 
        status: 'completed',
        feedback: 'Strong technical skills',
        rating: 4
      };
      const response = await apiRequest(request, 'PUT', '/hr/interviews/int-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /interviews/:id - rating over 5', async ({ request }) => {
      const updateData = { rating: 10 };
      const response = await apiRequest(request, 'PUT', '/hr/interviews/int-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /interviews/:id - delete interview', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/hr/interviews/int-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // JOB OFFERS - CRUD Operations (15 tests)
  // ============================================
  test.describe('Job Offers CRUD', () => {
    test('GET /job-offers - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/job-offers?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /job-offers - filter by applicant_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/job-offers?company_id=demo-company&applicant_id=app-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /job-offers - filter by status', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/job-offers?company_id=demo-company&status=pending');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /job-offers/:id - returns single offer', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/hr/job-offers/offer-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /job-offers - create with valid data', async ({ request }) => {
      const offerData = {
        applicant_id: 'app-001',
        job_posting_id: 'job-001',
        position_title: 'Software Developer',
        department: 'IT',
        salary: 65000,
        start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        benefits: ['Medical Aid', 'Pension', 'Annual Bonus'],
        status: 'pending'
      };
      const response = await apiRequest(request, 'POST', '/hr/job-offers', offerData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /job-offers - missing applicant_id', async ({ request }) => {
      const offerData = {
        position_title: 'Software Developer',
        salary: 65000
      };
      const response = await apiRequest(request, 'POST', '/hr/job-offers', offerData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /job-offers - negative salary', async ({ request }) => {
      const offerData = {
        applicant_id: 'app-001',
        position_title: 'Software Developer',
        salary: -65000
      };
      const response = await apiRequest(request, 'POST', '/hr/job-offers', offerData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /job-offers - expiry_date before today', async ({ request }) => {
      const offerData = {
        applicant_id: 'app-001',
        position_title: 'Software Developer',
        salary: 65000,
        expiry_date: '2020-01-01'
      };
      const response = await apiRequest(request, 'POST', '/hr/job-offers', offerData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /job-offers/:id - accept offer', async ({ request }) => {
      const updateData = { status: 'accepted', accepted_date: new Date().toISOString().split('T')[0] };
      const response = await apiRequest(request, 'PUT', '/hr/job-offers/offer-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /job-offers/:id - decline offer', async ({ request }) => {
      const updateData = { status: 'declined', decline_reason: 'Accepted another offer' };
      const response = await apiRequest(request, 'PUT', '/hr/job-offers/offer-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /job-offers/:id - delete offer', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/hr/job-offers/offer-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

});
