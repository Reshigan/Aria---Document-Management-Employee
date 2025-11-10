import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Eye, DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface Receipt {
  id: string;
  receipt_number: string;
  customer_id: string;
  customer_name?: string;
  payment_date: string;
  bank_account_id: string;
  payment_method: string;
  reference?: string;
  amount: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ReceiptStats {
  total_receipts: number;
  total_amount: number;
  posted_count: number;
  posted_amount: number;
  draft_count: number;
  draft_amount: number;
}

export default function Receipts() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [stats, setStats] = useState<ReceiptStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReceipts();
  }, [searchTerm, statusFilter]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await axios.get('/api/ar/receipts', { params });
      setReceipts(response.data);
      
      const totalAmount = response.data.reduce((sum: number, r: Receipt) => sum + r.amount, 0);
      const postedReceipts = response.data.filter((r: Receipt) => r.status === 'posted');
      const postedAmount = postedReceipts.reduce((sum: number, r: Receipt) => sum + r.amount, 0);
      const draftReceipts = response.data.filter((r: Receipt) => r.status === 'draft');
      const draftAmount = draftReceipts.reduce((sum: number, r: Receipt) => sum + r.amount, 0);

      setStats({
        total_receipts: response.data.length,
        total_amount: totalAmount,
        posted_count: postedReceipts.length,
        posted_amount: postedAmount,
        draft_count: draftReceipts.length,
        draft_amount: draftAmount
      });

      setError(null);
    } catch (error: any) {
      console.error('Error fetching receipts:', error);
      setError(error.response?.data?.detail || 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (receipt: Receipt) => {
    navigate(`/ar/receipts/${receipt.id}`);
  };

  const handleCreateNew = () => {
    navigate('/ar/receipts/new');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      posted: 'bg-green-100 text-green-800',
      void: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      cheque: 'Cheque',
      eft: 'EFT',
      card: 'Card',
    };
    return labels[method] || method;
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = !searchTerm || 
      receipt.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Customer Receipts</h1>
          <p style={{ color: '#6b7280' }}>Manage customer payments and allocations</p>
        </div>
        <button
          onClick={handleCreateNew}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <Plus size={20} />
          New Receipt
        </button>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          background: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '0.5rem',
          color: '#dc2626'
        }}>
          {error}
        </div>
      )}

      {/* Summary Stats */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            padding: '1.5rem',
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ padding: '0.75rem', background: '#dbeafe', borderRadius: '0.5rem' }}>
                <DollarSign size={24} style={{ color: '#2563eb' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Receipts</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {stats.total_receipts}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              R {stats.total_amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{
            padding: '1.5rem',
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ padding: '0.75rem', background: '#d1fae5', borderRadius: '0.5rem' }}>
                <CheckCircle size={24} style={{ color: '#059669' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Posted</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {stats.posted_count}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              R {stats.posted_amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{
            padding: '1.5rem',
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ padding: '0.75rem', background: '#e5e7eb', borderRadius: '0.5rem' }}>
                <Clock size={24} style={{ color: '#6b7280' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Draft</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {stats.draft_count}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              R {stats.draft_amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{
            padding: '1.5rem',
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '0.5rem' }}>
                <TrendingUp size={24} style={{ color: '#d97706' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Avg Receipt</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  R {stats.total_receipts > 0 ? (stats.total_amount / stats.total_receipts).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </div>
              </div>
            </div>
          </div>
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
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            type="text"
            placeholder="Search by receipt number, customer, or reference..."
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
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="posted">Posted</option>
          <option value="void">Void</option>
        </select>
      </div>

      {/* Receipts Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading receipts...</div>
      ) : filteredReceipts.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: '#6b7280' }}>No receipts found</p>
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
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Customer</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Payment Date</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Method</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Reference</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>{receipt.receipt_number}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{receipt.customer_name || `Customer ${receipt.customer_id}`}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{new Date(receipt.payment_date).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{getPaymentMethodLabel(receipt.payment_method)}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>{receipt.reference || '-'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: '500' }}>
                    R {receipt.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
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
                    <button
                      onClick={() => handleViewDetail(receipt)}
                      style={{
                        padding: '0.5rem',
                        background: '#dbeafe',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        color: '#2563eb'
                      }}
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
