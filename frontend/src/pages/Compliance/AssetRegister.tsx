import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Package, DollarSign, TrendingDown, Calendar } from 'lucide-react';

interface Asset {
  id: number;
  asset_number: string;
  name: string;
  category: string;
  location: string;
  purchase_date: string;
  purchase_cost: number;
  useful_life: number;
  depreciation_method: 'STRAIGHT_LINE' | 'REDUCING_BALANCE';
  accumulated_depreciation: number;
  book_value: number;
  status: 'ACTIVE' | 'DISPOSED' | 'WRITTEN_OFF' | 'UNDER_MAINTENANCE';
}

const AssetRegister: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([
    { id: 1, asset_number: 'FA-2024-001', name: 'Dell Server R740', category: 'IT Equipment', location: 'Server Room', purchase_date: '2024-03-15', purchase_cost: 185000, useful_life: 5, depreciation_method: 'STRAIGHT_LINE', accumulated_depreciation: 68500, book_value: 116500, status: 'ACTIVE' },
    { id: 2, asset_number: 'FA-2024-002', name: 'Toyota Hilux', category: 'Vehicles', location: 'Parking Lot', purchase_date: '2024-06-01', purchase_cost: 520000, useful_life: 5, depreciation_method: 'REDUCING_BALANCE', accumulated_depreciation: 156000, book_value: 364000, status: 'ACTIVE' },
    { id: 3, asset_number: 'FA-2023-015', name: 'Office Furniture Set', category: 'Furniture', location: 'Floor 2', purchase_date: '2023-01-10', purchase_cost: 85000, useful_life: 10, depreciation_method: 'STRAIGHT_LINE', accumulated_depreciation: 17000, book_value: 68000, status: 'ACTIVE' },
    { id: 4, asset_number: 'FA-2022-008', name: 'CNC Machine', category: 'Machinery', location: 'Factory Floor', purchase_date: '2022-08-20', purchase_cost: 1250000, useful_life: 10, depreciation_method: 'STRAIGHT_LINE', accumulated_depreciation: 312500, book_value: 937500, status: 'UNDER_MAINTENANCE' },
    { id: 5, asset_number: 'FA-2021-003', name: 'Old Printer', category: 'IT Equipment', location: 'Storage', purchase_date: '2021-02-15', purchase_cost: 25000, useful_life: 5, depreciation_method: 'STRAIGHT_LINE', accumulated_depreciation: 25000, book_value: 0, status: 'WRITTEN_OFF' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', location: '', purchase_date: '', purchase_cost: '', useful_life: '', depreciation_method: 'STRAIGHT_LINE' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      ACTIVE: { bg: '#dcfce7', text: '#166534' },
      DISPOSED: { bg: '#f3f4f6', text: '#374151' },
      WRITTEN_OFF: { bg: '#fee2e2', text: '#991b1b' },
      UNDER_MAINTENANCE: { bg: '#fef3c7', text: '#92400e' }
    };
    const c = config[status] || config.ACTIVE;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status.replace('_', ' ')}</span>;
  };

  const handleCreate = () => {
    setForm({ name: '', category: '', location: '', purchase_date: '', purchase_cost: '', useful_life: '', depreciation_method: 'STRAIGHT_LINE' });
    setShowModal(true);
  };

  const handleSave = () => {
    const cost = parseFloat(form.purchase_cost) || 0;
    const newAsset: Asset = {
      id: Date.now(),
      asset_number: `FA-2026-${String(assets.length + 1).padStart(3, '0')}`,
      name: form.name,
      category: form.category,
      location: form.location,
      purchase_date: form.purchase_date,
      purchase_cost: cost,
      useful_life: parseInt(form.useful_life) || 5,
      depreciation_method: form.depreciation_method as Asset['depreciation_method'],
      accumulated_depreciation: 0,
      book_value: cost,
      status: 'ACTIVE'
    };
    setAssets([newAsset, ...assets]);
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      setAssets(assets.filter(a => a.id !== id));
    }
  };

  const totalCost = assets.reduce((acc, a) => acc + a.purchase_cost, 0);
  const totalBookValue = assets.reduce((acc, a) => acc + a.book_value, 0);
  const totalDepreciation = assets.reduce((acc, a) => acc + a.accumulated_depreciation, 0);
  const activeAssets = assets.filter(a => a.status === 'ACTIVE').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Fixed Asset Register</h1>
        <p style={{ color: '#6b7280' }}>Track and manage company fixed assets</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Package size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Assets</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{assets.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Cost</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalCost)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Book Value</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{formatCurrency(totalBookValue)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><TrendingDown size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Acc. Depreciation</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(totalDepreciation)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Asset List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> Add Asset
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Asset</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Category</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Location</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Cost</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Depreciation</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Book Value</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{asset.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{asset.asset_number}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{asset.category}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{asset.location}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(asset.purchase_cost)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#ef4444', textAlign: 'right' }}>({formatCurrency(asset.accumulated_depreciation)})</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold', color: '#2563eb', textAlign: 'right' }}>{formatCurrency(asset.book_value)}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(asset.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(asset.id)} style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Add Fixed Asset</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Asset Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Category *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Category</option>
                    <option value="IT Equipment">IT Equipment</option>
                    <option value="Vehicles">Vehicles</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Machinery">Machinery</option>
                    <option value="Buildings">Buildings</option>
                    <option value="Land">Land</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Location *</label>
                  <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Purchase Date *</label>
                  <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Purchase Cost (ZAR) *</label>
                  <input type="number" value={form.purchase_cost} onChange={(e) => setForm({ ...form, purchase_cost: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Useful Life (years) *</label>
                  <input type="number" value={form.useful_life} onChange={(e) => setForm({ ...form, useful_life: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Depreciation Method *</label>
                  <select value={form.depreciation_method} onChange={(e) => setForm({ ...form, depreciation_method: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="STRAIGHT_LINE">Straight Line</option>
                    <option value="REDUCING_BALANCE">Reducing Balance</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Add Asset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetRegister;
