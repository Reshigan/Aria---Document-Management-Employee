import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { TransactionLayout, TransactionCard, TransactionField } from '../../components/TransactionLayout';
import { PostingStatus } from '../../components/PostingStatus';
import { AutomationPanel } from '../../components/AutomationPanel';
import { Trash2 } from 'lucide-react';

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
  allocations: ReceiptAllocation[];
  journal_entry_id?: string;  // Backend uses journal_entry_id not gl_entry_id
  posted_at?: string;
  posted_by?: string;
}

interface ReceiptAllocation {
  id: string;
  invoice_id: string;
  invoice_number: string;
  amount: number;
}

interface Customer {
  id: string;
  code: string;
  name: string;
}

interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  amount_outstanding: number;
}

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNew = id === 'new';
  const preselectedInvoiceId = searchParams.get('invoice_id');

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('eft');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('0.00');
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState<{ invoice_id: string; amount: string }[]>([]);

  useEffect(() => {
    loadMasterData();
    if (!isNew && id) {
      loadReceipt(id);
    }
  }, [id, isNew]);

  useEffect(() => {
    if (customerId) {
      loadCustomerInvoices(customerId);
    }
  }, [customerId]);

  useEffect(() => {
    if (preselectedInvoiceId && invoices.length > 0) {
      const invoice = invoices.find((inv) => inv.id === preselectedInvoiceId);
      if (invoice && allocations.length === 0) {
        setAllocations([{ invoice_id: invoice.id, amount: invoice.amount_outstanding.toFixed(2) }]);
        setAmount(invoice.amount_outstanding.toFixed(2));
      }
    }
  }, [preselectedInvoiceId, invoices]);

  const loadMasterData = async () => {
    try {
      const [customersRes, bankAccountsRes] = await Promise.all([
        api.get('/erp/master-data/customers'),
        api.get('/erp/master-data/bank-accounts')
      ]);
      setCustomers(customersRes.data);
      setBankAccounts(bankAccountsRes.data);
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  const loadCustomerInvoices = async (custId: string) => {
    try {
      const response = await api.get(`/api/ar/invoices?customer_id=${custId}&payment_status=unpaid,partial`);
      setInvoices(response.data);
    } catch (err) {
      console.error('Error loading customer invoices:', err);
    }
  };

  const loadReceipt = async (receiptId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/ar/receipts/${receiptId}`);
      const receiptData = response.data;
      setReceipt(receiptData);
      setCustomerId(receiptData.customer_id);
      setPaymentDate(receiptData.payment_date);
      setBankAccountId(receiptData.bank_account_id);
      setPaymentMethod(receiptData.payment_method);
      setReference(receiptData.reference || '');
      setAmount(receiptData.amount.toFixed(2));
      setNotes(receiptData.notes || '');
      setAllocations(
        receiptData.allocations.map((alloc: ReceiptAllocation) => ({
          invoice_id: alloc.invoice_id,
          amount: alloc.amount.toFixed(2)
        }))
      );
      setError(null);
    } catch (err: any) {
      console.error('Error loading receipt:', err);
      setError(err.response?.data?.detail || 'Failed to load receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!customerId) {
      setError('Please select a customer');
      return;
    }

    if (!bankAccountId) {
      setError('Please select a bank account');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than zero');
      return;
    }

    if (allocations.length === 0) {
      setError('Please allocate payment to at least one invoice');
      return;
    }

    const totalAllocated = allocations.reduce((sum, alloc) => sum + parseFloat(alloc.amount), 0);
    if (Math.abs(totalAllocated - parseFloat(amount)) > 0.01) {
      setError(`Total allocated (R ${totalAllocated.toFixed(2)}) must equal payment amount (R ${amount})`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        customer_id: customerId,
        payment_date: paymentDate,
        bank_account_id: bankAccountId,
        payment_method: paymentMethod,
        reference: reference || null,
        amount: parseFloat(amount),
        notes: notes || null,
        allocations: allocations.map((alloc) => ({
          invoice_id: alloc.invoice_id,
          amount: parseFloat(alloc.amount)
        }))
      };

      if (isNew) {
        const response = await api.post('/api/ar/receipts', payload);
        navigate(`/ar/receipts/${response.data.id}`);
      } else {
        await api.put(`/api/ar/receipts/${id}`, payload);
        await loadReceipt(id!);
      }
    } catch (err: any) {
      console.error('Error saving receipt:', err);
      setError(err.response?.data?.detail || 'Failed to save receipt');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!id || isNew) return;

    try {
      setLoading(true);
      setError(null);
      await api.post(`/api/ar/receipts/${id}/post`);
      await loadReceipt(id);
    } catch (err: any) {
      console.error('Error posting receipt:', err);
      setError(err.response?.data?.detail || 'Failed to post receipt');
    } finally {
      setLoading(false);
    }
  };

  const addAllocation = () => {
    setAllocations([...allocations, { invoice_id: '', amount: '0.00' }]);
  };

  const removeAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index: number, field: 'invoice_id' | 'amount', value: string) => {
    const newAllocations = [...allocations];
    newAllocations[index] = { ...newAllocations[index], [field]: value };
    setAllocations(newAllocations);
  };

  const totalAllocated = allocations.reduce((sum, alloc) => sum + (parseFloat(alloc.amount) || 0), 0);
  const unallocated = parseFloat(amount) - totalAllocated;

  return (
    <TransactionLayout
      title={isNew ? 'New Receipt' : 'Receipt'}
      documentNumber={receipt?.receipt_number}
      status={receipt?.status || 'draft'}
      backUrl="/ar/receipts"
      onSave={receipt?.status === 'draft' || isNew ? handleSave : undefined}
      onPost={receipt?.status === 'draft' && !isNew ? handlePost : undefined}
      loading={loading}
    >
      {error && (
        <div style={{
          padding: '1rem',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          color: '#991b1b',
          marginBottom: '1.5rem'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div>
          <TransactionCard title="Payment Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <TransactionField
                label="Customer"
                type="select"
                value={customerId}
                onChange={setCustomerId}
                options={customers.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
                required
                disabled={receipt?.status !== 'draft' && !isNew}
              />
              <TransactionField
                label="Payment Date"
                type="date"
                value={paymentDate}
                onChange={setPaymentDate}
                required
                disabled={receipt?.status !== 'draft' && !isNew}
              />
              <TransactionField
                label="Bank Account"
                type="select"
                value={bankAccountId}
                onChange={setBankAccountId}
                options={bankAccounts.map((ba) => ({ value: ba.id, label: `${ba.account_name} (${ba.account_number})` }))}
                required
                disabled={receipt?.status !== 'draft' && !isNew}
              />
              <TransactionField
                label="Payment Method"
                type="select"
                value={paymentMethod}
                onChange={setPaymentMethod}
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'cheque', label: 'Cheque' },
                  { value: 'eft', label: 'EFT' },
                  { value: 'card', label: 'Card' }
                ]}
                required
                disabled={receipt?.status !== 'draft' && !isNew}
              />
              <TransactionField
                label="Reference"
                type="text"
                value={reference}
                onChange={setReference}
                placeholder="Payment reference"
                disabled={receipt?.status !== 'draft' && !isNew}
              />
              <TransactionField
                label="Amount"
                type="number"
                value={amount}
                onChange={setAmount}
                required
                disabled={receipt?.status !== 'draft' && !isNew}
              />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <TransactionField
                label="Notes"
                type="textarea"
                value={notes}
                onChange={setNotes}
                rows={3}
                disabled={receipt?.status !== 'draft' && !isNew}
              />
            </div>
          </TransactionCard>

          <TransactionCard
            title="Invoice Allocations"
            actions={
              (receipt?.status === 'draft' || isNew) && (
                <button
                  onClick={addAllocation}
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
                  Add Allocation
                </button>
              )
            }
          >
            {allocations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                No allocations added. Click "Add Allocation" to allocate payment to invoices.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {allocations.map((alloc, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr auto',
                      gap: '0.75rem',
                      alignItems: 'end'
                    }}
                  >
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.5rem'
                      }}>
                        Invoice
                      </label>
                      <select
                        value={alloc.invoice_id}
                        onChange={(e) => updateAllocation(index, 'invoice_id', e.target.value)}
                        disabled={receipt?.status !== 'draft' && !isNew}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem'
                        }}
                      >
                        <option value="">Select invoice...</option>
                        {invoices.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoice_number} - Outstanding: R {inv.amount_outstanding.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.5rem'
                      }}>
                        Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={alloc.amount}
                        onChange={(e) => updateAllocation(index, 'amount', e.target.value)}
                        disabled={receipt?.status !== 'draft' && !isNew}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                    {(receipt?.status === 'draft' || isNew) && (
                      <button
                        onClick={() => removeAllocation(index)}
                        style={{
                          padding: '0.5rem',
                          background: '#ef4444',
                          border: 'none',
                          borderRadius: '0.375rem',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TransactionCard>
        </div>

        <div>
          {receipt && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <PostingStatus
                  status={receipt.status}
                  glEntryId={receipt.journal_entry_id}
                  glPosted={receipt.status === 'posted'}
                  postedAt={receipt.posted_at}
                  postedBy={receipt.posted_by}
                  onViewJournal={(entryId) => navigate(`/erp/general-ledger?entry=${entryId}`)}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <AutomationPanel
                  documentType="receipt"
                  documentId={receipt.id}
                  documentData={receipt}
                  onExecutionComplete={() => loadReceipt(id!)}
                />
              </div>
            </>
          )}

          <TransactionCard title="Allocation Summary">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Payment Amount:</span>
                <span style={{ fontWeight: '500' }}>R {parseFloat(amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Total Allocated:</span>
                <span style={{ fontWeight: '500' }}>R {totalAllocated.toFixed(2)}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '0.75rem',
                borderTop: '2px solid #e5e7eb',
                fontSize: '1.125rem',
                fontWeight: '600'
              }}>
                <span>Unallocated:</span>
                <span style={{ color: unallocated > 0.01 ? '#ef4444' : '#10b981' }}>
                  R {unallocated.toFixed(2)}
                </span>
              </div>
              {unallocated > 0.01 && (
                <div style={{
                  padding: '0.75rem',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  color: '#92400e'
                }}>
                  Warning: Payment not fully allocated
                </div>
              )}
            </div>
          </TransactionCard>

          {receipt && (
            <TransactionCard title="Metadata">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: '#6b7280' }}>Created:</span>
                  <br />
                  <span>{new Date(receipt.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>Last Updated:</span>
                  <br />
                  <span>{new Date(receipt.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </TransactionCard>
          )}
        </div>
      </div>
    </TransactionLayout>
  );
}
