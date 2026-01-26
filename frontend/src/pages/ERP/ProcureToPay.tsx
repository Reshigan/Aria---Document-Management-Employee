import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Filter, Download, Upload, 
  CheckCircle, XCircle, Clock, Package, ShoppingCart,
  Truck, DollarSign, AlertCircle
} from 'lucide-react';

interface RFQ {
  id: string;
  rfq_number: string;
  supplier_id: string;
  supplier_name: string;
  rfq_date: string;
  required_date: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  order_date: string;
  delivery_date: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface GoodsReceipt {
  id: string;
  gr_number: string;
  po_id: string;
  po_number: string;
  receipt_date: string;
  status: string;
  total_quantity: number;
  created_at: string;
}

interface SupplierInvoice {
  id: string;
  invoice_number: string;
  supplier_id: string;
  supplier_name: string;
  invoice_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface SupplierPayment {
  id: string;
  payment_number: string;
  supplier_id: string;
  supplier_name: string;
  payment_date: string;
  payment_method: string;
  total_amount: number;
  status: string;
  created_at: string;
}

type TabType = 'rfq' | 'po' | 'gr' | 'invoice' | 'payment';

const ProcureToPay: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('rfq');
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const companyId = localStorage.getItem('selectedCompanyId') || '';

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      switch (activeTab) {
        case 'rfq':
          const rfqRes = await fetch(`/api/erp/procure-to-pay/rfqs?company_id=${companyId}`, { headers });
          if (rfqRes.ok) {
            const data = await rfqRes.json();
            setRfqs(data.rfqs || []);
          }
          break;
        case 'po':
          const poRes = await fetch(`/api/erp/procure-to-pay/purchase-orders?company_id=${companyId}`, { headers });
          if (poRes.ok) {
            const data = await poRes.json();
            setPurchaseOrders(data.purchase_orders || []);
          }
          break;
        case 'gr':
          const grRes = await fetch(`/api/erp/procure-to-pay/goods-receipts?company_id=${companyId}`, { headers });
          if (grRes.ok) {
            const data = await grRes.json();
            setGoodsReceipts(data.goods_receipts || []);
          }
          break;
        case 'invoice':
          const invRes = await fetch(`/api/erp/procure-to-pay/supplier-invoices?company_id=${companyId}`, { headers });
          if (invRes.ok) {
            const data = await invRes.json();
            setSupplierInvoices(data.supplier_invoices || []);
          }
          break;
        case 'payment':
          const payRes = await fetch(`/api/erp/procure-to-pay/supplier-payments?company_id=${companyId}`, { headers });
          if (payRes.ok) {
            const data = await payRes.json();
            setSupplierPayments(data.supplier_payments || []);
          }
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      draft: { color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100', icon: <Clock className="w-3 h-3" /> },
      pending: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300', icon: <Clock className="w-3 h-3" /> },
      approved: { color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300', icon: <CheckCircle className="w-3 h-3" /> },
      sent: { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200', icon: <FileText className="w-3 h-3" /> },
      received: { color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800', icon: <Package className="w-3 h-3" /> },
      posted: { color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300', icon: <CheckCircle className="w-3 h-3" /> },
      paid: { color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300', icon: <DollarSign className="w-3 h-3" /> },
      cancelled: { color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300', icon: <XCircle className="w-3 h-3" /> }
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig.draft;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {status}
      </span>
    );
  };

  const renderRFQs = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Request for Quotations</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New RFQ
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">RFQ Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">RFQ Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Required Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {rfqs.map((rfq) => (
              <tr key={rfq.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{rfq.rfq_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{rfq.supplier_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(rfq.rfq_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(rfq.required_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(rfq.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">R {rfq.total_amount.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPurchaseOrders = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Purchase Orders</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New PO
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PO Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Delivery Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {purchaseOrders.map((po) => (
              <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{po.po_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{po.supplier_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(po.order_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(po.delivery_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(po.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">R {po.total_amount.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGoodsReceipts = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Goods Receipts</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New GR
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">GR Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PO Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Receipt Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {goodsReceipts.map((gr) => (
              <tr key={gr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{gr.gr_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{gr.po_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(gr.receipt_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{gr.total_quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(gr.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSupplierInvoices = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Supplier Invoices (MIRO)</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Invoice Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Invoice Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {supplierInvoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{invoice.supplier_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(invoice.due_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(invoice.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">R {invoice.total_amount.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSupplierPayments = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Supplier Payments</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Payment
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payment Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payment Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payment Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {supplierPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{payment.payment_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{payment.supplier_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(payment.payment_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{payment.payment_method}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(payment.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">R {payment.total_amount.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Please select a company to view Procure-to-Pay data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Procure-to-Pay</h1>
          <p className="text-gray-600 dark:text-gray-400">Complete procurement workflow from RFQ to payment</p>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('rfq')}
            className={`${
              activeTab === 'rfq'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <FileText className="w-4 h-4" />
            RFQ
          </button>
          <button
            onClick={() => setActiveTab('po')}
            className={`${
              activeTab === 'po'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <ShoppingCart className="w-4 h-4" />
            Purchase Orders
          </button>
          <button
            onClick={() => setActiveTab('gr')}
            className={`${
              activeTab === 'gr'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Package className="w-4 h-4" />
            Goods Receipts
          </button>
          <button
            onClick={() => setActiveTab('invoice')}
            className={`${
              activeTab === 'invoice'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <FileText className="w-4 h-4" />
            Supplier Invoices
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`${
              activeTab === 'payment'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <DollarSign className="w-4 h-4" />
            Payments
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'rfq' && renderRFQs()}
          {activeTab === 'po' && renderPurchaseOrders()}
          {activeTab === 'gr' && renderGoodsReceipts()}
          {activeTab === 'invoice' && renderSupplierInvoices()}
          {activeTab === 'payment' && renderSupplierPayments()}
        </>
      )}
    </div>
  );
};

export default ProcureToPay;
