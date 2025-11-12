import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = '';

interface DashboardData {
  status: string;
  timestamp: string;
  version: string;
  modules: Record<string, string>;
  database: string;
}

interface APAgingData {
  as_of_date: string;
  invoices: Array<{
    supplier_name: string;
    invoice_number: string;
    total_amount: number;
    amount_outstanding: number;
    aging_bucket: string;
  }>;
  summary: {
    total_outstanding: number;
    current: number;
    days_30: number;
    days_60: number;
    days_90: number;
    days_90_plus: number;
  };
}

interface ARAgingData {
  as_of_date: string;
  invoices: Array<{
    customer_name: string;
    invoice_number: string;
    total_amount: number;
    amount_outstanding: number;
    aging_bucket: string;
  }>;
  summary: {
    total_outstanding: number;
    current: number;
    days_30: number;
    days_60: number;
    days_90: number;
    days_90_plus: number;
  };
}

export default function ERPDashboard() {
  const [health, setHealth] = useState<DashboardData | null>(null);
  const [apAging, setApAging] = useState<APAgingData | null>(null);
  const [arAging, setArAging] = useState<ARAgingData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ap' | 'ar' | 'gl'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch health status
      const healthRes = await axios.get(`${API_BASE}/`);
      setHealth(healthRes.data);

      // Fetch AP Aging
      const apRes = await axios.get(`${API_BASE}/api/ap/aging/1`, {
        headers: { Authorization: 'Bearer test-token' }
      });
      setApAging(apRes.data);

      // Fetch AR Aging
      const arRes = await axios.get(`${API_BASE}/api/ar/aging/1`, {
        headers: { Authorization: 'Bearer test-token' }
      });
      setArAging(arRes.data);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ERP Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ARIA ERP</h1>
              <p className="text-sm text-gray-500">Production-Grade Enterprise Resource Planning</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                health?.database === 'connected' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {health?.database === 'connected' ? '● Online' : '● Offline'}
              </div>
              <div className="text-xs text-gray-500">
                v{health?.version}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'ap', label: 'Accounts Payable' },
              { key: 'ar', label: 'Accounts Receivable' },
              { key: 'gl', label: 'General Ledger' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Module Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Total Payables</h3>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {apAging ? formatCurrency(apAging.summary.total_outstanding) : '...'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Outstanding to suppliers</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Total Receivables</h3>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {arAging ? formatCurrency(arAging.summary.total_outstanding) : '...'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Outstanding from customers</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Active Modules</h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {health ? Object.keys(health.modules).length : '...'}
                </p>
                <p className="text-xs text-gray-500 mt-1">All systems operational</p>
              </div>
            </div>

            {/* Modules Grid */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">ERP Modules</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {health && Object.entries(health.modules).map(([module, status]) => (
                    <div key={module} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-2 h-2 rounded-full ${
                          status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                        <span className="text-xs text-gray-500">{status}</span>
                      </div>
                      <h4 className="font-medium text-sm capitalize">
                        {module.replace(/_/g, ' ')}
                      </h4>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Automation Bots */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Automation Bots</h2>
                <p className="text-sm text-gray-500">15 intelligent bots working 24/7</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    'Invoice Reconciliation', 'Expense Approval', 'Purchase Order',
                    'Credit Check', 'Payment Reminders', 'Tax Compliance',
                    'OCR Invoice', 'Bank Payment Prediction', 'Inventory Replenishment',
                    'Customer Churn', 'Revenue Forecasting', 'Cashflow Prediction',
                    'Anomaly Detection', 'Document Classification', 'Multi-currency'
                  ].map((bot, idx) => (
                    <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse" />
                      <span className="text-sm text-gray-700">{bot}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ap' && (
          <div className="space-y-6">
            {/* AP Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-xs font-medium text-gray-500">Total</h4>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {apAging && formatCurrency(apAging.summary.total_outstanding)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-xs font-medium text-gray-500">Current</h4>
                <p className="text-xl font-bold text-green-600 mt-1">
                  {apAging && formatCurrency(apAging.summary.current)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-xs font-medium text-gray-500">30 Days</h4>
                <p className="text-xl font-bold text-yellow-600 mt-1">
                  {apAging && formatCurrency(apAging.summary.days_30)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-xs font-medium text-gray-500">60 Days</h4>
                <p className="text-xl font-bold text-orange-600 mt-1">
                  {apAging && formatCurrency(apAging.summary.days_60)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-xs font-medium text-gray-500">90+ Days</h4>
                <p className="text-xl font-bold text-red-600 mt-1">
                  {apAging && formatCurrency(apAging.summary.days_90_plus)}
                </p>
              </div>
            </div>

            {/* AP Invoices Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Outstanding Payables</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {apAging?.invoices.slice(0, 10).map((invoice, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.supplier_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.invoice_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatCurrency(invoice.total_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {formatCurrency(invoice.amount_outstanding)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            invoice.aging_bucket === 'current' ? 'bg-green-100 text-green-800' :
                            invoice.aging_bucket === '30' ? 'bg-yellow-100 text-yellow-800' :
                            invoice.aging_bucket === '60' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {invoice.aging_bucket === 'current' ? 'Current' : `${invoice.aging_bucket}+ days`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ar' && (
          <div className="space-y-6">
            {/* AR Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-xs font-medium text-gray-500">Total</h4>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {arAging && formatCurrency(arAging.summary.total_outstanding)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-xs font-medium text-gray-500">Current</h4>
                <p className="text-xl font-bold text-green-600 mt-1">
                  {arAging && formatCurrency(arAging.summary.current)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-xs font-medium text-gray-500">30 Days</h4>
                <p className="text-xl font-bold text-yellow-600 mt-1">
                  {arAging && formatCurrency(arAging.summary.days_30)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-xs font-medium text-gray-500">60 Days</h4>
                <p className="text-xl font-bold text-orange-600 mt-1">
                  {arAging && formatCurrency(arAging.summary.days_60)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-xs font-medium text-gray-500">90+ Days</h4>
                <p className="text-xl font-bold text-red-600 mt-1">
                  {arAging && formatCurrency(arAging.summary.days_90_plus)}
                </p>
              </div>
            </div>

            {/* AR Invoices Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Outstanding Receivables</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {arAging?.invoices.slice(0, 10).map((invoice, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.customer_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.invoice_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatCurrency(invoice.total_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {formatCurrency(invoice.amount_outstanding)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            invoice.aging_bucket === 'current' ? 'bg-green-100 text-green-800' :
                            invoice.aging_bucket === '30' ? 'bg-yellow-100 text-yellow-800' :
                            invoice.aging_bucket === '60' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {invoice.aging_bucket === 'current' ? 'Current' : `${invoice.aging_bucket}+ days`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gl' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">General Ledger</h2>
            <p className="text-gray-500">Coming soon: Trial Balance, Balance Sheet, P&L Statement</p>
          </div>
        )}
      </main>
    </div>
  );
}
