import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, FileText, X, DollarSign } from 'lucide-react';

interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  is_active: boolean;
  created_at?: string;
}

interface APInvoice {
  id: string;
  invoice_number: string;
  vendor_id: string;
  vendor_name?: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  description?: string;
  created_at?: string;
}

interface Payment {
  id: string;
  payment_number: string;
  vendor_id: string;
  vendor_name?: string;
  payment_date: string;
  payment_method: string;
  amount: number;
  reference?: string;
  status: string;
  created_at?: string;
}

interface AgingBucket {
  vendor_id: string;
  vendor_name: string;
  current: number;
  days_30: number;
  days_60: number;
  days_90: number;
  over_90: number;
  total: number;
}

export default function AccountsPayable() {
  const [activeTab, setActiveTab] = useState<'vendors' | 'invoices' | 'payments' | 'aging'>('vendors');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [invoices, setInvoices] = useState<APInvoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [aging, setAging] = useState<AgingBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateVendorModal, setShowCreateVendorModal] = useState(false);
  const [showEditVendorModal, setShowEditVendorModal] = useState(false);
  const [showDeleteVendorDialog, setShowDeleteVendorDialog] = useState(false);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showCreatePaymentModal, setShowCreatePaymentModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<APInvoice | null>(null);
  const [vendorFormData, setVendorFormData] = useState<Partial<Vendor>>({
    vendor_code: '',
    vendor_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    payment_terms: 'Net 30',
    is_active: true
  });
  const [invoiceFormData, setInvoiceFormData] = useState<Partial<APInvoice>>({
    invoice_number: '',
    vendor_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    total_amount: 0,
    description: ''
  });
  const [paymentFormData, setPaymentFormData] = useState<Partial<Payment>>({
    vendor_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'EFT',
    amount: 0,
    reference: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'vendors') {
      loadVendors();
    } else if (activeTab === 'invoices') {
      loadInvoices();
      loadVendors();
    } else if (activeTab === 'payments') {
      loadPayments();
      loadVendors();
    } else if (activeTab === 'aging') {
      loadAging();
    }
  }, [activeTab, searchTerm, statusFilter]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      
      const response = await api.get('/erp/ap/vendors', { params });
      setVendors(response.data.vendors || response.data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading vendors:', err);
      setError(err.response?.data?.detail || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      
      const response = await api.get('/erp/ap/invoices', { params });
      setInvoices(response.data.invoices || response.data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading invoices:', err);
      setError(err.response?.data?.detail || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/ap/payments');
      setPayments(response.data.payments || response.data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading payments:', err);
      setError(err.response?.data?.detail || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const loadAging = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/reports/ap-aging');
      setAging(response.data.aging || response.data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading aging report:', err);
      setError(err.response?.data?.detail || 'Failed to load aging report');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = () => {
    setVendorFormData({
      vendor_code: '',
      vendor_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      payment_terms: 'Net 30',
      is_active: true
    });
    setShowCreateVendorModal(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setVendorFormData({
      vendor_code: vendor.vendor_code,
      vendor_name: vendor.vendor_name,
      contact_person: vendor.contact_person,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      payment_terms: vendor.payment_terms,
      is_active: vendor.is_active
    });
    setShowEditVendorModal(true);
  };

  const handleDeleteVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowDeleteVendorDialog(true);
  };

  const confirmDeleteVendor = async () => {
    if (!selectedVendor) return;
    
    try {
      await api.delete(`/erp/ap/vendors/${selectedVendor.id}`);
      loadVendors();
      setSelectedVendor(null);
    } catch (err: any) {
      console.error('Error deleting vendor:', err);
      setError(err.response?.data?.detail || 'Failed to delete vendor');
    }
  };

  const handleSubmitVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vendorFormData.vendor_code || !vendorFormData.vendor_name) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      if (showEditVendorModal && selectedVendor) {
        await api.put(`/erp/ap/vendors/${selectedVendor.id}`, vendorFormData);
      } else {
        await api.post('/erp/ap/vendors', vendorFormData);
      }

      loadVendors();
      setShowCreateVendorModal(false);
      setShowEditVendorModal(false);
      setSelectedVendor(null);
      setError(null);
    } catch (err: any) {
      console.error('Error saving vendor:', err);
      setError(err.response?.data?.detail || 'Failed to save vendor');
    }
  };

  const handleCreateInvoice = () => {
    setInvoiceFormData({
      invoice_number: '',
      vendor_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      total_amount: 0,
      description: ''
    });
    setShowCreateInvoiceModal(true);
  };

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoiceFormData.invoice_number || !invoiceFormData.vendor_id) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await api.post('/erp/ap/invoices', invoiceFormData);
      loadInvoices();
      setShowCreateInvoiceModal(false);
      setError(null);
    } catch (err: any) {
      console.error('Error saving invoice:', err);
      setError(err.response?.data?.detail || 'Failed to save invoice');
    }
  };

  const handleCreatePayment = () => {
    setPaymentFormData({
      vendor_id: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'EFT',
      amount: 0,
      reference: ''
    });
    setShowCreatePaymentModal(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentFormData.vendor_id || !paymentFormData.amount) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await api.post('/erp/ap/payments', paymentFormData);
      loadPayments();
      setShowCreatePaymentModal(false);
      setError(null);
    } catch (err: any) {
      console.error('Error saving payment:', err);
      setError(err.response?.data?.detail || 'Failed to save payment');
    }
  };

  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      draft: { bg: '#f3f4f6', text: '#6b7280' },
      pending: { bg: '#fef3c7', text: '#92400e' },
      approved: { bg: '#dbeafe', text: '#1e40af' },
      paid: { bg: '#d1fae5', text: '#065f46' },
      overdue: { bg: '#fee2e2', text: '#991b1b' }
    };
    return colors[status] || colors.draft;
  };

  const renderVendorFormModal = (isEdit: boolean) => {
    const isOpen = isEdit ? showEditVendorModal : showCreateVendorModal;
    const onClose = () => isEdit ? setShowEditVendorModal(false) : setShowCreateVendorModal(false);

    if (!isOpen) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          overflow: 'auto'
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            maxWidth: '600px',
            width: '95%',
            maxHeight: '95vh',
            overflow: 'auto',
            margin: '2rem'
          }}
        >
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'white',
            zIndex: 10
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
              {isEdit ? 'Edit Vendor' : 'Create Vendor'}
            </h2>
            <button
              onClick={onClose}
              style={{
                padding: '0.25rem',
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmitVendor}>
            <div style={{ padding: '1.5rem' }}>
              {error && (
                <div style={{
                  padding: '1rem',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.375rem',
                  color: '#991b1b',
                  marginBottom: '1rem'
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Vendor Code *
                  </label>
                  <input
                    type="text"
                    value={vendorFormData.vendor_code || ''}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, vendor_code: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Payment Terms
                  </label>
                  <select
                    value={vendorFormData.payment_terms || 'Net 30'}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, payment_terms: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Net 90">Net 90</option>
                    <option value="COD">Cash on Delivery</option>
                    <option value="2/10 Net 30">2/10 Net 30</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Vendor Name *
                </label>
                <input
                  type="text"
                  value={vendorFormData.vendor_name || ''}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, vendor_name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={vendorFormData.contact_person || ''}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, contact_person: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={vendorFormData.phone || ''}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={vendorFormData.email || ''}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, email: e.target.value })}
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
                  Address
                </label>
                <textarea
                  value={vendorFormData.address || ''}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, address: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={vendorFormData.is_active || false}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, is_active: e.target.checked })}
                    style={{ width: '1rem', height: '1rem' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Active</span>
                </label>
              </div>
            </div>

            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              position: 'sticky',
              bottom: 0,
              background: 'white'
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '0.5rem 1rem',
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {isEdit ? 'Update Vendor' : 'Create Vendor'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderInvoiceFormModal = () => {
    if (!showCreateInvoiceModal) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          overflow: 'auto'
        }}
        onClick={() => setShowCreateInvoiceModal(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            maxWidth: '600px',
            width: '95%',
            maxHeight: '95vh',
            overflow: 'auto',
            margin: '2rem'
          }}
        >
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'white',
            zIndex: 10
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
              Create AP Invoice
            </h2>
            <button
              onClick={() => setShowCreateInvoiceModal(false)}
              style={{
                padding: '0.25rem',
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmitInvoice}>
            <div style={{ padding: '1.5rem' }}>
              {error && (
                <div style={{
                  padding: '1rem',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.375rem',
                  color: '#991b1b',
                  marginBottom: '1rem'
                }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Vendor *
                </label>
                <select
                  value={invoiceFormData.vendor_id || ''}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, vendor_id: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Select vendor...</option>
                  {vendors.filter(v => v.is_active).map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendor_code} - {vendor.vendor_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    value={invoiceFormData.invoice_number || ''}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoice_number: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Total Amount *
                  </label>
                  <input
                    type="number"
                    value={invoiceFormData.total_amount || 0}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, total_amount: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={invoiceFormData.invoice_date || ''}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoice_date: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
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
                    value={invoiceFormData.due_date || ''}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, due_date: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Description
                </label>
                <textarea
                  value={invoiceFormData.description || ''}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              position: 'sticky',
              bottom: 0,
              background: 'white'
            }}>
              <button
                type="button"
                onClick={() => setShowCreateInvoiceModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '0.5rem 1rem',
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Create Invoice
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderPaymentFormModal = () => {
    if (!showCreatePaymentModal) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          overflow: 'auto'
        }}
        onClick={() => setShowCreatePaymentModal(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            maxWidth: '600px',
            width: '95%',
            maxHeight: '95vh',
            overflow: 'auto',
            margin: '2rem'
          }}
        >
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'white',
            zIndex: 10
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
              Create Payment
            </h2>
            <button
              onClick={() => setShowCreatePaymentModal(false)}
              style={{
                padding: '0.25rem',
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmitPayment}>
            <div style={{ padding: '1.5rem' }}>
              {error && (
                <div style={{
                  padding: '1rem',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.375rem',
                  color: '#991b1b',
                  marginBottom: '1rem'
                }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Vendor *
                </label>
                <select
                  value={paymentFormData.vendor_id || ''}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, vendor_id: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Select vendor...</option>
                  {vendors.filter(v => v.is_active).map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendor_code} - {vendor.vendor_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={paymentFormData.payment_date || ''}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Payment Method *
                  </label>
                  <select
                    value={paymentFormData.payment_method || 'EFT'}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="EFT">EFT</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Credit Card">Credit Card</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Amount *
                </label>
                <input
                  type="number"
                  value={paymentFormData.amount || 0}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  required
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
                  Reference
                </label>
                <input
                  type="text"
                  value={paymentFormData.reference || ''}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>

            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              position: 'sticky',
              bottom: 0,
              background: 'white'
            }}>
              <button
                type="button"
                onClick={() => setShowCreatePaymentModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '0.5rem 1rem',
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Create Payment
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Accounts Payable</h1>
          <p style={{ color: '#6b7280' }}>Manage vendors, invoices, payments, and aging reports</p>
        </div>
        {activeTab === 'vendors' && (
          <button
            onClick={handleCreateVendor}
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
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Plus size={20} />
            New Vendor
          </button>
        )}
        {activeTab === 'invoices' && (
          <button
            onClick={handleCreateInvoice}
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
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Plus size={20} />
            New Invoice
          </button>
        )}
        {activeTab === 'payments' && (
          <button
            onClick={handleCreatePayment}
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
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Plus size={20} />
            New Payment
          </button>
        )}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <button
              onClick={() => setActiveTab('vendors')}
              style={{
                padding: '1rem 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'vendors' ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === 'vendors' ? '#2563eb' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Vendors
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              style={{
                padding: '1rem 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'invoices' ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === 'invoices' ? '#2563eb' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Invoices
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              style={{
                padding: '1rem 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'payments' ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === 'payments' ? '#2563eb' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab('aging')}
              style={{
                padding: '1rem 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'aging' ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === 'aging' ? '#2563eb' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Aging Report
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'vendors' && (
        <>
          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
                  <Search
                    size={20}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search by code or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                Loading vendors...
              </div>
            ) : vendors.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <FileText size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No vendors found</h3>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                  {searchTerm ? 'Try adjusting your search' : 'Get started by creating your first vendor'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleCreateVendor}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Create Vendor
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Code</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Contact</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Email</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Payment Terms</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((vendor) => (
                      <tr key={vendor.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>{vendor.vendor_code}</td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{vendor.vendor_name}</td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>{vendor.contact_person || '-'}</td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>{vendor.email || '-'}</td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{vendor.payment_terms || '-'}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            background: vendor.is_active ? '#d1fae5' : '#f3f4f6',
                            color: vendor.is_active ? '#065f46' : '#6b7280'
                          }}>
                            {vendor.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleEditVendor(vendor)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: 'transparent',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.25rem',
                                color: '#6b7280',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteVendor(vendor)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: 'transparent',
                                border: '1px solid #fecaca',
                                borderRadius: '0.25rem',
                                color: '#ef4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'invoices' && (
        <>
          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
                  <Search
                    size={20}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ minWidth: '200px' }}>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      background: 'white'
                    }}
                  >
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                Loading invoices...
              </div>
            ) : invoices.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <FileText size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No invoices found</h3>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                  {searchTerm || statusFilter ? 'Try adjusting your filters' : 'Get started by creating your first invoice'}
                </p>
                {!searchTerm && !statusFilter && (
                  <button
                    onClick={handleCreateInvoice}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Create Invoice
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Invoice #</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Vendor</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Invoice Date</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Due Date</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Total</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Balance</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => {
                      const statusColors = getStatusColor(invoice.status);
                      return (
                        <tr key={invoice.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>{invoice.invoice_number}</td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{invoice.vendor_name}</td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {new Date(invoice.invoice_date).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {new Date(invoice.due_date).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: '500' }}>
                            {formatCurrency(invoice.total_amount)}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: '500' }}>
                            {formatCurrency(invoice.balance)}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              background: statusColors.bg,
                              color: statusColors.text
                            }}>
                              {invoice.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'payments' && (
        <>
          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                Loading payments...
              </div>
            ) : payments.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <DollarSign size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No payments found</h3>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Get started by creating your first payment</p>
                <button
                  onClick={handleCreatePayment}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Create Payment
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Payment #</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Vendor</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Method</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Reference</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => {
                      const statusColors = getStatusColor(payment.status);
                      return (
                        <tr key={payment.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>{payment.payment_number}</td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{payment.vendor_name}</td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{payment.payment_method}</td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: '500' }}>
                            {formatCurrency(payment.amount)}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>{payment.reference || '-'}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              background: statusColors.bg,
                              color: statusColors.text
                            }}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'aging' && (
        <>
          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                Loading aging report...
              </div>
            ) : aging.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <FileText size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No aging data</h3>
                <p style={{ color: '#6b7280' }}>Aging report will be available once you have outstanding invoices</p>
              </div>
            ) : (
              <>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                    AP Aging Report - As of {new Date().toLocaleDateString()}
                  </h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Vendor</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Current</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>1-30 Days</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>31-60 Days</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>61-90 Days</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Over 90 Days</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aging.map((bucket, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{bucket.vendor_name}</td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right' }}>
                            {formatCurrency(bucket.current)}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right' }}>
                            {formatCurrency(bucket.days_30)}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right' }}>
                            {formatCurrency(bucket.days_60)}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right' }}>
                            {formatCurrency(bucket.days_90)}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right', color: bucket.over_90 > 0 ? '#ef4444' : 'inherit' }}>
                            {formatCurrency(bucket.over_90)}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: '500' }}>
                            {formatCurrency(bucket.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ background: '#f9fafb', borderTop: '2px solid #d1d5db' }}>
                      <tr>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700' }}>Total</td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700', textAlign: 'right' }}>
                          {formatCurrency(aging.reduce((sum, b) => sum + b.current, 0))}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700', textAlign: 'right' }}>
                          {formatCurrency(aging.reduce((sum, b) => sum + b.days_30, 0))}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700', textAlign: 'right' }}>
                          {formatCurrency(aging.reduce((sum, b) => sum + b.days_60, 0))}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700', textAlign: 'right' }}>
                          {formatCurrency(aging.reduce((sum, b) => sum + b.days_90, 0))}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700', textAlign: 'right' }}>
                          {formatCurrency(aging.reduce((sum, b) => sum + b.over_90, 0))}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700', textAlign: 'right' }}>
                          {formatCurrency(aging.reduce((sum, b) => sum + b.total, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {renderVendorFormModal(false)}
      {renderVendorFormModal(true)}
      {renderInvoiceFormModal()}
      {renderPaymentFormModal()}

      <ConfirmDialog
        isOpen={showDeleteVendorDialog}
        onClose={() => setShowDeleteVendorDialog(false)}
        onConfirm={confirmDeleteVendor}
        title="Delete Vendor"
        message={`Are you sure you want to delete vendor "${selectedVendor?.vendor_name}"? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
