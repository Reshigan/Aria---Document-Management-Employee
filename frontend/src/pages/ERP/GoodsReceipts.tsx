import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Plus, Search, Eye, Check, Package } from 'lucide-react';

interface GoodsReceipt {
  id: string;
  receipt_number: string;
  purchase_order_id?: string;
  supplier_id: string;
  supplier_name: string;
  receipt_date: string;
  warehouse_id?: string;
  status: string;
  received_by?: string;
  lines?: GRLine[];
}

interface GRLine {
  id: string;
  purchase_order_line_id?: string;
  product_id: string;
  description: string;
  quantity_received: number;
  storage_location_id?: string;
}

export default function GoodsReceipts() {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReceipts();
  }, [searchTerm, statusFilter]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/procure-to-pay/goods-receipts');
      setReceipts(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading goods receipts:', err);
      setError(err.response?.data?.detail || 'Failed to load goods receipts');
    } finally {
      setLoading(false);
    }
  };

  const postReceipt = async (receiptId: string) => {
    try {
      await api.post(`/erp/procure-to-pay/goods-receipts/${receiptId}/post`);
      loadReceipts();
    } catch (err: any) {
      console.error('Error posting receipt:', err);
      setError(err.response?.data?.detail || 'Failed to post goods receipt');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      posted: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = !searchTerm || 
      receipt.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || receipt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Goods Receipts</h1>
        <p style={{ color: '#6b7280' }}>Manage incoming goods and inventory receipts</p>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          color: '#991b1b'
        }}>
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        padding: '1.5rem',
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <input
          type="text"
          placeholder="Search by receipt number or supplier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            minWidth: '150px'
          }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="posted">Posted</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          onClick={() => {/* TODO: Open create modal */}}
          style={{
            padding: '0.5rem 1.5rem',
            background: '#2563eb',
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
          Create Receipt
        </button>
      </div>

      {/* Goods Receipts Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading goods receipts...</div>
      ) : filteredReceipts.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: '#6b7280' }}>No goods receipts found</p>
        </div>
      ) : (
        <div style={{ 
          background: 'white', 
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Receipt #</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Supplier</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Receipt Date</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>{receipt.receipt_number}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{receipt.supplier_name}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{new Date(receipt.receipt_date).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }} className={getStatusColor(receipt.status)}>
                      {receipt.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {receipt.status === 'draft' && (
                        <button
                          onClick={() => postReceipt(receipt.id)}
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Check size={12} />
                          Post
                        </button>
                      )}
                      <button
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '1rem',
        marginTop: '2rem'
      }}>
        {['draft', 'posted', 'cancelled'].map((status) => {
          const count = receipts.filter(r => r.status === status).length;
          return (
            <div key={status} style={{
              padding: '1.5rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'capitalize', marginBottom: '0.5rem' }}>
                {status} Receipts
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
