import { useState, useEffect } from 'react';
import api from '../../services/api';

interface Customer {
  id: string;
  customer_name: string;
  email: string;
  outstanding_balance: number;
}

interface StatementHistory {
  id: string;
  customer_id: string;
  customer_name?: string;
  statement_date: string;
  start_date: string;
  end_date: string;
  opening_balance: number;
  closing_balance: number;
  transaction_count: number;
  emailed_to: string | null;
  emailed_at: string | null;
}

interface Statement {
  customer: {
    id: string;
    name: string;
    email: string;
    address: string | null;
  };
  period: {
    start_date: string;
    end_date: string;
  };
  opening_balance: number;
  transactions: Array<{
    date: string;
    type: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  closing_balance: number;
  aging: {
    current: number;
    days_30: number;
    days_60: number;
    days_90: number;
    over_90: number;
  };
}

export default function CustomerStatements() {
  const [history, setHistory] = useState<StatementHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewStatement, setPreviewStatement] = useState<Statement | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    start_date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    include_paid: false,
    email_address: '',
    custom_message: ''
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/xero/statements/history');
      setHistory(response.data.history || []);
    } catch (err) {
      setError('Failed to load statement history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!formData.customer_id) {
      setError('Please select a customer');
      return;
    }
    
    try {
      setGenerating(true);
      const response = await api.post('/xero/statements/generate', {
        customer_id: formData.customer_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        include_paid: formData.include_paid
      });
      setPreviewStatement(response.data);
    } catch (err) {
      setError('Failed to generate statement');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleEmailStatement = async () => {
    if (!formData.customer_id || !formData.email_address) {
      setError('Please provide customer and email address');
      return;
    }
    
    try {
      setGenerating(true);
      await api.post(`/xero/statements/${formData.customer_id}/email`, {
        start_date: formData.start_date,
        end_date: formData.end_date,
        include_paid: formData.include_paid,
        email_address: formData.email_address,
        custom_message: formData.custom_message
      });
      alert('Statement emailed successfully!');
      setShowGenerator(false);
      fetchHistory();
    } catch (err) {
      setError('Failed to email statement');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (!confirm('This will generate and optionally email statements to all customers with outstanding balances. Continue?')) {
      return;
    }
    
    try {
      setGenerating(true);
      const response = await api.post('/xero/statements/bulk-generate', {
        start_date: formData.start_date,
        end_date: formData.end_date,
        send_email: true
      });
      alert(`Generated ${response.data.generated} statements, emailed ${response.data.emailed}`);
      fetchHistory();
    } catch (err) {
      setError('Failed to bulk generate statements');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-ZA');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Statements</h1>
          <p className="text-gray-600">Generate and send account statements to customers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleBulkGenerate}
            disabled={generating}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            Bulk Generate & Email
          </button>
          <button
            onClick={() => setShowGenerator(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Generate Statement
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right">&times;</button>
        </div>
      )}

      {showGenerator && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Generate Customer Statement</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
              <input
                type="text"
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Enter customer ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email_address}
                onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.include_paid}
                  onChange={(e) => setFormData({ ...formData, include_paid: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Include paid invoices</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Message (Optional)</label>
              <input
                type="text"
                value={formData.custom_message}
                onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Add a personal message..."
              />
            </div>
            <div className="col-span-2 flex gap-2">
              <button
                onClick={handleGeneratePreview}
                disabled={generating}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Preview'}
              </button>
              <button
                onClick={handleEmailStatement}
                disabled={generating || !formData.email_address}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? 'Sending...' : 'Email Statement'}
              </button>
              <button
                onClick={() => { setShowGenerator(false); setPreviewStatement(null); }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>

          {previewStatement && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Statement Preview</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between mb-4">
                  <div>
                    <div className="font-semibold">{previewStatement.customer.name}</div>
                    <div className="text-sm text-gray-500">{previewStatement.customer.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Period</div>
                    <div>{formatDate(previewStatement.period.start_date)} - {formatDate(previewStatement.period.end_date)}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-500">Opening Balance</div>
                    <div className="text-lg font-semibold">{formatCurrency(previewStatement.opening_balance)}</div>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <div className="text-sm text-gray-500">Closing Balance</div>
                    <div className="text-lg font-semibold text-blue-600">{formatCurrency(previewStatement.closing_balance)}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Aging Summary</div>
                  <div className="grid grid-cols-5 gap-2 text-center text-sm">
                    <div className="bg-green-100 p-2 rounded">
                      <div className="text-gray-600">Current</div>
                      <div className="font-semibold">{formatCurrency(previewStatement.aging.current)}</div>
                    </div>
                    <div className="bg-yellow-100 p-2 rounded">
                      <div className="text-gray-600">30 Days</div>
                      <div className="font-semibold">{formatCurrency(previewStatement.aging.days_30)}</div>
                    </div>
                    <div className="bg-orange-100 p-2 rounded">
                      <div className="text-gray-600">60 Days</div>
                      <div className="font-semibold">{formatCurrency(previewStatement.aging.days_60)}</div>
                    </div>
                    <div className="bg-red-100 p-2 rounded">
                      <div className="text-gray-600">90 Days</div>
                      <div className="font-semibold">{formatCurrency(previewStatement.aging.days_90)}</div>
                    </div>
                    <div className="bg-red-200 p-2 rounded">
                      <div className="text-gray-600">90+ Days</div>
                      <div className="font-semibold">{formatCurrency(previewStatement.aging.over_90)}</div>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  {previewStatement.transactions.length} transactions in this period
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Statement History</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statement Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Opening</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Closing</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Transactions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emailed</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {history.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No statements generated yet. Generate your first statement above.
                </td>
              </tr>
            ) : (
              history.map((stmt) => (
                <tr key={stmt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {stmt.customer_name || stmt.customer_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(stmt.statement_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(stmt.start_date)} - {formatDate(stmt.end_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(stmt.opening_balance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(stmt.closing_balance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {stmt.transaction_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stmt.emailed_to ? (
                      <span className="text-green-600" title={`Sent to ${stmt.emailed_to} on ${formatDate(stmt.emailed_at!)}`}>
                        Sent
                      </span>
                    ) : (
                      <span className="text-gray-400">Not sent</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
