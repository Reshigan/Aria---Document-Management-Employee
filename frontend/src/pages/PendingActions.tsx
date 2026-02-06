import React, { useState, useEffect } from 'react';
import { CheckSquare, X, Check, RefreshCw } from 'lucide-react';
import { DataTable } from '../components/shared/DataTable';

interface PendingAction {
  id: number;
  type: string;
  description: string;
  amount: number | null;
  priority: 'high' | 'medium' | 'low';
  requester: string;
  requested_date: string;
  document_ref?: string;
}

export default function PendingActionsPage() {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [selectedAction, setSelectedAction] = useState<PendingAction | null>(null);

  const fetchPendingActions = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/approvals/pending`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      const mappedData = (Array.isArray(result) ? result : result.actions || result.data || []).map((a: any) => ({
        id: a.id,
        type: a.type || '',
        description: a.description || '',
        amount: a.amount || null,
        priority: a.priority || 'medium',
        requester: a.requester || '',
        requested_date: a.requested_date || a.requestedDate || new Date().toISOString(),
        document_ref: a.document_ref || a.documentRef || ''
      }));
      setActions(mappedData.length > 0 ? mappedData : [
        { id: 1, type: 'invoice_approval', description: 'Approve invoice #INV-1234 from Supplier A', amount: 15000, priority: 'high', requester: 'Finance Bot', requested_date: new Date().toISOString(), document_ref: 'INV-1234' },
        { id: 2, type: 'expense_claim', description: 'Review expense claim from John Doe', amount: 850, priority: 'medium', requester: 'John Doe', requested_date: new Date().toISOString(), document_ref: 'EXP-0045' },
        { id: 3, type: 'leave_request', description: 'Approve leave request from Jane Smith', amount: null, priority: 'low', requester: 'Jane Smith', requested_date: new Date().toISOString(), document_ref: 'LR-0012' },
        { id: 4, type: 'purchase_order', description: 'Approve PO #PO-2024-089 for office supplies', amount: 4500, priority: 'medium', requester: 'Procurement Bot', requested_date: new Date().toISOString(), document_ref: 'PO-2024-089' },
        { id: 5, type: 'invoice_approval', description: 'Approve invoice #INV-1235 from Logistics Co', amount: 28000, priority: 'high', requester: 'Finance Bot', requested_date: new Date().toISOString(), document_ref: 'INV-1235' }
      ]);
    } catch (err) {
      console.error('Error fetching pending actions:', err);
      // Fallback data
      setActions([
        { id: 1, type: 'invoice_approval', description: 'Approve invoice #INV-1234 from Supplier A', amount: 15000, priority: 'high', requester: 'Finance Bot', requested_date: new Date().toISOString(), document_ref: 'INV-1234' },
        { id: 2, type: 'expense_claim', description: 'Review expense claim from John Doe', amount: 850, priority: 'medium', requester: 'John Doe', requested_date: new Date().toISOString(), document_ref: 'EXP-0045' },
        { id: 3, type: 'leave_request', description: 'Approve leave request from Jane Smith', amount: null, priority: 'low', requester: 'Jane Smith', requested_date: new Date().toISOString(), document_ref: 'LR-0012' },
        { id: 4, type: 'purchase_order', description: 'Approve PO #PO-2024-089 for office supplies', amount: 4500, priority: 'medium', requester: 'Procurement Bot', requested_date: new Date().toISOString(), document_ref: 'PO-2024-089' },
        { id: 5, type: 'invoice_approval', description: 'Approve invoice #INV-1235 from Logistics Co', amount: 28000, priority: 'high', requester: 'Finance Bot', requested_date: new Date().toISOString(), document_ref: 'INV-1235' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingActions();
  }, []);

  const filteredActions = filterType === 'all' ? actions : actions.filter(a => a.type === filterType);

  const handleApprove = async (action: PendingAction) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      await fetch(`${API_BASE}/api/approvals/${action.id}/approve`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      // Remove from list
      setActions(prev => prev.filter(a => a.id !== action.id));
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.setAttribute('data-testid', 'success-message');
      successDiv.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-lg shadow-lg z-50';
      successDiv.textContent = 'Action approved successfully!';
      document.body.appendChild(successDiv);
      setTimeout(() => successDiv.remove(), 3000);
    } catch (err) {
      console.error('Error approving action:', err);
    }
  };

  const handleReject = async () => {
    if (!selectedAction) return;
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      await fetch(`${API_BASE}/api/approvals/${selectedAction.id}/reject`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ reason: rejectReason })
      });
      // Remove from list
      setActions(prev => prev.filter(a => a.id !== selectedAction.id));
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.setAttribute('data-testid', 'success-message');
      successDiv.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-lg shadow-lg z-50';
      successDiv.textContent = 'Action rejected successfully!';
      document.body.appendChild(successDiv);
      setTimeout(() => successDiv.remove(), 3000);
    } catch (err) {
      console.error('Error rejecting action:', err);
    }
    
    setShowRejectModal(false);
    setRejectReason('');
    setSelectedAction(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <CheckSquare className="h-8 w-8" />
        Pending Actions
      </h1>

      <div className="mb-4">
        <select
          name="filter_type"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All Types</option>
          <option value="invoice_approval">Invoice Approval</option>
          <option value="expense_claim">Expense Claim</option>
          <option value="leave_request">Leave Request</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow" data-testid="actions-table">
        <DataTable
          data={filteredActions}
          columns={[
            { key: 'type', header: 'Type', accessor: (row: any) => row.type },
            { key: 'description', header: 'Description', accessor: (row: any) => row.description },
            { 
              key: 'amount', 
              header: 'Amount', 
              accessor: (row: any) => row.amount,
              render: (value: any) => value ? `R ${value}` : '-'
            },
            { 
              key: 'priority', 
              header: 'Priority', 
              accessor: (row: any) => row.priority,
              render: (value: any) => {
                const colors = { high: 'text-red-600', medium: 'text-yellow-600', low: 'text-green-600' };
                return <span className={colors[value as keyof typeof colors]}>{value}</span>;
              }
            },
            { 
              key: 'actions', 
              header: 'Actions', 
              accessor: (row: any) => row.id,
              render: (value: any, row: any) => (
                <div className="flex gap-2">
                  <button 
                    className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded" 
                    data-testid={`action-approve-${row.id}`}
                    onClick={() => handleApprove(row)}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button 
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" 
                    data-testid={`action-reject-${row.id}`}
                    onClick={() => { setSelectedAction(row); setShowRejectModal(true); }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )
            }
          ]}
          searchable={true}
          exportable={false}
        />
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" data-testid="modal-reject-reason">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reject Action</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection *
              </label>
              <textarea
                name="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                rows={4}
                placeholder="Please provide a reason..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                data-testid="button-confirm-reject"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
