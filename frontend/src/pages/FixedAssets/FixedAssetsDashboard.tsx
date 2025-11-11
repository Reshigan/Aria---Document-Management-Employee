import { useState, useEffect } from 'react';
import { FolderOpen, Plus, Search, TrendingDown, DollarSign, Package } from 'lucide-react';
import api from '../../lib/api';

interface AssetCategory {
  id: string;
  code: string;
  name: string;
  depreciation_method: string;
  useful_life_years: number;
}

interface FixedAsset {
  id: string;
  asset_number: string;
  category_name: string;
  description: string;
  acquisition_date: string;
  acquisition_cost: number;
  accumulated_depreciation: number;
  book_value: number;
  status: string;
}

interface AssetsSummary {
  total_assets: number;
  total_cost: number;
  total_depreciation: number;
  total_book_value: number;
}

export default function FixedAssetsDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [summary, setSummary] = useState<AssetsSummary>({
    total_assets: 0,
    total_cost: 0,
    total_depreciation: 0,
    total_book_value: 0
  });
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    category_id: '',
    description: '',
    acquisition_date: new Date().toISOString().split('T')[0],
    acquisition_cost: '',
    location: '',
    serial_number: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetsRes, categoriesRes, summaryRes] = await Promise.all([
        api.get('/erp/fixed-assets/assets'),
        api.get('/erp/fixed-assets/categories'),
        api.get('/erp/fixed-assets/summary')
      ]);
      setAssets(assetsRes.data || []);
      setCategories(categoriesRes.data || []);
      setSummary(summaryRes.data || {
        total_assets: 0,
        total_cost: 0,
        total_depreciation: 0,
        total_book_value: 0
      });
    } catch (error) {
      console.error('Failed to load fixed assets data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async () => {
    try {
      await api.post('/erp/fixed-assets/assets', {
        ...newAsset,
        acquisition_cost: parseFloat(newAsset.acquisition_cost)
      });
      setShowAddModal(false);
      setNewAsset({
        category_id: '',
        description: '',
        acquisition_date: new Date().toISOString().split('T')[0],
        acquisition_cost: '',
        location: '',
        serial_number: ''
      });
      loadData();
    } catch (error) {
      console.error('Failed to add asset:', error);
      alert('Failed to add asset. Please try again.');
    }
  };

  const filteredAssets = assets.filter(asset =>
    asset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.asset_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FolderOpen size={32} style={{ color: '#64748b' }} />
          Fixed Assets
        </h1>
        <p style={{ color: '#6b7280' }}>Manage fixed assets, depreciation, and asset disposals</p>
      </div>

      {/* Action Bar */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        padding: '1.5rem',
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 1rem 0.5rem 2.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '0.5rem 1.5rem',
            background: '#64748b',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Plus size={16} />
          Add Asset
        </button>
      </div>

      {/* Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Package size={20} style={{ color: '#64748b' }} />
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Assets</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#64748b' }}>{summary.total_assets}</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <DollarSign size={20} style={{ color: '#10b981' }} />
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Book Value</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(summary.total_book_value)}</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TrendingDown size={20} style={{ color: '#ef4444' }} />
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Accumulated Depreciation</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(summary.total_depreciation)}</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <DollarSign size={20} style={{ color: '#3b82f6' }} />
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Cost</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{formatCurrency(summary.total_cost)}</div>
        </div>
      </div>

      {/* Assets Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#6b7280' }}>Loading assets...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <FolderOpen size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No fixed assets yet</h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Start by adding your first fixed asset to track depreciation and book value
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '0.5rem 1.5rem',
              background: '#64748b',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Add Your First Asset
          </button>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Asset Number</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Category</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Acquisition Cost</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Depreciation</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Book Value</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Acquisition Date</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => (
                <tr key={asset.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem', fontWeight: '500', color: '#111827' }}>{asset.asset_number}</td>
                  <td style={{ padding: '1rem', color: '#374151' }}>{asset.description}</td>
                  <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>{asset.category_name}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', color: '#374151' }}>{formatCurrency(asset.acquisition_cost)}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', color: '#ef4444' }}>{formatCurrency(asset.accumulated_depreciation)}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '500', color: '#10b981' }}>{formatCurrency(asset.book_value)}</td>
                  <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>{formatDate(asset.acquisition_date)}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      background: asset.status === 'active' ? '#d1fae5' : '#fee2e2',
                      color: asset.status === 'active' ? '#065f46' : '#991b1b'
                    }}>
                      {asset.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Add Fixed Asset</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Category *
              </label>
              <select
                value={newAsset.category_id}
                onChange={(e) => setNewAsset({ ...newAsset, category_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">Select category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Description *
              </label>
              <input
                type="text"
                value={newAsset.description}
                onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Acquisition Date *
              </label>
              <input
                type="date"
                value={newAsset.acquisition_date}
                onChange={(e) => setNewAsset({ ...newAsset, acquisition_date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Acquisition Cost *
              </label>
              <input
                type="number"
                step="0.01"
                value={newAsset.acquisition_cost}
                onChange={(e) => setNewAsset({ ...newAsset, acquisition_cost: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Location
              </label>
              <input
                type="text"
                value={newAsset.location}
                onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Serial Number
              </label>
              <input
                type="text"
                value={newAsset.serial_number}
                onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '0.5rem 1.5rem',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddAsset}
                disabled={!newAsset.category_id || !newAsset.description || !newAsset.acquisition_cost}
                style={{
                  padding: '0.5rem 1.5rem',
                  background: '#64748b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: newAsset.category_id && newAsset.description && newAsset.acquisition_cost ? 'pointer' : 'not-allowed',
                  opacity: newAsset.category_id && newAsset.description && newAsset.acquisition_cost ? 1 : 0.5
                }}
              >
                Add Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
