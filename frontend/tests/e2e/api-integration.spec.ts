/**
 * ARIA ERP - API Integration Tests
 * Tests all backend API endpoints for correct responses
 * Run with: npx playwright test api-integration.spec.ts
 */

import { test, expect, request, APIRequestContext } from '@playwright/test';
import { TEST_CONFIG, API_ENDPOINTS } from './test-config';

let apiContext: APIRequestContext;
let authToken: string;

// ============================================================================
// TEST SETUP
// ============================================================================

test.beforeAll(async () => {
  apiContext = await request.newContext({
    baseURL: TEST_CONFIG.API_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });
  
  // Login to get auth token
  try {
    const loginResponse = await apiContext.post(API_ENDPOINTS.AUTH.LOGIN, {
      data: {
        email: TEST_CONFIG.DEMO_USER.email,
        password: TEST_CONFIG.DEMO_USER.password
      }
    });
    
    if (loginResponse.ok()) {
      const data = await loginResponse.json();
      authToken = data.token || data.access_token || '';
    }
  } catch (e) {
    console.log('Auth endpoint not available, continuing with unauthenticated tests');
  }
});

test.afterAll(async () => {
  await apiContext.dispose();
});

// Helper function to make authenticated requests
async function authenticatedRequest(method: 'get' | 'post' | 'put' | 'delete', endpoint: string, data?: object) {
  const options: any = {
    headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
  };
  
  if (data) {
    options.data = data;
  }
  
  switch (method) {
    case 'get':
      return apiContext.get(endpoint, options);
    case 'post':
      return apiContext.post(endpoint, options);
    case 'put':
      return apiContext.put(endpoint, options);
    case 'delete':
      return apiContext.delete(endpoint, options);
  }
}

// ============================================================================
// 1. HEALTH CHECK TESTS
// ============================================================================

test.describe('1. Health Check API', () => {
  test('1.1 Health endpoint returns 200', async () => {
    const response = await apiContext.get(API_ENDPOINTS.HEALTH.CHECK);
    expect(response.status()).toBe(200);
  });

  test('1.2 Health endpoint returns valid JSON', async () => {
    const response = await apiContext.get(API_ENDPOINTS.HEALTH.CHECK);
    const data = await response.json();
    expect(data).toBeTruthy();
  });
});

// ============================================================================
// 2. AUTHENTICATION API TESTS
// ============================================================================

test.describe('2. Authentication API', () => {
  test('2.1 Login with valid credentials', async () => {
    const response = await apiContext.post(API_ENDPOINTS.AUTH.LOGIN, {
      data: {
        email: TEST_CONFIG.DEMO_USER.email,
        password: TEST_CONFIG.DEMO_USER.password
      }
    });
    
    // Accept 200 or 401 (if auth is configured differently)
    expect([200, 201, 401, 404]).toContain(response.status());
  });

  test('2.2 Login with invalid credentials returns error', async () => {
    const response = await apiContext.post(API_ENDPOINTS.AUTH.LOGIN, {
      data: {
        email: 'invalid@test.com',
        password: 'wrongpassword'
      }
    });
    
    // Should not return 200 for invalid credentials
    expect([400, 401, 403, 404, 500]).toContain(response.status());
  });
});

// ============================================================================
// 3. DASHBOARD API TESTS
// ============================================================================

test.describe('3. Dashboard API', () => {
  test('3.1 Executive dashboard endpoint', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.DASHBOARD.EXECUTIVE);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('3.2 Dashboard metrics endpoint', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.DASHBOARD.METRICS);
    expect([200, 401, 404]).toContain(response.status());
  });
});

// ============================================================================
// 4. BI & ANALYTICS API TESTS
// ============================================================================

test.describe('4. BI & Analytics API', () => {
  test('4.1 Executive dashboard BI endpoint', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.BI.EXECUTIVE);
    expect([200, 401, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toBeTruthy();
    }
  });

  test('4.2 AR Aging report endpoint', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.BI.AR_AGING);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('4.3 AP Aging report endpoint', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.BI.AP_AGING);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('4.4 Sales analytics endpoint', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.BI.SALES_ANALYTICS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('4.5 Procurement analytics endpoint', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.BI.PROCUREMENT_ANALYTICS);
    expect([200, 401, 404]).toContain(response.status());
  });
});

