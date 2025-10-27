import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Download, FileText } from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatters';

interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  balance: number;
  status: string;
}

const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    from_date: '',
    to_date: ''
  });

  // Mock data for demonstration
  useEffect(() => {
    setInvoices([
      { id: 1, invoice_number: 'INV-2025-00001', customer_id: 1, invoice_date: '2025-10-01', due_date: '2025-10-31', total_amount: 15000, balance: 15000, status: 'approved' },
      { id: 2, invoice_number: 'INV-2025-00002', customer_id: 2, invoice_date: '2025-10-15', due_date: '2025-11-14', total_amount: 8500, balance: 4250, status: 'partial' },
      { id: 3, invoice_number: 'INV-2025-00003', customer_id: 3, invoice_date: '2025-10-20', due_date: '2025-11-19', total_amount: 23000, balance: 0, status: 'paid' }
    ]);
  }, []);

  const getStatusBadge = (status: string) => {
    const { bg, text } = getStatusColor(status);
    const labels: Record<string, string> = {
      draft: 'Draft', approved: 'Approved', partial: 'Partial', paid: 'Paid', cancelled: 'Cancelled', overdue: 'Overdue'
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${bg} ${text}`}>{labels[status] || status}</span>;
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'paid' || status === 'cancelled') return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 mt-1">Manage your sales invoices</p>
        </div>
        <Link to="/financial/invoices/new" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Total Invoices</div>
          <div className="text-2xl font-bold text-gray-900">{invoices.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Total Amount</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(invoices.reduce((sum, inv) => sum + inv.total_amount, 0))}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Outstanding</div>
          <div className="text-2xl font-bold text-yellow-600">
            {formatCurrency(invoices.reduce((sum, inv) => sum + inv.balance, 0))}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Overdue</div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(invoices.filter(inv => isOverdue(inv.due_date, inv.status)).reduce((sum, inv) => sum + inv.balance, 0))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link to={`/financial/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                    {invoice.invoice_number}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm">{formatDate(invoice.invoice_date)}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={isOverdue(invoice.due_date, invoice.status) ? 'text-red-600 font-medium' : ''}>
                    {formatDate(invoice.due_date)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium">{formatCurrency(invoice.total_amount)}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={invoice.balance > 0 ? 'text-yellow-600 font-medium' : 'text-green-600'}>
                    {formatCurrency(invoice.balance)}
                  </span>
                </td>
                <td className="px-6 py-4">{getStatusBadge(invoice.status)}</td>
                <td className="px-6 py-4">
                  <Link to={`/financial/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-800 text-sm">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceList;
