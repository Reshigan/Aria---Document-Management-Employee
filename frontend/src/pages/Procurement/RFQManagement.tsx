import React, { useState, useEffect } from 'react';
import { Plus, FileText, X, Edit, Trash2, Send, CheckCircle, XCircle, AlertTriangle, Clock, Users, DollarSign, Search, Layers, ShoppingCart } from 'lucide-react';

interface SupplierQuote {
  supplier_id: string;
  supplier_name: string;
  quoted_amount: number;
  delivery_days: number;
  notes: string;
  received_date?: string;
}

interface RFQ {
  rfq_id: string;
  title: string;
  description: string;
  status: 'draft' | 'sent' | 'received' | 'evaluated' | 'awarded' | 'cancelled';
  issue_date: string;
  due_date: string;
  suppliers: string[];
  quotes: SupplierQuote[];
  selected_supplier?: string;
  estimated_value?: number;
}

interface FormData {
  title: string;
  description: string;
  issue_date: string;
  due_date: string;
  suppliers: string;
  estimated_value: number;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    received: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    evaluated: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    awarded: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };
  return colors[status] || colors.draft;
};

const RFQManagement: React.FC = () => {
  const [rfqs, setRFQs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [editingRfq, setEditingRfq] = useState<RFQ | null>(null);
  const [selectedRfq, setSelectedRfq] = useState<RFQ | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    suppliers: '',
    estimated_value: 0
  });
  const [quoteData, setQuoteData] = useState<SupplierQuote>({
    supplier_id: '',
    supplier_name: '',
    quoted_amount: 0,
    delivery_days: 0,
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRFQs();
  }, []);

  const fetchRFQs = async () => {
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/procurement/rfq');
      const data = await response.json();
      setRFQs(data.rfqs || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: '',
      suppliers: '',
      estimated_value: 0
    });
    setEditingRfq(null);
    setError(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (rfq: RFQ) => {
    setEditingRfq(rfq);
    setFormData({
      title: rfq.title,
      description: rfq.description || '',
      issue_date: rfq.issue_date?.split('T')[0] || '',
      due_date: rfq.due_date?.split('T')[0] || '',
      suppliers: rfq.suppliers?.join(', ') || '',
      estimated_value: rfq.estimated_value || 0
    });
    setShowModal(true);
  };

  const handleDelete = async (rfqId: string) => {
    if (!confirm('Are you sure you want to delete this RFQ?')) return;
    try {
      await fetch(`https://aria.vantax.co.za/api/erp/procurement/rfq/${rfqId}`, {
        method: 'DELETE'
      });
      setSuccess('RFQ deleted successfully');
      fetchRFQs();
    } catch (error) {
      setError('Failed to delete RFQ');
    }
  };

  // Business Logic: Send RFQ to Suppliers (draft -> sent)
  const handleSend = async (rfq: RFQ) => {
    if (rfq.status !== 'draft') {
      setError('Only draft RFQs can be sent');
      return;
    }
    if (!rfq.suppliers || rfq.suppliers.length === 0) {
      setError('RFQ must have at least one supplier before sending');
      return;
    }
    try {
      await fetch(`https://aria.vantax.co.za/api/erp/procurement/rfq/${rfq.rfq_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rfq, status: 'sent' })
      });
      setSuccess('RFQ sent to suppliers');
      fetchRFQs();
    } catch (error) {
      setError('Failed to send RFQ');
    }
  };

  // Business Logic: Record Quote from Supplier
  const handleRecordQuote = (rfq: RFQ) => {
    setSelectedRfq(rfq);
    setQuoteData({
      supplier_id: '',
      supplier_name: rfq.suppliers?.[0] || '',
      quoted_amount: 0,
      delivery_days: 0,
      notes: ''
    });
    setShowQuoteModal(true);
  };

  const handleSubmitQuote = async () => {
    if (!selectedRfq) return;
    if (!quoteData.supplier_name || quoteData.quoted_amount <= 0) {
      setError('Supplier name and quoted amount are required');
      return;
    }
    try {
      const updatedQuotes = [...(selectedRfq.quotes || []), { ...quoteData, received_date: new Date().toISOString() }];
      await fetch(`https://aria.vantax.co.za/api/erp/procurement/rfq/${selectedRfq.rfq_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...selectedRfq, quotes: updatedQuotes, status: 'received' })
      });
      setShowQuoteModal(false);
      setSuccess('Quote recorded successfully');
      fetchRFQs();
    } catch (error) {
      setError('Failed to record quote');
    }
  };

  // Business Logic: Award RFQ to Supplier and Convert to PO
  const handleAwardAndConvertToPO = async (rfq: RFQ, supplierName: string, quotedAmount: number) => {
    try {
      // Update RFQ status to awarded
      await fetch(`https://aria.vantax.co.za/api/erp/procurement/rfq/${rfq.rfq_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rfq, status: 'awarded', selected_supplier: supplierName })
      });
      // Create Purchase Order
      await fetch('https://aria.vantax.co.za/api/erp/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_name: supplierName,
          rfq_id: rfq.rfq_id,
          total_amount: quotedAmount,
          status: 'draft',
          notes: `Created from RFQ: ${rfq.title}`
        })
      });
      setSuccess(`RFQ awarded to ${supplierName} and Purchase Order created`);
      fetchRFQs();
    } catch (error) {
      setError('Failed to award RFQ');
    }
  };

  // Business Logic: Cancel RFQ
  const handleCancel = async (rfq: RFQ) => {
    if (rfq.status === 'awarded' || rfq.status === 'cancelled') {
      setError('Cannot cancel awarded or already cancelled RFQs');
      return;
    }
    if (!confirm('Are you sure you want to cancel this RFQ?')) return;
    try {
      await fetch(`https://aria.vantax.co.za/api/erp/procurement/rfq/${rfq.rfq_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rfq, status: 'cancelled' })
      });
      setSuccess('RFQ cancelled');
      fetchRFQs();
    } catch (error) {
      setError('Failed to cancel RFQ');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    try {
      const url = editingRfq 
        ? `https://aria.vantax.co.za/api/erp/procurement/rfq/${editingRfq.rfq_id}`
        : 'https://aria.vantax.co.za/api/erp/procurement/rfq';
      const method = editingRfq ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        suppliers: formData.suppliers.split(',').map(s => s.trim()).filter(s => s),
        status: editingRfq?.status || 'draft',
        quotes: editingRfq?.quotes || []
      };
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      setShowModal(false);
      resetForm();
      setSuccess(editingRfq ? 'RFQ updated' : 'RFQ created');
      fetchRFQs();
    } catch (error) {
      setError('Failed to save RFQ');
    }
  };

  // Calculate stats
  const stats = {
    total: rfqs.length,
    draft: rfqs.filter(r => r.status === 'draft').length,
    sent: rfqs.filter(r => r.status === 'sent').length,
    received: rfqs.filter(r => r.status === 'received').length,
    awarded: rfqs.filter(r => r.status === 'awarded').length,
  };

  // Filter and search RFQs
  const filteredRFQs = rfqs
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => searchTerm === '' || r.title?.toLowerCase().includes(searchTerm.toLowerCase()));

  // Get best quote for an RFQ
  const getBestQuote = (rfq: RFQ) => {
    if (!rfq.quotes || rfq.quotes.length === 0) return null;
    return rfq.quotes.reduce((best, current) => current.quoted_amount < best.quoted_amount ? current : best);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Request for Quotation (RFQ)</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage supplier quotes and procurement requests</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search RFQs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 w-64"
              />
            </div>
            <button 
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30 transition-all"
            >
              <Plus size={20} />
              Create RFQ
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><AlertTriangle size={20} />{error}</div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">&times;</button>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><CheckCircle size={20} />{success}</div>
            <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700">&times;</button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <button onClick={() => setFilter('all')} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${filter === 'all' ? 'border-blue-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p></div>
              <Layers className="text-blue-500" size={20} />
            </div>
          </button>
          <button onClick={() => setFilter('draft')} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${filter === 'draft' ? 'border-gray-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-gray-500">Draft</p><p className="text-2xl font-bold text-gray-600">{stats.draft}</p></div>
              <FileText className="text-gray-400" size={20} />
            </div>
          </button>
          <button onClick={() => setFilter('sent')} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${filter === 'sent' ? 'border-blue-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-gray-500">Sent</p><p className="text-2xl font-bold text-blue-600">{stats.sent}</p></div>
              <Send className="text-blue-500" size={20} />
            </div>
          </button>
          <button onClick={() => setFilter('received')} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${filter === 'received' ? 'border-purple-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-gray-500">Received</p><p className="text-2xl font-bold text-purple-600">{stats.received}</p></div>
              <Clock className="text-purple-500" size={20} />
            </div>
          </button>
          <button onClick={() => setFilter('awarded')} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${filter === 'awarded' ? 'border-emerald-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-gray-500">Awarded</p><p className="text-2xl font-bold text-emerald-600">{stats.awarded}</p></div>
              <CheckCircle className="text-emerald-500" size={20} />
            </div>
          </button>
        </div>

        {/* RFQ Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">RFQ ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Suppliers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Best Quote</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />Loading...
                    </div>
                  </td></tr>
                ) : filteredRFQs.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />No RFQs found {filter !== 'all' && `with status "${filter}"`}
                  </td></tr>
                ) : (
                  filteredRFQs.map((rfq) => {
                    const bestQuote = getBestQuote(rfq);
                    return (
                      <tr key={rfq.rfq_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono">{rfq.rfq_id?.slice(0, 8) || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm font-medium">{rfq.title}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rfq.status)}`}>{rfq.status}</span>
                        </td>
                        <td className="px-6 py-4 text-sm"><div className="flex items-center gap-1"><Users size={14} className="text-gray-400" />{rfq.suppliers?.length || 0}</div></td>
                        <td className="px-6 py-4 text-sm">
                          {bestQuote ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-medium"><DollarSign size={14} />{Number(bestQuote.quoted_amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                          ) : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-6 py-4 text-sm">{rfq.due_date ? new Date(rfq.due_date).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleEdit(rfq)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Edit size={16} /></button>
                            {rfq.status === 'draft' && (
                              <>
                                <button onClick={() => handleSend(rfq)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Send to Suppliers"><Send size={16} /></button>
                                <button onClick={() => handleDelete(rfq.rfq_id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 size={16} /></button>
                              </>
                            )}
                            {(rfq.status === 'sent' || rfq.status === 'received') && (
                              <button onClick={() => handleRecordQuote(rfq)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Record Quote"><DollarSign size={16} /></button>
                            )}
                            {rfq.status === 'received' && bestQuote && (
                              <button onClick={() => handleAwardAndConvertToPO(rfq, bestQuote.supplier_name, bestQuote.quoted_amount)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Award & Create PO"><ShoppingCart size={16} /></button>
                            )}
                            {rfq.status !== 'awarded' && rfq.status !== 'cancelled' && (
                              <button onClick={() => handleCancel(rfq)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancel"><XCircle size={16} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingRfq ? 'Edit RFQ' : 'Create RFQ'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full border rounded-xl px-3 py-2 dark:bg-gray-700 dark:border-gray-600" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-xl px-3 py-2 dark:bg-gray-700 dark:border-gray-600" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Date</label>
                  <input type="date" value={formData.issue_date} onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })} className="w-full border rounded-xl px-3 py-2 dark:bg-gray-700 dark:border-gray-600" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
                  <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full border rounded-xl px-3 py-2 dark:bg-gray-700 dark:border-gray-600" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Value</label>
                <input type="number" value={formData.estimated_value} onChange={(e) => setFormData({ ...formData, estimated_value: parseFloat(e.target.value) || 0 })} className="w-full border rounded-xl px-3 py-2 dark:bg-gray-700 dark:border-gray-600" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Suppliers (comma-separated)</label>
                <input type="text" value={formData.suppliers} onChange={(e) => setFormData({ ...formData, suppliers: e.target.value })} className="w-full border rounded-xl px-3 py-2 dark:bg-gray-700 dark:border-gray-600" placeholder="Supplier A, Supplier B, Supplier C" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700">{editingRfq ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQuoteModal && selectedRfq && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Supplier Quote</h2>
              <button onClick={() => setShowQuoteModal(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier *</label>
                <select value={quoteData.supplier_name} onChange={(e) => setQuoteData({ ...quoteData, supplier_name: e.target.value })} className="w-full border rounded-xl px-3 py-2 dark:bg-gray-700 dark:border-gray-600">
                  <option value="">Select Supplier</option>
                  {selectedRfq.suppliers?.map((s, i) => (<option key={i} value={s}>{s}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quoted Amount *</label>
                <input type="number" value={quoteData.quoted_amount} onChange={(e) => setQuoteData({ ...quoteData, quoted_amount: parseFloat(e.target.value) || 0 })} className="w-full border rounded-xl px-3 py-2 dark:bg-gray-700 dark:border-gray-600" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Days</label>
                <input type="number" value={quoteData.delivery_days} onChange={(e) => setQuoteData({ ...quoteData, delivery_days: parseInt(e.target.value) || 0 })} className="w-full border rounded-xl px-3 py-2 dark:bg-gray-700 dark:border-gray-600" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea value={quoteData.notes} onChange={(e) => setQuoteData({ ...quoteData, notes: e.target.value })} className="w-full border rounded-xl px-3 py-2 dark:bg-gray-700 dark:border-gray-600" rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowQuoteModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300">Cancel</button>
                <button type="button" onClick={handleSubmitQuote} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700">Record Quote</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RFQManagement;