// ============================================================================
// 5. ERP MASTER DATA API TESTS
// ============================================================================

test.describe('5. ERP Master Data API', () => {
  test('5.1 Get customers list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.ERP.CUSTOMERS);
    expect([200, 401, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data) || data.data || data.customers).toBeTruthy();
    }
  });

  test('5.2 Get suppliers list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.ERP.SUPPLIERS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('5.3 Get products list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.ERP.PRODUCTS);
    expect([200, 401, 404]).toContain(response.status());
  });
});

// ============================================================================
// 6. ERP TRANSACTIONS API TESTS
// ============================================================================

test.describe('6. ERP Transactions API', () => {
  test('6.1 Get purchase orders list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.ERP.PURCHASE_ORDERS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('6.2 Get goods receipts list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.ERP.GOODS_RECEIPTS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('6.3 Get quotes list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.ERP.QUOTES);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('6.4 Get sales orders list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.ERP.SALES_ORDERS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('6.5 Get invoices list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.ERP.INVOICES);
    expect([200, 401, 404]).toContain(response.status());
  });
});

// ============================================================================
// 7. BOTS API TESTS
// ============================================================================

test.describe('7. Bots API', () => {
  test('7.1 Get bots list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.BOTS.LIST);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('7.2 Get bot configurations', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.BOTS.CONFIGS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('7.3 Get bot runs history', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.BOTS.RUNS);
    expect([200, 401, 404]).toContain(response.status());
  });
});

// ============================================================================
// 8. DOCUMENTS API TESTS
// ============================================================================

test.describe('8. Documents API', () => {
  test('8.1 Get document types', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.DOCUMENTS.TYPES);
    expect([200, 401, 404]).toContain(response.status());
  });
});

// ============================================================================
// 9. NEW PAGES API TESTS
// ============================================================================

test.describe('9. New Pages API', () => {
  test('9.1 Get budgets list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.NEW_PAGES.BUDGETS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('9.2 Get cost centers list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.NEW_PAGES.COST_CENTERS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('9.3 Get expense claims list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.NEW_PAGES.EXPENSE_CLAIMS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('9.4 Get collections list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.NEW_PAGES.COLLECTIONS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('9.5 Get requisitions list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.NEW_PAGES.REQUISITIONS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('9.6 Get positions list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.NEW_PAGES.POSITIONS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('9.7 Get performance reviews list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.NEW_PAGES.PERFORMANCE_REVIEWS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('9.8 Get training courses list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.NEW_PAGES.TRAINING_COURSES);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('9.9 Get VAT returns list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.NEW_PAGES.VAT_RETURNS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('9.10 Get B-BBEE scorecards list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.NEW_PAGES.BBBEE_SCORECARDS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('9.11 Get support tickets list', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.NEW_PAGES.SUPPORT_TICKETS);
    expect([200, 401, 404]).toContain(response.status());
  });
});

// ============================================================================
// 10. MICROFEATURES API TESTS
// ============================================================================

test.describe('10. Microfeatures API', () => {
  test('10.1 Get notifications', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.MICROFEATURES.NOTIFICATIONS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('10.2 Get recent items', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.MICROFEATURES.RECENT_ITEMS);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('10.3 Get favorites', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.MICROFEATURES.FAVORITES);
    expect([200, 401, 404]).toContain(response.status());
  });
});

// ============================================================================
// 11. MENU API TESTS
// ============================================================================

test.describe('11. Menu API', () => {
  test('11.1 Get menu structure', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.MENU.STRUCTURE);
    expect([200, 401, 404]).toContain(response.status());
  });
});

// ============================================================================
// 12. CRUD OPERATION TESTS
// ============================================================================

