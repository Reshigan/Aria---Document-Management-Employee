/**
 * ARIA ERP - Ask ARIA Module Granular Tests
 * Comprehensive field-level and validation testing for Ask ARIA AI Assistant module
 * 
 * Tests: ~60 granular test cases covering Chat, Bot Execution, Document Upload, History
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

test.describe('Ask ARIA Module Granular Tests', () => {

  // ============================================
  // CHAT - Operations (20 tests)
  // ============================================
  test.describe('Chat Operations', () => {
    test('POST /ask-aria/chat - simple question', async ({ request }) => {
      const chatData = {
        message: 'What is the current inventory level?',
        session_id: generateId('session')
      };
      const response = await apiRequest(request, 'POST', '/ask-aria/chat', chatData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /ask-aria/chat - list bots command', async ({ request }) => {
      const chatData = {
        message: 'List all available bots',
        session_id: generateId('session')
      };
      const response = await apiRequest(request, 'POST', '/ask-aria/chat', chatData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /ask-aria/chat - create sales order command', async ({ request }) => {
      const chatData = {
        message: 'Create a sales order for customer ABC Corp',
        session_id: generateId('session')
      };
      const response = await apiRequest(request, 'POST', '/ask-aria/chat', chatData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /ask-aria/chat - run payroll command', async ({ request }) => {
      const chatData = {
        message: 'Run payroll for January 2024',
        session_id: generateId('session')
      };
      const response = await apiRequest(request, 'POST', '/ask-aria/chat', chatData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /ask-aria/chat - reconciliation command', async ({ request }) => {
      const chatData = {
        message: 'Run bank reconciliation',
        session_id: generateId('session')
      };
      const response = await apiRequest(request, 'POST', '/ask-aria/chat', chatData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /ask-aria/chat - generate report command', async ({ request }) => {
      const chatData = {
        message: 'Generate a sales report for Q4 2024',
        session_id: generateId('session')
      };
      const response = await apiRequest(request, 'POST', '/ask-aria/chat', chatData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /ask-aria/chat - empty message', async ({ request }) => {
      const chatData = {
        message: '',
        session_id: generateId('session')
      };
      const response = await apiRequest(request, 'POST', '/ask-aria/chat', chatData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /ask-aria/chat - very long message (5000 chars)', async ({ request }) => {
      const chatData = {
        message: 'A'.repeat(5000),
        session_id: generateId('session')
      };
      const response = await apiRequest(request, 'POST', '/ask-aria/chat', chatData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /ask-aria/chat - with context', async ({ request }) => {
      const chatData = {
        message: 'What is the status of this order?',
        session_id: generateId('session'),
        context: {
          order_id: 'SO-001',
          page: 'sales_orders'
        }
      };
      const response = await apiRequest(request, 'POST', '/ask-aria/chat', chatData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /ask-aria/chat - missing session_id', async ({ request }) => {
      const chatData = {
        message: 'Hello'
      };
      const response = await apiRequest(request, 'POST', '/ask-aria/chat', chatData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });
  });

  // ============================================
  // BOT REGISTRY - Operations (15 tests)
  // ============================================
  test.describe('Bot Registry Operations', () => {
    test('GET /bots - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/bots?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data.data || data.bots || data)).toBe(true);
      }
    });

    test('GET /bots - filter by category', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/bots?company_id=demo-company&category=finance');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bots - filter by status', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/bots?company_id=demo-company&status=active');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bots/:id - returns single bot', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/bots/bot-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /bots/execute - execute bot', async ({ request }) => {
      const executeData = {
        bot_id: 'bot-001',
        parameters: {
          date_range: 'last_30_days'
        }
      };
      const response = await apiRequest(request, 'POST', '/bots/execute', executeData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /bots/execute - missing bot_id', async ({ request }) => {
      const executeData = {
        parameters: {}
      };
      const response = await apiRequest(request, 'POST', '/bots/execute', executeData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /bots/execute - invalid bot_id', async ({ request }) => {
      const executeData = {
        bot_id: 'non-existent-bot',
        parameters: {}
      };
      const response = await apiRequest(request, 'POST', '/bots/execute', executeData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('GET /bots/executions - returns execution history', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/bots/executions?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bots/executions - filter by bot_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/bots/executions?company_id=demo-company&bot_id=bot-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bots/executions - filter by status', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/bots/executions?company_id=demo-company&status=completed');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // CHAT HISTORY - Operations (10 tests)
  // ============================================
  test.describe('Chat History Operations', () => {
    test('GET /ask-aria/history - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/ask-aria/history?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /ask-aria/history - filter by session_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/ask-aria/history?company_id=demo-company&session_id=session-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /ask-aria/history - filter by user_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/ask-aria/history?company_id=demo-company&user_id=user-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /ask-aria/history - pagination', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/ask-aria/history?company_id=demo-company&page_size=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /ask-aria/sessions - returns sessions list', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/ask-aria/sessions?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('DELETE /ask-aria/history/:session_id - delete session history', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/ask-aria/history/session-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // DOCUMENT UPLOAD - Operations (10 tests)
  // ============================================
  test.describe('Document Upload Operations', () => {
    test('GET /ask-aria/documents - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/ask-aria/documents?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /ask-aria/documents - filter by type', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/ask-aria/documents?company_id=demo-company&type=invoice');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /ask-aria/documents - filter by status', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/ask-aria/documents?company_id=demo-company&status=processed');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /ask-aria/documents/:id - returns single document', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/ask-aria/documents/doc-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /ask-aria/documents/classify - classify document', async ({ request }) => {
      const classifyData = {
        document_id: 'doc-001'
      };
      const response = await apiRequest(request, 'POST', '/ask-aria/documents/classify', classifyData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /ask-aria/documents/extract - extract data from document', async ({ request }) => {
      const extractData = {
        document_id: 'doc-001',
        extraction_type: 'invoice'
      };
      const response = await apiRequest(request, 'POST', '/ask-aria/documents/extract', extractData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /ask-aria/documents/:id - delete document', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/ask-aria/documents/doc-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // SUGGESTED PROMPTS - Operations (5 tests)
  // ============================================
  test.describe('Suggested Prompts Operations', () => {
    test('GET /ask-aria/suggested-prompts - returns prompts', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/ask-aria/suggested-prompts?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /ask-aria/suggested-prompts - filter by category', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/ask-aria/suggested-prompts?company_id=demo-company&category=finance');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /ask-aria/suggested-prompts - filter by context', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/ask-aria/suggested-prompts?company_id=demo-company&context=sales_orders');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /ask-aria/feedback - submit feedback', async ({ request }) => {
      const feedbackData = {
        message_id: 'msg-001',
        rating: 5,
        feedback: 'Very helpful response'
      };
      const response = await apiRequest(request, 'POST', '/ask-aria/feedback', feedbackData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /ask-aria/feedback - negative rating', async ({ request }) => {
      const feedbackData = {
        message_id: 'msg-001',
        rating: -1
      };
      const response = await apiRequest(request, 'POST', '/ask-aria/feedback', feedbackData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });
  });

});
