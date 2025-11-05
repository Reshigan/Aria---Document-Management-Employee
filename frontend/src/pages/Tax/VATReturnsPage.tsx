import { useState, useEffect } from 'react';
import { Plus, FileText, DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';

interface VATReturn {
  id: number;
  return_number: string;
  period_start: string;
  period_end: string;
  output_tax: number;
  input_tax: number;
  net_vat: number;
  status: string;
  filing_date?: string;
  payment_date?: string;
}

export default function VATReturnsPage() {
  const [returns, setReturns] = useState<VATReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    period_start: '',
    period_end: '',
    filing_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await fetch('/api/vat/returns', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setReturns(data);
      }
    } catch (error) {
      console.error('Failed to fetch VAT returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/vat/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowModal(false);
        setFormData({
          period_start: '',
          period_end: '',
          filing_date: new Date().toISOString().split('T')[0]
        });
        fetchReturns();
      }
    } catch (error) {
      console.error('Failed to create VAT return:', error);
    }
  };

  const handleFileReturn = async (id: number) => {
    try {
      const response = await fetch(`/api/vat/returns/${id}/file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchReturns();
      }
    } catch (error) {
      console.error('Failed to file VAT return:', error);
    }
  };

  const totalOutput = returns.reduce((sum, r) => sum + r.output_tax, 0);
  const totalInput = returns.reduce((sum, r) => sum + r.input_tax, 0);
  const totalNet = returns.reduce((sum, r) => sum + r.net_vat, 0);
  const pendingCount = returns.filter(r => r.status === 'DRAFT').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FILED': return { bg: '#d1fae5', color: '#059669' };
      case 'DRAFT': return { bg: '#e5e7eb', color: '#6b7280' };
      case 'PAID': return { bg: '#dbeafe', color: '#2563eb' };
      default: return { bg: '#fef3c7', color: '#d97706' };
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>VAT Returns</h1>
          <p style={{ color: '#6b7280' }}>Manage VAT returns and submissions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <Plus size={20} />
          New VAT Return
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: '#d1fae5', borderRadius: '8px' }}>
              <TrendingUp size={24} style={{ color: '#059669' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Output Tax</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                R {totalOutput.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: '#dbeafe', borderRadius: '8px' }}>
              <DollarSign size={24} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Input Tax</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                R {totalInput.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: totalNet >= 0 ? '#fee2e2' : '#d1fae5', borderRadius: '8px' }}>
              <FileText size={24} style={{ color: totalNet >= 0 ? '#dc2626' : '#059669' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Net VAT {totalNet >= 0 ? 'Payable' : 'Refund'}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                R {Math.abs(totalNet).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '8px' }}>
              <Calendar size={24} style={{ color: '#d97706' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Pending Returns</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {pendingCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Return Number</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Period</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Output Tax</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Input Tax</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Net VAT</th>
              <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {returns.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                  <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <div>No VAT returns found</div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Create your first VAT return to get started</div>
                </td>
              </tr>
            ) : (
              returns.map((vatReturn) => {
                const statusStyle = getStatusColor(vatReturn.status);
                return (
                  <tr key={vatReturn.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{vatReturn.return_number}</td>
                    <td style={{ padding: '1rem', color: '#6b7280' }}>
                      {new Date(vatReturn.period_start).toLocaleDateString('en-ZA')} - {new Date(vatReturn.period_end).toLocaleDateString('en-ZA')}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#059669' }}>
                      R {vatReturn.output_tax.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#2563eb' }}>
                      R {vatReturn.input_tax.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '500', color: vatReturn.net_vat >= 0 ? '#dc2626' : '#059669' }}>
                      R {vatReturn.net_vat.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {vatReturn.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        {vatReturn.status === 'DRAFT' && (
                          <button
                            onClick={() => handleFileReturn(vatReturn.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#dbeafe',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: '#2563eb',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}
                          >
                            File Return
                          </button>
                        )}
                        <button
                          style={{
                            padding: '0.5rem',
                            background: '#f3f4f6',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#6b7280'
                          }}
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
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
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            width: '90%',
            maxWidth: '600px'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              New VAT Return
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                      Period Start *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.period_start}
                      onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                      Period End *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.period_end}
                      onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Filing Date
                  </label>
                  <input
                    type="date"
                    value={formData.filing_date}
                    onChange={(e) => setFormData({ ...formData, filing_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Create VAT Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