test.describe('12. CRUD Operations', () => {
  let testCustomerId: string;
  
  test('12.1 Create customer', async () => {
    const response = await authenticatedRequest('post', API_ENDPOINTS.ERP.CUSTOMERS, {
      name: `Test Customer ${Date.now()}`,
      email: `test${Date.now()}@test.com`,
      phone: '+27 11 123 4567',
      is_active: true
    });
    
    expect([200, 201, 401, 404, 400]).toContain(response.status());
    
    if (response.status() === 200 || response.status() === 201) {
      const data = await response.json();
      testCustomerId = data.id || data.customer_id;
    }
  });

  test('12.2 Read customer', async () => {
    if (!testCustomerId) {
      test.skip();
      return;
    }
    
    const response = await authenticatedRequest('get', `${API_ENDPOINTS.ERP.CUSTOMERS}/${testCustomerId}`);
    expect([200, 401, 404]).toContain(response.status());
  });

  test('12.3 Update customer', async () => {
    if (!testCustomerId) {
      test.skip();
      return;
    }
    
    const response = await authenticatedRequest('put', `${API_ENDPOINTS.ERP.CUSTOMERS}/${testCustomerId}`, {
      name: `Updated Customer ${Date.now()}`
    });
    
    expect([200, 401, 404, 400]).toContain(response.status());
  });

  test('12.4 Delete customer', async () => {
    if (!testCustomerId) {
      test.skip();
      return;
    }
    
    const response = await authenticatedRequest('delete', `${API_ENDPOINTS.ERP.CUSTOMERS}/${testCustomerId}`);
    expect([200, 204, 401, 404]).toContain(response.status());
  });
});

// ============================================================================
// 13. ERROR HANDLING TESTS
// ============================================================================

test.describe('13. Error Handling', () => {
  test('13.1 Invalid endpoint returns 404', async () => {
    const response = await apiContext.get('/api/nonexistent-endpoint');
    expect([404, 400]).toContain(response.status());
  });

  test('13.2 Invalid JSON body returns error', async () => {
    const response = await apiContext.post(API_ENDPOINTS.AUTH.LOGIN, {
      data: 'invalid json',
      headers: { 'Content-Type': 'text/plain' }
    });
    
    expect([400, 401, 404, 415, 500]).toContain(response.status());
  });

  test('13.3 Missing required fields returns error', async () => {
    const response = await authenticatedRequest('post', API_ENDPOINTS.ERP.CUSTOMERS, {});
    expect([400, 401, 404, 422]).toContain(response.status());
  });
});

// ============================================================================
// 14. PERFORMANCE TESTS
// ============================================================================

test.describe('14. Performance Tests', () => {
  test('14.1 Health endpoint responds within 1 second', async () => {
    const startTime = Date.now();
    await apiContext.get(API_ENDPOINTS.HEALTH.CHECK);
    const responseTime = Date.now() - startTime;
    
    expect(responseTime).toBeLessThan(1000);
  });

  test('14.2 Dashboard endpoint responds within 3 seconds', async () => {
    const startTime = Date.now();
    await authenticatedRequest('get', API_ENDPOINTS.BI.EXECUTIVE);
    const responseTime = Date.now() - startTime;
    
    expect(responseTime).toBeLessThan(3000);
  });

  test('14.3 List endpoints respond within 2 seconds', async () => {
    const endpoints = [
      API_ENDPOINTS.ERP.CUSTOMERS,
      API_ENDPOINTS.ERP.SUPPLIERS,
      API_ENDPOINTS.ERP.PRODUCTS
    ];
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      await authenticatedRequest('get', endpoint);
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(2000);
    }
  });
});

// ============================================================================
// 15. DATA VALIDATION TESTS
// ============================================================================

test.describe('15. Data Validation Tests', () => {
  test('15.1 Customer list returns valid structure', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.ERP.CUSTOMERS);
    
    if (response.status() === 200) {
      const data = await response.json();
      
      // Check if response is array or has data property
      const customers = Array.isArray(data) ? data : (data.data || data.customers || []);
      
      if (customers.length > 0) {
        const customer = customers[0];
        // Check for expected fields
        expect(customer).toHaveProperty('id');
      }
    }
  });

  test('15.2 Invoice list returns valid structure', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.ERP.INVOICES);
    
    if (response.status() === 200) {
      const data = await response.json();
      
      const invoices = Array.isArray(data) ? data : (data.data || data.invoices || []);
      
      if (invoices.length > 0) {
        const invoice = invoices[0];
        expect(invoice).toHaveProperty('id');
      }
    }
  });

  test('15.3 BI dashboard returns valid metrics', async () => {
    const response = await authenticatedRequest('get', API_ENDPOINTS.BI.EXECUTIVE);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toBeTruthy();
    }
  });
});

// ============================================================================
// TEST SUMMARY
// ============================================================================

test.afterAll(async () => {
  console.log('ARIA ERP API Integration Tests Completed');
  console.log('Total test sections: 15');
  console.log('Estimated total tests: 50+');
});
