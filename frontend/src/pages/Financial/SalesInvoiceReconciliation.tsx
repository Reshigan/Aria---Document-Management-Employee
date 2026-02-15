import React, { useState, useEffect } from 'react';
import { 
  FileText, CheckCircle, XCircle, Clock, AlertTriangle, 
  Play, Download, Filter, Eye, Check, X, Send,
  TrendingUp, TrendingDown, DollarSign, RefreshCw
} from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';

interface ReconciliationException {
  id: number;
  sales_order_id: string;
  order_number: string;
  customer_name: string;
  invoice_id: string | null;
  exception_type: string;
  expected_amount: number;
  actual_amount: number;
  variance_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

interface ReconciliationSummary {
  summary: {
    total_orders: number;
    fully_invoiced: number;
    partially_invoiced: number;
    not_invoiced: number;
    total_sales_value: number;
    invoiced_value: number;
    uninvoiced_value: number;
  };
  exceptions: {
    total: number;
    pending: number;
    approved: number;
    posted: number;
    total_variance: number;
  };
}

export default function SalesInvoiceReconciliation() {
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [exceptions, setExceptions] = useState<ReconciliationException[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selectedException, setSelectedException] = useState<ReconciliationException | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postingData, setPostingData] = useState({ gl_account: '7100', notes: '' });
  const [runningReconciliation, setRunningReconciliation] = useState(false);

