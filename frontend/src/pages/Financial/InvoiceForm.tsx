import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X, Plus, Trash2, FileText, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import api from '../../lib/api';

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

interface Customer {
  id: string;
  customer_name: string;
  email?: string;
}

export default function InvoiceForm() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    reference: '',
    notes: ''
  });

  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: '1', description: '', quantity: 1, unit_price: 0, vat_rate: 15 }
  ]);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await api.get('/erp/order-to-cash/customers');
        const data = response.data?.data || response.data || [];
        setCustomers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error loading customers:', err);
      }
    };
    loadCustomers();
  }, []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddLine = () => {
    setLines([...lines, { id: Date.now().toString(), description: '', quantity: 1, unit_price: 0, vat_rate: 15 }]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length > 1) setLines(lines.filter(line => line.id !== id));
  };

  const handleLineChange = (id: string, field: keyof InvoiceLine, value: string | number) => {
    setLines(lines.map(line => line.id === id ? { ...line, [field]: value } : line));
  };

  const calculateLineTotal = (line: InvoiceLine) => {
    const subtotal = line.quantity * line.unit_price;
    const vat = subtotal * (line.vat_rate / 100);
    return subtotal + vat;
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
    const vat = lines.reduce((sum, line) => sum + ((line.quantity * line.unit_price) * (line.vat_rate / 100)), 0);
    return { subtotal, vat, total: subtotal + vat };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCustomer = customers.find(c => c.id === formData.customer_id);
    const invoiceData = {
      customer_id: formData.customer_id || undefined,
      customer_name: selectedCustomer?.customer_name || formData.customer_name || undefined,
      customer_email: selectedCustomer?.email || undefined,
      invoice_date: formData.invoice_date,
      due_date: formData.due_date,
      reference: formData.reference,
      notes: formData.notes,
      lines: lines.map(line => ({ description: line.description, quantity: line.quantity, unit_price: line.unit_price, vat_rate: line.vat_rate })),
      subtotal: totals.subtotal,
      vat_amount: totals.vat,
      total_amount: totals.total
    };

    setSaving(true);
    setError(null);
    
    try {
      await api.post('/financial/invoices', invoiceData);
      navigate('/financial/invoices');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save invoice. Please try again.');
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-3">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg"><FileText className="h-4 w-4 text-white" /></div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">New Invoice</h1>
          </div>
          <button onClick={() => navigate('/financial/invoices')} className="p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700"><X className="h-4 w-4 text-gray-600 dark:text-gray-400" /></button>
        </div>

        {error && (<div className="p-2 mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded"><X className="h-3 w-3 text-red-500" /></button></div>)}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 space-y-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-3">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Invoice Details</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Customer *</label><select required value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} className={inputClass}><option value="">Select customer...</option>{customers.map(c => (<option key={c.id} value={c.id}>{c.customer_name}</option>))}</select></div>
                  <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reference</label><input type="text" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="PO Number" className={inputClass} /></div>
                  <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Invoice Date *</label><input type="date" required value={formData.invoice_date} onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Due Date *</label><input type="date" required value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className={inputClass} /></div>
                </div>
                <div className="mt-2"><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label><input type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." className={inputClass} /></div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Line Items</h3>
                  <button type="button" onClick={handleAddLine} className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"><Plus className="h-3 w-3" />Add</button>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50"><tr>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Description</th>
                    <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-gray-500 uppercase w-16">Qty</th>
                    <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-gray-500 uppercase w-24">Price</th>
                    <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-gray-500 uppercase w-16">VAT%</th>
                    <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-gray-500 uppercase w-24">Total</th>
                    <th className="px-2 py-1.5 w-8"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {lines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-2 py-1"><input type="text" required value={line.description} onChange={(e) => handleLineChange(line.id, 'description', e.target.value)} placeholder="Item description" className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></td>
                        <td className="px-1 py-1"><input type="number" required min="0" step="0.01" value={line.quantity} onChange={(e) => handleLineChange(line.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right" /></td>
                        <td className="px-1 py-1"><input type="number" required min="0" step="0.01" value={line.unit_price} onChange={(e) => handleLineChange(line.id, 'unit_price', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right" /></td>
                        <td className="px-1 py-1"><input type="number" required min="0" max="100" step="0.01" value={line.vat_rate} onChange={(e) => handleLineChange(line.id, 'vat_rate', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right" /></td>
                        <td className="px-2 py-1 text-right text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(calculateLineTotal(line))}</td>
                        <td className="px-1 py-1 text-center"><button type="button" onClick={() => handleRemoveLine(line.id)} disabled={lines.length === 1} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-3">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium text-gray-900 dark:text-white">{formatCurrency(totals.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">VAT (15%)</span><span className="font-medium text-gray-900 dark:text-white">{formatCurrency(totals.vat)}</span></div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="font-bold text-lg text-blue-600 dark:text-blue-400">{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium text-sm hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Invoice'}</button>
                <button type="button" onClick={() => navigate('/financial/invoices')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
