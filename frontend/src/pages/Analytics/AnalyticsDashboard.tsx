import React, { useEffect, useState } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Package, 
  FileText, AlertTriangle, CheckCircle, XCircle, Download, RefreshCw,
  PieChart, Activity, Calendar, Filter
} from 'lucide-react';
import api from '../../services/api';

interface ExecutiveSummary {
  summary: {
    revenue_ytd: number;
    revenue_month: number;
    ar_outstanding: number;
    ar_overdue: number;
    ap_outstanding: number;
    net_position: number;
  };
  counts: {
    customers: number;
    suppliers: number;
    products: number;
  };
  activity_this_month: {
    sales_orders: { count: number; value: number };
    purchase_orders: { count: number; value: number };
    invoices: { count: number; value: number };
  };
  top_customers: Array<{ name: string; revenue: number }>;
  top_products: Array<{ name: string; sales: number }>;
}

interface IntegrityCheck {
  name: string;
  description: string;
  status: 'pass' | 'warning' | 'fail';
  details: Record<string, any>;
}

interface IntegrityResult {
  summary: {
    total_checks: number;
    passed: number;
    warnings: number;
    failed: number;
    overall_status: string;
  };
  checks: IntegrityCheck[];
}

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<'executive' | 'financial' | 'sales' | 'procurement' | 'integrity'>('executive');
  const [loading, setLoading] = useState(true);
  const [executiveData, setExecutiveData] = useState<ExecutiveSummary | null>(null);
  const [integrityData, setIntegrityData] = useState<IntegrityResult | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'executive') {
        const response = await api.get('/bi/dashboard/executive');
        setExecutiveData(response.data);
      } else if (activeTab === 'integrity') {
        const response = await api.get('/bi/integrity/run');
        setIntegrityData(response.data);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-ZA').format(num);
  };

  const exportReport = async (reportType: string) => {
    try {
      const response = await api.get(`/bi/export/csv/${reportType}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Business Intelligence
          </h1>
          <p className="text-gray-600 mt-1">Real-time analytics and reporting across your entire ERP</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <select
            className="px-4 py-2 border rounded-lg"
            onChange={(e) => exportReport(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>Export...</option>
            <option value="customers">Customers</option>
            <option value="suppliers">Suppliers</option>
            <option value="products">Products</option>
            <option value="invoices">Invoices</option>
            <option value="trial-balance">Trial Balance</option>
          </select>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'executive', label: 'Executive Dashboard', icon: Activity },
            { id: 'financial', label: 'Financial Reports', icon: DollarSign },
            { id: 'sales', label: 'Sales Analytics', icon: TrendingUp },
            { id: 'procurement', label: 'Procurement', icon: Package },
            { id: 'integrity', label: 'Data Integrity', icon: CheckCircle }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'executive' && executiveData && (
            <ExecutiveDashboardTab data={executiveData} formatCurrency={formatCurrency} formatNumber={formatNumber} />
          )}
          {activeTab === 'financial' && (
            <FinancialReportsTab dateRange={dateRange} setDateRange={setDateRange} formatCurrency={formatCurrency} />
          )}
          {activeTab === 'sales' && (
            <SalesAnalyticsTab dateRange={dateRange} setDateRange={setDateRange} formatCurrency={formatCurrency} />
          )}
          {activeTab === 'procurement' && (
            <ProcurementAnalyticsTab dateRange={dateRange} setDateRange={setDateRange} formatCurrency={formatCurrency} />
          )}
          {activeTab === 'integrity' && integrityData && (
            <DataIntegrityTab data={integrityData} onRefresh={loadData} />
          )}
        </>
      )}
    </div>
  );
}

function ExecutiveDashboardTab({ data, formatCurrency, formatNumber }: { 
  data: ExecutiveSummary; 
  formatCurrency: (n: number) => string;
  formatNumber: (n: number) => string;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Revenue YTD"
          value={formatCurrency(data.summary.revenue_ytd)}
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
        />
        <MetricCard
          title="Revenue This Month"
          value={formatCurrency(data.summary.revenue_month)}
          icon={<DollarSign className="h-6 w-6" />}
          color="blue"
        />
        <MetricCard
          title="AR Outstanding"
          value={formatCurrency(data.summary.ar_outstanding)}
          subtitle={`${formatCurrency(data.summary.ar_overdue)} overdue`}
          icon={<FileText className="h-6 w-6" />}
          color="yellow"
        />
        <MetricCard
          title="AP Outstanding"
          value={formatCurrency(data.summary.ap_outstanding)}
          subtitle={`Net: ${formatCurrency(data.summary.net_position)}`}
          icon={<FileText className="h-6 w-6" />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Master Data
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Customers</span>
              <span className="font-semibold">{formatNumber(data.counts.customers)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Suppliers</span>
              <span className="font-semibold">{formatNumber(data.counts.suppliers)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Products</span>
              <span className="font-semibold">{formatNumber(data.counts.products)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Activity This Month
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Sales Orders</span>
              <span className="font-semibold">{data.activity_this_month.sales_orders.count} ({formatCurrency(data.activity_this_month.sales_orders.value)})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Purchase Orders</span>
              <span className="font-semibold">{data.activity_this_month.purchase_orders.count} ({formatCurrency(data.activity_this_month.purchase_orders.value)})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Invoices</span>
              <span className="font-semibold">{data.activity_this_month.invoices.count} ({formatCurrency(data.activity_this_month.invoices.value)})</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-purple-600" />
            Top Customers
          </h3>
          <div className="space-y-2">
            {data.top_customers.length > 0 ? (
              data.top_customers.slice(0, 5).map((customer, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate">{customer.name}</span>
                  <span className="font-medium">{formatCurrency(customer.revenue)}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No customer data yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-orange-600" />
          Top Products by Sales
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {data.top_products.length > 0 ? (
            data.top_products.slice(0, 5).map((product, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 truncate">{product.name}</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(product.sales)}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 col-span-5 text-center py-4">No product sales data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FinancialReportsTab({ dateRange, setDateRange, formatCurrency }: {
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  formatCurrency: (n: number) => string;
}) {
  const [reportType, setReportType] = useState<'profit-loss' | 'balance-sheet' | 'cash-flow' | 'ar-aging' | 'ap-aging'>('profit-loss');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      let url = `/bi/reports/${reportType}`;
      if (reportType === 'profit-loss' || reportType === 'cash-flow') {
        url += `?start_date=${dateRange.start}&end_date=${dateRange.end}`;
      } else if (reportType === 'balance-sheet' || reportType === 'ar-aging' || reportType === 'ap-aging') {
        url += `?as_of_date=${dateRange.end}`;
      }
      const response = await api.get(url);
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType, dateRange]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            {[
              { id: 'profit-loss', label: 'P&L' },
              { id: 'balance-sheet', label: 'Balance Sheet' },
              { id: 'cash-flow', label: 'Cash Flow' },
              { id: 'ar-aging', label: 'AR Aging' },
              { id: 'ap-aging', label: 'AP Aging' }
            ].map((report) => (
              <button
                key={report.id}
                onClick={() => setReportType(report.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  reportType === report.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {report.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center ml-auto">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : reportData ? (
        <div className="bg-white rounded-lg shadow">
          {reportType === 'profit-loss' && <ProfitLossReport data={reportData} formatCurrency={formatCurrency} />}
          {reportType === 'balance-sheet' && <BalanceSheetReport data={reportData} formatCurrency={formatCurrency} />}
          {reportType === 'cash-flow' && <CashFlowReport data={reportData} formatCurrency={formatCurrency} />}
          {(reportType === 'ar-aging' || reportType === 'ap-aging') && <AgingReport data={reportData} formatCurrency={formatCurrency} type={reportType} />}
        </div>
      ) : null}
    </div>
  );
}

function ProfitLossReport({ data, formatCurrency }: { data: any; formatCurrency: (n: number) => string }) {
  return (
    <div className="p-6">
      <h3 className="text-xl font-bold mb-6">Profit & Loss Statement</h3>
      <p className="text-sm text-gray-500 mb-4">Period: {data.period?.start_date} to {data.period?.end_date}</p>
      
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-green-700 mb-2">Revenue</h4>
          {(data.revenue?.accounts || []).map((acc: any, idx: number) => (
            <div key={idx} className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">{acc.account_code} - {acc.account_name}</span>
              <span>{formatCurrency(acc.balance)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 font-bold border-t mt-2">
            <span>Total Revenue</span>
            <span className="text-green-600">{formatCurrency(data.revenue?.total || 0)}</span>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-red-700 mb-2">Cost of Sales</h4>
          {(data.cost_of_sales?.accounts || []).map((acc: any, idx: number) => (
            <div key={idx} className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">{acc.account_code} - {acc.account_name}</span>
              <span>{formatCurrency(acc.balance)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 font-bold border-t mt-2">
            <span>Total Cost of Sales</span>
            <span className="text-red-600">{formatCurrency(data.cost_of_sales?.total || 0)}</span>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex justify-between font-bold text-lg">
            <span>Gross Profit</span>
            <span className={data.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(data.gross_profit || 0)}
            </span>
          </div>
          <div className="text-sm text-gray-600 text-right">
            Gross Margin: {data.gross_margin || 0}%
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-orange-700 mb-2">Operating Expenses</h4>
          {(data.operating_expenses?.accounts || []).map((acc: any, idx: number) => (
            <div key={idx} className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">{acc.account_code} - {acc.account_name}</span>
              <span>{formatCurrency(acc.balance)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 font-bold border-t mt-2">
            <span>Total Operating Expenses</span>
            <span className="text-orange-600">{formatCurrency(data.operating_expenses?.total || 0)}</span>
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="flex justify-between font-bold text-xl">
            <span>Net Income</span>
            <span className={data.net_income >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(data.net_income || 0)}
            </span>
          </div>
          <div className="text-sm text-gray-600 text-right">
            Net Margin: {data.net_margin || 0}%
          </div>
        </div>
      </div>
    </div>
  );
}

function BalanceSheetReport({ data, formatCurrency }: { data: any; formatCurrency: (n: number) => string }) {
  return (
    <div className="p-6">
      <h3 className="text-xl font-bold mb-6">Balance Sheet</h3>
      <p className="text-sm text-gray-500 mb-4">As of: {data.as_of_date}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-blue-700 mb-2">Current Assets</h4>
            {(data.assets?.current?.accounts || []).map((acc: any, idx: number) => (
              <div key={idx} className="flex justify-between py-1 text-sm">
                <span className="text-gray-600">{acc.account_code} - {acc.account_name}</span>
                <span>{formatCurrency(acc.balance)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-medium border-t mt-2">
              <span>Total Current Assets</span>
              <span>{formatCurrency(data.assets?.current?.total || 0)}</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-blue-700 mb-2">Non-Current Assets</h4>
            {(data.assets?.non_current?.accounts || []).map((acc: any, idx: number) => (
              <div key={idx} className="flex justify-between py-1 text-sm">
                <span className="text-gray-600">{acc.account_code} - {acc.account_name}</span>
                <span>{formatCurrency(acc.balance)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-medium border-t mt-2">
              <span>Total Non-Current Assets</span>
              <span>{formatCurrency(data.assets?.non_current?.total || 0)}</span>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between font-bold text-lg">
              <span>Total Assets</span>
              <span className="text-blue-600">{formatCurrency(data.assets?.total || 0)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-red-700 mb-2">Current Liabilities</h4>
            {(data.liabilities?.current?.accounts || []).map((acc: any, idx: number) => (
              <div key={idx} className="flex justify-between py-1 text-sm">
                <span className="text-gray-600">{acc.account_code} - {acc.account_name}</span>
                <span>{formatCurrency(acc.balance)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-medium border-t mt-2">
              <span>Total Current Liabilities</span>
              <span>{formatCurrency(data.liabilities?.current?.total || 0)}</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-green-700 mb-2">Equity</h4>
            {(data.equity?.accounts || []).map((acc: any, idx: number) => (
              <div key={idx} className="flex justify-between py-1 text-sm">
                <span className="text-gray-600">{acc.account_code} - {acc.account_name}</span>
                <span>{formatCurrency(acc.balance)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-medium border-t mt-2">
              <span>Total Equity</span>
              <span>{formatCurrency(data.equity?.total || 0)}</span>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="flex justify-between font-bold text-lg">
              <span>Total Liabilities & Equity</span>
              <span>{formatCurrency(data.total_liabilities_and_equity || 0)}</span>
            </div>
            <div className={`text-sm mt-2 ${data.balanced ? 'text-green-600' : 'text-red-600'}`}>
              {data.balanced ? 'Balance sheet is balanced' : 'Warning: Balance sheet is not balanced'}
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Working Capital</span>
                <span className="font-medium">{formatCurrency(data.working_capital || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Ratio</span>
                <span className="font-medium">{data.current_ratio || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CashFlowReport({ data, formatCurrency }: { data: any; formatCurrency: (n: number) => string }) {
  return (
    <div className="p-6">
      <h3 className="text-xl font-bold mb-6">Cash Flow Statement</h3>
      <p className="text-sm text-gray-500 mb-4">Period: {data.period?.start_date} to {data.period?.end_date}</p>
      
      <div className="space-y-6">
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-semibold text-blue-700 mb-3">Operating Activities</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Customer Receipts</span>
              <span className="text-green-600">{formatCurrency(data.operating_activities?.customer_receipts || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Supplier Payments</span>
              <span className="text-red-600">({formatCurrency(data.operating_activities?.supplier_payments || 0)})</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Net Operating Cash Flow</span>
              <span className={data.operating_activities?.net_operating >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(data.operating_activities?.net_operating || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Opening Cash</h4>
            <p className="text-2xl font-bold">{formatCurrency(data.opening_cash || 0)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Closing Cash</h4>
            <p className="text-2xl font-bold">{formatCurrency(data.closing_cash || 0)}</p>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex justify-between font-bold text-lg">
            <span>Net Change in Cash</span>
            <span className={data.net_change_in_cash >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(data.net_change_in_cash || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgingReport({ data, formatCurrency, type }: { data: any; formatCurrency: (n: number) => string; type: string }) {
  const isAR = type === 'ar-aging';
  
  return (
    <div className="p-6">
      <h3 className="text-xl font-bold mb-6">{isAR ? 'Accounts Receivable' : 'Accounts Payable'} Aging</h3>
      <p className="text-sm text-gray-500 mb-4">As of: {data.as_of_date}</p>
      
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Current', key: 'current', color: 'green' },
          { label: '1-30 Days', key: 'days_1_30', color: 'yellow' },
          { label: '31-60 Days', key: 'days_31_60', color: 'orange' },
          { label: '61-90 Days', key: 'days_61_90', color: 'red' },
          { label: '90+ Days', key: 'over_90', color: 'red' }
        ].map((bucket) => (
          <div key={bucket.key} className={`bg-${bucket.color}-50 p-4 rounded-lg text-center`}>
            <p className="text-sm text-gray-600">{bucket.label}</p>
            <p className="text-xl font-bold">{formatCurrency(data.totals?.[bucket.key] || 0)}</p>
            <p className="text-xs text-gray-500">{(data.buckets?.[bucket.key] || []).length} invoices</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <div className="flex justify-between font-bold text-lg">
          <span>Total Outstanding</span>
          <span>{formatCurrency(data.grand_total || 0)}</span>
        </div>
        <p className="text-sm text-gray-600">{data.invoice_count || 0} invoices</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">{isAR ? 'Customer' : 'Supplier'}</th>
              <th className="px-4 py-2 text-left">Invoice #</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Due Date</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-right">Outstanding</th>
              <th className="px-4 py-2 text-right">Days Overdue</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(data.buckets || {}).flat().slice(0, 20).map((invoice: any, idx: number) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">{isAR ? invoice.customer_name : invoice.supplier_name}</td>
                <td className="px-4 py-2">{invoice.invoice_number}</td>
                <td className="px-4 py-2">{invoice.invoice_date}</td>
                <td className="px-4 py-2">{invoice.due_date}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(invoice.total_amount)}</td>
                <td className="px-4 py-2 text-right font-medium">{formatCurrency(invoice.outstanding)}</td>
                <td className={`px-4 py-2 text-right ${invoice.days_overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {Math.round(invoice.days_overdue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SalesAnalyticsTab({ dateRange, setDateRange, formatCurrency }: {
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  formatCurrency: (n: number) => string;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/bi/reports/sales-analytics?start_date=${dateRange.start}&end_date=${dateRange.end}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to load sales analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2 items-center">
          <Calendar className="h-4 w-4 text-gray-500" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Quotes"
              value={String(data.quote_conversion?.total_quotes || 0)}
              icon={<FileText className="h-6 w-6" />}
              color="blue"
            />
            <MetricCard
              title="Converted Quotes"
              value={String(data.quote_conversion?.converted_quotes || 0)}
              icon={<CheckCircle className="h-6 w-6" />}
              color="green"
            />
            <MetricCard
              title="Conversion Rate"
              value={`${data.quote_conversion?.conversion_rate || 0}%`}
              icon={<TrendingUp className="h-6 w-6" />}
              color="purple"
            />
            <MetricCard
              title="Converted Value"
              value={formatCurrency(data.quote_conversion?.converted_value || 0)}
              icon={<DollarSign className="h-6 w-6" />}
              color="green"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Sales by Month</h3>
              <div className="space-y-2">
                {(data.sales_by_month || []).map((month: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="w-20 text-sm text-gray-600">{month.month}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-blue-600 h-4 rounded-full" 
                        style={{ width: `${Math.min(100, (month.revenue / Math.max(...(data.sales_by_month || []).map((m: any) => m.revenue || 1))) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="w-32 text-right font-medium">{formatCurrency(month.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Top Customers</h3>
              <div className="space-y-2">
                {(data.sales_by_customer || []).slice(0, 10).map((customer: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">{customer.customer_name}</span>
                    <span className="font-medium">{formatCurrency(customer.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProcurementAnalyticsTab({ dateRange, setDateRange, formatCurrency }: {
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  formatCurrency: (n: number) => string;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/bi/reports/procurement-analytics?start_date=${dateRange.start}&end_date=${dateRange.end}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to load procurement analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2 items-center">
          <Calendar className="h-4 w-4 text-gray-500" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total POs"
              value={String(data.po_fulfillment?.total_pos || 0)}
              icon={<FileText className="h-6 w-6" />}
              color="blue"
            />
            <MetricCard
              title="Received"
              value={String(data.po_fulfillment?.received_pos || 0)}
              icon={<Package className="h-6 w-6" />}
              color="green"
            />
            <MetricCard
              title="Invoiced"
              value={String(data.po_fulfillment?.invoiced_pos || 0)}
              icon={<CheckCircle className="h-6 w-6" />}
              color="purple"
            />
            <MetricCard
              title="Total PO Value"
              value={formatCurrency(data.po_fulfillment?.total_po_value || 0)}
              icon={<DollarSign className="h-6 w-6" />}
              color="orange"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Spend by Month</h3>
              <div className="space-y-2">
                {(data.spend_by_month || []).map((month: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="w-20 text-sm text-gray-600">{month.month}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-orange-600 h-4 rounded-full" 
                        style={{ width: `${Math.min(100, (month.spend / Math.max(...(data.spend_by_month || []).map((m: any) => m.spend || 1))) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="w-32 text-right font-medium">{formatCurrency(month.spend)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Top Suppliers by Spend</h3>
              <div className="space-y-2">
                {(data.spend_by_supplier || []).slice(0, 10).map((supplier: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">{supplier.supplier_name}</span>
                    <span className="font-medium">{formatCurrency(supplier.spend)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DataIntegrityTab({ data, onRefresh }: { data: IntegrityResult; onRefresh: () => void }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'fail':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold">Data Integrity Checks</h3>
            <p className="text-sm text-gray-500">Verify accounting integrity and data consistency</p>
          </div>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Run Checks
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-3xl font-bold">{data.summary.total_checks}</p>
            <p className="text-sm text-gray-600">Total Checks</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <p className="text-3xl font-bold text-green-600">{data.summary.passed}</p>
            <p className="text-sm text-gray-600">Passed</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <p className="text-3xl font-bold text-yellow-600">{data.summary.warnings}</p>
            <p className="text-sm text-gray-600">Warnings</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <p className="text-3xl font-bold text-red-600">{data.summary.failed}</p>
            <p className="text-sm text-gray-600">Failed</p>
          </div>
        </div>

        <div className={`p-4 rounded-lg mb-6 ${
          data.summary.overall_status === 'pass' ? 'bg-green-100' :
          data.summary.overall_status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
        }`}>
          <div className="flex items-center gap-2">
            {getStatusIcon(data.summary.overall_status)}
            <span className="font-semibold">
              Overall Status: {data.summary.overall_status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {data.checks.map((check, idx) => (
            <div key={idx} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <h4 className="font-semibold">{check.name}</h4>
                    <p className="text-sm text-gray-600">{check.description}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(check.status)}`}>
                  {check.status.toUpperCase()}
                </span>
              </div>
              {check.details && Object.keys(check.details).length > 0 && (
                <div className="mt-3 bg-gray-50 p-3 rounded text-sm">
                  <pre className="whitespace-pre-wrap text-xs">
                    {JSON.stringify(check.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, color }: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'orange';
}) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{title}</span>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