  useEffect(() => {
    fetchData();
  }, [statusFilter, typeFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [summaryRes, exceptionsRes] = await Promise.all([
        fetch(`${API_BASE}/api/sales-reconciliation/summary`, { headers }),
        fetch(`${API_BASE}/api/sales-reconciliation/exceptions?${new URLSearchParams({
          ...(statusFilter && { status: statusFilter }),
          ...(typeFilter && { exception_type: typeFilter })
        })}`, { headers })
      ]);

      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }
      if (exceptionsRes.ok) {
        const data = await exceptionsRes.json();
        setExceptions(data.exceptions || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runReconciliation = async () => {
    setRunningReconciliation(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/sales-reconciliation/run-reconciliation`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Reconciliation completed!\n\nOrders processed: ${result.results.orders_processed}\nMatched: ${result.results.matched}\nExceptions found: ${result.results.exceptions_found}`);
        fetchData();
      }
    } catch (error) {
      console.error('Error running reconciliation:', error);
    } finally {
      setRunningReconciliation(false);
    }
  };

  const approveException = async (exceptionId: number) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/sales-reconciliation/exceptions/${exceptionId}/approve`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error approving exception:', error);
    }
  };

  const postVariance = async () => {
    if (!selectedException) return;
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/sales-reconciliation/exceptions/${selectedException.id}/post`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exception_id: selectedException.id,
          gl_account: postingData.gl_account,
          notes: postingData.notes
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Variance posted successfully!\n\nJournal ID: ${result.journal_id}\nAmount: R ${Math.abs(result.amount).toFixed(2)}\nGL Account: ${result.gl_account}`);
        setShowPostModal(false);
        setSelectedException(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error posting variance:', error);
    }
  };

  const getExceptionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'quantity_variance': 'Quantity Variance',
      'price_variance': 'Price Variance',
      'missing_invoice': 'Missing Invoice',
      'missing_delivery': 'Missing Delivery'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'approved': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'posted': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'rejected': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const columns = [
    { key: 'order_number', label: 'Sales Order' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'invoice_id', label: 'Invoice', render: (row: ReconciliationException) => row.invoice_id || '-' },
    { key: 'exception_type', label: 'Exception Type', render: (row: ReconciliationException) => getExceptionTypeLabel(row.exception_type) },
    { key: 'expected_amount', label: 'Expected', render: (row: ReconciliationException) => `R ${Number(row.expected_amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` },
    { key: 'actual_amount', label: 'Actual', render: (row: ReconciliationException) => `R ${Number(row.actual_amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` },
    { key: 'variance_amount', label: 'Variance', render: (row: ReconciliationException) => (
      <span className={row.variance_amount < 0 ? 'text-red-600' : 'text-green-600'}>
        R {Number(row.variance_amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
      </span>
    )},
    { key: 'status', label: 'Status', render: (row: ReconciliationException) => getStatusBadge(row.status) },
    { key: 'actions', label: 'Actions', render: (row: ReconciliationException) => (
      <div className="flex gap-2">
        <button 
          onClick={() => setSelectedException(row)}
          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </button>
        {row.status === 'pending' && (
          <button 
            onClick={() => approveException(row.id)}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
            title="Approve"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
        {row.status === 'approved' && (
          <button 
            onClick={() => { setSelectedException(row); setShowPostModal(true); }}
            className="p-1 text-purple-600 hover:bg-purple-50 rounded"
            title="Post to GL"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    )}
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
              <FileText className="h-8 w-8 text-indigo-600" />
              Sales to Invoice Reconciliation
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Match sales orders with invoices and resolve exceptions
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={runReconciliation}
              disabled={runningReconciliation}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {runningReconciliation ? 'Running...' : 'Run Reconciliation'}
            </button>
          </div>
        </div>

        {summary && (
          <>
            <div className="grid grid-cols-4 gap-6 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sales Orders</div>
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{summary.summary.total_orders}</div>
                <div className="text-sm text-gray-500 mt-1">
                  R {summary.Number(summary.total_sales_value ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Fully Invoiced</div>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-600">{summary.summary.fully_invoiced}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {Number(((summary.summary.fully_invoiced / summary.summary.total_orders) * 100) || 0).toFixed(1)}% complete
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Invoice</div>
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="text-3xl font-bold text-yellow-600">
                  {summary.summary.partially_invoiced + summary.summary.not_invoiced}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  R {summary.Number(summary.uninvoiced_value ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })} outstanding
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Exceptions</div>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="text-3xl font-bold text-red-600">{summary.exceptions.total}</div>
                <div className="text-sm text-gray-500 mt-1">
                  R {summary.Number(exceptions.total_variance ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })} variance
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Pending Review</span>
                </div>
                <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mt-1">
                  {summary.exceptions.pending}
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Approved</span>
                </div>
                <div className="text-2xl font-bold text-blue-800 dark:text-blue-200 mt-1">
                  {summary.exceptions.approved}
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <Send className="h-4 w-4" />
                  <span className="font-medium">Posted to GL</span>
                </div>
                <div className="text-2xl font-bold text-green-800 dark:text-green-200 mt-1">
                  {summary.exceptions.posted}
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">Total Variance</span>
                </div>
                <div className="text-2xl font-bold text-purple-800 dark:text-purple-200 mt-1">
                  R {summary.Number(exceptions.total_variance ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="posted">Posted</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Exception Types</option>
              <option value="quantity_variance">Quantity Variance</option>
              <option value="price_variance">Price Variance</option>
              <option value="missing_invoice">Missing Invoice</option>
              <option value="missing_delivery">Missing Delivery</option>
            </select>
          </div>
          
          <DataTable
            data={exceptions}
            columns={columns}
            searchable={true}
            exportable={true}
            exportFilename="sales-invoice-reconciliation"
          />
        </div>

        {selectedException && !showPostModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Exception Details</h2>
                <button onClick={() => setSelectedException(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Sales Order</label>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedException.order_number}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Customer</label>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedException.customer_name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Invoice</label>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedException.invoice_id || 'Not Created'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Exception Type</label>
                    <p className="font-medium text-gray-900 dark:text-white">{getExceptionTypeLabel(selectedException.exception_type)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Expected Amount</label>
                    <p className="font-medium text-gray-900 dark:text-white">R {Number(selectedException.expected_amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Actual Amount</label>
                    <p className="font-medium text-gray-900 dark:text-white">R {Number(selectedException.actual_amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Variance</label>
                    <p className={`font-medium ${selectedException.variance_amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      R {Number(selectedException.variance_amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Status</label>
                    <p>{getStatusBadge(selectedException.status)}</p>
                  </div>
                </div>
                {selectedException.notes && (
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Notes</label>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedException.notes}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  {selectedException.status === 'pending' && (
                    <button
                      onClick={() => { approveException(selectedException.id); setSelectedException(null); }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </button>
                  )}
                  {selectedException.status === 'approved' && (
                    <button
                      onClick={() => setShowPostModal(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Post to GL
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedException(null)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPostModal && selectedException && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Post Variance to GL</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Variance Amount
                  </label>
                  <p className={`text-2xl font-bold ${selectedException.variance_amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    R {Number(selectedException.variance_amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    GL Account
                  </label>
                  <select
                    value={postingData.gl_account}
                    onChange={(e) => setPostingData({ ...postingData, gl_account: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="7100">7100 - Sales Adjustments</option>
                    <option value="7200">7200 - Price Variances</option>
                    <option value="7300">7300 - Quantity Variances</option>
                    <option value="7400">7400 - Write-offs</option>
                    <option value="7500">7500 - Discounts Given</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={postingData.notes}
                    onChange={(e) => setPostingData({ ...postingData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                    placeholder="Add posting notes..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={postVariance}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Post to GL
                  </button>
                  <button
                    onClick={() => { setShowPostModal(false); }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
