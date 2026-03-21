import React, { useState, useEffect } from 'react';
import { botsAPI, erpAPI, healthAPI } from '../services/api';
import { CheckCircle, XCircle, Loader, Play } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  data?: any;
}

export default function ApiTest() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Health Check', status: 'pending' },
    { name: 'List All Agents', status: 'pending' },
    { name: 'Financial Module', status: 'pending' },
    { name: 'HR Module', status: 'pending' },
    { name: 'CRM Module', status: 'pending' },
    { name: 'Execute Invoice Agent', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, ...updates } : test
    ));
  };

  const runTests = async () => {
    setIsRunning(true);
    
    // Test 1: Health Check
    try {
      const response = await healthAPI.check();
      updateTest(0, {
        status: 'success',
        message: `${response.data.bots_count} agents loaded`,
        data: response.data
      });
    } catch (error: any) {
      updateTest(0, {
        status: 'error',
        message: error.message
      });
    }

    // Test 2: List Agents
    try {
      const response = await botsAPI.list();
      updateTest(1, {
        status: 'success',
        message: `Found ${response.data.count} agents`,
        data: response.data
      });
    } catch (error: any) {
      updateTest(1, {
        status: 'error',
        message: error.message
      });
    }

    // Test 3: Financial Module
    try {
      const response = await erpAPI.financial();
      updateTest(2, {
        status: 'success',
        message: `${response.data.features?.length || 0} features`,
        data: response.data
      });
    } catch (error: any) {
      updateTest(2, {
        status: 'error',
        message: error.message
      });
    }

    // Test 4: HR Module
    try {
      const response = await erpAPI.hr();
      updateTest(3, {
        status: 'success',
        message: `${response.data.features?.length || 0} features`,
        data: response.data
      });
    } catch (error: any) {
      updateTest(3, {
        status: 'error',
        message: error.message
      });
    }

    // Test 5: CRM Module
    try {
      const response = await erpAPI.crm();
      updateTest(4, {
        status: 'success',
        message: `${response.data.features?.length || 0} features`,
        data: response.data
      });
    } catch (error: any) {
      updateTest(4, {
        status: 'error',
        message: error.message
      });
    }

    // Test 6: Execute Agent
    try {
      const response = await botsAPI.execute('invoice_reconciliation', {
        invoice_number: 'TEST-001',
        amount: 1000.00,
        supplier: 'Test Supplier'
      });
      updateTest(5, {
        status: 'success',
        message: response.data.success ? 'Agent executed successfully' : 'Execution failed',
        data: response.data
      });
    } catch (error: any) {
      updateTest(5, {
        status: 'error',
        message: error.message
      });
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Loader className="w-5 h-5 text-gray-300 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                API Connection Test
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Test connection between frontend and backend API
              </p>
            </div>
            <button
              onClick={runTests}
              disabled={isRunning}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isRunning
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white '
              }`}
            >
              <Play className="w-5 h-5" />
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </button>
          </div>

          <div className="space-y-4">
            {tests.map((test, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {test.name}
                    </h3>
                  </div>
                  {test.message && (
                    <span className={`text-sm ${
                      test.status === 'success' ? 'text-green-600' : 
                      test.status === 'error' ? 'text-red-600' : 
                      'text-gray-600'
                    }`}>
                      {test.message}
                    </span>
                  )}
                </div>

                {test.data && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:text-blue-200">
                      View Response Data
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-auto max-h-60">
                      {JSON.stringify(test.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">API Configuration</h3>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p><strong>API URL:</strong> {import.meta.env.VITE_API_URL || 'http://localhost:8000'}</p>
              <p><strong>Environment:</strong> {import.meta.env.MODE}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:text-blue-200 underline"
            >
              Open Interactive API Docs →
            </a>
            <a
              href="http://localhost:8000/health"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:text-blue-200 underline"
            >
              Health Check Endpoint →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
