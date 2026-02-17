import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface Supplier {
  id: number;
  supplier_code: string;
  supplier_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  payment_terms: number;
  bbbee_level: number;
  is_active: boolean;
  created_at: string;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name?: string;
  order_date: string;
  delivery_date: string;
  status: 'DRAFT' | 'APPROVED' | 'SENT' | 'RECEIVED' | 'CANCELLED';
  total_amount: number;
  created_at: string;
}

interface RFQ {
  id: number;
  rfq_number: string;
  title: string;
  description: string;
  issue_date: string;
  closing_date: string;
  status: 'DRAFT' | 'ISSUED' | 'CLOSED' | 'CANCELLED';
  created_at: string;
}

const ProcurementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'purchase_orders' | 'rfqs'>('suppliers');
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliersSearch, setSuppliersSearch] = useState('');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    supplier_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    payment_terms: '30',
    bbbee_level: '4',
    is_active: true
  });
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [posLoading, setPosLoading] = useState(false);
  const [posSearch, setPosSearch] = useState('');
  const [showPoModal, setShowPoModal] = useState(false);
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null);
  const [poForm, setPoForm] = useState({
    supplier_id: '',
    order_date: '',
    delivery_date: '',
    total_amount: ''
  });
  
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [rfqsLoading, setRfqsLoading] = useState(false);
  const [rfqsSearch, setRfqsSearch] = useState('');
  const [showRfqModal, setShowRfqModal] = useState(false);
  const [editingRfq, setEditingRfq] = useState<RFQ | null>(null);
  const [rfqForm, setRfqForm] = useState({
    title: '',
    description: '',
    issue_date: '',
    closing_date: ''
  });
  
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: 'supplier' | 'po' | 'rfq';
    id: number;
    name: string;
  }>({ show: false, type: 'supplier', id: 0, name: '' });
  
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'suppliers') loadSuppliers();
    else if (activeTab === 'purchase_orders') loadPurchaseOrders();
    else if (activeTab === 'rfqs') loadRfqs();
  }, [activeTab]);

  const loadSuppliers = async () => {
    setSuppliersLoading(true);
    setError('');
    try {
      const response = await api.get('/erp/procurement/suppliers');
      setSuppliers(response.data.suppliers || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load suppliers');
    } finally {
      setSuppliersLoading(false);
    }
  };

  const handleCreateSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({
      supplier_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      payment_terms: '30',
      bbbee_level: '4',
      is_active: true
    });
    setShowSupplierModal(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      supplier_name: supplier.supplier_name,
      contact_person: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      payment_terms: supplier.payment_terms.toString(),
      bbbee_level: supplier.bbbee_level.toString(),
      is_active: supplier.is_active
    });
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = async () => {
    setError('');
    try {
      const payload = {
        ...supplierForm,
        payment_terms: parseInt(supplierForm.payment_terms),
        bbbee_level: parseInt(supplierForm.bbbee_level)
      };
      
      if (editingSupplier) {
        await api.put(`/erp/procurement/suppliers/${editingSupplier.id}`, payload);
      } else {
        await api.post('/erp/procurement/suppliers', payload);
      }
      setShowSupplierModal(false);
      loadSuppliers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save supplier');
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    try {
      await api.delete(`/erp/procurement/suppliers/${id}`);
      loadSuppliers();
      setDeleteConfirm({ show: false, type: 'supplier', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete supplier');
    }
  };

  const loadPurchaseOrders = async () => {
    setPosLoading(true);
    setError('');
    try {
      const response = await api.get('/erp/procurement/purchase-orders');
      setPurchaseOrders(response.data.purchase_orders || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load purchase orders');
    } finally {
      setPosLoading(false);
    }
  };

  const handleCreatePo = () => {
    setEditingPo(null);
    setPoForm({
      supplier_id: '',
      order_date: '',
      delivery_date: '',
      total_amount: ''
    });
    setShowPoModal(true);
  };

  const handleEditPo = (po: PurchaseOrder) => {
    setEditingPo(po);
    setPoForm({
      supplier_id: po.supplier_id.toString(),
      order_date: po.order_date,
      delivery_date: po.delivery_date,
      total_amount: po.total_amount.toString()
    });
    setShowPoModal(true);
  };

  const handleSavePo = async () => {
    setError('');
    try {
      const payload = {
        ...poForm,
        supplier_id: parseInt(poForm.supplier_id),
        total_amount: parseFloat(poForm.total_amount)
      };
      
      if (editingPo) {
        await api.put(`/erp/procurement/purchase-orders/${editingPo.id}`, payload);
      } else {
        await api.post('/erp/procurement/purchase-orders', payload);
      }
      setShowPoModal(false);
      loadPurchaseOrders();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save purchase order');
    }
  };

  const handleDeletePo = async (id: number) => {
    try {
      await api.delete(`/erp/procurement/purchase-orders/${id}`);
      loadPurchaseOrders();
      setDeleteConfirm({ show: false, type: 'po', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete purchase order');
    }
  };

  const handleApprovePo = async (poId: number) => {
    try {
      await api.post(`/erp/procurement/purchase-orders/${poId}/approve`);
      loadPurchaseOrders();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to approve purchase order');
    }
  };

  const handleSendPo = async (poId: number) => {
    try {
      await api.post(`/erp/procurement/purchase-orders/${poId}/send`);
      loadPurchaseOrders();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send purchase order');
    }
  };

  const loadRfqs = async () => {
    setRfqsLoading(true);
    setError('');
    try {
      const response = await api.get('/erp/procurement/rfqs');
      setRfqs(response.data.rfqs || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load RFQs');
    } finally {
      setRfqsLoading(false);
    }
  };

  const handleCreateRfq = () => {
    setEditingRfq(null);
    setRfqForm({
      title: '',
      description: '',
      issue_date: '',
      closing_date: ''
    });
    setShowRfqModal(true);
  };

  const handleEditRfq = (rfq: RFQ) => {
    setEditingRfq(rfq);
    setRfqForm({
      title: rfq.title,
      description: rfq.description,
      issue_date: rfq.issue_date,
      closing_date: rfq.closing_date
    });
    setShowRfqModal(true);
  };

  const handleSaveRfq = async () => {
    setError('');
    try {
      if (editingRfq) {
        await api.put(`/erp/procurement/rfqs/${editingRfq.id}`, rfqForm);
      } else {
        await api.post('/erp/procurement/rfqs', rfqForm);
      }
      setShowRfqModal(false);
      loadRfqs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save RFQ');
    }
  };

  const handleDeleteRfq = async (id: number) => {
    try {
      await api.delete(`/erp/procurement/rfqs/${id}`);
      loadRfqs();
      setDeleteConfirm({ show: false, type: 'rfq', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete RFQ');
    }
  };

  const handleIssueRfq = async (rfqId: number) => {
    try {
      await api.post(`/erp/procurement/rfqs/${rfqId}/issue`);
      loadRfqs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to issue RFQ');
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.supplier_name.toLowerCase().includes(suppliersSearch.toLowerCase()) ||
    s.supplier_code.toLowerCase().includes(suppliersSearch.toLowerCase())
  );

  const filteredPos = purchaseOrders.filter(po =>
    po.po_number.toLowerCase().includes(posSearch.toLowerCase()) ||
    po.supplier_name?.toLowerCase().includes(posSearch.toLowerCase())
  );

  const filteredRfqs = rfqs.filter(r =>
    r.rfq_number.toLowerCase().includes(rfqsSearch.toLowerCase()) ||
    r.title.toLowerCase().includes(rfqsSearch.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      SENT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      ISSUED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      CLOSED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status] || colors.DRAFT}`}>{status}</span>;
  };

  const getBbbeeBadge = (level: number) => {
    const colors: Record<number, string> = {
      1: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      2: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      3: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      4: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[Math.min(level, 4)] || 'bg-gray-100 text-gray-700'}`}>Level {level}</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  const formatDate = (dateString: string) => { if (!dateString) return "-"; const _d = new Date(dateString); return isNaN(_d.getTime()) ? dateString : _d.toLocaleDateString("en-ZA"); };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Procurement</h1>
          <p className="text-gray-500 dark:text-gray-300 mt-1">Manage suppliers, purchase orders, and RFQs</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'suppliers' 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Suppliers ({suppliers.length})
            </button>
            <button
              onClick={() => setActiveTab('purchase_orders')}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'purchase_orders' 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Purchase Orders ({purchaseOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('rfqs')}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'rfqs' 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              RFQs ({rfqs.length})
            </button>
          </div>
        </div>

      {/* SUPPLIERS TAB */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {/* Actions Bar */}
          <div className="flex justify-between items-center">
            <input
              type="text"
              placeholder="Search suppliers..."
              value={suppliersSearch}
              onChange={(e) => setSuppliersSearch(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 w-80 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              onClick={handleCreateSupplier}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700  transition-all"
            >
              + New Supplier
            </button>
          </div>

          {/* Suppliers Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Supplier Code</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Payment Terms</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">BBBEE</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {suppliersLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-300">Loading suppliers...</td>
                  </tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-300">No suppliers found</td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-blue-600 dark:text-blue-400">{supplier.supplier_code}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{supplier.supplier_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{supplier.contact_person}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{supplier.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{supplier.payment_terms} days</td>
                      <td className="px-6 py-4">{getBbbeeBadge(supplier.bbbee_level)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => handleEditSupplier(supplier)} className="px-3 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">Edit</button>
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'supplier', id: supplier.id, name: supplier.supplier_name })} className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PURCHASE ORDERS TAB */}
      {activeTab === 'purchase_orders' && (
        <div className="space-y-4">
          {/* Actions Bar */}
          <div className="flex justify-between items-center">
            <input
              type="text"
              placeholder="Search purchase orders..."
              value={posSearch}
              onChange={(e) => setPosSearch(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 w-80 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              onClick={handleCreatePo}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700  transition-all"
            >
              + New Purchase Order
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-300 mb-1">Total POs</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{purchaseOrders.length}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-300 mb-1">Draft</div>
              <div className="text-2xl font-bold text-gray-500 dark:text-gray-300">
                {purchaseOrders.filter(po => po.status === 'DRAFT').length}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-300 mb-1">Sent</div>
              <div className="text-2xl font-bold text-amber-500">
                {purchaseOrders.filter(po => po.status === 'SENT').length}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-300 mb-1">Total Value</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(purchaseOrders.reduce((sum, po) => sum + po.total_amount, 0))}
              </div>
            </div>
          </div>

          {/* Purchase Orders Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">PO Number</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Order Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Delivery Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {posLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-300">Loading purchase orders...</td>
                  </tr>
                ) : filteredPos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-300">No purchase orders found</td>
                  </tr>
                ) : (
                  filteredPos.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-blue-600 dark:text-blue-400">{po.po_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{po.supplier_name || `Supplier #${po.supplier_id}`}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(po.order_date)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(po.delivery_date)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(po.total_amount)}</td>
                      <td className="px-6 py-4">{getStatusBadge(po.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => handleEditPo(po)} className="px-3 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">Edit</button>
                          {po.status === 'DRAFT' && (
                            <button onClick={() => handleApprovePo(po.id)} className="px-3 py-1 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors">Approve</button>
                          )}
                          {po.status === 'APPROVED' && (
                            <button onClick={() => handleSendPo(po.id)} className="px-3 py-1 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors">Send</button>
                          )}
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'po', id: po.id, name: po.po_number })} className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RFQS TAB */}
      {activeTab === 'rfqs' && (
        <div className="space-y-4">
          {/* Actions Bar */}
          <div className="flex justify-between items-center">
            <input
              type="text"
              placeholder="Search RFQs..."
              value={rfqsSearch}
              onChange={(e) => setRfqsSearch(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 w-80 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              onClick={handleCreateRfq}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700  transition-all"
            >
              + New RFQ
            </button>
          </div>

          {/* RFQs Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">RFQ Number</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Issue Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Closing Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rfqsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-300">Loading RFQs...</td>
                  </tr>
                ) : filteredRfqs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-300">No RFQs found</td>
                  </tr>
                ) : (
                  filteredRfqs.map((rfq) => (
                    <tr key={rfq.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-blue-600 dark:text-blue-400">{rfq.rfq_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{rfq.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(rfq.issue_date)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(rfq.closing_date)}</td>
                      <td className="px-6 py-4">{getStatusBadge(rfq.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => handleEditRfq(rfq)} className="px-3 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">Edit</button>
                          {rfq.status === 'DRAFT' && (
                            <button onClick={() => handleIssueRfq(rfq.id)} className="px-3 py-1 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors">Issue</button>
                          )}
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'rfq', id: rfq.id, name: rfq.rfq_number })} className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUPPLIER MODAL */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-[600px] max-h-[90vh] overflow-auto shadow-2xl">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingSupplier ? 'Edit Supplier' : 'New Supplier'}</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  value={supplierForm.supplier_name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, supplier_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    value={supplierForm.contact_person}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone *</label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <textarea
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Payment Terms (days)</label>
                  <input
                    type="number"
                    value={supplierForm.payment_terms}
                    onChange={(e) => setSupplierForm({ ...supplierForm, payment_terms: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">BBBEE Level</label>
                  <select
                    value={supplierForm.bbbee_level}
                    onChange={(e) => setSupplierForm({ ...supplierForm, bbbee_level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="1">Level 1</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3</option>
                    <option value="4">Level 4</option>
                    <option value="5">Level 5</option>
                    <option value="6">Level 6</option>
                    <option value="7">Level 7</option>
                    <option value="8">Level 8</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={supplierForm.is_active}
                    onChange={(e) => setSupplierForm({ ...supplierForm, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
              <button
                onClick={() => setShowSupplierModal(false)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSupplier}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700  transition-all"
              >
                {editingSupplier ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PURCHASE ORDER MODAL */}
      {showPoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-[600px] max-h-[90vh] overflow-auto shadow-2xl">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingPo ? 'Edit Purchase Order' : 'New Purchase Order'}</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Supplier ID *</label>
                <input
                  type="number"
                  value={poForm.supplier_id}
                  onChange={(e) => setPoForm({ ...poForm, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Order Date *</label>
                  <input
                    type="date"
                    value={poForm.order_date}
                    onChange={(e) => setPoForm({ ...poForm, order_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Delivery Date *</label>
                  <input
                    type="date"
                    value={poForm.delivery_date}
                    onChange={(e) => setPoForm({ ...poForm, delivery_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Total Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={poForm.total_amount}
                  onChange={(e) => setPoForm({ ...poForm, total_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
              <button
                onClick={() => setShowPoModal(false)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePo}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700  transition-all"
              >
                {editingPo ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RFQ MODAL */}
      {showRfqModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-[600px] max-h-[90vh] overflow-auto shadow-2xl">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingRfq ? 'Edit RFQ' : 'New RFQ'}</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={rfqForm.title}
                  onChange={(e) => setRfqForm({ ...rfqForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={rfqForm.description}
                  onChange={(e) => setRfqForm({ ...rfqForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Issue Date *</label>
                  <input
                    type="date"
                    value={rfqForm.issue_date}
                    onChange={(e) => setRfqForm({ ...rfqForm, issue_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Closing Date *</label>
                  <input
                    type="date"
                    value={rfqForm.closing_date}
                    onChange={(e) => setRfqForm({ ...rfqForm, closing_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
              <button
                onClick={() => setShowRfqModal(false)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRfq}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700  transition-all"
              >
                {editingRfq ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title={`Delete ${deleteConfirm.type}`}
        message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteConfirm.type === 'supplier') handleDeleteSupplier(deleteConfirm.id);
          else if (deleteConfirm.type === 'po') handleDeletePo(deleteConfirm.id);
          else if (deleteConfirm.type === 'rfq') handleDeleteRfq(deleteConfirm.id);
        }}
        onClose={() => setDeleteConfirm({ show: false, type: 'supplier', id: 0, name: '' })}
      />
      </div>
    </div>
  );
};

export default ProcurementDashboard;
