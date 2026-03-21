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
        setAllocations([{ invoice_id: invoice.id, amount: Number(invoice.amount_outstanding ?? 0).toFixed(2) }]);
        setAmount(Number(invoice.amount_outstanding ?? 0).toFixed(2));
      }
    }
  }, [preselectedInvoiceId, invoices]);

  const loadMasterData = async () => {
    try {
      const [customersRes, bankAccountsRes] = await Promise.all([
        api.get('/erp/master-data/customers'),
        api.get('/erp/master-data/bank-accounts')
      ]);
      const cd = customersRes.data;
      setCustomers(Array.isArray(cd) ? cd : cd.customers || cd.data || []);
      const bd = bankAccountsRes.data;
      setBankAccounts(Array.isArray(bd) ? bd : bd.accounts || bd.data || []);
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  const loadCustomerInvoices = async (custId: string) => {
    try {
      const response = await api.get(`/api/ar/invoices?customer_id=${custId}&payment_status=unpaid,partial`);
      const d = response.data;
      setInvoices(Array.isArray(d) ? d : d.invoices || d.data || []);
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
      setAmount(Number(receiptData.amount ?? 0).toFixed(2));
      setNotes(receiptData.notes || '');
      setAllocations(
        receiptData.allocations.map((alloc: ReceiptAllocation) => ({
          invoice_id: alloc.invoice_id,
          amount: Number(alloc.amount ?? 0).toFixed(2)
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
      setError(`Total allocated (R ${Number(totalAllocated ?? 0).toFixed(2)}) must equal payment amount (R ${amount})`);
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

  const handleCancel = async () => {
    if (!id || isNew) return;

    const reason = prompt('Enter cancellation reason (optional):');
    if (reason === null) return;

    try {
      setLoading(true);
      setError(null);
      await api.post(`/api/ar/receipts/${id}/cancel`, {
        reason: reason || 'User cancelled'
      });
      await loadReceipt(id);
    } catch (err: any) {
      console.error('Error cancelling receipt:', err);
      setError(err.response?.data?.detail || 'Failed to cancel receipt');
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
      onCancel={receipt?.status === 'draft' && !isNew ? handleCancel : undefined}
      loading={loading}
    >
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TransactionCard title="Payment Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <div className="mt-4">
              <TransactionField
                label="Notes"
                type="textarea"
                value={notes}
                onChange={setNotes}
                rows={2}
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
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-blue-600 hover:to-blue-700  transition-all"
                >
                  Add Allocation
                </button>
              )
            }
          >
            {allocations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-300">
                No allocations added. Click "Add Allocation" to allocate payment to invoices.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {allocations.map((alloc, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[2fr_1fr_auto] gap-3 items-end"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Invoice
                      </label>
                      <select
                        value={alloc.invoice_id}
                        onChange={(e) => updateAllocation(index, 'invoice_id', e.target.value)}
                        disabled={receipt?.status !== 'draft' && !isNew}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select invoice...</option>
                        {invoices.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoice_number} - Outstanding: R {Number(inv.amount_outstanding ?? 0).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={alloc.amount}
                        onChange={(e) => updateAllocation(index, 'amount', e.target.value)}
                        disabled={receipt?.status !== 'draft' && !isNew}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {(receipt?.status === 'draft' || isNew) && (
                      <button
                        onClick={() => removeAllocation(index)}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
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
              <div className="mb-6">
                <PostingStatus
                  status={receipt.status}
                  glEntryId={receipt.journal_entry_id}
                  glPosted={receipt.status === 'posted'}
                  postedAt={receipt.posted_at}
                  postedBy={receipt.posted_by}
                  onViewJournal={(entryId) => navigate(`/erp/general-ledger?entry=${entryId}`)}
                />
              </div>

              <div className="mb-6">
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
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-300">Payment Amount:</span>
                <span className="font-medium text-gray-900 dark:text-white">R {parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-300">Total Allocated:</span>
                <span className="font-medium text-gray-900 dark:text-white">R {Number(totalAllocated ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t-2 border-gray-200 dark:border-gray-700 text-lg font-semibold">
                <span className="text-gray-900 dark:text-white">Unallocated:</span>
                <span className={unallocated > 0.01 ? 'text-red-500' : 'text-emerald-500'}>
                  R {Number(unallocated ?? 0).toFixed(2)}
                </span>
              </div>
              {unallocated > 0.01 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                  Warning: Payment not fully allocated
                </div>
              )}
            </div>
          </TransactionCard>

          {receipt && (
            <TransactionCard title="Metadata">
              <div className="flex flex-col gap-2 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-300">Created:</span>
                  <br />
                  <span className="text-gray-900 dark:text-white">{receipt.created_at ? new Date(receipt.created_at).toLocaleString() : '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-300">Last Updated:</span>
                  <br />
                  <span className="text-gray-900 dark:text-white">{receipt.updated_at ? new Date(receipt.updated_at).toLocaleString() : '-'}</span>
                </div>
              </div>
            </TransactionCard>
          )}
        </div>
      </div>
    </TransactionLayout>
  );
}
