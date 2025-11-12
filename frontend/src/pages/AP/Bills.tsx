import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, FileText, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Bill {
  id: number;
  bill_number: string;
  supplier_id: number;
  supplier_name?: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  currency: string;
}

export default function Bills() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [formData, setFormData] = useState({
    supplier_id: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
    total_amount: 0,
    currency: 'ZAR'
  });

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await fetch('/api/ap/bills', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBills(data);
      }
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingBill 
        ? `/api/ap/bills/${editingBill.id}`
        : '/api/ap/bills';
      
      const method = editingBill ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowModal(false);
        setEditingBill(null);
        setFormData({
          supplier_id: '',
          bill_date: new Date().toISOString().split('T')[0],
          due_date: new Date().toISOString().split('T')[0],
          reference: '',
          description: '',
          total_amount: 0,
          currency: 'ZAR'
        });
        fetchBills();
      }
    } catch (error) {
      console.error('Failed to save bill:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bill?')) return;
    
    try {
      const response = await fetch(`/api/ap/bills/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchBills();
      }
    } catch (error) {
      console.error('Failed to delete bill:', error);
    }
  };

  const totalBills = bills.reduce((sum, bill) => sum + bill.total_amount, 0);
  const totalPaid = bills.reduce((sum, bill) => sum + bill.amount_paid, 0);
  const totalDue = bills.reduce((sum, bill) => sum + bill.amount_due, 0);
  const overdueCount = bills.filter(b => new Date(b.due_date) < new Date() && b.status !== 'PAID').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return { bg: '#d1fae5', color: '#059669' };
      case 'DRAFT': return { bg: '#e5e7eb', color: '#6b7280' };
      case 'APPROVED': return { bg: '#dbeafe', color: '#2563eb' };
      case 'OVERDUE': return { bg: '#fee2e2', color: '#dc2626' };
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
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Bills</h1>
          <p style={{ color: '#6b7280' }}>Manage supplier bills and payments</p>
        </div>
        <button
          onClick={() => navigate('/ap/bills/new')}
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
          New Bill
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: '#dbeafe', borderRadius: '8px' }}>
              <FileText size={24} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Bills</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                R {totalBills.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: '#d1fae5', borderRadius: '8px' }}>
              <CheckCircle size={24} style={{ color: '#059669' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Paid</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                R {totalPaid.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '8px' }}>
              <Clock size={24} style={{ color: '#d97706' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Outstanding</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                R {totalDue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: '#fee2e2', borderRadius: '8px' }}>
              <AlertCircle size={24} style={{ color: '#dc2626' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Overdue</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {overdueCount} {overdueCount === 1 ? 'Bill' : 'Bills'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Bill Number</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Supplier</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Bill Date</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Due Date</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Amount</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Amount Due</th>
              <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                  <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <div>No bills found</div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Create your first bill to get started</div>
                </td>
              </tr>
            ) : (
              bills.map((bill) => {
                const statusStyle = getStatusColor(bill.status);
                return (
                  <tr 
                    key={bill.id} 
                    style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                    onClick={() => navigate(`/ap/bills/${bill.id}`)}
                  >
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{bill.bill_number}</td>
                    <td style={{ padding: '1rem' }}>{bill.supplier_name || `Supplier ${bill.supplier_id}`}</td>
                    <td style={{ padding: '1rem', color: '#6b7280' }}>
                      {new Date(bill.bill_date).toLocaleDateString('en-ZA')}
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280' }}>
                      {new Date(bill.due_date).toLocaleDateString('en-ZA')}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '500' }}>
                      R {bill.total_amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#6b7280' }}>
                      R {bill.amount_due.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
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
                        {bill.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleDelete(bill.id)}
                          style={{
                            padding: '0.5rem',
                            background: '#fee2e2',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#dc2626'
                          }}
                        >
                          <Trash2 size={16} />
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
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              {editingBill ? 'Edit Bill' : 'New Bill'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Supplier ID *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                      Bill Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.bill_date}
                      onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
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
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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
                    Reference
                  </label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
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
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Total Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })}
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
                  onClick={() => {
                    setShowModal(false);
                    setEditingBill(null);
                  }}
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
                  {editingBill ? 'Update' : 'Create'} Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
