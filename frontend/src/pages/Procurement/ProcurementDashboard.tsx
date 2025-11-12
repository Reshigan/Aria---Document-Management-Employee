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
    const colors: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151' },
      APPROVED: { bg: '#dbeafe', text: '#1e40af' },
      SENT: { bg: '#fef3c7', text: '#92400e' },
      RECEIVED: { bg: '#dcfce7', text: '#166534' },
      CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
      ISSUED: { bg: '#dbeafe', text: '#1e40af' },
      CLOSED: { bg: '#dcfce7', text: '#166534' }
    };
    const color = colors[status] || { bg: '#f3f4f6', text: '#374151' };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: color.bg, color: color.text }}>{status}</span>;
  };

  const getBbbeeBadge = (level: number) => {
    const colors: Record<number, { bg: string; text: string }> = {
      1: { bg: '#dcfce7', text: '#166534' },
      2: { bg: '#dbeafe', text: '#1e40af' },
      3: { bg: '#fef3c7', text: '#92400e' },
      4: { bg: '#fed7aa', text: '#9a3412' }
    };
    const color = colors[Math.min(level, 4)] || { bg: '#f3f4f6', text: '#374151' };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: color.bg, color: color.text }}>Level {level}</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Procurement</h1>
        <p style={{ color: '#6b7280' }}>Manage suppliers, purchase orders, and RFQs</p>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => setActiveTab('suppliers')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'suppliers' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'suppliers' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Suppliers ({suppliers.length})
          </button>
          <button
            onClick={() => setActiveTab('purchase_orders')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'purchase_orders' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'purchase_orders' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Purchase Orders ({purchaseOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('rfqs')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'rfqs' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'rfqs' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            RFQs ({rfqs.length})
          </button>
        </div>
      </div>

      {/* SUPPLIERS TAB */}
      {activeTab === 'suppliers' && (
        <div>
          {/* Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search suppliers..."
              value={suppliersSearch}
              onChange={(e) => setSuppliersSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '300px' }}
            />
            <button
              onClick={handleCreateSupplier}
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              + New Supplier
            </button>
          </div>

          {/* Suppliers Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Supplier Code</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Contact</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Payment Terms</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>BBBEE</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliersLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading suppliers...</td>
                  </tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No suppliers found</td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{supplier.supplier_code}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{supplier.supplier_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{supplier.contact_person}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{supplier.email}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{supplier.payment_terms} days</td>
                      <td style={{ padding: '12px 16px' }}>{getBbbeeBadge(supplier.bbbee_level)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleEditSupplier(supplier)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'supplier', id: supplier.id, name: supplier.supplier_name })} style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
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
        <div>
          {/* Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search purchase orders..."
              value={posSearch}
              onChange={(e) => setPosSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '300px' }}
            />
            <button
              onClick={handleCreatePo}
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              + New Purchase Order
            </button>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total POs</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{purchaseOrders.length}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Draft</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280' }}>
                {purchaseOrders.filter(po => po.status === 'DRAFT').length}
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Sent</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                {purchaseOrders.filter(po => po.status === 'SENT').length}
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Value</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                {formatCurrency(purchaseOrders.reduce((sum, po) => sum + po.total_amount, 0))}
              </div>
            </div>
          </div>

          {/* Purchase Orders Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>PO Number</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Supplier</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Order Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Delivery Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading purchase orders...</td>
                  </tr>
                ) : filteredPos.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No purchase orders found</td>
                  </tr>
                ) : (
                  filteredPos.map((po) => (
                    <tr key={po.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{po.po_number}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{po.supplier_name || `Supplier #${po.supplier_id}`}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatDate(po.order_date)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatDate(po.delivery_date)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>{formatCurrency(po.total_amount)}</td>
                      <td style={{ padding: '12px 16px' }}>{getStatusBadge(po.status)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button onClick={() => handleEditPo(po)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                          {po.status === 'DRAFT' && (
                            <button onClick={() => handleApprovePo(po.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#059669', background: 'none', border: 'none', cursor: 'pointer' }}>Approve</button>
                          )}
                          {po.status === 'APPROVED' && (
                            <button onClick={() => handleSendPo(po.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer' }}>Send</button>
                          )}
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'po', id: po.id, name: po.po_number })} style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
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
        <div>
          {/* Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search RFQs..."
              value={rfqsSearch}
              onChange={(e) => setRfqsSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '300px' }}
            />
            <button
              onClick={handleCreateRfq}
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              + New RFQ
            </button>
          </div>

          {/* RFQs Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>RFQ Number</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Title</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Issue Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Closing Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rfqsLoading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading RFQs...</td>
                  </tr>
                ) : filteredRfqs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No RFQs found</td>
                  </tr>
                ) : (
                  filteredRfqs.map((rfq) => (
                    <tr key={rfq.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{rfq.rfq_number}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{rfq.title}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatDate(rfq.issue_date)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatDate(rfq.closing_date)}</td>
                      <td style={{ padding: '12px 16px' }}>{getStatusBadge(rfq.status)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleEditRfq(rfq)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                          {rfq.status === 'DRAFT' && (
                            <button onClick={() => handleIssueRfq(rfq.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#059669', background: 'none', border: 'none', cursor: 'pointer' }}>Issue</button>
                          )}
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'rfq', id: rfq.id, name: rfq.rfq_number })} style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingSupplier ? 'Edit Supplier' : 'New Supplier'}</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Supplier Name *</label>
                <input
                  type="text"
                  value={supplierForm.supplier_name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, supplier_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Contact Person *</label>
                  <input
                    type="text"
                    value={supplierForm.contact_person}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Phone *</label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Email *</label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Address</label>
                <textarea
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Payment Terms (days)</label>
                  <input
                    type="number"
                    value={supplierForm.payment_terms}
                    onChange={(e) => setSupplierForm({ ...supplierForm, payment_terms: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>BBBEE Level</label>
                  <select
                    value={supplierForm.bbbee_level}
                    onChange={(e) => setSupplierForm({ ...supplierForm, bbbee_level: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
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
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={supplierForm.is_active}
                    onChange={(e) => setSupplierForm({ ...supplierForm, is_active: e.target.checked })}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Active</span>
                </label>
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, backgroundColor: 'white' }}>
              <button
                onClick={() => setShowSupplierModal(false)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSupplier}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                {editingSupplier ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PURCHASE ORDER MODAL */}
      {showPoModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingPo ? 'Edit Purchase Order' : 'New Purchase Order'}</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Supplier ID *</label>
                <input
                  type="number"
                  value={poForm.supplier_id}
                  onChange={(e) => setPoForm({ ...poForm, supplier_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Order Date *</label>
                  <input
                    type="date"
                    value={poForm.order_date}
                    onChange={(e) => setPoForm({ ...poForm, order_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Delivery Date *</label>
                  <input
                    type="date"
                    value={poForm.delivery_date}
                    onChange={(e) => setPoForm({ ...poForm, delivery_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Total Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={poForm.total_amount}
                  onChange={(e) => setPoForm({ ...poForm, total_amount: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, backgroundColor: 'white' }}>
              <button
                onClick={() => setShowPoModal(false)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePo}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                {editingPo ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RFQ MODAL */}
      {showRfqModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingRfq ? 'Edit RFQ' : 'New RFQ'}</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Title *</label>
                <input
                  type="text"
                  value={rfqForm.title}
                  onChange={(e) => setRfqForm({ ...rfqForm, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Description</label>
                <textarea
                  value={rfqForm.description}
                  onChange={(e) => setRfqForm({ ...rfqForm, description: e.target.value })}
                  rows={4}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Issue Date *</label>
                  <input
                    type="date"
                    value={rfqForm.issue_date}
                    onChange={(e) => setRfqForm({ ...rfqForm, issue_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Closing Date *</label>
                  <input
                    type="date"
                    value={rfqForm.closing_date}
                    onChange={(e) => setRfqForm({ ...rfqForm, closing_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, backgroundColor: 'white' }}>
              <button
                onClick={() => setShowRfqModal(false)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRfq}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
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
        onCancel={() => setDeleteConfirm({ show: false, type: 'supplier', id: 0, name: '' })}
      />
    </div>
  );
};

export default ProcurementDashboard;
