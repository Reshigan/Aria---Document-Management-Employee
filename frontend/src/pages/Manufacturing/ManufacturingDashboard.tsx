import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import ConfirmDialog from '../../components/ConfirmDialog';

interface BOM {
  id: number;
  bom_code: string;
  product_id: number;
  product_name?: string;
  version: number;
  quantity: number;
  unit_of_measure: string;
  is_active: boolean;
  created_at: string;
}

interface WorkOrder {
  id: number;
  work_order_code: string;
  bom_id: number;
  bom_code?: string;
  product_id: number;
  product_name?: string;
  quantity_to_produce: number;
  quantity_produced: number;
  status: 'DRAFT' | 'RELEASED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduled_start_date: string;
  scheduled_end_date: string;
  actual_start_date?: string;
  actual_end_date?: string;
  created_at: string;
}

const ManufacturingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'boms' | 'work_orders'>('boms');
  
  const [boms, setBoms] = useState<BOM[]>([]);
  const [bomsLoading, setBomsLoading] = useState(false);
  const [bomsSearch, setBomsSearch] = useState('');
  const [showBomModal, setShowBomModal] = useState(false);
  const [editingBom, setEditingBom] = useState<BOM | null>(null);
  const [bomForm, setBomForm] = useState({
    product_id: '',
    version: '1',
    quantity: '1',
    unit_of_measure: 'EA',
    is_active: true
  });
  
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [workOrdersLoading, setWorkOrdersLoading] = useState(false);
  const [workOrdersSearch, setWorkOrdersSearch] = useState('');
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const [workOrderForm, setWorkOrderForm] = useState({
    bom_id: '',
    product_id: '',
    quantity_to_produce: '',
    scheduled_start_date: '',
    scheduled_end_date: ''
  });
  
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: 'bom' | 'work_order';
    id: number;
    name: string;
  }>({ show: false, type: 'bom', id: 0, name: '' });
  
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'boms') loadBoms();
    else if (activeTab === 'work_orders') loadWorkOrders();
  }, [activeTab]);

  const loadBoms = async () => {
    setBomsLoading(true);
    setError('');
    try {
      const response = await api.get('/erp/manufacturing/boms');
      setBoms(response.data.boms || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load BOMs');
    } finally {
      setBomsLoading(false);
    }
  };

  const handleCreateBom = () => {
    setEditingBom(null);
    setBomForm({
      product_id: '',
      version: '1',
      quantity: '1',
      unit_of_measure: 'EA',
      is_active: true
    });
    setShowBomModal(true);
  };

  const handleEditBom = (bom: BOM) => {
    setEditingBom(bom);
    setBomForm({
      product_id: bom.product_id.toString(),
      version: bom.version.toString(),
      quantity: bom.quantity.toString(),
      unit_of_measure: bom.unit_of_measure,
      is_active: bom.is_active
    });
    setShowBomModal(true);
  };

  const handleSaveBom = async () => {
    setError('');
    try {
      const payload = {
        ...bomForm,
        product_id: parseInt(bomForm.product_id),
        version: parseInt(bomForm.version),
        quantity: parseFloat(bomForm.quantity)
      };
      
      if (editingBom) {
        await api.put(`/erp/manufacturing/boms/${editingBom.id}`, payload);
      } else {
        await api.post('/erp/manufacturing/boms', payload);
      }
      setShowBomModal(false);
      loadBoms();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save BOM');
    }
  };

  const handleDeleteBom = async (id: number) => {
    try {
      await api.delete(`/erp/manufacturing/boms/${id}`);
      loadBoms();
      setDeleteConfirm({ show: false, type: 'bom', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete BOM');
    }
  };

  const loadWorkOrders = async () => {
    setWorkOrdersLoading(true);
    setError('');
    try {
      const response = await api.get('/erp/manufacturing/work-orders');
      setWorkOrders(response.data.work_orders || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load work orders');
    } finally {
      setWorkOrdersLoading(false);
    }
  };

  const handleCreateWorkOrder = () => {
    setEditingWorkOrder(null);
    setWorkOrderForm({
      bom_id: '',
      product_id: '',
      quantity_to_produce: '',
      scheduled_start_date: '',
      scheduled_end_date: ''
    });
    setShowWorkOrderModal(true);
  };

  const handleEditWorkOrder = (wo: WorkOrder) => {
    setEditingWorkOrder(wo);
    setWorkOrderForm({
      bom_id: wo.bom_id.toString(),
      product_id: wo.product_id.toString(),
      quantity_to_produce: wo.quantity_to_produce.toString(),
      scheduled_start_date: wo.scheduled_start_date,
      scheduled_end_date: wo.scheduled_end_date
    });
    setShowWorkOrderModal(true);
  };

  const handleSaveWorkOrder = async () => {
    setError('');
    try {
      const payload = {
        ...workOrderForm,
        bom_id: parseInt(workOrderForm.bom_id),
        product_id: parseInt(workOrderForm.product_id),
        quantity_to_produce: parseFloat(workOrderForm.quantity_to_produce)
      };
      
      if (editingWorkOrder) {
        await api.put(`/erp/manufacturing/work-orders/${editingWorkOrder.id}`, payload);
      } else {
        await api.post('/erp/manufacturing/work-orders', payload);
      }
      setShowWorkOrderModal(false);
      loadWorkOrders();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save work order');
    }
  };

  const handleDeleteWorkOrder = async (id: number) => {
    try {
      await api.delete(`/erp/manufacturing/work-orders/${id}`);
      loadWorkOrders();
      setDeleteConfirm({ show: false, type: 'work_order', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete work order');
    }
  };

  const handleReleaseWorkOrder = async (woId: number) => {
    try {
      await api.post(`/erp/manufacturing/work-orders/${woId}/release`);
      loadWorkOrders();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to release work order');
    }
  };

  const handleStartWorkOrder = async (woId: number) => {
    try {
      await api.post(`/erp/manufacturing/work-orders/${woId}/start`);
      loadWorkOrders();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start work order');
    }
  };

  const handleCompleteWorkOrder = async (woId: number) => {
    try {
      await api.post(`/erp/manufacturing/work-orders/${woId}/complete`);
      loadWorkOrders();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to complete work order');
    }
  };

  const filteredBoms = boms.filter(b =>
    b.bom_code.toLowerCase().includes(bomsSearch.toLowerCase()) ||
    b.product_name?.toLowerCase().includes(bomsSearch.toLowerCase())
  );

  const filteredWorkOrders = workOrders.filter(wo =>
    wo.work_order_code.toLowerCase().includes(workOrdersSearch.toLowerCase()) ||
    wo.product_name?.toLowerCase().includes(workOrdersSearch.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151' },
      RELEASED: { bg: '#dbeafe', text: '#1e40af' },
      IN_PROGRESS: { bg: '#fef3c7', text: '#92400e' },
      COMPLETED: { bg: '#dcfce7', text: '#166534' },
      CANCELLED: { bg: '#fee2e2', text: '#991b1b' }
    };
    const color = colors[status] || { bg: '#f3f4f6', text: '#374151' };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: color.bg, color: color.text }}>{status.replace('_', ' ')}</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Manufacturing</h1>
        <p style={{ color: '#6b7280' }}>Manage BOMs, work orders, and production planning</p>
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
            onClick={() => setActiveTab('boms')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'boms' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'boms' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            BOMs ({boms.length})
          </button>
          <button
            onClick={() => setActiveTab('work_orders')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'work_orders' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'work_orders' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Work Orders ({workOrders.length})
          </button>
        </div>
      </div>

      {/* BOMS TAB */}
      {activeTab === 'boms' && (
        <div>
          {/* Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search BOMs..."
              value={bomsSearch}
              onChange={(e) => setBomsSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '300px' }}
            />
            <button
              onClick={handleCreateBom}
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              + New BOM
            </button>
          </div>

          {/* BOMs Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>BOM Code</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Product</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Version</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Quantity</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>UOM</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Active</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bomsLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading BOMs...</td>
                  </tr>
                ) : filteredBoms.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No BOMs found</td>
                  </tr>
                ) : (
                  filteredBoms.map((bom) => (
                    <tr key={bom.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{bom.bom_code}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{bom.product_name || `Product #${bom.product_id}`}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>v{bom.version}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{bom.quantity}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{bom.unit_of_measure}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: bom.is_active ? '#dcfce7' : '#fee2e2', color: bom.is_active ? '#166534' : '#991b1b' }}>
                          {bom.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleEditBom(bom)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'bom', id: bom.id, name: bom.bom_code })} style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
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

      {/* WORK ORDERS TAB */}
      {activeTab === 'work_orders' && (
        <div>
          {/* Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search work orders..."
              value={workOrdersSearch}
              onChange={(e) => setWorkOrdersSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '300px' }}
            />
            <button
              onClick={handleCreateWorkOrder}
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              + New Work Order
            </button>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Work Orders</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{workOrders.length}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>In Progress</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                {workOrders.filter(wo => wo.status === 'IN_PROGRESS').length}
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Completed</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                {workOrders.filter(wo => wo.status === 'COMPLETED').length}
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Draft</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280' }}>
                {workOrders.filter(wo => wo.status === 'DRAFT').length}
              </div>
            </div>
          </div>

          {/* Work Orders Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>WO Code</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Product</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Qty to Produce</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Qty Produced</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Start Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workOrdersLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading work orders...</td>
                  </tr>
                ) : filteredWorkOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No work orders found</td>
                  </tr>
                ) : (
                  filteredWorkOrders.map((wo) => (
                    <tr key={wo.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{wo.work_order_code}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{wo.product_name || `Product #${wo.product_id}`}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{wo.quantity_to_produce}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{wo.quantity_produced}</td>
                      <td style={{ padding: '12px 16px' }}>{getStatusBadge(wo.status)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatDate(wo.scheduled_start_date)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button onClick={() => handleEditWorkOrder(wo)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                          {wo.status === 'DRAFT' && (
                            <button onClick={() => handleReleaseWorkOrder(wo.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#059669', background: 'none', border: 'none', cursor: 'pointer' }}>Release</button>
                          )}
                          {wo.status === 'RELEASED' && (
                            <button onClick={() => handleStartWorkOrder(wo.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer' }}>Start</button>
                          )}
                          {wo.status === 'IN_PROGRESS' && (
                            <button onClick={() => handleCompleteWorkOrder(wo.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#059669', background: 'none', border: 'none', cursor: 'pointer' }}>Complete</button>
                          )}
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'work_order', id: wo.id, name: wo.work_order_code })} style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
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

      {/* BOM MODAL */}
      {showBomModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingBom ? 'Edit BOM' : 'New BOM'}</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Product ID *</label>
                  <input
                    type="number"
                    value={bomForm.product_id}
                    onChange={(e) => setBomForm({ ...bomForm, product_id: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Version *</label>
                  <input
                    type="number"
                    value={bomForm.version}
                    onChange={(e) => setBomForm({ ...bomForm, version: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={bomForm.quantity}
                    onChange={(e) => setBomForm({ ...bomForm, quantity: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Unit of Measure</label>
                  <select
                    value={bomForm.unit_of_measure}
                    onChange={(e) => setBomForm({ ...bomForm, unit_of_measure: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="EA">Each (EA)</option>
                    <option value="KG">Kilogram (KG)</option>
                    <option value="L">Liter (L)</option>
                    <option value="M">Meter (M)</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={bomForm.is_active}
                    onChange={(e) => setBomForm({ ...bomForm, is_active: e.target.checked })}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Active</span>
                </label>
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, backgroundColor: 'white' }}>
              <button
                onClick={() => setShowBomModal(false)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBom}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                {editingBom ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WORK ORDER MODAL */}
      {showWorkOrderModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingWorkOrder ? 'Edit Work Order' : 'New Work Order'}</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>BOM ID *</label>
                  <input
                    type="number"
                    value={workOrderForm.bom_id}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, bom_id: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Product ID *</label>
                  <input
                    type="number"
                    value={workOrderForm.product_id}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, product_id: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Quantity to Produce *</label>
                <input
                  type="number"
                  step="0.01"
                  value={workOrderForm.quantity_to_produce}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, quantity_to_produce: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Scheduled Start Date *</label>
                  <input
                    type="date"
                    value={workOrderForm.scheduled_start_date}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, scheduled_start_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Scheduled End Date *</label>
                  <input
                    type="date"
                    value={workOrderForm.scheduled_end_date}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, scheduled_end_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, backgroundColor: 'white' }}>
              <button
                onClick={() => setShowWorkOrderModal(false)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWorkOrder}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                {editingWorkOrder ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title={`Delete ${deleteConfirm.type.replace('_', ' ')}`}
        message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteConfirm.type === 'bom') handleDeleteBom(deleteConfirm.id);
          else if (deleteConfirm.type === 'work_order') handleDeleteWorkOrder(deleteConfirm.id);
        }}
        onCancel={() => setDeleteConfirm({ show: false, type: 'bom', id: 0, name: '' })}
      />
    </div>
  );
};

export default ManufacturingDashboard;
